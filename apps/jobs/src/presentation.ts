import { createHash } from "node:crypto";
import {
  MockStudioGenerator,
  OpenAIStillAdapter,
  stillPrompt,
  UnknownConstructionError,
  type GeneratedMedia,
  type StudioGenerator,
} from "@jewelo/ai";
import { parseJobsEnv, pipelineLimits } from "@jewelo/config";
import { isDuplicateObject } from "@jewelo/media";
// Fix-3 review M1: `errorClass` used to be private to this file, so the video
// job wrote fal's raw refusal into the same customer-visible columns. It is a
// shared jobs module now and every category write in `apps/jobs` goes through
// it.
import { errorClass } from "./error-class";
// Storyline review 1 M2: what the day's money is allowed to be before a
// real-mode dispatch spends any of it.
import {
  readSpendPolicy,
  spendCeilingRefusal,
  type RuntimeSpendPolicy,
} from "./spend-ceiling";

/**
 * SIMPLE-1 (25 Sep 2026). The whole image path, end to end:
 *
 *   load task, run, revision
 *   -> one prompt string (`stillPrompt`)
 *   -> spend check
 *   -> reserve attempt
 *   -> generate
 *   -> store
 *   -> complete
 *
 * There is no stencil, no identity anchor, no style anchor, no look reference,
 * no inspiration upload, no prompt snapshot, no verifier, no name reader, no
 * piece reader and no regeneration loop. The model renders the name from the
 * approved text and the chosen construction, and the photograph it returns is
 * the photograph the shopper sees.
 */

interface TaskRow {
  id: string;
  run_id: string;
  owner_principal_id: string;
  presentation_view:
    "studio" | "on_skin" | "close_up" | "dark" | "studio_hero" | "billboard";
  status: string;
  attempt: number;
  dispatch_idempotency_key: string;
  prompt_release: string;
  prompt_release_id: string;
  style_anchor_release_id: string;
  pipeline_release: string;
  aspect_ratio: "1:1" | "4:5" | "9:16" | "16:9";
  cancel_requested_at?: string;
  identity_artifact_id?: string | null;
  /** The day `reserve_provider_attempt` books every attempt of this task against. */
  reservation_usage_date?: string | null;
}
interface RunRow {
  id: string;
  design_id: string;
  revision_id: string;
  owner_principal_id: string;
  status: string;
}
interface RevisionRow {
  id: string;
  specification: Record<string, unknown>;
  identity_anchor: {
    approvedText: string;
    language: "en" | "ar";
    typography: string;
    fingerprint: string;
  };
}

interface StoredOutput {
  media: GeneratedMedia;
  stored: { bucket: string; path: string; checksum: string };
}

export type TransitionOutcome = "applied" | "cancelled";

/** The transition RPC raises `task cancelled`; that is a clean stop, not a failure. */
export function isTaskCancelled(error: unknown): boolean {
  return error instanceof Error && /task cancelled/i.test(error.message);
}

/**
 * A stored checkpoint the dispatch cannot use: the bytes will not download, or
 * the attempt row it belongs to is gone. Thrown by `loadStoredOutput` with the
 * cost to book, so the dispatch can close the attempt and stop at operator
 * review instead of leaving it open for the sweeper to re-emit every window.
 */
export class StoredOutputUnavailableError extends Error {
  constructor(
    code: string,
    readonly actualCostCents: number,
  ) {
    super(code);
    this.name = "StoredOutputUnavailableError";
  }
}

