"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PREVIEW_REQUEST_STATUSES,
  isDeterministicRefusal,
  type PreviewRequestCommand,
  type PreviewRequestStatus,
} from "@jewelo/contracts";
import {
  loadOperatorPreviewRequests,
  loadOperatorDesignState,
  loadOperatorReviewRuns,
  retryGenerationTask,
  sendPreviewRequestCommand,
  type OperatorPreviewRequestRecord,
  type OperatorReviewRun,
} from "@/lib/operator-preview-request-client";
import {
  readPersonalizedRun,
  type PersonalizedViewSlot,
} from "@/features/atelier/personalizedRun";
import s from "./PreviewRequestQueue.module.css";

/**
 * The queue the shop is run from.
 *
 * Every shopper who asked to be contacted, the photographs their run actually
 * produced, a way to reach them, a note that survives the day, and the pieces
 * the pipeline stopped on with the reason said in words a jeweller can act on.
 *
 * Two rules hold this surface together. A photograph that is not the customer's
 * own piece is labelled as a sample on the tile itself, so nobody sends it to
 * anyone. And a reason is always shown twice: once in plain words, once as the
 * raw code, because the words are for the shop and the code is for whoever is
 * asked about it later.
 */

/**
 * The stopped-run vocabulary, in words a jeweller can act on.
 *
 * Keys are the head of the stored code - what stands before the first `:` or
 * `|` - because the pipeline appends measurements (`identity_no_ring_seat:left=6,right=6`)
 * that belong on the raw line underneath, not in the sentence. The raw code is
 * never hidden; an unlisted code keeps its own honest sentence.
 */
const PLAIN_WORDS: Readonly<Record<string, string>> = {
  identity_no_ring_seat:
    "The name offers no place for the rings. Make this one by hand.",
  identity_ring_gate_failed: "The rings will not sit safely on this name.",
  identity_ring_anchor_missing: "The rings will not sit safely on this name.",
  identity_ring_hole_too_small: "The ring holes come out too small to thread.",
  identity_ring_span_too_narrow: "The rings sit too close together to hang straight.",
  identity_ring_overhang_too_wide: "The rings hang past the letters.",
  identity_ring_tilt_too_steep: "The pendant would hang crooked.",
  identity_ring_post_too_long:
    "The rings would need a stem too long to look right.",
  identity_ring_welded_to_glyph: "The rings run into a letter.",
  identity_ring_punched_ink: "The rings would cut into a letter.",
  identity_bar_fallback:
    "The letters would not join, so a plain bar was used instead. Check this one by hand.",
  identity_bridge_failed: "The letters would not join into one piece.",
  identity_bridge_moved_ink: "Joining the letters moved them out of shape.",
  identity_shaping_gate_failed: "The letter shapes did not come out clean.",
  identity_component_gate_failed: "The name came out in pieces instead of one.",
  identity_stencil_empty_outline: "The name produced no outline to work from.",
  identity_stencil_pinhole: "The outline came out with holes in it.",
  identity_mask_empty: "The name produced no shape at all.",
  identity_fit_overflow: "The name is too long for the pendant width.",
  identity_font_missing: "The lettering this name needs is not installed.",
  identity_font_bytes_mismatch: "The lettering file does not match the one on record.",
  identity_gate_failed: "The name did not pass the shape checks.",
  identity_verification_failed:
    "The photograph does not match the shape of the name.",
  name_mismatch: "The photograph did not read the name back.",
  dependency_blocked:
    "This view waits on the studio photograph, which never arrived.",
  mock_generation_failed:
    "A sample run stopped. Nothing was charged and no piece was made.",
  spend_guard_exceeded: "The day's spending limit was reached.",
  stale_worker_ambiguous_paid_request:
    "A photograph stopped half way. Check it before running it again.",
  video_poll_timeout: "The film took too long and was let go.",
  style_anchor_missing: "A reference photograph is missing.",
  prompt_compile_failed:
    "The recipe cannot be written for this specification.",
  studio_only_policy:
    "The shop is set to the studio photograph only, so this view was not taken.",
  task_prompt_release_mismatch: "The recipe versions do not line up.",
  prompt_snapshot_lineage_mismatch: "The recipe versions do not line up.",
  pre_spend_gate_failed: "The piece was stopped before anything was spent.",
  operator_rejected: "Somebody in the shop stopped this one.",
  cancelled: "This one was stopped.",
  unknown: "It stopped for a reason with no words yet. Read the code below.",
};

