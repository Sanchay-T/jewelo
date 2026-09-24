"use client";

/**
 * The review stage's personalized preview.
 *
 * One shopper, one specification, one run. This hook owns the whole life of that
 * run in the browser: it starts it only when the customer has confirmed their own
 * spelling, follows it through durable Supabase state, reconstructs it after a
 * reload under the same anonymous principal, and opens the honest capture path
 * the moment the run cannot deliver a photograph of the piece they designed.
 *
 * The illustrated sample is never part of this. Nothing here can show a photo of
 * a different design.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  contactProblem,
  contactProblemFromMessage,
  type ContactProblem,
} from "@jewelo/contracts";

import type { Sample } from "./catalogue";
import { signature, type Draft, type View } from "./model";
import {
  customerViewStatus,
  heroSlot,
  pastCeiling,
  PERSONALIZED_RUN_CEILING_MS,
  PERSONALIZED_RUN_WATCH_MS,
  preflightRefusal,
  resumeSubmission,
  shouldStartRun,
  shouldWatchRun,
  slotFor,
  startAttemptKey,
  type CustomerViewStatus,
  type DegradeReason,
  type PersonalizedRun,
} from "./personalizedRun";
import {
  buildPersonalizedPreviewRequest,
  previewRequestBody,
} from "./previewHandoff";
import {
  capturePreviewRequest,
  clearSubmission,
  createBrowserPreviewSession,
  loadSubmission,
  PipelineError,
  saveSubmission,
  startPersonalizedRun,
  watchRun,
  type PipelineDeps,
  type StoredSubmission,
} from "./previewPipeline";

/**
 * The personalized pipeline is a property of the deployment, not of the browser:
 * the mock data mode has no Supabase project behind it, so the atelier stays the
 * purely local illustrated experience there and never opens a journey it cannot
 * finish.
 */
export const PERSONALIZED_PREVIEW_ENABLED =
  process.env.NEXT_PUBLIC_JEWELO_DATA_MODE === "remote";

/** One catalogue assembled from the versioned sample manifests. */
const CATALOGUE_MANIFEST_ID = "caleums-atelier-catalogue";

export type PreviewPhase =
  | "idle"
  | "starting"
  | "watching"
  | "degraded";

export type ContactChannel = "whatsapp" | "phone" | "email";

export interface ContactDraft {
  channel: ContactChannel;
  value: string;
  name: string;
}

interface Submission {
  signature: string;
  requestKey: string;
  designId?: string;
  runId?: string;
  revisionId?: string;
  startedAt: number;
}

export interface PersonalizedPreview {
  enabled: boolean;
  phase: PreviewPhase;
  /** Approval has been attempted for this specification, including a failed start. */
  attempted: boolean;
  unavailable: boolean;
  /** The live run, when one exists and belongs to the piece on screen. */
  run?: PersonalizedRun;
  /** Why the personalized path cannot deliver, when it cannot. */
  reason?: DegradeReason;
  /** A photograph of the customer's own piece exists for this view. */
  imageFor(view: View): string | undefined;
  statusFor(view: View): CustomerViewStatus | undefined;
  /** True once at least one of the customer's own photographs is on screen. */
  personalized: boolean;
  heroReady: boolean;
  /** The customer should be offered the capture form now. */
  capturing: boolean;
  contact: ContactDraft;
  setContact(next: ContactDraft): void;
  /**
   * Leaves the contact with the shop and answers with the reference the shop
   * now holds, or nothing at all when the capture was refused.
   */
  submitContact(): Promise<string | undefined>;
  captureStatus: "idle" | "sending" | "captured" | "error";
  /**
   * Why the capture was refused. `empty`, `phone_format` and `email_format` are
   * the server's own contact rules, decided here before anything is sent so the
   * shopper gets the format guidance instead of a round trip that discards it;
   * `invalid` is a 422 whose sentence is not one of them, `failed` everything
   * else.
   */
  captureError?: ContactProblem | "invalid" | "failed";
  capturedRequestId?: string;
  /**
   * The last reference this shopper was given, even after they edited the piece.
   * Editing starts a new specification and clears the capture, but the operator
   * still holds the earlier request: losing its reference would leave the
   * shopper with nothing to quote in the shop.
   */
  previousRequestId?: string;
  runId?: string;
  designId?: string;
  readyAssets: { view: View; assetId: string }[];
}