export interface PresentationRepository {
  load(taskId: string): Promise<{
    task: TaskRow;
    run: RunRow;
    revision: RevisionRow;
  }>;
  loadStoredOutput(task: TaskRow): Promise<StoredOutput | undefined>;
  reserveAttempt(
    task: TaskRow,
    provider: string,
    model: string,
  ): Promise<{
    attempt: number;
    idempotencyKey: string;
    duplicateComplete: boolean;
  }>;
  transitionTask(
    taskId: string,
    from: readonly string[],
    to: string,
    patch?: Record<string, unknown>,
  ): Promise<TransitionOutcome>;
  storeProviderOutput(input: {
    task: TaskRow;
    run: RunRow;
    revision: RevisionRow;
    attempt: number;
    media: GeneratedMedia;
  }): Promise<{ bucket: string; path: string; checksum: string }>;
  complete(input: {
    task: TaskRow;
    run: RunRow;
    revision: RevisionRow;
    attempt: number;
    media: GeneratedMedia;
    stored: { bucket: string; path: string; checksum: string };
  }): Promise<TransitionOutcome | void>;
  fail(input: {
    task: TaskRow;
    run: RunRow;
    attempt: number;
    error: unknown;
    terminal: boolean;
    actualCostCents: number;
  }): Promise<void>;
  blockPreSpend(input: {
    task: TaskRow;
    run: RunRow;
    error: unknown;
  }): Promise<void>;
  /**
   * Paid attempts this task may make, read from the same row the SQL gates read
   * (`runtime_policy.provider_attempt_budget`). A repository that has one and
   * cannot read it throws rather than guessing; the dispatch then stops before
   * the provider and the stale sweeper brings the task back.
   */
  providerAttemptBudget?(): Promise<number>;
  /**
   * The two `runtime_policy` numbers a real-mode dispatch refuses to spend
   * against when they are looser than the deployment's ceilings
   * (`./spend-ceiling`). One row, one query.
   */
  spendPolicy?(): Promise<RuntimeSpendPolicy>;
}

/**
 * The `reserve_provider_attempt` refusals no later window can change, as the
 * code to stop at operator review with, or `undefined` to re-throw. The RPC
 * raises "attempt already open" before all of them, so when one is returned
 * every attempt is closed and the refused transaction booked nothing.
 */
function reservationRefusal(
  error: unknown,
  bookedOn: string | null | undefined,
): string | undefined {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("provider attempt budget exhausted"))
    return "provider_attempt_budget_exhausted";
  if (message.includes("runtime policy missing"))
    return "runtime_policy_missing";
  if (
    message.includes("daily spend guard exceeded") &&
    bookedOn &&
    bookedOn < new Date().toISOString().slice(0, 10)
  )
    return "spend_guard_exceeded";
  return undefined;
}