function plainWords(code: string | undefined): string {
  if (!code) return "It stopped without saying why. Read the run by hand.";
  const head = code.split("|")[0]?.split(":")[0] ?? "";
  return (
    PLAIN_WORDS[head] ??
    "It stopped for a reason this queue has no words for yet. Read the code."
  );
}

/** The refusal the database returns when the paid attempts are used up. */
function retryRefusal(message: string): string {
  return /attempt budget/i.test(message)
    ? "This photograph has used every attempt the shop allows. Make it by hand or start a new piece."
    : /cannot be retried|task cancelled/i.test(message)
      ? "This one is not in a state that can be run again."
      : message;
}

const STATUS_WORDS: Readonly<Record<PreviewRequestStatus, string>> = {
  new: "Waiting",
  contacted: "Contacted",
  fulfilled: "Made",
  cancelled: "Dropped",
};

/**
 * `wa.me` wants digits only; `tel:` keeps the number exactly as stored.
 *
 * Security review 2 L-2: a stored contact the server could not parse arrives as
 * the `unknown` channel with an empty value, and gets no link at all. An href
 * is only ever built from a value that passed `previewRequestContactSchema`.
 */
function contactLinks(channel: string, value: string) {
  if (channel === "unknown") return [];
  if (channel === "email")
    return [{ href: `mailto:${value}`, label: "Email" }];
  const digits = value.replaceAll(/[^0-9]/g, "");
  return [
    ...(digits ? [{ href: `https://wa.me/${digits}`, label: "WhatsApp" }] : []),
    { href: `tel:${value}`, label: "Call" },
  ];
}

interface StillsState {
  loading: boolean;
  error?: string;
  slots?: PersonalizedViewSlot[];
}