export function usePersonalizedPreview(input: {
  draft: Draft;
  locale: "en" | "ar";
  loaded: boolean;
  stage: "design" | "review";
  confirmed: boolean;
  sample: Sample | undefined;
  /** Test seam: a fully injected transport keeps unit tests offline. */
  deps?: PipelineDeps;
  enabled?: boolean;
}): PersonalizedPreview {
  const enabled = input.enabled ?? PERSONALIZED_PREVIEW_ENABLED;
  const currentSignature = signature(input.draft);
  const [submission, setSubmission] = useState<Submission | undefined>();
  const [phase, setPhase] = useState<PreviewPhase>("idle");
  const [run, setRun] = useState<PersonalizedRun | undefined>();
  const [reason, setReason] = useState<DegradeReason | undefined>();
  const [ceilingReached, setCeilingReached] = useState(false);
  /** This page's reading window; see `PERSONALIZED_RUN_WATCH_MS`. */
  const [watchWindowClosed, setWatchWindowClosed] = useState(false);
  const [contact, setContact] = useState<ContactDraft>({
    // The shop asked for an email address on every saved design (Omran, 22
    // September 2026), so email is the door offered first; a shopper who
    // prefers WhatsApp or a phone call still picks it here.
    channel: "email",
    value: "",
    name: "",
  });
  const [captureStatus, setCaptureStatus] = useState<
    "idle" | "sending" | "captured" | "error"
  >("idle");
  const [captureError, setCaptureError] = useState<
    ContactProblem | "invalid" | "failed" | undefined
  >();
  const [capturedRequestId, setCapturedRequestId] = useState<
    string | undefined
  >();
  /**
   * The specification the live capture was made for.
   *
   * A capture can exist without a submission - the shopper can leave contact
   * details on a deployment where no run was ever started - so the submission's
   * signature cannot be what decides whether the capture still belongs to the
   * piece on screen. Keying the reset on this instead is what stops a contact
   * captured for design A being filed against design B.
   */
  const [capturedFor, setCapturedFor] = useState<string | undefined>();
  /** Deliberately survives a specification change; see `previousRequestId`. */
  const [previousRequestId, setPreviousRequestId] = useState<
    string | undefined
  >();

  const injected = input.deps;
  const depsRef = useRef<PipelineDeps | undefined>(injected);
  const deps = useMemo(() => {
    if (injected) return injected;
    if (!depsRef.current)
      depsRef.current = { session: createBrowserPreviewSession() };
    return depsRef.current;
  }, [injected]);

  // One submission per specification. A shopper who unticks and reticks the
  // confirmation must not buy a second run.
  const startedFor = useRef<string | undefined>(undefined);
  const sampleRef = useRef(input.sample);
  sampleRef.current = input.sample;
  const draftRef = useRef(input.draft);
  draftRef.current = input.draft;
  /**
   * The captured request id, readable from inside the start effect's async
   * callbacks without re-running that effect and buying another run. Written
   * back with every submission so a start that lands after a capture cannot
   * overwrite the stored `previewRequestId` with nothing.
   */
  const captured = useRef<{ signature?: string; id?: string }>({});
  captured.current = { signature: capturedFor, id: capturedRequestId };
  const capturedIdFor = (signature: string) =>
    captured.current.signature === signature ? captured.current.id : undefined;

  const buildRequest = useCallback(
    (id: string) =>
      buildPersonalizedPreviewRequest(draftRef.current, sampleRef.current, {
        id,
        locale: input.locale,
      }),
    [input.locale],
  );

  /**
   * The submission this browser has already made for the piece on screen. It is
   * a ref, not state, because it is read inside the start effect: it must be
   * current without re-running that effect and buying another run.
   */
  const written = useRef<StoredSubmission | undefined>(undefined);

  const remember = useCallback((next: Submission, requestId?: string) => {
    const stored: StoredSubmission = {
      version: 1,
      signature: next.signature,
      requestKey: next.requestKey,
      startedAt: next.startedAt,
      ...(next.designId ? { designId: next.designId } : {}),
      ...(next.revisionId ? { revisionId: next.revisionId } : {}),
      ...(next.runId ? { runId: next.runId } : {}),
      ...(requestId ? { previewRequestId: requestId } : {}),
    };
    written.current = stored;
    saveSubmission(stored);
  }, []);

  // Reload: the anonymous session is the same principal, so the run that belongs
  // to the piece on screen is read back out of durable state.
  useEffect(() => {
    if (!enabled || !input.loaded || submission) return;
    const stored = loadSubmission();
    const resumed = resumeSubmission(stored, currentSignature);
    if (!stored || !resumed) return;
    written.current = stored;
    // A restored checkbox is not a fresh approval. Even an unfinished start
    // stays guarded on reload; unticking below permits an explicit retry with
    // the same durable request key.
    startedFor.current = stored.signature;
    setSubmission({
      signature: stored.signature,
      requestKey: stored.requestKey,
      designId: stored.designId,
      revisionId: stored.revisionId,
      runId: stored.runId,
      startedAt: stored.startedAt,
    });
    if (stored.previewRequestId) {
      setCapturedRequestId(stored.previewRequestId);
      setPreviousRequestId(stored.previewRequestId);
      setCaptureStatus("captured");
      // `resumeSubmission` already refused a stored signature that is not the
      // piece on screen, so this capture is for the current specification.
      setCapturedFor(stored.signature);
    }
    // Without a run id there is nothing to watch: the previous start was
    // interrupted or refused. Keep the capture path open after reload while
    // preserving its request key so re-confirming can safely replay approval.
    setPhase(stored.runId ? resumed.phase : "degraded");
    if (!stored.runId) setReason("unavailable");
  }, [enabled, input.loaded, currentSignature, submission]);

  // The specification changed under the run: nothing from the old run may be
  // shown for the new piece.
  useEffect(() => {
    if (submission && submission.signature !== currentSignature) {
      setSubmission(undefined);
      setRun(undefined);
      setReason(undefined);
      setPhase("idle");
      setCeilingReached(false);
      setWatchWindowClosed(false);
      startedFor.current = undefined;
      written.current = undefined;
      clearSubmission();
    }
  }, [currentSignature, submission]);

  // The specification changed under the capture. The shop is holding a request
  // for the old piece, so the new one needs its own: the panel stops saying the
  // team has this design, and adding to the bag captures again. The request id
  // itself stays visible as `previousRequestId` so the two can be reconciled.
  useEffect(() => {
    if (capturedFor && capturedFor !== currentSignature) {
      setCaptureStatus("idle");
      setCaptureError(undefined);
      setCapturedRequestId(undefined);
      setCapturedFor(undefined);
    }
  }, [capturedFor, currentSignature]);

  // A refused start can be retried by a new checkbox action, but never merely
  // because hydration restored its old checked value. Existing runs remain
  // guarded when unticked: they are watched, not bought a second time.
  useEffect(() => {
    if (
      !input.confirmed &&
      submission?.signature === currentSignature &&
      !submission.runId &&
      phase === "degraded"
    ) startedFor.current = undefined;
  }, [input.confirmed, currentSignature, submission, phase]);

  // Approval is what starts a run, and the database refuses to approve a
  // revision the customer has not confirmed, so the confirmation checkbox is the
  // start signal. Only the false -> true transition fires.
  useEffect(() => {
    if (
      !shouldStartRun({
        enabled,
        loaded: input.loaded,
        stage: input.stage,
        confirmed: input.confirmed,
        signature: currentSignature,
        startedFor: startedFor.current,
      })
    )
      return;
    startedFor.current = currentSignature;
    // A retry after a failed start replays the same approval instead of buying
    // a second run.
    const requestKey = startAttemptKey(
      written.current,
      currentSignature,
      crypto.randomUUID(),
    );
    const startedAt = Date.now();
    // `buildPersonalizedPreviewRequest` throws on a specification it refuses to
    // hand on - an unspelled name, a reference that is not a local catalogue
    // asset. Outside a guard that throw happened during render and took the
    // whole page down with it. It is caught here and degrades to the honest
    // capture path; the atelier also disables the confirmation itself while the
    // draft is not makeable, so this is the second line, not the first.
    let preview: ReturnType<typeof buildRequest>;
    try {
      preview = buildRequest(crypto.randomUUID());
    } catch {
      setSubmission({ signature: currentSignature, requestKey, startedAt });
      remember(
        { signature: currentSignature, requestKey, startedAt },
        capturedIdFor(currentSignature),
      );
      setReason("invalid");
      setPhase("degraded");
      startedFor.current = undefined;
      return;
    }
    const refusal = preflightRefusal(preview.specification);
    if (refusal) {
      // Proved unmakeable before a single cent is reserved: this goes straight
      // to the shop instead of a blocked run.
      setSubmission({ signature: currentSignature, requestKey, startedAt });
      remember(
        { signature: currentSignature, requestKey, startedAt },
        capturedIdFor(currentSignature),
      );
      setReason("unsupported");
      setPhase("degraded");
      return;
    }
    setPhase("starting");
    setSubmission({ signature: currentSignature, requestKey, startedAt });
    // Write-ahead: persisted BEFORE the first request, so a reload between the
    // approval and its answer still finds this submission and refuses to start
    // a second run for the same piece.
    remember(
      { signature: currentSignature, requestKey, startedAt },
      capturedIdFor(currentSignature),
    );
    let cancelled = false;
    void startPersonalizedRun({
      request: preview,
      spellingConfirmed: true,
      requestKey,
      deps,
    })
      .then((handles) => {
        if (cancelled) return;
        const next: Submission = {
          signature: currentSignature,
          requestKey,
          startedAt,
          designId: handles.designId,
          revisionId: handles.revisionId,
          runId: handles.runId,
        };
        setSubmission(next);
        remember(next, capturedIdFor(next.signature));
        setPhase("watching");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const failure =
          error instanceof PipelineError ? error.reason : "unavailable";
        setReason(failure);
        setPhase("degraded");
        remember(
          { signature: currentSignature, requestKey, startedAt },
          capturedIdFor(currentSignature),
        );
        // A failed start must be retryable: re-confirming reuses this same
        // request key, so the retry replays one approval rather than buying a
        // second run.
        startedFor.current = undefined;
      });
    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    input.loaded,
    input.confirmed,
    input.stage,
    currentSignature,
    buildRequest,
    deps,
    remember,
  ]);

  const runId = submission?.runId;
  const designId = submission?.designId;

  // A shopper standing in a shop should not be watched by a spinner for ever.
  const startedAt = submission?.startedAt;
  useEffect(() => {
    if (!startedAt || ceilingReached) return;
    const remaining = startedAt + PERSONALIZED_RUN_CEILING_MS - Date.now();
    if (remaining <= 0) {
      setCeilingReached(true);
      return;
    }
    const timer = setTimeout(() => setCeilingReached(true), remaining);
    return () => clearTimeout(timer);
  }, [startedAt, ceilingReached]);

  const personalized = !!run?.ready.length;
  const heroReady = !!heroSlot(run);
  const stalled =
    ceilingReached && !personalized && !!startedAt && pastCeiling(startedAt, Date.now());

  // This page's own reading window, started at mount and not at the submission:
  // a reload always reads the run once more, however long ago it was bought.
  //
  // `watchRun` asks for the window on every poll through this ref rather than
  // through its options, because the watcher must not be torn down and rebuilt
  // when the window closes: that would cost the Realtime subscription and a
  // re-read for nothing.
  const watchWindowClosedRef = useRef(watchWindowClosed);
  watchWindowClosedRef.current = watchWindowClosed;
  useEffect(() => {
    if (!runId || watchWindowClosed) return;
    const timer = setTimeout(() => {
      // Written here as well as during render: `watchRun` reads this ref on
      // every poll, and a three-second poll would otherwise ask it up to once
      // before React has rendered the state change.
      watchWindowClosedRef.current = true;
      setWatchWindowClosed(true);
    }, PERSONALIZED_RUN_WATCH_MS);
    return () => clearTimeout(timer);
  }, [runId, watchWindowClosed]);

  // Durable state, polled and accelerated by Realtime. Inside this page's
  // reading window every run is read; past it, only a run with one of the
  // customer's own photographs on screen, at the slow signed-URL cadence the
  // watcher widens to, because that photograph's signature dies in five minutes
  // and only this watcher renews it. A run with nothing to show stops there.
  // Passing the shopper's six-minute ceiling is not a reason to stop: the
  // capture path opens, and the run is still shown if it finishes afterwards.
  //
  // What is on screen, not what the run's status was: an operator retrying a
  // blocked view un-settles a finished run, and a watcher keyed on the live
  // `settled` flag stopped dead there - photographs expiring, spinner never
  // resolving. Photographs do not un-arrive, so this answer does not flap.
  const watching = shouldWatchRun({
    enabled,
    runId,
    hasPhotograph: personalized && run?.runId === runId,
    watchWindowClosed,
  });
  useEffect(() => {
    if (!watching || !runId) return;
    return watchRun({
      deps,
      handles: { runId, designId },
      fastCadenceAllowed: () => !watchWindowClosedRef.current,
      onUpdate: (next) => {
        if (!next) return;
        setRun(next);
        if (next.outcome === "unavailable") {
          setReason((old) => old ?? "unavailable");
          setPhase("degraded");
        }
        // The piece arrived after all - late, or after a reload that resumed
        // into the capture path. A run the server can still deliver must never
        // stay pinned behind an earlier degrade.
        if (next.outcome === "personalized") {
          setReason(undefined);
          setPhase("watching");
        }
      },
      onError: () => {
        // A transient read failure is not a customer-visible failure; the next
        // poll answers. Nothing is claimed here.
      },
    });
  }, [watching, runId, designId, deps]);
  /**
   * Every design a shopper keeps is a request the shop can answer (Omran, 22
   * September 2026), so the way to reach them is asked for on the whole review
   * stage - not only when the personalized run degraded.
   *
   * It does still need a backend to write the request to: in the mock data mode
   * there is no Supabase project behind the route, so every capture would fail
   * and the shopper could not keep a piece at all. There the atelier stays the
   * purely local illustrated experience and the bag is filled without a request.
   */
  const capturing = enabled && input.stage === "review";

  const imageFor = useCallback(
    (view: View) => {
      const slot = run && slotFor(run, view);
      return slot?.presentable ? slot.imageUrl : undefined;
    },
    [run],
  );
  const statusFor = useCallback(
    (view: View) => {
      const slot = run && slotFor(run, view);
      return slot ? customerViewStatus(slot) : undefined;
    },
    [run],
  );

  const submitContact = useCallback(async () => {
    const value = contact.value.trim();
    // The server's own rules, run here first: a shopper who mistypes a number
    // is told the format on the spot instead of waiting for a 422 whose
    // guidance the browser then threw away (ux review minor 7).
    const problem = contactProblem(contact.channel, value);
    if (problem) {
      setCaptureError(problem);
      setCaptureStatus("error");
      return undefined;
    }
    setCaptureStatus("sending");
    setCaptureError(undefined);
    // The request key is what makes a capture idempotent: the route replays the
    // row that already carries it instead of writing a second one. With the
    // personalized preview off there is no submission in state to read it from,
    // so the key this browser already used for the same design is taken from
    // durable state; a different design gets a fresh key, as it must.
    const durable = written.current ?? loadSubmission();
    const previous =
      submission ??
      (durable && durable.signature === currentSignature ? durable : undefined);
    const key = previous?.requestKey ?? crypto.randomUUID();
    const startedAtValue = previous?.startedAt ?? Date.now();
    try {
      const preview = buildRequest(crypto.randomUUID());
      const record = await capturePreviewRequest({
        deps,
        body: previewRequestBody({
          request: preview,
          contact: {
            channel: contact.channel,
            value,
            ...(contact.name.trim() ? { name: contact.name.trim() } : {}),
          },
          requestKey: key,
          manifestId: CATALOGUE_MANIFEST_ID,
          sampleShown: !!sampleRef.current,
          ...(submission?.designId ? { designId: submission.designId } : {}),
          ...(submission?.revisionId
            ? { designRevisionId: submission.revisionId }
            : {}),
          ...(submission?.runId ? { generationRunId: submission.runId } : {}),
        }),
      });
      setCapturedRequestId(record.id);
      setPreviousRequestId(record.id);
      setCaptureStatus("captured");
      setCapturedFor(currentSignature);
      remember(
        {
          signature: currentSignature,
          requestKey: key,
          startedAt: startedAtValue,
          designId: submission?.designId,
          revisionId: submission?.revisionId,
          runId: submission?.runId,
        },
        record.id,
      );
      return record.id;
    } catch (error) {
      setCaptureStatus("error");
      if (!(error instanceof PipelineError) || error.reason !== "invalid") {
        setCaptureError("failed");
        return undefined;
      }
      // A 422 the client did not predict. When the server's sentence is one of
      // the contact rules it is shown as that rule, in the shopper's own
      // language; otherwise the form says only what it can honestly say.
      setCaptureError(contactProblemFromMessage(error.message) ?? "invalid");
      return undefined;
    }
  }, [contact, deps, submission, buildRequest, remember, currentSignature]);

  /**
   * Editing the contact clears the refusal it earned. A format sentence left
   * standing under a corrected number is a stale accusation.
   */
  const updateContact = useCallback((next: ContactDraft) => {
    setContact(next);
    setCaptureStatus((old) => (old === "error" ? "idle" : old));
    setCaptureError(undefined);
  }, []);

  const readyAssets = useMemo(
    () =>
      (run?.slots ?? [])
        .filter((slot) => slot.presentable && slot.assetId)
        .map((slot) => ({ view: slot.view, assetId: slot.assetId! })),
    [run],
  );

  return {
    enabled,
    phase,
    attempted: submission?.signature === currentSignature ||
      (enabled && input.loaded && input.stage === "review" && input.confirmed),
    unavailable: phase === "degraded" || stalled || watchWindowClosed || !!run?.settled,
    run,
    reason,
    imageFor,
    statusFor,
    personalized,
    heroReady,
    capturing,
    contact,
    setContact: updateContact,
    submitContact,
    captureStatus,
    captureError,
    capturedRequestId,
    previousRequestId,
    runId: submission?.runId,
    designId: submission?.designId,
    readyAssets,
  };
}