export async function executePresentationTask(
  taskId: string,
  repository: PresentationRepository,
  generator: StudioGenerator,
) {
  const { task, run, revision } = await repository.load(taskId);
  if (task.status === "ready") return { status: "deduplicated" as const };
  if (task.status === "cancelled" || task.cancel_requested_at)
    return { status: "cancelled" as const };
  // Loaded before anything else so a later refusal can tell that the attempt it
  // would close is already paid for.
  let checkpoint: StoredOutput | undefined;
  /**
   * The one way out of a pre-spend failure. `mark_task_pre_spend_blocked`
   * refuses a task whose attempt is not 0, so past that the task is failed
   * terminally instead; either way it ends at operator review with a category
   * code and never a letter of the customer's name.
   */
  const blockPreSpendTerminally = async (error: unknown) => {
    // A resume holds an open attempt whose photograph is paid for and stored.
    // Closing it at 0 would discard the photograph and under-count the ledger.
    if (checkpoint) throw error;
    try {
      await repository.blockPreSpend({ task, run, error });
    } catch (blockError) {
      await repository.fail({
        task,
        run,
        attempt: task.attempt,
        error: new Error(
          `${errorClass(error)}|pre_spend_block_failed|${errorClass(blockError)}`,
        ),
        terminal: true,
        actualCostCents: 0,
      });
    }
    return { status: "operator_review" as const, attempt: task.attempt };
  };
  const stopBeforeSpend = async (
    code: string,
    attempt = task.attempt,
    actualCostCents = 0,
  ) => {
    if (attempt === 0) return blockPreSpendTerminally(new Error(code));
    await repository.fail({
      task,
      run,
      attempt,
      error: new Error(code),
      terminal: true,
      actualCostCents,
    });
    return { status: "operator_review" as const, attempt };
  };
  try {
    checkpoint = await repository.loadStoredOutput(task);
  } catch (error) {
    if (error instanceof StoredOutputUnavailableError)
      return stopBeforeSpend(
        error.message,
        task.attempt,
        error.actualCostCents,
      );
    throw error;
  }
  // SIMPLE-1: only the studio view is generated. `runtime_policy.studio_only`
  // is meant to cancel the other three before they are ever dispatched; where
  // it is off, one arrives here and stops cleanly rather than being
  // photographed by a path that has no anchor to place it against.
  if (task.presentation_view !== "studio")
    return blockPreSpendTerminally(new Error("studio_view_only"));
  // The whole prompt: the approved name, the script it is written in, and the
  // piece the shopper approved. A construction the prompt has no wording for
  // stops the task here, before any money is reserved, with
  // `unknown_construction`; it is never photographed as some other piece and
  // never left for the sweeper to re-emit.
  let prompt: string;
  try {
    prompt = stillPrompt({
      name: revision.identity_anchor.approvedText,
      script: revision.identity_anchor.language === "ar" ? "ar" : "en",
      specification: revision.specification,
    });
  } catch (error) {
    if (error instanceof UnknownConstructionError)
      return blockPreSpendTerminally(error);
    throw error;
  }
  // The attempt budget is the database's, not this file's: `reserve_provider_attempt`,
  // `retry_generation_task` and `operator_retry_generation_task` all refuse past
  // the same `runtime_policy.provider_attempt_budget`, so a job that stopped one
  // attempt earlier or later than the RPC would either waste a paid attempt or
  // leave a task the RPC will never serve again looking retryable.
  const attemptBudget =
    (await repository.providerAttemptBudget?.()) ??
    pipelineLimits.providerAttemptBudget;
  const provider = generator instanceof MockStudioGenerator ? "mock" : "openai";
  const model =
    generator instanceof OpenAIStillAdapter
      ? generator.model
      : "mock-openai-still-v1";
  // Storyline review 1 M2. A real-mode dispatch refuses to book an attempt at
  // all while `runtime_policy` is looser than the ceilings this deployment set.
  // It sits above `reserveAttempt` because `mark_task_pre_spend_blocked` only
  // takes a task at attempt 0, and because a reservation is already spend.
  if (provider !== "mock" && repository.spendPolicy) {
    const readPolicy = repository.spendPolicy.bind(repository);
    const refusal = spendCeilingRefusal(await readSpendPolicy(readPolicy));
    if (refusal) return blockPreSpendTerminally(new Error(refusal));
  }
  let reservation: {
    attempt: number;
    idempotencyKey: string;
    duplicateComplete: boolean;
  };
  try {
    // Reservation itself raises `task cancelled`; that is a clean stop.
    reservation = checkpoint
      ? {
          attempt: task.attempt,
          idempotencyKey: `${task.dispatch_idempotency_key}:attempt:${task.attempt}`,
          duplicateComplete: false,
        }
      : await repository.reserveAttempt(task, provider, model);
  } catch (error) {
    if (isTaskCancelled(error)) return { status: "cancelled" as const };
    const code = reservationRefusal(error, task.reservation_usage_date);
    if (code) return stopBeforeSpend(code);
    throw error;
  }
  if (reservation.duplicateComplete) return { status: "deduplicated" as const };
  // Undefined until an attempt actually reaches the provider, so a failure
  // before that never reconciles a sibling attempt's cost.
  let actualCostCents: number | undefined;
  try {
    let media: GeneratedMedia;
    let stored: StoredOutput["stored"];
    if (checkpoint) {
      media = checkpoint.media;
      stored = checkpoint.stored;
      actualCostCents = media.estimatedCostCents;
    } else {
      const started = await repository.transitionTask(
        task.id,
        ["queued", "retrying", "generating"],
        "generating",
        { attempt: reservation.attempt },
      );
      if (started === "cancelled") return { status: "cancelled" as const };
      media = await generator.generate({
        idempotencyKey: reservation.idempotencyKey,
        prompt,
        aspectRatio: task.aspect_ratio ?? "1:1",
      });
      actualCostCents = media.estimatedCostCents;
      stored = await repository.storeProviderOutput({
        task,
        run,
        revision,
        attempt: reservation.attempt,
        media,
      });
    }
    const completed = await repository.complete({
      task,
      run,
      revision,
      attempt: reservation.attempt,
      media,
      stored,
    });
    if (completed === "cancelled") return { status: "cancelled" as const };
    // The run id travels with the result so the caller can scope its
    // dependent-outbox dispatch to this run instead of claiming every
    // principal's pending rows.
    return {
      status: "ready" as const,
      attempt: reservation.attempt,
      runId: task.run_id,
    };
  } catch (error) {
    if (isTaskCancelled(error)) return { status: "cancelled" as const };
    const terminal = reservation.attempt >= attemptBudget;
    await repository.fail({
      task,
      run,
      attempt: reservation.attempt,
      error,
      terminal,
      actualCostCents: actualCostCents ?? 0,
    });
    if (!terminal) throw error;
    return { status: "operator_review" as const, attempt: reservation.attempt };
  }
}