export function PreviewRequestQueue() {
  const [requests, setRequests] = useState<OperatorPreviewRequestRecord[]>([]);
  const [reviewRuns, setReviewRuns] = useState<OperatorReviewRun[]>([]);
  const [reviewError, setReviewError] = useState("");
  const [filter, setFilter] = useState<PreviewRequestStatus | "all">("all");
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [stills, setStills] = useState<Record<string, StillsState>>({});
  const [taskMessage, setTaskMessage] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    try {
      const loaded = await loadOperatorPreviewRequests(
        filter === "all" ? undefined : filter,
      );
      setRequests(loaded);
      // The stored note is the field's starting text; anything the operator has
      // typed and not saved wins, so a background refresh cannot erase it.
      setNotes((current) =>
        Object.fromEntries(
          loaded.map((item) => [
            item.id,
            current[item.id] ?? item.operatorNote ?? "",
          ]),
        ),
      );
      setError("");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Preview requests unavailable",
      );
    }
    try {
      setReviewRuns(await loadOperatorReviewRuns());
      setReviewError("");
    } catch {
      // The stopped-run list is an addition to the queue, not the queue: a
      // failure here leaves the requests readable and says so on its own line.
      //
      // Storyline review 1, minor: it used to say so nowhere. An empty list and
      // a list that could not be loaded looked identical, so a shop reading
      // "nothing stopped today" could be reading a broken read instead. The
      // previously loaded runs are kept - stale is more use than blank - and
      // the line below says the refresh failed.
      setReviewError("The stopped pieces could not be loaded.");
    }
  }, [filter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const reviewByRun = useMemo(
    () => new Map(reviewRuns.map((run) => [run.id, run])),
    [reviewRuns],
  );
  const requestRunIds = useMemo(
    () => new Set(requests.map((item) => item.generationRunId ?? "")),
    [requests],
  );
  const unlinkedRuns = reviewRuns.filter((run) => !requestRunIds.has(run.id));

  async function command(
    name: PreviewRequestCommand,
    id: string,
    note?: string,
  ) {
    setBusy(`${id}:${name}`);
    try {
      await sendPreviewRequestCommand(name, id, note);
      setError("");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Action unavailable");
    } finally {
      setBusy(undefined);
    }
  }

  async function showStills(item: OperatorPreviewRequestRecord) {
    const runId = item.generationRunId;
    const designId = item.designId;
    if (!runId || !designId) return;
    setStills((current) => ({ ...current, [item.id]: { loading: true } }));
    try {
      const payload = await loadOperatorDesignState(designId);
      const run = readPersonalizedRun(payload, runId);
      setStills((current) => ({
        ...current,
        [item.id]: run
          ? { loading: false, slots: run.slots }
          : { loading: false, error: "This run is no longer readable." },
      }));
    } catch (caught) {
      setStills((current) => ({
        ...current,
        [item.id]: {
          loading: false,
          error:
            caught instanceof Error ? caught.message : "Photographs unavailable",
        },
      }));
    }
  }

  async function retry(run: OperatorReviewRun, taskId: string) {
    if (!run.designId) {
      setTaskMessage((current) => ({
        ...current,
        [taskId]: "This run has no design on it, so it cannot be run again.",
      }));
      return;
    }
    setBusy(taskId);
    try {
      await retryGenerationTask(run.designId, taskId, "operator_queue_retry");
      setTaskMessage((current) => ({
        ...current,
        [taskId]: "Sent back to be photographed again.",
      }));
      await refresh();
    } catch (caught) {
      setTaskMessage((current) => ({
        ...current,
        [taskId]: retryRefusal(
          caught instanceof Error ? caught.message : "Retry unavailable",
        ),
      }));
    } finally {
      setBusy(undefined);
    }
  }

  const waiting = requests.filter((item) => item.status === "new").length;

  function reviewBlock(run: OperatorReviewRun) {
    return (
      <div className={s.review}>
        <p className={s.reasonPlain}>{plainWords(run.reason)}</p>
        <p className={s.code}>
          run {run.id.slice(0, 8)} · {run.reason ?? "no reason recorded"}
        </p>
        {run.tasks
          .filter((task) => task.status === "failed" || task.status === "blocked")
          .map((task) => (
            <div key={task.id} className={s.task}>
              <span>{task.view ?? "view"}</span>
              <span className={s.code}>
                {task.status} · attempt {task.attempt} ·{" "}
                {task.errorCode ?? "no code"}
              </span>
              <span>{plainWords(task.errorCode)}</span>
              {/* Storyline review 1 M7: a deterministic refusal is a property
                  of the name, the specification or the recipe, decided before
                  any money is spent, so the same dispatch decides it the same
                  way every time. Offering "Photograph it again" there told the
                  shop a piece had been sent back when nothing had moved. The
                  code list is `@jewelo/contracts`; retry stays for a provider
                  or worker failure, which is exactly what running it again
                  fixes. */}
              {isDeterministicRefusal(task.errorCode) ? (
                <span className={s.byHand}>Make this one by hand</span>
              ) : (
                <button
                  type="button"
                  className="clm-secondary"
                  disabled={busy === task.id || task.cancelRequested}
                  onClick={() => void retry(run, task.id)}
                >
                  Photograph it again
                </button>
              )}
              {taskMessage[task.id] ? (
                <p className={s.message} role="status">
                  {taskMessage[task.id]}
                </p>
              ) : null}
            </div>
          ))}
      </div>
    );
  }

  return (
    <section className={s.queue} aria-label="Preview requests">
      <div className={s.head}>
        <div>
          <p className="clm-kicker">Preview requests</p>
          <h2>{waiting} awaiting contact</h2>
        </div>
        <div className={s.filter} role="group" aria-label="Filter by status">
          {(["all", ...PREVIEW_REQUEST_STATUSES] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {value === "all" ? "All" : STATUS_WORDS[value]}
            </button>
          ))}
        </div>
      </div>
      {error ? (
        <p className={s.message} role="status">
          {error}
        </p>
      ) : null}
      {reviewError ? (
        <p className={s.message} role="status">
          {reviewError}
        </p>
      ) : null}
      {requests.length === 0 ? (
        <p className={s.when}>Nothing in this view.</p>
      ) : (
        <ul className={s.list}>
          {requests.map((item) => {
            const links = contactLinks(item.contact.channel, item.contact.value);
            const still = stills[item.id];
            const run = item.generationRunId
              ? reviewByRun.get(item.generationRunId)
              : undefined;
            return (
              <li key={item.id} className={s.card}>
                <header>
                  <p className={s.summary}>{item.summary}</p>
                  <span className={s.status} data-status={item.status}>
                    {STATUS_WORDS[item.status]}
                  </span>
                </header>
                <p className={s.when} dir="ltr">
                  {new Date(item.createdAt).toLocaleString("en")} ·{" "}
                  {item.sampleReference
                    ? `sample ${item.sampleReference.sampleId}`
                    : "no sample shown"}
                </p>
                <p className={s.contact} dir="ltr">
                  <strong>
                    {item.contact.channel === "unknown"
                      ? "Contact needs review"
                      : `${item.contact.name ? `${item.contact.name} · ` : ""}${item.contact.value}`}
                  </strong>
                  <span className={s.when}>
                    {item.contact.channel === "unknown"
                      ? "open the row in the database"
                      : item.contact.channel}
                  </span>
                  {links.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {link.label}
                    </a>
                  ))}
                </p>
                {item.generationRunId && item.designId ? (
                  <div>
                    <div className={s.actions}>
                      <button
                        type="button"
                        disabled={still?.loading}
                        onClick={() => void showStills(item)}
                      >
                        {still?.loading
                          ? "Opening…"
                          : still?.slots
                            ? "Reload photographs"
                            : "Show photographs"}
                      </button>
                    </div>
                    {still?.error ? (
                      <p className={s.message} role="status">
                        {still.error}
                      </p>
                    ) : null}
                    {still?.slots ? (
                      <ul className={s.stills}>
                        {still.slots.map((slot) => (
                          <li key={slot.view} className={s.still}>
                            {slot.imageUrl ? (
                              <img
                                src={slot.imageUrl}
                                alt={`${slot.view} view of this piece`}
                              />
                            ) : (
                              <span className={s.empty}>
                                {slot.state === "absent"
                                  ? "never started"
                                  : slot.state}
                              </span>
                            )}
                            <strong>{slot.view}</strong>
                            {slot.imageUrl && !slot.presentable ? (
                              <span className={s.sample}>
                                Sample asset, {slot.provider ?? "no"}{" "}mode - not
                                the customer&rsquo;s piece
                              </span>
                            ) : null}
                            {slot.errorCode ? (
                              <>
                                <span>{plainWords(slot.errorCode)}</span>
                                <span className={s.code}>{slot.errorCode}</span>
                              </>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : (
                  <p className={s.when}>No run is linked to this request.</p>
                )}
                {run ? reviewBlock(run) : null}
                <div className={s.note}>
                  <label htmlFor={`note-${item.id}`}>Note</label>
                  <textarea
                    id={`note-${item.id}`}
                    value={notes[item.id] ?? ""}
                    onChange={(event) =>
                      setNotes((current) => ({
                        ...current,
                        [item.id]: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className={s.actions}>
                  <button
                    type="button"
                    disabled={busy === `${item.id}:preview_request.note`}
                    onClick={() =>
                      void command(
                        "preview_request.note",
                        item.id,
                        notes[item.id] ?? "",
                      )
                    }
                  >
                    Save note
                  </button>
                  <button
                    type="button"
                    disabled={
                      item.status !== "new" ||
                      busy === `${item.id}:preview_request.mark_contacted`
                    }
                    onClick={() =>
                      void command(
                        "preview_request.mark_contacted",
                        item.id,
                        notes[item.id] ?? "",
                      )
                    }
                  >
                    Mark contacted
                  </button>
                  <button
                    type="button"
                    disabled={
                      item.status === "fulfilled" ||
                      item.status === "cancelled" ||
                      busy === `${item.id}:preview_request.mark_fulfilled`
                    }
                    onClick={() =>
                      void command(
                        "preview_request.mark_fulfilled",
                        item.id,
                        notes[item.id] ?? "",
                      )
                    }
                  >
                    Made and handed over
                  </button>
                  <button
                    type="button"
                    disabled={
                      item.status === "fulfilled" ||
                      item.status === "cancelled" ||
                      busy === `${item.id}:preview_request.mark_cancelled`
                    }
                    onClick={() =>
                      void command(
                        "preview_request.mark_cancelled",
                        item.id,
                        notes[item.id] ?? "",
                      )
                    }
                  >
                    Drop this one
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {unlinkedRuns.length > 0 ? (
        <div>
          <div className={s.head}>
            <div>
              <p className="clm-kicker">Pieces stopped for a look</p>
              <h2>{unlinkedRuns.length} waiting on the shop</h2>
            </div>
          </div>
          <ul className={s.list}>
            {unlinkedRuns.map((run) => (
              <li key={run.id} className={s.card}>
                <header>
                  <p className={s.summary}>
                    Piece {run.designId?.slice(0, 8) ?? "unknown"}
                  </p>
                  <span className={s.status}>Stopped</span>
                </header>
                <p className={s.when} dir="ltr">
                  {new Date(run.createdAt).toLocaleString("en")} · nobody asked
                  to be contacted on this one
                </p>
                {reviewBlock(run)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
