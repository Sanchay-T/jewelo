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

/**
 * A transport that answers the personalized pipeline from a fixture, so the
 * terminal-failure screens can be seen without a Supabase project and without
 * spending anything.
 *
 * There is no other way to reach them locally: `PERSONALIZED_PREVIEW_ENABLED` is
 * false in the mock data mode, and the mock provider mode on staging produces
 * placeholder assets, which the review stage correctly refuses to present but
 * which is not the same state as a run that ended. The caller is responsible for
 * gating this on development and on the mock data mode; nothing here is reachable
 * from a shopper's journey.
 *
 * `run` is the run row's status and `studio` the studio task's, which together
 * decide every customer-visible state: `operator_review` + `failed` is a run
 * that ended with no photograph.
 */
export function fixturePipelineDeps(fixture: {
  run: string;
  studio: string;
}): PipelineDeps {
  const designId = "fixture-design";
  const runId = "fixture-run";
  const task = (view: string, status: string) => ({
    id: `fixture-task-${view}`,
    run_id: runId,
    presentation_view: view,
    status,
    attempt: 1,
  });
  const state = {
    generation_runs: [{ id: runId, design_id: designId, status: fixture.run }],
    generation_tasks: [
      task("studio", fixture.studio),
      task("on_skin", "queued"),
      task("close_up", "queued"),
      task("dark", "queued"),
    ],
    assets: [],
  };
  const fetchImpl: typeof fetch = async (target) => {
    const url = typeof target === "string" ? target : String(target);
    const body = url.startsWith("/api/state")
      ? state
      : url.includes("/drafts")
        ? { id: designId }
        : url.includes("/approve")
          ? {
              run_id: runId,
              approved_design_id: designId,
              revision_id: "fixture-revision",
              dispatchState: "published",
            }
          : { id: "fixture-request", status: "new" };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  return { session: { accessToken: async () => "fixture" }, fetchImpl };
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
  rememberSignedUrlRefreshWindow(payload);
  return readPersonalizedRun(payload, handles.runId);
}

/**
 * The last-resort hold, used only by a payload that publishes neither number.
 *
 * The only way to see one is a rolling deploy where an older `/api/state` is
 * still answering: every deployed version publishes
 * `signedUrlRefreshFloorMs`, and this is the value it publishes, kept here as
 * the assumption about a server too old to say. It is deliberately far below
 * any signed lifetime the config allows (the minimum is 60 s), so holding a
 * URL for it can never outlive the signature.
 */
const SIGNED_URL_REFRESH_FLOOR_MS = 30_000;

/**
 * How long a signed asset URL may be held before it is replaced, as the server
 * that signed it says.
 *
 * Fix-2 review minor 11: this used to be a literal 240 000 here while the
 * server signed for `pipelineLimits.signedUrlExpirySeconds`, so lowering the
 * configured expiry would have left the browser serving URLs that had already
 * expired. `@jewelo/config` cannot be imported from a client module - it
 * re-exports `load-env`, which imports `node:fs` - so the number travels the
 * other way the boundary allows: `/api/state` publishes it as
 * `signedUrlRefreshAfterMs`, derived there from the same validated expiry and
 * refresh margin the signing call uses, and this module only reads it.
 *
 * Fix-3 review minor 8: a payload without the number used to leave the cache
 * off entirely, which reinstates the iOS Safari decode defect - images that are
 * not `priority` never finish decoding when their `src` changes on every poll -
 * for the whole of a rolling deploy. It falls back instead: to
 * `signedUrlRefreshFloorMs`, the minimum the server publishes alongside, and to
 * `SIGNED_URL_REFRESH_FLOOR_MS` when the payload carries neither. Degrading
 * shortens the hold; it never turns it off.
 */
export function readSignedUrlRefreshWindow(payload: unknown): number {
  const published = payload as {
    signedUrlRefreshAfterMs?: unknown;
    signedUrlRefreshFloorMs?: unknown;
  };
  const positive = (value: unknown): number | undefined =>
    typeof value === "number" && Number.isFinite(value) && value > 0
      ? value
      : undefined;
  return (
    positive(published?.signedUrlRefreshAfterMs) ??
    positive(published?.signedUrlRefreshFloorMs) ??
    SIGNED_URL_REFRESH_FLOOR_MS
  );
}

let signedUrlRefreshAfterMs = SIGNED_URL_REFRESH_FLOOR_MS;

function rememberSignedUrlRefreshWindow(payload: StatePayload): void {
  signedUrlRefreshAfterMs = readSignedUrlRefreshWindow(payload);
}

/**
 * `/api/state` mints a fresh signed URL for every asset on every call, so
 * handing the browser a new `src` on each poll restarts the download and, on
 * iOS Safari, images that are not `priority` never finish decoding. Keep one
 * URL per asset and rotate it before the signature expires, on the window the
 * server publishes (see `signedUrlRefreshAfterMs` above).
 */
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
      if (held && now - held.issuedAt < signedUrlRefreshAfterMs)
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
  /**
   * Whether the live three-second poll may still be armed. Asked on every
   * refresh, not once at mount, because the answer changes under a watcher that
   * is deliberately not torn down: the page's reading window
   * (`PERSONALIZED_RUN_WATCH_MS`) closes while the run is still being read to
   * keep its signatures alive. Absent means always allowed.
   */
  fastCadenceAllowed?: () => boolean;
}

