import { createHash } from "node:crypto";
import {
  MockStudioGenerator,
  MockStudioVerifier,
  OpenAINameReader,
  OpenAIStillAdapter,
  PRESENTATION_ASPECT_RATIO,
  buildPromptVariableSnapshot,
  compilePrompt,
  identityTextMatches,
  normalizeIdentityText,
  type GeneratedMedia,
  type PromptProfile,
  type PromptVariableSnapshot,
  type StudioGenerator,
  type StudioNameReader,
  type StudioVerifier,
} from "@jewelo/ai";
import {
  identityBarFallbackReview,
  parseJobsEnv,
  pipelineLimits,
} from "@jewelo/config";
// Pipeline fix review 1 finding 5. The one definition of a reference-asset id -
// the opaque identifier the upload route mints, and nothing that can traverse a
// path - is the one the upload route validates against, so this job cannot
// drift from it.
import { REFERENCE_ASSET_ID } from "@jewelo/contracts";
import { isDuplicateObject } from "@jewelo/media";
import sharp from "sharp";
// Fix-3 review M1: `errorClass` used to be private to this file, so the video
// job wrote fal's raw refusal into the same customer-visible columns. It is a
// shared jobs module now and every category write in `apps/jobs` goes through
// it.
import { errorClass, nameMismatchCode } from "./error-class";
import { renderIdentityAnchor } from "./identity-anchor";

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
  /** Set on the three model views: the studio still they must reproduce. */
  dependency_task_id?: string | null;
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
interface PromptReleaseRow {
  id: string;
  profile: PromptProfile;
  template: string;
}
interface PromptSnapshotRow {
  task_id: string;
  prompt_release_id: string;
  variable_snapshot: PromptVariableSnapshot;
  compiled_prompt: string;
  compiler_version: string;
  sha256: string;
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

export interface PresentationRepository {
  load(taskId: string): Promise<{
    task: TaskRow;
    run: RunRow;
    revision: RevisionRow;
    release: PromptReleaseRow;
    snapshot?: PromptSnapshotRow;
  }>;
  materializePromptSnapshot(input: {
    task: TaskRow;
    release: PromptReleaseRow;
    variables: PromptVariableSnapshot;
    compiledPrompt: string;
    compilerVersion: string;
    sha256: string;
  }): Promise<PromptSnapshotRow>;
  loadStoredOutput(task: TaskRow): Promise<StoredOutput | undefined>;
  reserveAttempt(
    task: TaskRow,
    provider: string,
    model: string,
    attemptOverride?: number,
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
  /** Keeps a name-rejected still in private storage for inspection. */
  storeRejectedOutput?(input: {
    task: TaskRow;
    run: RunRow;
    revision: RevisionRow;
    attempt: number;
    media: GeneratedMedia;
  }): Promise<string>;
  complete(input: {
    task: TaskRow;
    run: RunRow;
    revision: RevisionRow;
    attempt: number;
    media: GeneratedMedia;
    stored: { bucket: string; path: string; checksum: string };
    verification: Record<string, unknown>;
    identityFingerprint: string;
    identityArtifactId: string;
    inputAssetIds?: readonly string[];
  }): Promise<TransitionOutcome | void>;
  fail(input: {
    task: TaskRow;
    run: RunRow;
    attempt: number;
    error: unknown;
    terminal: boolean;
    actualCostCents: number;
    rejectedObjectPaths?: readonly string[];
  }): Promise<void>;
  signedIdentityUrl(
    revision: RevisionRow,
    ownerId: string,
    task: TaskRow,
  ): Promise<{
    url: string;
    fingerprint: string;
    artifactId: string;
    /**
     * How the engine attached the jump rings to this stencil (D-020):
     * `welded` on letter strokes, `bar` on a top rail, `none` for a
     * construction that carries its own suspension. Optional so a repository
     * that renders nothing - the in-memory one in a harness - can leave it
     * out; a missing value is treated as "not a bar" by the review gate.
     */
    ringPlacement?: string;
  }>;
  /**
   * Whether a `bar` construction must be seen by the shop before a paid still
   * is made of it (`IDENTITY_BAR_FALLBACK_REVIEW`, validated in
   * `@jewelo/config` and read once when the dependencies are built, never per
   * task). Undefined means on, so a repository that never set it cannot spend
   * on a piece nobody approved; only an explicit `false` lets the bar
   * construction proceed.
   */
  readonly barFallbackReviewEnabled?: boolean;
  signedStyleAnchorUrl(task: TaskRow): Promise<string>;
  /** Ready still of `dependency_task_id`; undefined while it is not ready yet. */
  signedDependencyStillUrl?(
    task: TaskRow,
  ): Promise<{ url: string; assetId: string } | undefined>;
  /**
   * Terminal status of `dependency_task_id`, or undefined while it can still
   * produce a still. A dependent view whose parent is terminal can never
   * become dispatchable, so it must stop instead of deferring forever.
   */
  dependencyTerminalStatus?(task: TaskRow): Promise<string | undefined>;
  signedInspirationUrl(
    revision: RevisionRow,
    ownerId: string,
  ): Promise<string | undefined>;
  blockPreSpend(input: {
    task: TaskRow;
    run: RunRow;
    error: unknown;
  }): Promise<void>;
  /**
   * Paid attempts this task may make, read from the same row the SQL gates
   * read (`runtime_policy.provider_attempt_budget`).
   *
   * Optional so a repository that has no policy to read - the in-memory one in
   * a harness - can leave it out, and only then is the validated default in
   * `packages/config` used.
   *
   * Pipeline fix review 1 finding 8: this used to promise that same fallback
   * when the policy read failed, which the Supabase implementation does not do
   * and should not do. A read that errors leaves this job unable to say how
   * many paid attempts the SQL gates will allow, and guessing that number is
   * how a task either wastes a still or is declared retryable when
   * `reserve_provider_attempt` will never serve it again. It throws instead,
   * the dispatch stops before any provider call, and the stale sweeper brings
   * the task back when the database answers again. The config default applies
   * only to a policy row that answered with a missing or invalid value.
   */
  providerAttemptBudget?(): Promise<number>;
}

/**
 * The three model views edit the approved studio still, so the compiled prompt
 * has to name the extra first image before the published template's own
 * "first image is the only source for the pendant" rule is read.
 */
export const DEPENDENT_REFERENCE_RULE =
  "REFERENCE: the first supplied image is the finished pendant photographed in the studio; reproduce this exact object - same letterforms, same metal, same stones, same chain - in the new scene. The second image is its black stencil (identical shape). The third image is style only.";

/**
 * The deterministic refusals `materialize_prompt_snapshot` raises
 * (`supabase/migrations/20260827060000_caleums_prompt_registry.sql:284-289`),
 * each mapped to a reason class.
 *
 * The message text is the RPC's own; the class is what this job is allowed to
 * write into `terminal_error_code`. Neither the compiled prompt nor the
 * customer's name ever appears in one.
 */
const PROMPT_SNAPSHOT_REJECTIONS: readonly (readonly [string, string])[] = [
  ["prompt release does not match task pin", "release_pin"],
  ["invalid prompt variable snapshot", "variables"],
  ["invalid compiled prompt length", "length"],
  ["compiled prompt checksum mismatch", "checksum"],
];

/**
 * Whether a failed `materialize_prompt_snapshot` call is a property of the task
 * rather than of the moment, and if so which one.
 *
 * Adversarial review 3: the call used to be left to the stale sweeper on every
 * failure. That is right for a transport fault or a 5xx, which the next
 * dispatch will not see. It is wrong for the four `raise exception`s the RPC
 * carries, because they depend only on rows that a re-dispatch cannot change -
 * and `recover_stale_generation_tasks`
 * (`supabase/migrations/20260907020000_dependent_view_terminal_gate.sql:150-172`)
 * has no attempt cap on `attempt = 0 and status = 'queued'` and bumps
 * `updated_at`, so one deterministic raise becomes an outbox row every two
 * minutes for ever.
 *
 * PostgREST answers a raise with a 4xx whose body carries the SQLSTATE and the
 * message. `SupabasePresentationRepository.#request` folds both into its error
 * message and truncates the body at 300 characters, so the body is matched as
 * text rather than parsed: a truncated JSON object still carries the code and
 * the message, which are the first fields PostgREST writes. Anything else -
 * a 5xx, a fetch that never answered, a `P0001` this job does not recognise -
 * returns undefined and keeps the sweeper path.
 */
export function promptSnapshotRejectionClass(
  error: unknown,
): string | undefined {
  const message = error instanceof Error ? error.message : String(error);
  const status = /Supabase job request (\d{3}):/.exec(message);
  if (!status) return undefined;
  const code = Number(status[1]);
  if (!Number.isFinite(code) || code < 400 || code >= 500) return undefined;
  const body = message.slice(status.index + status[0].length);
  const sqlState = /"code"\s*:\s*"([0-9A-Za-z]{5})"/.exec(body)?.[1];
  if (sqlState !== "P0001" && sqlState !== "22023") return undefined;
  for (const [raised, reason] of PROMPT_SNAPSHOT_REJECTIONS)
    if (body.includes(raised)) return reason;
  // `22023` is invalid_parameter_value: the argument itself is wrong, so the
  // next dispatch sends the same wrong argument. A `P0001` with a message this
  // job does not know is not classified, because an unrecognised raise may yet
  // be about the moment rather than the row.
  return sqlState === "22023" ? "invalid_argument" : undefined;
}

export async function executePresentationTask(
  taskId: string,
  repository: PresentationRepository,
  generator: StudioGenerator,
  verifier: StudioVerifier,
  nameReader?: StudioNameReader,
) {
  const {
    task,
    run,
    revision,
    release,
    snapshot: existingSnapshot,
  } = await repository.load(taskId);
  if (task.status === "ready") return { status: "deduplicated" as const };
  if (task.status === "cancelled" || task.cancel_requested_at)
    return { status: "cancelled" as const };
  /**
   * The one way out of a pre-spend failure, used by every pre-spend gate below.
   *
   * Adversarial review 1 finding 3: `mark_task_pre_spend_blocked` raises for a
   * task whose attempt is not 0, because the pre-spend gate cannot follow a
   * provider reservation. Adversarial review 2 finding 4: only one of the call
   * sites carried that fallback, and the gates that simply threw carried none,
   * so on a retry the throw escaped `executePresentationTask` (the Inngest
   * function runs with `retries: 0`), the task stayed `retrying` with no
   * `terminal_error_code`, and the stale sweeper re-dispatched it for ever.
   * (The sweeper runs every two minutes but only claims tasks older than
   * `pipelineLimits.staleRecoveryWindowMs`; the cadence is not the window.) Every deterministic pre-spend refusal now ends the same way:
   * block if the RPC will take it, terminal `fail` with the same message if it
   * will not, and `operator_review` either way. The messages are category
   * strings; a customer name never appears in one.
   */
  const blockPreSpendTerminally = async (error: unknown) => {
    try {
      await repository.blockPreSpend({ task, run, error });
    } catch (blockError) {
      // Pipeline review 1 finding 8: the bare catch discarded why the RPC
      // refused, so an operator saw the gate's reason and no trace of the
      // second failure. Both causes are recorded as their class only.
      //
      // Pipeline fix review 1 finding 7: the gate's own message used to be
      // concatenated in raw. Most gate messages are category strings, but this
      // path also carries whatever `signedIdentityUrl`, the anchor read or the
      // inspiration read threw, including a PostgREST body with row values in
      // it, and `fail` writes this string into the customer-visible
      // `terminal_error_code`. Two classes, no free text.
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
  // The release row the job loaded is not the release the task is pinned to.
  // That is a property of the two rows, so re-dispatching cannot change it.
  if (release.id !== task.prompt_release_id)
    return blockPreSpendTerminally(new Error("task_prompt_release_mismatch"));
  let snapshot = existingSnapshot;
  if (!snapshot) {
    let compiled: ReturnType<typeof compilePrompt>;
    let compiledPrompt: string;
    try {
      const variables = buildPromptVariableSnapshot({
        approvedName: revision.identity_anchor.approvedText,
        language: revision.identity_anchor.language,
        specification: revision.specification,
        presentationView: task.presentation_view,
      });
      compiled = compilePrompt({
        profile: release.profile,
        template: release.template,
        variables,
      });
      compiledPrompt = task.dependency_task_id
        ? `${DEPENDENT_REFERENCE_RULE} ${compiled.compiledPrompt}`
        : compiled.compiledPrompt;
    } catch (error) {
      // A revision whose specification cannot fill the release's pinned
      // variable set can never compile, however often it is re-dispatched.
      // Left to throw, the task stays `queued` at attempt 0 and the stale
      // sweeper re-queues it once per stale window for ever. This is a pre-spend gate like the
      // identity and anchor gates: block once, release the reservation, and
      // send it to operator review.
      return blockPreSpendTerminally(
        new Error(
          `prompt_compile_failed:${
            error instanceof Error ? error.message : "unknown"
          }`,
        ),
      );
    }
    try {
      snapshot = await repository.materializePromptSnapshot({
        task,
        release,
        variables: compiled.variableSnapshot,
        compiledPrompt,
        compilerVersion: compiled.compilerVersion,
        sha256: createHash("sha256")
          .update(compiledPrompt, "utf8")
          .digest("hex"),
      });
    } catch (error) {
      // A write against Supabase fails in two different ways and they need
      // opposite answers. A transport fault or a 5xx is about the moment: the
      // same task succeeds on the next dispatch, so it is rethrown and the
      // stale sweeper recovers it. A deterministic raise from the RPC is about
      // the rows, so re-dispatching it turns one bad row into an outbox event
      // once per stale window for ever; it is refused once, pre-spend, like
      // the other gates here.
      const reason = promptSnapshotRejectionClass(error);
      if (reason === undefined) throw error;
      return blockPreSpendTerminally(
        new Error(`prompt_snapshot_rejected:${reason}`),
      );
    }
  }
  // A stored snapshot that belongs to another task, another release or another
  // prompt text is wrong in the row, not in this attempt: the same comparison
  // fails on every redispatch, so it is a pre-spend refusal like the others.
  if (
    snapshot.task_id !== task.id ||
    snapshot.prompt_release_id !== task.prompt_release_id ||
    createHash("sha256")
      .update(snapshot.compiled_prompt, "utf8")
      .digest("hex") !== snapshot.sha256
  )
    return blockPreSpendTerminally(
      new Error("prompt_snapshot_lineage_mismatch"),
    );
  let identity: Awaited<
    ReturnType<PresentationRepository["signedIdentityUrl"]>
  >;
  let styleAnchorUrl: string | undefined;
  let inspirationImageUrl: string | undefined;
  let reference: { url: string; assetId: string } | undefined;
  try {
    if (task.dependency_task_id) {
      reference = await repository.signedDependencyStillUrl?.(task);
      if (!reference) {
        // A dependent view whose studio still is terminal can never get a
        // pendant to copy. Deferring would let the stale sweeper re-queue it
        // once per stale window forever; block it once instead, which also
        // releases its reservation through the pre-spend path below.
        const terminal = await repository.dependencyTerminalStatus?.(task);
        if (terminal) throw new Error(`dependency_${terminal}`);
        // Otherwise a recovery dispatch simply arrived before the studio still
        // existed: wait for the release rather than spend on an empty scene.
        return { status: "deferred" as const };
      }
    }
    // Identity and exact style release existence are hard pre-spend gates.
    identity = await repository.signedIdentityUrl(
      revision,
      task.owner_principal_id,
      task,
    );
    // The studio still gets NO style photo: every wrong name today was copied
    // from the anchor. Dependent views inherit the studio still as reference.
    styleAnchorUrl =
      task.presentation_view === "studio"
        ? undefined
        : await repository.signedStyleAnchorUrl(task);
    inspirationImageUrl = await repository.signedInspirationUrl(
      revision,
      task.owner_principal_id,
    );
  } catch (error) {
    return blockPreSpendTerminally(error);
  }
  // D-020 bar fallback. The engine never refuses a name for want of a ring
  // seat: where no letter stroke can carry a ring it welds a rail across the
  // top of the lettering and hangs both rings from that. That is a different
  // physical piece from the one the shopper approved, so unless the deployment
  // has said bar pieces are sellable
  // (`IDENTITY_BAR_FALLBACK_REVIEW=0`), the run stops here - before the
  // attempt budget is read, before any reservation and before any provider
  // call - and waits for the shop. The placement is a property of the name and
  // the style, so a redispatch would decide the same thing: it is a pre-spend
  // block like the others, terminal, with a code and no customer text.
  if (
    identity.ringPlacement === "bar" &&
    repository.barFallbackReviewEnabled !== false
  )
    return blockPreSpendTerminally(new Error("identity_bar_fallback"));
  // The attempt budget is the database's, not this file's: `reserve_provider_attempt`,
  // `retry_generation_task` and `operator_retry_generation_task` all refuse past
  // the same `runtime_policy.provider_attempt_budget`, so a job that stopped one
  // attempt earlier or later than the RPC would either waste a paid attempt or
  // leave a task the RPC will never serve again looking retryable.
  const attemptBudget =
    (await repository.providerAttemptBudget?.()) ??
    pipelineLimits.providerAttemptBudget;
  const checkpoint = await repository.loadStoredOutput(task);
  const provider = generator instanceof MockStudioGenerator ? "mock" : "openai";
  const model =
    generator instanceof OpenAIStillAdapter
      ? generator.model
      : "mock-openai-still-v1";
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
    throw error;
  }
  if (reservation.duplicateComplete) return { status: "deduplicated" as const };
  const inputAssetIds = reference ? [reference.assetId] : [];
  // Undefined until an attempt actually reaches the provider, so a failure
  // before that never reconciles a sibling attempt's cost.
  let actualCostCents: number | undefined;
  // Name-rejected stills are kept in private storage so an operator can see
  // what the model actually engraved; they never become assets.
  const rejectedObjectPaths: string[] = [];
  try {
    // A studio still whose engraved name is not the approved one is regenerated
    // in place: at most two extra paid attempts, then operator review.
    for (let regeneration = 0; ; regeneration += 1) {
      const resumable = regeneration === 0 ? checkpoint : undefined;
      let media: GeneratedMedia;
      let stored: StoredOutput["stored"];
      if (resumable) {
        media = resumable.media;
        stored = resumable.stored;
        actualCostCents = media.estimatedCostCents;
      } else {
        const started = await repository.transitionTask(
          task.id,
          ["queued", "retrying", "generating"],
          "generating",
          { attempt: reservation.attempt, input_asset_ids: inputAssetIds },
        );
        if (started === "cancelled") return { status: "cancelled" as const };
        media = await generator.generate({
          idempotencyKey: reservation.idempotencyKey,
          prompt: snapshot.compiled_prompt,
          referenceImageUrl: reference?.url,
          identityImageUrl: identity.url,
          styleAnchorUrl,
          inspirationImageUrl,
          identityFingerprint: identity.fingerprint,
          aspectRatio:
            task.aspect_ratio ??
            PRESENTATION_ASPECT_RATIO[task.presentation_view],
          presentationView: task.presentation_view,
          specification: revision.specification,
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
      const verifying = await repository.transitionTask(
        task.id,
        ["generating", "verifying"],
        "verifying",
      );
      if (verifying === "cancelled") return { status: "cancelled" as const };
      const verification = await verifier.verify({
        approvedText: revision.identity_anchor.approvedText,
        identityFingerprint: identity.fingerprint,
        identityImageUrl: identity.url,
        presentationView: task.presentation_view,
        specification: revision.specification,
        media,
      });
      if (
        !verification.passed ||
        !verification.exactText ||
        !verification.exactScript ||
        !verification.exactlyTwoConnectedRings ||
        !verification.correctShot ||
        !verification.noAddedIdentityElements
      )
        throw new Error("identity_verification_failed");
      const record = verification as unknown as Record<string, unknown>;
      if (nameReader) {
        const expected = revision.identity_anchor.approvedText;
        const reading = await nameReader.read(media, expected);
        const readText = reading.text;
        // Pipeline review 1 finding 1. The script of a name is decided by its
        // letters. The old class required the whole approved text to be Latin
        // letters, spaces, `'` and `-`, so the two-name join
        // `canonical_identity_anchor` writes ("SARA & OMAR"), a typographic
        // apostrophe ("O’Neill") and any combining mark made the name
        // "not Latin" - and the still was then required to contain Arabic,
        // which it never did. Every attempt failed, three paid stills per view
        // were spent, and the shopper was told the piece was unavailable.
        const expectedLetters = expected.replaceAll(/\P{L}/gu, "");
        // Pipeline fix review 1 finding 1. An approved text with no letters
        // ("1234", "-", "'") normalises to `""`, which made `latinExpected`
        // true, the script test vacuous and `identityTextMatches` compare `""`
        // to `""` - so the gate passed whatever the model had engraved. It is
        // a property of the approved row, not of this attempt: no regeneration
        // can give a letterless name letters, so it fails closed at once
        // instead of spending two more stills first.
        const letterlessApproved = normalizeIdentityText(expected).length === 0;
        const scriptOk =
          !letterlessApproved &&
          (!/\p{Script=Arabic}/u.test(expectedLetters)
            ? !/\p{Script=Arabic}/u.test(readText)
            : /\p{Script=Arabic}/u.test(readText));
        // Pipeline review 1 finding 3. The deterministic comparison is the only
        // thing that can pass a still. The model's own `matches` is kept in the
        // decision as evidence of what it claimed, and is never sufficient: a
        // self-report was exactly what let wrong names through in August.
        const passed = scriptOk && identityTextMatches(readText, expected);
        record.nameCheck = {
          passed,
          readText,
          expected,
          scriptOk,
          letterlessApproved,
          modelReportedMatch: reading.matches,
        };
        if (!passed) {
          const terminal =
            letterlessApproved ||
            regeneration >= 2 ||
            reservation.attempt >= attemptBudget;
          if (repository.storeRejectedOutput)
            rejectedObjectPaths.push(
              await repository.storeRejectedOutput({
                task,
                run,
                revision,
                attempt: reservation.attempt,
                media,
              }),
            );
          await repository.fail({
            task,
            run,
            attempt: reservation.attempt,
            error: new Error(
              letterlessApproved
                ? "approved_text_has_no_letters"
                : nameMismatchCode(readText),
            ),
            terminal,
            actualCostCents: actualCostCents ?? 0,
            rejectedObjectPaths,
          });
          if (terminal)
            return {
              status: "operator_review" as const,
              attempt: reservation.attempt,
            };
          reservation = await repository.reserveAttempt(
            task,
            provider,
            model,
            reservation.attempt + 1,
          );
          actualCostCents = undefined;
          continue;
        }
      }
      if (rejectedObjectPaths.length)
        record.rejectedObjectPaths = [...rejectedObjectPaths];
      const completed = await repository.complete({
        task,
        run,
        revision,
        attempt: reservation.attempt,
        media,
        stored,
        verification: record,
        identityFingerprint: identity.fingerprint,
        identityArtifactId: identity.artifactId,
        inputAssetIds,
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
    }
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
      rejectedObjectPaths,
    });
    if (!terminal) throw error;
    return { status: "operator_review" as const, attempt: reservation.attempt };
  }
}

export class SupabasePresentationRepository implements PresentationRepository {
  constructor(
    private readonly url: string,
    private readonly key: string,
    private readonly allowMockAnchors = false,
    // Motion is opt-in (VIDEO_ENABLED). Off means a ready studio still never
    // asks fal for a preview, so no run spends video cents.
    private readonly videoEnabled = false,
    // P1-5. Constructions that carry their own suspension and so want no jump
    // rings welded on. Read once from the validated environment; the identity
    // package never reads an environment variable itself.
    private readonly ringlessConstructions: ReadonlySet<string> = new Set<string>(),
    // P1-6. The pipeline release every identity artifact and task is pinned to,
    // validated in `@jewelo/config` (PIPELINE_RELEASE_ID) rather than written
    // here as a literal, so a release bump is a configuration change.
    private readonly pipelineReleaseId = "caleums-final-media-v2",
    // Pipeline fix 1 item 11. Whether a D-020 bar construction goes to
    // operator review before any spend. Read once from the validated
    // environment in `productionPresentationDependencies`, like the ringless
    // set above, so no task reads an environment variable.
    readonly barFallbackReviewEnabled = true,
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
    const releases = await this.#request<PromptReleaseRow[]>(
      `/rest/v1/prompt_releases?id=eq.${task.prompt_release_id}`,
    );
    const release = releases[0];
    if (!release) throw new Error("prompt_release_not_found");
    const snapshots = await this.#request<PromptSnapshotRow[]>(
      `/rest/v1/generation_prompt_snapshots?task_id=eq.${task.id}`,
    );
    return { task, run, revision, release, snapshot: snapshots[0] };
  }
  async materializePromptSnapshot(input: {
    task: TaskRow;
    release: PromptReleaseRow;
    variables: PromptVariableSnapshot;
    compiledPrompt: string;
    compilerVersion: string;
    sha256: string;
  }) {
    return this.#request<PromptSnapshotRow>(
      "/rest/v1/rpc/materialize_prompt_snapshot",
      {
        method: "POST",
        body: JSON.stringify({
          p_task_id: input.task.id,
          p_prompt_release_id: input.release.id,
          p_variable_snapshot: input.variables,
          p_compiled_prompt: input.compiledPrompt,
          p_compiler_version: input.compilerVersion,
          p_sha256: input.sha256,
        }),
      },
    );
  }
  async reserveAttempt(
    task: TaskRow,
    provider: string,
    model: string,
    attemptOverride?: number,
  ) {
    const attempt = attemptOverride ?? task.attempt + 1;
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
      }>
    >(
      `/rest/v1/provider_attempts?task_id=eq.${task.id}&attempt=eq.${task.attempt}`,
    );
    const attempt = attempts[0];
    if (!attempt) throw new Error("provider_attempt_checkpoint_missing");
    const signedUrl = await this.signedStorageUrl(
      checkpoint.bucket_id,
      checkpoint.object_path,
    );
    const response = await fetch(signedUrl);
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
  async signedIdentityUrl(
    revision: RevisionRow,
    ownerId: string,
    task: TaskRow,
  ) {
    // Adversarial review 1 finding 1: the release the engine stamps into the
    // artifact has to be the release the task is pinned to. Two releases in one
    // run mean media from two different identity engines under one order, and
    // nothing downstream would say which pendant the customer is looking at.
    // Both values are release ids from the registry, never customer text.
    // Review 2 finding 7: the comparison used to run after the stencil had been
    // shaped, rasterised, measured and encoded, so a mismatch cost a full
    // render before it refused. The release the engine will stamp is the one
    // handed to it, so the comparison belongs here, where it costs nothing.
    if (this.pipelineReleaseId !== task.pipeline_release)
      throw new Error(
        `identity_pipeline_release_mismatch:task=${task.pipeline_release},report=${this.pipelineReleaseId}`,
      );
    const rendered = await renderIdentityAnchor(
      {
        approvedText: revision.identity_anchor.approvedText,
        language: revision.identity_anchor.language,
        typography: revision.identity_anchor.typography,
        fingerprint: revision.identity_anchor.fingerprint,
      },
      revision.specification,
      this.pipelineReleaseId,
      this.ringlessConstructions,
    );
    // And the same statement about what the engine actually stamped, which is
    // cheap now that the report exists and keeps the check honest if the solver
    // ever stops echoing the release it was given.
    if (rendered.report.pipelineRelease !== task.pipeline_release)
      throw new Error(
        `identity_pipeline_release_mismatch:task=${task.pipeline_release},report=${rendered.report.pipelineRelease}`,
      );
    const basePath = `principal/${ownerId}/revision/${revision.id}/identity-${rendered.fingerprint}`;
    // The engine renders a PNG and only a PNG: the stencil is rasterised from
    // its own path data and the SVG never leaves `identityStencilSvg`. The
    // upload loop used to branch on an `svg` field the renderer never sets, so
    // it promised a second artifact that no run has ever written.
    const uploadBody = rendered.png.buffer.slice(
      rendered.png.byteOffset,
      rendered.png.byteOffset + rendered.png.byteLength,
    ) as ArrayBuffer;
    const upload = await fetch(
      `${this.url}/storage/v1/object/identity-anchors/${basePath}.png`,
      {
        method: "POST",
        headers: {
          apikey: this.key,
          authorization: `Bearer ${this.key}`,
          "content-type": "image/png",
          "x-upsert": "false",
        },
        body: uploadBody,
      },
    );
    const uploadDetail = await upload.text();
    if (!upload.ok && !isDuplicateObject(upload, uploadDetail))
      throw new Error(`identity anchor upload failed:${upload.status}`);
    // Four sibling tasks race to insert the same artifact; a loser can hit the
    // (bucket_id, object_path) unique key instead of the on_conflict target.
    try {
      await this.#request(
        "/rest/v1/identity_artifacts?on_conflict=revision_id,fingerprint",
        {
          method: "POST",
          headers: { prefer: "resolution=ignore-duplicates,return=minimal" },
          body: JSON.stringify({
            revision_id: revision.id,
            owner_principal_id: ownerId,
            engine_release: String(rendered.report.engineRelease),
            // P1-6: the sha of the bytes HarfBuzz actually shaped with, never
            // a placeholder. `existing-latin` used to stand in for the Latin
            // path, which no longer exists: both scripts go through the solver.
            font_release: rendered.report.fontSha256Measured,
            approved_text: revision.identity_anchor.approvedText,
            script: revision.identity_anchor.language,
            fingerprint: rendered.fingerprint,
            bucket_id: "identity-anchors",
            object_path: `${basePath}.png`,
            png_sha256: rendered.pngSha256,
            validation_report: rendered.report,
          }),
        },
      );
    } catch (error) {
      if (!String(error).includes("23505")) throw error;
    }
    const artifacts = await this.#request<Array<{ id: string }>>(
      `/rest/v1/identity_artifacts?revision_id=eq.${revision.id}&fingerprint=eq.${rendered.fingerprint}&select=id`,
    );
    const artifactId = artifacts[0]?.id;
    if (!artifactId) throw new Error("identity_artifact_lineage_missing");
    await this.#request(`/rest/v1/generation_tasks?id=eq.${task.id}`, {
      method: "PATCH",
      body: JSON.stringify({ identity_artifact_id: artifactId }),
    });
    // Through the shared signer so this path is percent-encoded segment by
    // segment like every other one.
    const url = await this.signedStorageUrl(
      "identity-anchors",
      `${basePath}.png`,
    );
    return {
      url,
      fingerprint: rendered.fingerprint,
      artifactId,
      // Already stored on the artifact row: `validation_report` is
      // `rendered.report`, whose `claimed` block spreads the construction
      // measurement and so carries `claimed.ringPlacement`. Nothing new is
      // written and no migration is needed; the value is handed back so the
      // pre-spend gate can read it without a second query.
      ringPlacement: rendered.construction.ringPlacement,
    };
  }
  async signedStyleAnchorUrl(task: TaskRow) {
    if (!task.style_anchor_release_id)
      throw new Error(`style_anchor_missing:${task.presentation_view}`);
    const releases = await this.#request<
      Array<{
        id: string;
        source_task_id: string;
        bucket_id?: string;
        object_path?: string;
        checksum_sha256?: string;
        status: string;
      }>
    >(`/rest/v1/style_anchor_releases?id=eq.${task.style_anchor_release_id}`);
    const release = releases[0];
    if (
      !release ||
      release.status !== "published" ||
      !release.bucket_id ||
      !release.object_path ||
      !release.checksum_sha256
    ) {
      if (this.allowMockAnchors)
        return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
      throw new Error(
        `style_anchor_missing:${release?.source_task_id ?? task.presentation_view}`,
      );
    }
    const signed = await this.signedStorageUrl(
      release.bucket_id,
      release.object_path,
    );
    // Every anchor carries a different customer's name; the low-pass keeps its
    // light, palette and mood while destroying the letterforms the model kept
    // copying into the pendant.
    const response = await fetch(signed);
    if (!response.ok)
      throw new Error(`style_anchor_unreadable:${release.source_task_id}`);
    const lowPassed = await sharp(Buffer.from(await response.arrayBuffer()))
      .resize(256, null, { fit: "inside" })
      .blur(20)
      .resize(1024, null, { fit: "inside" })
      .png()
      .toBuffer();
    return `data:image/png;base64,${lowPassed.toString("base64")}`;
  }
  async signedDependencyStillUrl(task: TaskRow) {
    if (!task.dependency_task_id) return undefined;
    const assets = await this.#request<
      Array<{ id: string; bucket_id: string; object_path: string }>
    >(
      `/rest/v1/assets?task_id=eq.${task.dependency_task_id}&provider=in.(openai,mock)&select=id,bucket_id,object_path&order=created_at.desc&limit=1`,
    );
    const asset = assets[0];
    if (!asset) return undefined;
    return {
      url: await this.signedStorageUrl(asset.bucket_id, asset.object_path),
      assetId: asset.id,
    };
  }
  async dependencyTerminalStatus(task: TaskRow) {
    if (!task.dependency_task_id) return undefined;
    const rows = await this.#request<Array<{ status: string }>>(
      `/rest/v1/generation_tasks?id=eq.${task.dependency_task_id}&status=in.(blocked,failed,cancelled)&select=status&limit=1`,
    );
    return rows[0]?.status;
  }
  async signedInspirationUrl(revision: RevisionRow, ownerId: string) {
    const reference = revision.specification.referenceAsset;
    if (!reference || typeof reference !== "object") return undefined;
    const id = String((reference as Record<string, unknown>).id ?? "");
    const fileName = String(
      (reference as Record<string, unknown>).fileName ?? "reference",
    ).replaceAll(/[^a-zA-Z0-9._-]/g, "_");
    if (!id) throw new Error("inspiration_reference_missing");
    // Pipeline review 1 finding 5 / security review 1 finding 3. The
    // specification is customer-supplied and, until the draft schema lands,
    // unvalidated: this id was interpolated straight into a service-role
    // storage path, where `..` segments normalise before the request and can
    // read another principal's object. The id is an opaque identifier, so it
    // is matched against its own shape rather than escaped.
    if (!REFERENCE_ASSET_ID.test(id))
      throw new Error("inspiration_reference_invalid");
    return this.signedStorageUrl(
      "references",
      `principal/${ownerId}/${id}/${fileName}`,
    ).catch(() => {
      throw new Error(`inspiration_reference_missing:${id}`);
    });
  }
  async signedStorageUrl(bucket: string, path: string) {
    // Pipeline fix review 1 finding 4. Each segment is encoded on its own so a
    // `/` inside a name stays part of the name rather than a new segment. That
    // is all the encoding does: `encodeURIComponent` leaves `.` and `-`
    // untouched, so `..` survives it unchanged and a dot segment would still
    // be resolved by whatever normalises the path. The traversal is refused
    // here instead, before anything is signed.
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
   * Fix-2 review M1: `mark_task_pre_spend_blocked` writes `p_reason` straight
   * into `terminal_error_code`, which `/api/state` selects on every poll, and
   * the reason here can be whatever `signedIdentityUrl`, the anchor read or
   * the inspiration read threw - including a PostgREST body carrying row
   * values. Only the class goes to the RPC; the full message is recorded once
   * in an audit event, which no customer-facing route reads.
   *
   * Fix-3 review M2: that audit insert used to run first and unguarded, so a
   * failed logging write threw before `mark_task_pre_spend_blocked` ever ran.
   * The caller's fallback then reached `fail` at attempt 0, where
   * `reconcile_provider_attempt` finds no attempt row and returns, and the
   * run-start reservation stayed booked for the rest of the day. The RPC that
   * blocks the task and releases the reservation goes first now, and the
   * detail is written after it and cannot propagate: an explanation is never
   * allowed to be a prerequisite for releasing money.
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
  async storeRejectedOutput(input: {
    task: TaskRow;
    run: RunRow;
    revision: RevisionRow;
    attempt: number;
    media: GeneratedMedia;
  }) {
    const checksum = createHash("sha256")
      .update(input.media.bytes)
      .digest("hex");
    const path = `principal/${input.task.owner_principal_id}/design/${input.run.design_id}/revision/${input.revision.id}/run/${input.run.id}/${input.task.presentation_view}/rejected-attempt-${input.attempt}-${checksum.slice(0, 12)}.png`;
    const response = await fetch(
      `${this.url}/storage/v1/object/generated-assets/${path}`,
      {
        method: "POST",
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
      throw new Error(`rejected asset upload failed:${response.status}`);
    return path;
  }
  async complete(input: {
    task: TaskRow;
    run: RunRow;
    revision: RevisionRow;
    attempt: number;
    media: GeneratedMedia;
    stored: { bucket: string; path: string; checksum: string };
    verification: Record<string, unknown>;
    identityFingerprint: string;
    identityArtifactId: string;
    inputAssetIds?: readonly string[];
  }): Promise<TransitionOutcome> {
    // Claim `ready` first: a task cancelled mid-verification must not gain an
    // asset, a motion request, or a `task.ready` audit event.
    const ready = await this.transitionTask(
      input.task.id,
      ["generating", "verifying"],
      "ready",
    );
    if (ready === "cancelled") return "cancelled";
    await this.#request("/rest/v1/assets", {
      method: "POST",
      headers: { prefer: "resolution=ignore-duplicates" },
      body: JSON.stringify({
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
        identity_fingerprint: input.identityFingerprint,
        identity_artifact_id: input.identityArtifactId,
        attempt: input.attempt,
        verification_result: input.verification,
        pipeline_release: input.task.pipeline_release,
        style_anchor_release_id: input.task.style_anchor_release_id,
        input_asset_ids: input.inputAssetIds ?? [],
      }),
    });
    await this.#request("/rest/v1/rpc/reconcile_provider_attempt", {
      method: "POST",
      body: JSON.stringify({
        p_task_id: input.task.id,
        p_attempt: input.attempt,
        p_status: "succeeded",
        p_actual_cost_cents: input.media.estimatedCostCents,
        p_terminal: true,
      }),
    });
    let motionPreview = "not_applicable";
    if (input.task.presentation_view === "studio") {
      // The three model views only become dispatchable once this still exists.
      await this.#request("/rest/v1/rpc/release_dependent_tasks", {
        method: "POST",
        body: JSON.stringify({ p_source_task_id: input.task.id }),
      });
      // Motion is opt-in; with video off no fal preview is requested.
      if (!this.videoEnabled) motionPreview = "disabled";
      else {
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
          motionPreview = "requested";
        } catch (error) {
          motionPreview = "operator_review";
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
          await this.#request(
            `/rest/v1/generation_runs?id=eq.${input.run.id}`,
            {
              method: "PATCH",
              body: JSON.stringify({
                operator_review_reason: `video_request_failed:${reason}`.slice(
                  0,
                  300,
                ),
              }),
            },
          );
        }
      }
    }
    await this.#request("/rest/v1/audit_events", {
      method: "POST",
      body: JSON.stringify({
        design_id: input.run.design_id,
        principal_id: input.task.owner_principal_id,
        actor_type: "job",
        action: "task.ready",
        detail: {
          taskId: input.task.id,
          attempt: input.attempt,
          motionPreview,
        },
      }),
    });
    return "applied";
  }
  async fail(input: {
    task: TaskRow;
    run: RunRow;
    attempt: number;
    error: unknown;
    terminal: boolean;
    actualCostCents: number;
    rejectedObjectPaths?: readonly string[];
  }) {
    const message =
      input.error instanceof Error ? input.error.message : "unknown";
    // Fix-2 review M1: the outer catch of `runPresentationTask` reaches here
    // with whatever the run threw, and `#request` folds a PostgREST status and
    // body into its message, so row values used to land in the
    // customer-visible `terminal_error_code`. The class is what both the
    // ledger row and the task column get; the full message is kept only in the
    // audit event below, which no customer-facing route reads.
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
          ...(input.rejectedObjectPaths?.length
            ? { rejectedObjectPaths: input.rejectedObjectPaths }
            : {}),
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
    config.PROVIDER_MODE === "mock",
    config.VIDEO_ENABLED,
    config.IDENTITY_RINGLESS_CONSTRUCTIONS,
    config.PIPELINE_RELEASE_ID,
    identityBarFallbackReview(environment),
  );
  if (config.PROVIDER_MODE === "mock")
    return {
      repository,
      generator: new MockStudioGenerator(),
      verifier: new MockStudioVerifier(),
      nameReader: undefined as StudioNameReader | undefined,
    };
  return {
    repository,
    generator: new OpenAIStillAdapter(
      config.OPENAI_API_KEY!,
      config.OPENAI_IMAGE_MODEL,
      config.OPENAI_STILL_ESTIMATED_COST_CENTS,
    ),
    // Verifier removed 2026-08-27: the OpenAI vision check passed wrong names.
    verifier: new MockStudioVerifier(),
    // Narrow replacement: transcribe the engraved name and regenerate on drift.
    nameReader: new OpenAINameReader(
      config.OPENAI_API_KEY!,
      config.OPENAI_VERIFIER_MODEL,
    ) as StudioNameReader | undefined,
  };
}
