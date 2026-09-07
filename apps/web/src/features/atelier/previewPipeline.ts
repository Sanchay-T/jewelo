"use client";

/**
 * The personalized-preview transport.
 *
 * One submission is: an anonymous Supabase session that survives a reload, a
 * draft, an approved immutable revision, the generation run that approval
 * starts, and then durable state read back from `GET /api/state`. The browser
 * never selects a provider, a model, a prompt or a paid parameter, and never
 * polls a provider: it reads Supabase truth through the app's own routes.
 *
 * Everything here is injectable so the mapping and the retry rules can be tested
 * without a network, and so the mock path stays completely offline.
 */
import { createSupabaseDataClient, type SupabaseDataClient } from "@jewelo/data";

import {
  approvedSpecification,
  backendDraftBody,
  type previewRequestBody,
  type PersonalizedPreviewRequest,
} from "./previewHandoff";
import {
  classifyStartFailure,
  dispatchRejected,
  readPersonalizedRun,
  type DegradeReason,
  type PersonalizedRun,
  type PersonalizedViewSlot,
  type StatePayload,
} from "./personalizedRun";

export class PipelineError extends Error {
  constructor(
    readonly reason: DegradeReason,
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = "PipelineError";
  }
}

export interface PreviewSession {
  /** A fresh bearer for the anonymous principal, created on first use. */
  accessToken(): Promise<string>;
  /**
   * Realtime notification that this run changed. Optional: the caller always
   * polls as well, so a transport without Realtime is only slower, never wrong.
   */
  watch?(runId: string, onChange: () => void): () => void;
}

export interface PipelineDeps {
  session: PreviewSession;
  fetchImpl?: typeof fetch;
}

/**
 * The anonymous session lives in the same browser storage key the rest of the
 * app already uses (`jewelo:anonymous-session:v1`), with refresh handled by the
 * Supabase client, so a reload keeps the same principal and therefore the same
 * runs, assets and captured requests.
 */
