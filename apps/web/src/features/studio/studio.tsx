"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowClockwise,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  DownloadSimple,
  FloppyDisk,
  ImageSquare,
  MagicWand,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  ShareNetwork,
  Sparkle,
  X,
} from "@phosphor-icons/react";
import { AppShell } from "@/components/app-shell";
import { useJewelo } from "@/lib/jewelo-provider";
import {
  PRESENTATION_VIEW_DETAILS,
  arabicStyleLabel,
  formatCaleumsPrice,
  identityFromSpecification,
  safePresentationState,
} from "@/lib/ui-presentation";
import type { Locale, PresentationView, TaskState } from "@/lib/types";

const activeStates = new Set<TaskState>([
  "queued",
  "generating",
  "verifying",
  "retrying",
]);

const legacyPresentationCoordinates = {
  studio: { directionIndex: 0, kind: "product" },
  on_skin: { directionIndex: 0, kind: "worn" },
  close_up: { directionIndex: 2, kind: "product" },
  dark: { directionIndex: 3, kind: "product" },
} as const;

function stateCopy(state: TaskState | "pending") {
  if (state === "failed")
    return ["This view needs another try", "Ready siblings remain available."];
  if (state === "cancelled")
    return ["This view was cancelled", "Ready siblings remain available."];
  if (state === "blocked")
    return [
      "Waiting for Studio approval",
      "Derived work starts only from the verified parent.",
    ];
  if (state === "unavailable")
    return ["This view is unavailable", "The atelier can review the task."];
  if (state === "pending")
    return [
      "Waiting for its backend task",
      "This placeholder is not selectable or ready.",
    ];
  if (state === "verifying")
    return [
      "Checking your exact identity",
      "The view unlocks only after verification.",
    ];
  if (state === "retrying")
    return ["Trying this view again", "Ready siblings remain available."];
  if (state === "generating")
    return [
      "Rendering this presentation",
      "It will appear here when verified.",
    ];
  return ["Queued for presentation", "It will appear here when verified."];
}