/**
 * Poll `/api/state`, accelerated by Realtime when it is available, and re-read
 * immediately when the tab comes back: a backgrounded phone suspends timers, and
 * signed media URLs expire in five minutes.
 *
 * A settled run cannot change again without a new run, so the three-second poll
 * would only re-read the same rows - but the page must keep reading anyway, at
 * the slow cadence, or its signed URLs expire under it. This used to stop
 * outright, and the studio photograph, which settles first, expired first: seen
 * live 41 s past expiry, returning 400, with the Studio slide and thumbnail
 * broken while the three later views still loaded. So on settle the interval
 * widens to `signedUrlRefreshAfterMs`, the hold window the server publishes and
 * `createSignedUrlCache` rotates on, which swaps each URL one refresh margin
 * before its signature expires and costs one read per window instead of eighty.
 */
export function watchRun(options: WatchOptions): () => void {
  const interval = options.intervalMs ?? 3000;
  const stabilise = createSignedUrlCache();
  let stopped = false;
  let inFlight = false;
  let settledCadence = false;
  /** The hold window the settled interval is currently armed on. */
  let settledWindowMs = 0;
  const refresh = () => {
    if (stopped || inFlight) return;
    inFlight = true;
    loadRun(options.deps, options.handles)
      .then((run) => {
        if (stopped) return;
        const stable = stabilise(run);
        options.onUpdate(stable);
        // An undefined read is the run row missing from a 200 answer. The UI
        // keeps the settled run it already has (`onUpdate` discards undefined),
        // so the cadence must not change either: narrowing here read every
        // three seconds for ever.
        if (!stable) return;
        // The cadence is decided here, on every read, from both halves of the
        // question: has this run stopped moving, and is anyone still watching
        // it. Fifth adversarial pass, M1: deciding it only inside
        // `resumeFastCadence` made the window a one-way veto - a run that
        // un-settled INSIDE the window narrowed to 3 s and nothing ever widened
        // it again, so a tab left open read `/api/state` 1200 times an hour for
        // ever. Read on every refresh, the window closing widens the cadence on
        // the next read whatever the run is doing.
        if (stable.settled || options.fastCadenceAllowed?.() === false)
          keepUrlsFresh();
        else resumeFastCadence();
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
  /**
   * Widen the poll to the signed-URL hold window. The visibilitychange listener
   * stays on so a phone tab that was suspended past the window re-reads the
   * moment it is looked at again.
   *
   * The timer is re-armed when the published window changes - a rolling deploy
   * can lower `signedUrlRefreshAfterMs` under a page that is already settled,
   * and `createSignedUrlCache` holds on the current value, so an interval still
   * running on the old, longer one would let a URL expire before it rotated.
   */
  function keepUrlsFresh() {
    if (stopped) return;
    if (settledCadence && settledWindowMs === signedUrlRefreshAfterMs) return;
    settledCadence = true;
    settledWindowMs = signedUrlRefreshAfterMs;
    clearInterval(timer);
    timer = setInterval(refresh, settledWindowMs);
  }
  /**
   * Narrow back to the live poll. `settled` is not one-way: a failed studio
   * strands its dependents, which reads as settled, and then an operator retries
   * that view with `operator_retry_generation_task` and the run is moving again
   * (the stale sweeper cannot do this: `recover_stale_generation_tasks` only
   * touches queued, generating, verifying and retrying rows). Left on the slow
   * cadence the page would have shown that at up to four minutes' delay.
   *
   * Past the page's reading window that trade is off: nobody is standing in
   * front of this tab, and the only reason the watcher is still alive there is
   * to keep re-signing the URLs, which the settled cadence already does. A run
   * that moves after the window - an operator retry, the sweeper re-queuing a
   * task - would otherwise leave a three-second read of Supabase running with
   * no ceiling for as long as the tab stays open. `fastCadenceAllowed` is what
   * refuses that, and it is asked in `refresh` rather than here, so the answer
   * is re-read on every poll and not only when a run happens to un-settle.
   */
  function resumeFastCadence() {
    if (stopped || !settledCadence) return;
    settledCadence = false;
    clearInterval(timer);
    timer = setInterval(refresh, interval);
  }
  /** The unmount path: after this nothing reads, times out or listens. */
  function stop() {
    if (stopped) return;
    stopped = true;
    clearInterval(timer);
    if (hasDocument) document.removeEventListener("visibilitychange", onVisible);
    unwatch?.();
  }
  let timer = setInterval(refresh, interval);
  if (hasDocument) document.addEventListener("visibilitychange", onVisible);
  // Realtime accelerates the poll; it does not escape its ceiling. Sixth
  // adversarial pass, m1: this handed `refresh` straight to the channel, so
  // past the reading window one operator retry - about six row changes across
  // tasks and assets - still produced six immediate reads, which is exactly the
  // traffic the window exists to end. Past the window the 240 s timer is the
  // only thing that reads, and that is all the signatures need.
  const unwatch = options.deps.session.watch?.(options.handles.runId, () => {
    if (options.fastCadenceAllowed?.() === false) return;
    refresh();
  });
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
