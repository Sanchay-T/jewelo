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

import type { Sample } from "./catalogue";
import { signature, type Draft, type View } from "./model";
import {
  customerViewStatus,
  heroSlot,
  pastCeiling,
  PERSONALIZED_RUN_CEILING_MS,
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
  submitContact(): Promise<void>;
  captureStatus: "idle" | "sending" | "captured" | "error";
  captureError?: string;
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
  const [contact, setContact] = useState<ContactDraft>({
    channel: "whatsapp",
    value: "",
    name: "",
  });
  const [captureStatus, setCaptureStatus] = useState<
    "idle" | "sending" | "captured" | "error"
  >("idle");
  const [captureError, setCaptureError] = useState<string | undefined>();
  const [capturedRequestId, setCapturedRequestId] = useState<
    string | undefined
  >();
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
    // Marked as started whether or not a run id survived, so re-confirming
    // after a mid-flight reload cannot buy a second run.
    startedFor.current = resumed.startedFor;
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
    }
    if (resumed.reason) setReason(resumed.reason);
    setPhase(resumed.phase);
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
      setCaptureStatus("idle");
      setCapturedRequestId(undefined);
      startedFor.current = undefined;
      written.current = undefined;
      clearSubmission();
    }
  }, [currentSignature, submission]);

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
      remember({ signature: currentSignature, requestKey, startedAt });
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
      remember({ signature: currentSignature, requestKey, startedAt });
      setReason("unsupported");
      setPhase("degraded");
      return;
    }
    setPhase("starting");
    setSubmission({ signature: currentSignature, requestKey, startedAt });
    // Write-ahead: persisted BEFORE the first request, so a reload between the
    // approval and its answer still finds this submission and refuses to start
    // a second run for the same piece.
    remember({ signature: currentSignature, requestKey, startedAt });
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
        remember(next);
        setPhase("watching");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const failure =
          error instanceof PipelineError ? error.reason : "unavailable";
        setReason(failure);
        setPhase("degraded");
        remember({ signature: currentSignature, requestKey, startedAt });
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

  // Durable state, polled and accelerated by Realtime. The watcher stops itself
  // on a settled run; this effect also tears it down once the honest capture
  // path has replaced it.
  const watching = shouldWatchRun({ enabled, runId, stalled });
  useEffect(() => {
    if (!watching || !runId) return;
    return watchRun({
      deps,
      handles: { runId, designId },
      onUpdate: (next) => {
        if (!next) return;
        setRun(next);
        if (next.outcome === "unavailable") {
          setReason((old) => old ?? "unavailable");
          setPhase("degraded");
        }
      },
      onError: () => {
        // A transient read failure is not a customer-visible failure; the next
        // poll answers. Nothing is claimed here.
      },
    });
  }, [watching, runId, designId, deps]);
  const capturing =
    enabled &&
    input.stage === "review" &&
    (phase === "degraded" || stalled || (personalized && input.confirmed));

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
    if (!value) {
      setCaptureError("required");
      setCaptureStatus("error");
      return;
    }
    setCaptureStatus("sending");
    setCaptureError(undefined);
    const key = submission?.requestKey ?? crypto.randomUUID();
    const startedAtValue = submission?.startedAt ?? Date.now();
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
    } catch (error) {
      setCaptureStatus("error");
      setCaptureError(
        error instanceof PipelineError && error.reason === "invalid"
          ? "invalid"
          : "failed",
      );
    }
  }, [contact, deps, submission, buildRequest, remember, currentSignature]);

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
    run,
    reason,
    imageFor,
    statusFor,
    personalized,
    heroReady,
    capturing,
    contact,
    setContact,
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