export function Studio({
  locale,
  designId,
}: {
  locale: Locale;
  designId: string;
}) {
  const router = useRouter();
  const { client, state, refresh } = useJewelo();
  const design = state.designs.find((item) => item.id === designId);
  const run = design?.runs.at(-1);
  const direction = run?.directions[0];
  const revision =
    design?.revisions.find((item) => item.id === run?.revisionId) ??
    design?.revisions.at(-1);
  const [activeView, setActiveView] = useState<PresentationView>("studio");
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState<string>();
  const [message, setMessage] = useState("");
  const [locallyCancelled, setLocallyCancelled] = useState<string[]>([]);
  const scenarioMode = process.env.NEXT_PUBLIC_JEWELO_SCENARIOS === "1";

  const slots = useMemo(
    () =>
      PRESENTATION_VIEW_DETAILS.map((details) => {
        const canonicalTask = run?.tasks.find(
          (candidate) => candidate.view === details.id,
        );
        const legacyCoordinate = legacyPresentationCoordinates[details.id];
        const legacyDirection =
          run?.directions[legacyCoordinate.directionIndex];
        const task =
          canonicalTask ??
          run?.tasks.find(
            (candidate) =>
              candidate.directionId === legacyDirection?.id &&
              candidate.kind === legacyCoordinate.kind,
          );
        const asset =
          run?.assets.find(
            (candidate) => task && candidate.lineage.taskId === task.id,
          ) ?? run?.assets.find((candidate) => candidate.view === details.id);
        const backendState = safePresentationState(
          task && locallyCancelled.includes(task.id)
            ? "cancelled"
            : (task?.state ?? asset?.state),
        );
        const ready =
          backendState === "ready" &&
          asset?.state === "ready" &&
          Boolean(asset.assetUrl);
        return {
          ...details,
          task,
          asset,
          ready,
          state:
            backendState === "ready" && !ready ? "verifying" : backendState,
        };
      }),
    [locallyCancelled, run],
  );
  const selectedSlot =
    slots.find((slot) => slot.id === activeView) ?? slots[0]!;
  const studioSlot = slots.find((slot) => slot.id === "studio")!;

  useEffect(
    () => (run ? client.subscribeToRun(run.id, refresh) : undefined),
    [client, refresh, run],
  );
  useEffect(() => {
    if (selectedSlot.task)
      setMessage(
        `${selectedSlot.label} is ${selectedSlot.state.replaceAll("_", " ")}.`,
      );
  }, [selectedSlot.label, selectedSlot.state, selectedSlot.task]);

  async function action(
    key: string,
    work: () => Promise<unknown>,
    success: string,
  ) {
    setBusy(key);
    setMessage("");
    try {
      await work();
      refresh();
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action unavailable");
    } finally {
      setBusy(undefined);
    }
  }

  async function continueToPiece() {
    if (!direction || !studioSlot.ready) return;
    await action(
      "commerce",
      async () => {
        if (design?.selectedDirectionId !== direction.id)
          await client.selectDirection(designId, direction.id);
        if (!design?.estimate) await client.calculateEstimate(designId);
        router.push(`/${locale}/commerce/${designId}`);
      },
      "Opening your final piece.",
    );
  }

  async function regenerate() {
    setLocallyCancelled([]);
    await action(
      "regenerate",
      () => client.startRun(designId),
      "A fresh set of presentation tasks has started.",
    );
  }

  async function refine() {
    await action(
      "refine",
      async () => {
        await client.refineDesign(designId, "Caleums Studio refinement");
        await client.startRun(designId);
      },
      "A refined revision is being rendered.",
    );
  }

  if (!design || !revision)
    return (
      <AppShell locale={locale}>
        <main className="clm-empty">
          <h1>Design not found</h1>
          <Link className="clm-primary" href={`/${locale}`}>
            Return home
          </Link>
        </main>
      </AppShell>
    );
  if (!run || !direction)
    return (
      <AppShell locale={locale}>
        <main className="clm-empty">
          <p className="clm-kicker">Approved design</p>
          <h1>Your piece is ready to render.</h1>
          <button
            className="clm-primary"
            onClick={() => void client.startRun(designId)}
          >
            Create Studio result
          </button>
        </main>
      </AppShell>
    );

  const spec = revision.specification;
  const identity = identityFromSpecification(spec);
  const loadingCopy = stateCopy(selectedSlot.state);

  return (
    <AppShell locale={locale}>
      <main className="clm-studio" dir={locale === "ar" ? "rtl" : "ltr"}>
        <aside className="clm-studio-summary">
          <Link className="clm-back" href={`/${locale}/design/new`}>
            <ArrowLeft size={16} /> Back to design
          </Link>
          <p className="clm-kicker">Your design</p>
          <h1 dir={spec.arabicStyle === "none" ? "ltr" : "rtl"}>
            {identity.inline}
          </h1>
          <dl className="clm-summary compact">
            <div>
              <dt>Names</dt>
              <dd dir={spec.arabicStyle === "none" ? "ltr" : "rtl"}>
                {identity.inline}
              </dd>
            </div>
            <div>
              <dt>Script</dt>
              <dd>{arabicStyleLabel(spec.arabicStyle)}</dd>
            </div>
            <div>
              <dt>Layout</dt>
              <dd>{spec.layout.replaceAll("-", " ")}</dd>
            </div>
            <div>
              <dt>Metal</dt>
              <dd>18K {spec.metalColor} gold</dd>
            </div>
            <div>
              <dt>Stones</dt>
              <dd>
                {spec.stoneCoverage.replaceAll("-", " ")} ·{" "}
                {spec.gemstone.replaceAll("-", " ")}
              </dd>
            </div>
            <div>
              <dt>Chain</dt>
              <dd>
                {spec.chain.style} · {spec.chain.lengthCm} cm
              </dd>
            </div>
            <div>
              <dt>Size</dt>
              <dd>
                {spec.sizeProfile} ({spec.dimensions.widthMm} mm)
              </dd>
            </div>
          </dl>
          <div className="clm-studio-save">
            <button
              type="button"
              onClick={() => setMessage("Design saved in this workspace.")}
            >
              <FloppyDisk size={17} /> Save
            </button>
            <button
              type="button"
              onClick={() =>
                void navigator.clipboard
                  ?.writeText(window.location.href)
                  .then(() => setMessage("Design link copied."))
              }
            >
              <ShareNetwork size={17} /> Share
            </button>
          </div>
          <div className="clm-estimate">
            <span>Estimated price</span>
            <strong>{formatCaleumsPrice(design)}</strong>
            <small>One price source · final quote follows atelier review</small>
          </div>
        </aside>

        <section className="clm-studio-canvas">
          <header>
            <div>
              <p className="clm-kicker">Your presentation set</p>
              <h2>
                {selectedSlot.label} · {selectedSlot.treatment}
              </h2>
            </div>
            <span className="clm-state" data-state={selectedSlot.state}>
              {selectedSlot.state.replaceAll("_", " ")}
            </span>
          </header>
          <div
            id="caleums-active-presentation"
            className="clm-studio-media"
            data-ratio={selectedSlot.ratio}
            aria-live="polite"
          >
            {selectedSlot.ready && selectedSlot.asset?.assetUrl ? (
              <Image
                src={selectedSlot.asset.assetUrl}
                alt={selectedSlot.asset.alt}
                fill
                priority={selectedSlot.id === "studio"}
                sizes="(max-width: 799px) 100vw, 68vw"
                style={{ transform: `scale(${zoom})` }}
              />
            ) : (
              <div className="clm-studio-loading">
                <Sparkle size={34} weight="duotone" />
                <strong>{loadingCopy[0]}</strong>
                <span>{loadingCopy[1]}</span>
              </div>
            )}
            {selectedSlot.ready && (
              <div className="clm-zoom">
                <button
                  type="button"
                  aria-label="Zoom out"
                  onClick={() => setZoom(Math.max(1, zoom - 0.15))}
                >
                  <MagnifyingGlassMinus size={18} />
                </button>
                <button
                  type="button"
                  aria-label="Zoom in"
                  onClick={() => setZoom(Math.min(1.6, zoom + 0.15))}
                >
                  <MagnifyingGlassPlus size={18} />
                </button>
                <span>{Math.round(zoom * 100)}%</span>
              </div>
            )}
          </div>
          <div
            className="clm-studio-tabs"
            role="tablist"
            aria-label="Presentation views"
          >
            {slots.map((slot, index) => (
              <button
                key={slot.id}
                type="button"
                role="tab"
                aria-selected={activeView === slot.id}
                aria-controls="caleums-active-presentation"
                disabled={!slot.ready}
                onClick={() => {
                  setZoom(1);
                  setActiveView(slot.id);
                }}
              >
                <span>
                  <ImageSquare size={16} /> {String(index + 1).padStart(2, "0")}{" "}
                  {slot.label}
                </span>
                <small>
                  {slot.ready && <CheckCircle size={12} />}
                  {slot.treatment} · {slot.ratio} ·{" "}
                  {slot.state.replaceAll("_", " ")}
                </small>
              </button>
            ))}
          </div>
          {scenarioMode && (
            <details className="clm-task-audit">
              <summary>Development task status audit</summary>
              <p>
                Each row is a real mock/backend task state; missing tasks remain
                unavailable.
              </p>
              <ul>
                {slots.map((slot) => (
                  <li key={slot.id}>
                    <span>
                      {slot.label} · {slot.state.replaceAll("_", " ")}
                    </span>
                    {slot.task && activeStates.has(slot.state as TaskState) && (
                      <button
                        type="button"
                        disabled={Boolean(busy)}
                        onClick={() =>
                          void action(
                            `cancel-${slot.task!.id}`,
                            async () => {
                              await client.cancelTask(designId, slot.task!.id);
                              setLocallyCancelled((current) => [
                                ...new Set([...current, slot.task!.id]),
                              ]);
                            },
                            `${slot.label} task cancelled.`,
                          )
                        }
                      >
                        Cancel
                      </button>
                    )}
                    {slot.task && slot.state === "failed" && (
                      <button
                        type="button"
                        disabled={Boolean(busy)}
                        onClick={() =>
                          void action(
                            `retry-${slot.task!.id}`,
                            () => client.retryTask(designId, slot.task!.id),
                            `${slot.label} retry started.`,
                          )
                        }
                      >
                        Retry
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        <footer className="clm-studio-actions">
          <div>
            <strong>{identity.inline}</strong>
            <span>Verified identity · four independent presentations</span>
          </div>
          <button
            type="button"
            className="clm-secondary"
            disabled={Boolean(busy)}
            onClick={() => void refine()}
          >
            <MagicWand size={17} />
            {busy === "refine" ? "Refining…" : "Refine"}
          </button>
          <button
            type="button"
            className="clm-secondary"
            disabled={Boolean(busy)}
            onClick={() => void regenerate()}
          >
            <ArrowClockwise size={17} />
            {busy === "regenerate" ? "Starting…" : "Regenerate"}
          </button>
          {selectedSlot.task &&
            activeStates.has(selectedSlot.state as TaskState) && (
              <button
                type="button"
                className="clm-secondary clm-task-action"
                disabled={Boolean(busy)}
                onClick={() =>
                  void action(
                    "cancel-task",
                    async () => {
                      await client.cancelTask(designId, selectedSlot.task!.id);
                      setLocallyCancelled((current) => [
                        ...new Set([...current, selectedSlot.task!.id]),
                      ]);
                    },
                    `${selectedSlot.label} task cancelled. Ready assets remain preserved.`,
                  )
                }
              >
                <X size={16} />
                {busy === "cancel-task" ? "Cancelling…" : "Cancel task"}
              </button>
            )}
          {selectedSlot.task && selectedSlot.state === "failed" && (
            <button
              type="button"
              className="clm-secondary clm-task-action"
              disabled={Boolean(busy)}
              onClick={() =>
                void action(
                  "retry-task",
                  () => client.retryTask(designId, selectedSlot.task!.id),
                  `${selectedSlot.label} retry started.`,
                )
              }
            >
              <ArrowClockwise size={16} />
              {busy === "retry-task" ? "Retrying…" : "Retry task"}
            </button>
          )}
          {selectedSlot.ready && selectedSlot.asset?.assetUrl && (
            <a
              className="clm-secondary"
              href={selectedSlot.asset.assetUrl}
              download
            >
              <DownloadSimple size={17} /> Download
            </a>
          )}
          <button
            type="button"
            className="clm-primary"
            disabled={!studioSlot.ready || Boolean(busy)}
            onClick={() => void continueToPiece()}
          >
            {busy === "commerce" ? "Preparing…" : "Continue to your piece"}{" "}
            <ArrowRight size={17} />
          </button>
        </footer>
        {message && (
          <p className="clm-toast" role="status">
            {message}
          </p>
        )}
        <p className="clm-sr-live" aria-live="polite" aria-atomic="true">
          {selectedSlot.label} presentation task {selectedSlot.state}.
        </p>
      </main>
    </AppShell>
  );
}