export function createBrowserPreviewSession(): PreviewSession {
  let client: SupabaseDataClient | undefined;
  const supabase = () => {
    if (client) return client;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key)
      throw new PipelineError(
        "unavailable",
        "Personalized previews are not configured in this environment.",
      );
    client = createSupabaseDataClient(url, key);
    return client;
  };
  return {
    async accessToken() {
      const auth = supabase().auth;
      const existing = await auth.getSession();
      const session =
        existing.data.session ??
        (
          await auth.signInAnonymously({
            options: { data: { caleums_principal: "anonymous" } },
          })
        ).data.session;
      if (!session?.access_token)
        throw new PipelineError(
          "unauthenticated",
          "This browser could not start a private session.",
        );
      return session.access_token;
    },
    watch(runId, onChange) {
      try {
        const channel = supabase()
          .channel(`caleums:run:${runId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "generation_tasks",
              filter: `run_id=eq.${runId}`,
            },
            onChange,
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "assets",
              filter: `run_id=eq.${runId}`,
            },
            onChange,
          )
          .subscribe();
        return () => {
          void supabase().removeChannel(channel);
        };
      } catch {
        // Realtime is an accelerator. Polling remains the contract.
        return () => {};
      }
    },
  };
}

async function request<T>(
  deps: PipelineDeps,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const call = deps.fetchImpl ?? fetch;
  const token = await deps.session.accessToken();
  let response: Response;
  try {
    response = await call(path, {
      ...init,
      credentials: "same-origin",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
        ...init.headers,
      },
    });
  } catch (error) {
    throw new PipelineError(
      "unavailable",
      error instanceof Error ? error.message : "Network request failed",
    );
  }
  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    code?: string;
  };
  if (!response.ok) {
    const failure = { code: body.code, message: body.error };
    throw new PipelineError(
      classifyStartFailure(failure),
      body.error ?? `Request failed: ${response.status}`,
      body.code,
    );
  }
  return body as T;
}

export interface RunHandles {
  designId: string;
  revisionId?: string;
  runId: string;
}

/**
 * Approval is what starts a run: `approve_and_start_studio` creates the revision,
 * the run, the four still tasks and the outbox rows in one transaction. The
 * separate run endpoint exists for a design that already has a settled run, so
 * one piece never accumulates duplicate designs.
 */
export async function startPersonalizedRun(input: {
  request: PersonalizedPreviewRequest;
  spellingConfirmed: boolean;
  requestKey: string;
  deps: PipelineDeps;
  existingDesignId?: string;
}): Promise<RunHandles> {
  const { request: preview, requestKey, deps } = input;
  if (input.existingDesignId) {
    const started = await request<Record<string, unknown>>(
      deps,
      `/api/designs/${encodeURIComponent(input.existingDesignId)}/run`,
      {
        method: "POST",
        body: JSON.stringify({ idempotencyKey: requestKey }),
      },
    );
    if (dispatchRejected(started))
      throw new PipelineError(
        "dispatch",
        "The generation queue did not accept this run.",
      );
    return {
      designId: input.existingDesignId,
      runId: String(started.run_id ?? ""),
    };
  }
  const draft = await request<{ id: string }>(deps, "/api/designs/drafts", {
    method: "POST",
    body: JSON.stringify(backendDraftBody(preview)),
  });
  const approved = await request<Record<string, unknown>>(
    deps,
    "/api/revisions/approve",
    {
      method: "POST",
      body: JSON.stringify({
        draftId: draft.id,
        specification: approvedSpecification(preview, input.spellingConfirmed),
        // The same key on a retry replays the same approval and the same run
        // instead of buying a second one.
        idempotencyKey: requestKey,
      }),
    },
  );
  if (dispatchRejected(approved))
    throw new PipelineError(
      "dispatch",
      "The generation queue did not accept this run.",
    );
  const runId = String(approved.run_id ?? "");
  if (!runId)
    throw new PipelineError("unavailable", "No run was created for this piece.");
  return {
    designId: String(approved.approved_design_id ?? ""),
    revisionId: String(approved.revision_id ?? "") || undefined,
    runId,
  };
}

export async function loadRun(
  deps: PipelineDeps,
  handles: { designId?: string; runId: string },
): Promise<PersonalizedRun | undefined> {
  // Always scope the read: unscoped, every poll re-signs every asset this
  // principal has ever owned.
  const query = handles.designId
    ? `?designId=${encodeURIComponent(handles.designId)}`
    : "";
  const payload = await request<StatePayload>(deps, `/api/state${query}`);
  return readPersonalizedRun(payload, handles.runId);
}

/**
 * `/api/state` mints a fresh five-minute signed URL for every asset on every
 * call, so handing the browser a new `src` on each poll restarts the download
 * and, on iOS Safari, images that are not `priority` never finish decoding.
 * Keep one URL per asset and rotate it a minute before the signature expires.
 */
const SIGNED_URL_TTL_MS = 240_000;

export function createSignedUrlCache() {
  const cache = new Map<string, { url: string; issuedAt: number }>();
  return function stabilise(
    run: PersonalizedRun | undefined,
    now = Date.now(),
  ): PersonalizedRun | undefined {
    if (!run) return run;
    const slots = run.slots.map((slot): PersonalizedViewSlot => {
      if (!slot.assetId || !slot.imageUrl) return slot;
      const held = cache.get(slot.assetId);
      if (held && now - held.issuedAt < SIGNED_URL_TTL_MS)
        return { ...slot, imageUrl: held.url };
      cache.set(slot.assetId, { url: slot.imageUrl, issuedAt: now });
      return slot;
    });
    return { ...run, slots };
  };
}

export interface WatchOptions {
  deps: PipelineDeps;
  handles: { designId?: string; runId: string };
  onUpdate: (run: PersonalizedRun | undefined) => void;
  onError?: (error: unknown) => void;
  intervalMs?: number;
}

/**
 * Poll `/api/state`, accelerated by Realtime when it is available, and re-read
 * immediately when the tab comes back: a backgrounded phone suspends timers, and
 * signed media URLs expire in five minutes.
 */
export function watchRun(options: WatchOptions): () => void {
  const interval = options.intervalMs ?? 3000;
  const stabilise = createSignedUrlCache();
  let stopped = false;
  let inFlight = false;
  const refresh = () => {
    if (stopped || inFlight) return;
    inFlight = true;
    loadRun(options.deps, options.handles)
      .then((run) => {
        if (stopped) return;
        const stable = stabilise(run);
        options.onUpdate(stable);
        // A settled run cannot change again without a new run, so polling it
        // would only burn a signed URL every three seconds.
        if (stable?.settled) stop();
      })
      .catch((error) => {
        if (!stopped) options.onError?.(error);
      })
      .finally(() => {
        inFlight = false;
      });
  };
  const onVisible = () => {
    if (document.visibilityState === "visible") refresh();
  };
  const hasDocument = typeof document !== "undefined";
  function stop() {
    if (stopped) return;
    stopped = true;
    clearInterval(timer);
    if (hasDocument) document.removeEventListener("visibilitychange", onVisible);
    unwatch?.();
  }
  const timer = setInterval(refresh, interval);
  if (hasDocument) document.addEventListener("visibilitychange", onVisible);
  const unwatch = options.deps.session.watch?.(options.handles.runId, refresh);
  refresh();
  return stop;
}

export interface CapturedPreviewRequest {
  id: string;
  status: string;
  createdAt?: string;
}

/** The honest-degrade capture. Replaying the same key returns the same row. */
export async function capturePreviewRequest(input: {
  deps: PipelineDeps;
  body: ReturnType<typeof previewRequestBody>;
}): Promise<CapturedPreviewRequest> {
  const record = await request<{
    id: string;
    status: string;
    createdAt?: string;
  }>(input.deps, "/api/preview-requests", {
    method: "POST",
    body: JSON.stringify(input.body),
  });
  return record;
}

export async function loadCapturedRequest(
  deps: PipelineDeps,
  id: string,
): Promise<CapturedPreviewRequest | undefined> {
  try {
    return await request<CapturedPreviewRequest>(
      deps,
      `/api/preview-requests/${encodeURIComponent(id)}`,
    );
  } catch {
    // A request this principal cannot see is simply not shown again.
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Local continuity: which submission belongs to the piece on screen
// ---------------------------------------------------------------------------

export const SUBMISSION_STORAGE_KEY = "caleums.atelier.preview.v1";

export interface StoredSubmission {
  version: 1;
  /** Identifies the exact specification this submission was made for. */
  signature: string;
  requestKey: string;
  designId?: string;
  revisionId?: string;
  runId?: string;
  previewRequestId?: string;
  startedAt: number;
}

function isUuidish(value: unknown) {
  return typeof value === "string" && value.length > 0 && value.length <= 200;
}

export function parseSubmission(raw: string | null): StoredSubmission | undefined {
  if (!raw) return undefined;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (
      !value ||
      value.version !== 1 ||
      typeof value.signature !== "string" ||
      !isUuidish(value.requestKey) ||
      typeof value.startedAt !== "number"
    )
      return undefined;
    for (const key of [
      "designId",
      "revisionId",
      "runId",
      "previewRequestId",
    ] as const)
      if (value[key] !== undefined && !isUuidish(value[key])) return undefined;
    return value as unknown as StoredSubmission;
  } catch {
    return undefined;
  }
}

export function loadSubmission(
  storage: Pick<Storage, "getItem"> | undefined = globalThis.localStorage,
) {
  try {
    return parseSubmission(storage?.getItem(SUBMISSION_STORAGE_KEY) ?? null);
  } catch {
    return undefined;
  }
}

export function saveSubmission(
  submission: StoredSubmission,
  storage: Pick<Storage, "setItem"> | undefined = globalThis.localStorage,
) {
  try {
    storage?.setItem(SUBMISSION_STORAGE_KEY, JSON.stringify(submission));
  } catch {
    // A shopper with storage disabled keeps the in-memory run for this tab.
  }
}

export function clearSubmission(
  storage: Pick<Storage, "removeItem"> | undefined = globalThis.localStorage,
) {
  try {
    storage?.removeItem(SUBMISSION_STORAGE_KEY);
  } catch {
    // ignored: nothing durable depends on the clear succeeding
  }
}