export class SupabasePresentationRepository implements PresentationRepository {
  constructor(
    private readonly url: string,
    private readonly key: string,
    // Motion is opt-in (VIDEO_ENABLED). Off means a ready studio still never
    // asks fal for a preview, so no run spends video cents.
    private readonly videoEnabled = false,
  ) {}
  async #request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.url}${path}`, {
      ...init,
      headers: {
        apikey: this.key,
        authorization: `Bearer ${this.key}`,
        "content-type": "application/json",
        ...init.headers,
      },
    });
    if (!response.ok)
      throw new Error(
        `Supabase job request ${response.status}:${(await response.text()).slice(0, 300)}`,
      );
    if (response.status === 204) return undefined as T;
    const body = await response.text();
    return (body ? JSON.parse(body) : undefined) as T;
  }
  async load(taskId: string) {
    const tasks = await this.#request<TaskRow[]>(
      `/rest/v1/generation_tasks?id=eq.${taskId}`,
    );
    const task = tasks[0];
    if (!task) throw new Error("task_not_found");
    const runs = await this.#request<RunRow[]>(
      `/rest/v1/generation_runs?id=eq.${task.run_id}`,
    );
    const run = runs[0];
    if (!run) throw new Error("run_not_found");
    const revisions = await this.#request<RevisionRow[]>(
      `/rest/v1/design_revisions?id=eq.${run.revision_id}`,
    );
    const revision = revisions[0];
    if (!revision) throw new Error("revision_not_found");
    return { task, run, revision };
  }
  async reserveAttempt(task: TaskRow, provider: string, model: string) {
    const attempt = task.attempt + 1;
    const idempotencyKey = `${task.dispatch_idempotency_key}:attempt:${attempt}`;
    const rows = await this.#request<
      Array<{ attempt_number: number; duplicate_complete: boolean }>
    >("/rest/v1/rpc/reserve_provider_attempt", {
      method: "POST",
      body: JSON.stringify({
        p_task_id: task.id,
        p_provider: provider,
        p_model: model,
        p_provider_key: idempotencyKey,
      }),
    });
    return {
      attempt: rows[0]?.attempt_number ?? attempt,
      idempotencyKey,
      duplicateComplete: rows[0]?.duplicate_complete ?? false,
    };
  }
  async loadStoredOutput(task: TaskRow): Promise<StoredOutput | undefined> {
    if (task.attempt < 1) return undefined;
    const checkpoints = await this.#request<
      Array<{
        bucket_id: string;
        object_path: string;
        mime_type: string;
        checksum_sha256: string;
        provider_request_id?: string;
      }>
    >(
      `/rest/v1/provider_output_checkpoints?task_id=eq.${task.id}&attempt=eq.${task.attempt}`,
    );
    const checkpoint = checkpoints[0];
    if (!checkpoint) return undefined;
    const attempts = await this.#request<
      Array<{
        provider: "mock" | "openai" | "fal";
        model: string;
        provider_request_id?: string;
        estimated_cost_cents: number;
        status: string;
        completed_at: string | null;
      }>
    >(
      `/rest/v1/provider_attempts?task_id=eq.${task.id}&attempt=eq.${task.attempt}`,
    );
    const attempt = attempts[0];
    if (!attempt)
      throw new StoredOutputUnavailableError(
        "provider_attempt_checkpoint_missing",
        0,
      );
    // A checkpoint is resumable only while its attempt is still open. Once
    // `fail` closed it, `complete_presentation_task` refuses that attempt for
    // ever, so resuming it would pay for nothing. Undefined here makes the
    // dispatch book attempt + 1 and shoot a fresh still; the stale sweeper
    // applies the same rule (20260924010000_resume_only_open_checkpoints.sql).
    if (
      !["reserved", "submitted"].includes(attempt.status) ||
      attempt.completed_at !== null
    )
      return undefined;
    // Bound the resume. The sweeper writes one `task.stale_verification_recovered`
    // row per recovery it emits, carrying this task and attempt, and a resume
    // only happens because of one. Past the limit the attempt closes at its
    // estimate - the photograph was paid for - and a person looks at it.
    const recoveries = await this.#request<Array<{ id: string }>>(
      `/rest/v1/audit_events?select=id&action=eq.task.stale_verification_recovered&principal_id=eq.${task.owner_principal_id}&detail->>taskId=eq.${task.id}&detail->>attempt=eq.${task.attempt}`,
    );
    if (recoveries.length > pipelineLimits.storedOutputResumeLimit)
      throw new StoredOutputUnavailableError(
        "stored_output_resume_exhausted",
        attempt.estimated_cost_cents,
      );
    let signedUrl: string;
    try {
      signedUrl = await this.signedStorageUrl(
        checkpoint.bucket_id,
        checkpoint.object_path,
      );
    } catch (error) {
      // Storage answers a sign request for a missing object with HTTP 400 and
      // `{"statusCode":"404","error":"not_found","code":"NoSuchKey"}`, so the
      // object being gone surfaces here, never as a 404 on the download.
      if (
        error instanceof Error &&
        /NoSuchKey|"statusCode":"404"/.test(error.message)
      )
        throw new StoredOutputUnavailableError(
          "stored_provider_output_download_failed:404",
          attempt.estimated_cost_cents,
        );
      throw error;
    }
    const response = await fetch(signedUrl, {
      signal: AbortSignal.timeout(pipelineLimits.storageRequestTimeoutMs),
    });
    // Gone for good (404/410): the image was paid for, so the attempt closes
    // at its estimate. Any other status is storage having a bad moment: the
    // attempt stays open and the next window resumes the paid photograph.
    if (response.status === 404 || response.status === 410)
      throw new StoredOutputUnavailableError(
        `stored_provider_output_download_failed:${response.status}`,
        attempt.estimated_cost_cents,
      );
    if (!response.ok)
      throw new Error(
        `stored_provider_output_download_failed:${response.status}`,
      );
    return {
      media: {
        provider: attempt.provider,
        model: attempt.model,
        requestId:
          checkpoint.provider_request_id ??
          attempt.provider_request_id ??
          `recovered:${task.id}:${task.attempt}`,
        bytes: new Uint8Array(await response.arrayBuffer()),
        mimeType: checkpoint.mime_type,
        estimatedCostCents: attempt.estimated_cost_cents,
      },
      stored: {
        bucket: checkpoint.bucket_id,
        path: checkpoint.object_path,
        checksum: checkpoint.checksum_sha256,
      },
    };
  }
  async transitionTask(
    taskId: string,
    from: readonly string[],
    to: string,
    patch: Record<string, unknown> = {},
  ): Promise<TransitionOutcome> {
    try {
      await this.#request("/rest/v1/rpc/transition_generation_task", {
        method: "POST",
        body: JSON.stringify({
          p_task_id: taskId,
          p_from: from,
          p_to: to,
          p_patch: patch,
        }),
      });
      return "applied";
    } catch (error) {
      if (isTaskCancelled(error)) return "cancelled";
      throw error;
    }
  }
  async signedStorageUrl(bucket: string, path: string) {
    // Each segment is encoded on its own so a `/` inside a name stays part of
    // the name rather than a new segment. `encodeURIComponent` leaves `.`
    // untouched, so `..` survives it unchanged; the traversal is refused here
    // instead, before anything is signed.
    const segments = path.split("/");
    if (
      segments.some(
        (segment) => !segment || segment === "." || segment === "..",
      )
    )
      throw new Error("signed_storage_path_invalid");
    const encodedPath = segments
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    const result = await this.#request<{
      signedURL?: string;
      signedUrl?: string;
    }>(`/storage/v1/object/sign/${encodeURIComponent(bucket)}/${encodedPath}`, {
      method: "POST",
      body: JSON.stringify({
        expiresIn: pipelineLimits.signedUrlExpirySeconds,
      }),
    });
    const signed = result.signedURL ?? result.signedUrl;
    if (!signed) throw new Error("signed_storage_url_missing");
    return signed.startsWith("http")
      ? signed
      : `${this.url}/storage/v1${signed}`;
  }
  async providerAttemptBudget() {
    const rows = await this.#request<
      Array<{ provider_attempt_budget: number | null }>
    >("/rest/v1/runtime_policy?id=eq.true&select=provider_attempt_budget");
    const budget = rows[0]?.provider_attempt_budget;
    return typeof budget === "number" && Number.isInteger(budget) && budget > 0
      ? budget
      : pipelineLimits.providerAttemptBudget;
  }
  /**
   * The spend ceiling gate's one read: the same single row, all three numbers,
   * with the service key. A value the row does not hold, or holds as null, is
   * read as whichever end refuses - an unreadable policy is not evidence that
   * the day is capped, and this gate exists to refuse exactly that.
   */
  async spendPolicy(): Promise<RuntimeSpendPolicy> {
    const rows = await this.#request<
      Array<{
        global_max_reserved_spend_cents: number | null;
        provider_attempt_budget: number | null;
        studio_reservation_cents: number | null;
      }>
    >(
      "/rest/v1/runtime_policy?id=eq.true&select=global_max_reserved_spend_cents,provider_attempt_budget,studio_reservation_cents",
    );
    const row = rows[0];
    const number = (value: number | null | undefined) =>
      typeof value === "number" && Number.isFinite(value)
        ? value
        : Number.MAX_SAFE_INTEGER;
    return {
      globalMaxReservedSpendCents: number(row?.global_max_reserved_spend_cents),
      providerAttemptBudget: number(row?.provider_attempt_budget),
      // The reservation is refused for being too small, so an unreadable value
      // is the smallest number and not the largest: same rule, opposite end.
      studioReservationCents:
        typeof row?.studio_reservation_cents === "number" &&
        Number.isFinite(row.studio_reservation_cents)
          ? row.studio_reservation_cents
          : 0,
    };
  }
  /**
   * Fix-2 review M1: `mark_task_pre_spend_blocked` writes `p_reason` straight
   * into `terminal_error_code`, which `/api/state` selects on every poll. Only
   * the class goes to the RPC; the full message is recorded once in an audit
   * event, which no customer-facing route reads.
   *
   * Fix-3 review M2: the RPC that blocks the task and releases the reservation
   * goes first, and the detail is written after it and cannot propagate: an
   * explanation is never allowed to be a prerequisite for releasing money.
   */
  async blockPreSpend(input: { task: TaskRow; run: RunRow; error: unknown }) {
    const message =
      input.error instanceof Error
        ? input.error.message
        : "pre_spend_gate_failed";
    const code = errorClass(input.error);
    await this.#request("/rest/v1/rpc/mark_task_pre_spend_blocked", {
      method: "POST",
      body: JSON.stringify({
        p_task_id: input.task.id,
        p_reason: code,
      }),
    });
    try {
      await this.#request("/rest/v1/audit_events", {
        method: "POST",
        body: JSON.stringify({
          design_id: input.run.design_id,
          principal_id: input.task.owner_principal_id,
          actor_type: "job",
          action: "task.pre_spend_block_detail",
          detail: {
            taskId: input.task.id,
            errorClass: code,
            error: message.slice(0, 300),
          },
        }),
      });
    } catch (auditError) {
      console.error("pre_spend_block_detail_write_failed", {
        taskId: input.task.id,
        errorClass: code,
        auditErrorClass: errorClass(auditError),
      });
    }
  }
  async storeProviderOutput(input: {
    task: TaskRow;
    run: RunRow;
    revision: RevisionRow;
    attempt: number;
    media: GeneratedMedia;
  }) {
    const checksum = createHash("sha256")
      .update(input.media.bytes)
      .digest("hex");
    const path = `principal/${input.task.owner_principal_id}/design/${input.run.design_id}/revision/${input.revision.id}/run/${input.run.id}/${input.task.presentation_view}/attempt-${input.attempt}-${checksum.slice(0, 12)}.png`;
    const response = await fetch(
      `${this.url}/storage/v1/object/generated-assets/${path}`,
      {
        method: "POST",
        signal: AbortSignal.timeout(pipelineLimits.storageRequestTimeoutMs),
        headers: {
          apikey: this.key,
          authorization: `Bearer ${this.key}`,
          "content-type": input.media.mimeType,
          "x-upsert": "false",
        },
        body: Buffer.from(input.media.bytes),
      },
    );
    const uploadBody = await response.text();
    if (!response.ok && !isDuplicateObject(response, uploadBody))
      throw new Error(`asset upload failed:${response.status}`);
    await this.#request(
      "/rest/v1/provider_output_checkpoints?on_conflict=task_id,attempt",
      {
        method: "POST",
        headers: { prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify({
          task_id: input.task.id,
          attempt: input.attempt,
          owner_principal_id: input.task.owner_principal_id,
          bucket_id: "generated-assets",
          object_path: path,
          mime_type: input.media.mimeType,
          byte_size: input.media.bytes.byteLength,
          checksum_sha256: checksum,
          provider_request_id: input.media.requestId,
        }),
      },
    );
    const checkpoints = await this.#request<
      Array<{ object_path: string; checksum_sha256: string }>
    >(
      `/rest/v1/provider_output_checkpoints?task_id=eq.${input.task.id}&attempt=eq.${input.attempt}&select=object_path,checksum_sha256`,
    );
    if (
      checkpoints[0]?.object_path !== path ||
      checkpoints[0]?.checksum_sha256 !== checksum
    )
      throw new Error("provider_output_checkpoint_conflict");
    return { bucket: "generated-assets", path, checksum };
  }
  async complete(input: {
    task: TaskRow;
    run: RunRow;
    revision: RevisionRow;
    attempt: number;
    media: GeneratedMedia;
    stored: { bucket: string; path: string; checksum: string };
  }): Promise<TransitionOutcome> {
    // The database owns the cancellation fence and publishes asset + ready +
    // accounting together. A replay cannot charge or create the asset twice.
    try {
      await this.#request("/rest/v1/rpc/complete_presentation_task", {
        method: "POST",
        body: JSON.stringify({
          p_task_id: input.task.id,
          p_attempt: input.attempt,
          p_actual_cost_cents: input.media.estimatedCostCents,
          p_asset: {
            design_id: input.run.design_id,
            revision_id: input.revision.id,
            run_id: input.run.id,
            task_id: input.task.id,
            owner_principal_id: input.task.owner_principal_id,
            presentation_view: input.task.presentation_view,
            bucket_id: input.stored.bucket,
            object_path: input.stored.path,
            mime_type: input.media.mimeType,
            byte_size: input.media.bytes.byteLength,
            checksum_sha256: input.stored.checksum,
            provider: input.media.provider,
            model: input.media.model,
            prompt_release: input.task.prompt_release,
            prompt_release_id: input.task.prompt_release_id,
            // SIMPLE-1: nothing renders an identity anchor any more, so the
            // NOT NULL fingerprint column carries the revision's own value -
            // the hash of the approved name the prompt was built from.
            identity_fingerprint: input.revision.identity_anchor.fingerprint,
            identity_artifact_id: input.task.identity_artifact_id ?? null,
            attempt: input.attempt,
            // NOT NULL, and there is no verification any more.
            verification_result: {},
            pipeline_release: input.task.pipeline_release,
            style_anchor_release_id: input.task.style_anchor_release_id,
            input_asset_ids: [],
          },
        }),
      });
    } catch (error) {
      if (isTaskCancelled(error)) return "cancelled";
      throw error;
    }
    if (input.task.presentation_view === "studio" && this.videoEnabled) {
      // Still completion and dependent dispatch are already committed. Motion
      // remains opt-in and uses its existing idempotent request key.
      try {
        await this.#request("/rest/v1/rpc/request_video_task", {
          method: "POST",
          body: JSON.stringify({
            p_run_id: input.run.id,
            p_kind: "preview",
            p_source_task_id: input.task.id,
            p_request_key: `auto-preview:${input.run.id}:${input.task.id}`,
          }),
        });
      } catch (error) {
        const reason = String(
          error instanceof Error ? error.message : "unknown",
        ).slice(0, 120);
        await this.#request("/rest/v1/audit_events", {
          method: "POST",
          body: JSON.stringify({
            design_id: input.run.design_id,
            principal_id: input.task.owner_principal_id,
            actor_type: "job",
            action: "video.auto_request_failed",
            detail: { sourceTaskId: input.task.id, reason },
          }),
        });
        // The still stays ready; only the run carries the visible motion failure.
        await this.#request(`/rest/v1/generation_runs?id=eq.${input.run.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            operator_review_reason: `video_request_failed:${reason}`.slice(
              0,
              300,
            ),
          }),
        });
      }
    }
    return "applied";
  }
  async fail(input: {
    task: TaskRow;
    run: RunRow;
    attempt: number;
    error: unknown;
    terminal: boolean;
    actualCostCents: number;
  }) {
    const message =
      input.error instanceof Error ? input.error.message : "unknown";
    // Fix-2 review M1: `#request` folds a PostgREST status and body into its
    // message, so row values used to land in the customer-visible
    // `terminal_error_code`. The class is what both the ledger row and the task
    // column get; the full message is kept only in the audit event below.
    const errorCode = errorClass(input.error);
    await this.#request("/rest/v1/rpc/reconcile_provider_attempt", {
      method: "POST",
      body: JSON.stringify({
        p_task_id: input.task.id,
        p_attempt: input.attempt,
        p_status: "failed",
        p_actual_cost_cents: input.actualCostCents,
        p_error_class: errorCode,
        p_terminal: input.terminal,
      }),
    });
    await this.transitionTask(
      input.task.id,
      ["queued", "generating", "verifying", "retrying"],
      input.terminal ? "blocked" : "retrying",
      input.terminal ? { terminal_error_code: errorCode } : {},
    );
    await this.#request("/rest/v1/audit_events", {
      method: "POST",
      body: JSON.stringify({
        design_id: input.run.design_id,
        principal_id: input.task.owner_principal_id,
        actor_type: "job",
        action: input.terminal ? "task.operator_review" : "task.retrying",
        detail: {
          taskId: input.task.id,
          attempt: input.attempt,
          errorClass: errorCode,
          error: message.slice(0, 300),
        },
      }),
    });
  }
}

export function productionPresentationDependencies(
  environment: Record<string, string | undefined> = process.env,
) {
  const config = parseJobsEnv(environment);
  const repository = new SupabasePresentationRepository(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY,
    config.VIDEO_ENABLED,
  );
  if (config.PROVIDER_MODE === "mock")
    return { repository, generator: new MockStudioGenerator() };
  return {
    repository,
    generator: new OpenAIStillAdapter(
      config.OPENAI_API_KEY!,
      config.OPENAI_IMAGE_MODEL,
      config.OPENAI_STILL_ESTIMATED_COST_CENTS,
    ),
  };
}
