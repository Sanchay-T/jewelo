/**
 * Reading one personalized run out of `GET /api/state`.
 *
 * Pure functions only: no fetch, no storage, no React. Everything the review
 * stage claims about a customer's own pendant is decided here, so the rules that
 * keep it honest are testable in isolation:
 *
 * - a view is only presented as the customer's photograph when its task is
 *   `ready`, an asset exists, and that asset came from a real image provider;
 * - a mock asset proves the pipeline works, so it is never shown as the piece;
 * - a run that ends with Studio ready and its dependent views blocked is a
 *   partial success, not a failure of the whole run;
 * - nothing here invents a percentage, an estimate or a remaining time.
 */
import { views, type View } from "./model";

export type StateRow = Record<string, unknown>;
export interface StatePayload {
  principalId?: unknown;
  generation_runs?: StateRow[];
  generation_tasks?: StateRow[];
  assets?: StateRow[];
  design_revisions?: StateRow[];
}

/** The database task states, plus `absent` for a view this run never created. */
export type PersonalizedViewState =
  | "queued"
  | "generating"
  | "verifying"
  | "ready"
  | "retrying"
  | "failed"
  | "blocked"
  | "cancelled"
  | "absent";

const VIEW_STATES: readonly PersonalizedViewState[] = [
  "queued",
  "generating",
  "verifying",
  "ready",
  "retrying",
  "failed",
  "blocked",
  "cancelled",
  "absent",
];
/** A view that can still change on its own. Everything else is terminal. */
const IN_FLIGHT: readonly PersonalizedViewState[] = [
  "queued",
  "generating",
  "verifying",
  "retrying",
];
/**
 * `PROVIDER_MODE=mock` writes a placeholder asset with provider `mock` so the
 * durable pipeline can be exercised without spending. It is real plumbing and a
 * fake photograph: presenting it as the shopper's pendant would be exactly the
 * borrowed-image lie this product forbids.
 */
const PLACEHOLDER_PROVIDERS = new Set(["mock"]);

export const PRESENTATION_BY_VIEW: Readonly<Record<View, string>> = {
  Studio: "studio",
  "On skin": "on_skin",
  "Close-up": "close_up",
  Dark: "dark",
};

export interface PersonalizedViewSlot {
  view: View;
  state: PersonalizedViewState;
  attempt: number;
  taskId?: string;
  assetId?: string;
  /** Short-lived signed URL. Never persisted; re-read from `/api/state`. */
  imageUrl?: string;
  provider?: string;
  /** Present only on a terminal task; a fixed server vocabulary, never prose. */
  errorCode?: string;
  /** True when this is the customer's own verified photograph. */
  presentable: boolean;
  /**
   * False when this run can never produce this view. The three model views are
   * created with a dependency on the studio still and carry no outbox row: they
   * are dispatched only by `release_dependent_tasks` after studio is ready, so a
   * studio task that ends blocked leaves them `queued` for ever. Rendering that
   * as a spinner would be the fake progress this product forbids.
   */
  reachable: boolean;
}

export type PersonalizedRunOutcome = "pending" | "personalized" | "unavailable";

export interface PersonalizedRun {
  runId: string;
  designId?: string;
  revisionId?: string;
  status: string;
  slots: PersonalizedViewSlot[];
  /** Views whose own photograph can be shown. */
  ready: View[];
  outcome: PersonalizedRunOutcome;
  /** No view can still progress without a new run. */
  settled: boolean;
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}
function rows(value: unknown): StateRow[] {
  return Array.isArray(value) ? (value as StateRow[]) : [];
}
function viewState(value: unknown): PersonalizedViewState {
  const state = text(value) as PersonalizedViewState;
  // An unknown state is treated as still queued rather than as a failure: the
  // customer is never told their piece failed because of a vocabulary gap.
  return VIEW_STATES.includes(state) ? state : "queued";
}

export function isInFlight(state: PersonalizedViewState): boolean {
  return IN_FLIGHT.includes(state);
}

/** One personalized run, or undefined when this principal cannot see it. */
export function readPersonalizedRun(
  payload: StatePayload,
  runId: string,
): PersonalizedRun | undefined {
  const run = rows(payload.generation_runs).find(
    (row) => text(row.id) === runId,
  );
  if (!run) return undefined;
  const taskRows = rows(payload.generation_tasks).filter(
    (row) => text(row.run_id) === runId,
  );
  const assetRows = rows(payload.assets).filter(
    (row) => text(row.run_id) === runId,
  );
  const runStatus = text(run.status, "queued");
  const studioTask = taskRows.find(
    (row) => text(row.presentation_view) === "studio",
  );
  const studioState = studioTask ? viewState(studioTask.status) : "absent";
  // The three model views depend on the studio still. If studio can no longer
  // become ready, or the whole run was stopped, they will never be dispatched.
  const dependentsStranded =
    ["failed", "blocked", "cancelled", "absent"].includes(studioState) ||
    ["cancelled", "operator_review"].includes(runStatus);
  const slots = views.map((view): PersonalizedViewSlot => {
    const presentation = PRESENTATION_BY_VIEW[view];
    const task = taskRows.find(
      (row) => text(row.presentation_view) === presentation,
    );
    const asset = assetRows.find(
      (row) => text(row.presentation_view) === presentation,
    );
    const state = task ? viewState(task.status) : "absent";
    const provider = asset ? text(asset.provider) : undefined;
    const imageUrl = asset ? text(asset.signed_url) || undefined : undefined;
    return {
      view,
      state,
      attempt: Number(task?.attempt ?? 0),
      taskId: task ? text(task.id) : undefined,
      assetId: asset ? text(asset.id) : undefined,
      imageUrl,
      provider,
      errorCode: text(task?.terminal_error_code) || undefined,
      presentable:
        state === "ready" &&
        !!imageUrl &&
        !!provider &&
        !PLACEHOLDER_PROVIDERS.has(provider),
      reachable:
        state === "ready" ||
        (isInFlight(state) && !(view !== "Studio" && dependentsStranded)),
    };
  });
  const ready = slots.filter((slot) => slot.presentable).map((slot) => slot.view);
  const settled = !slots.some((slot) => isInFlight(slot.state) && slot.reachable);
  return {
    runId,
    designId: text(run.design_id) || undefined,
    revisionId: text(run.revision_id) || undefined,
    status: runStatus,
    slots,
    ready,
    // A settled run with no presentable photograph has nothing to show the
    // customer, whatever its database status says.
    outcome: ready.length ? "personalized" : settled ? "unavailable" : "pending",
    settled,
  };
}

export function slotFor(run: PersonalizedRun, view: View) {
  return run.slots.find((slot) => slot.view === view);
}

/** The hero is the customer's Studio photograph, the moment it exists. */
export function heroSlot(run: PersonalizedRun | undefined) {
  const studio = run && slotFor(run, "Studio");
  return studio?.presentable ? studio : undefined;
}

/**
 * Why a personalized run could not be started or could not finish. Each value
 * has one honest customer sentence; none of them blames the customer or hides
 * behind a generic error.
 */
export type DegradeReason =
  | "daily_limit"
  | "busy"
  /** Proved unmakeable by the identity engine before any spend. */
  | "unsupported"
  | "spend_guard"
  | "run_active"
  | "dispatch"
  | "unauthenticated"
  | "invalid"
  | "unavailable";

export interface ApiFailure {
  code?: string;
  message?: string;
}

export function classifyStartFailure(failure: ApiFailure): DegradeReason {
  const message = failure.message ?? "";
  const code = failure.code ?? "";
  // The per-principal daily allowance. The database raises 'daily generation
  // quota exceeded', which the shared error mapper classifies as a 409 conflict
  // because its pattern reads "generation limit"; the customer sentence for it
  // is "try again tomorrow", so it is recognised here from the message too.
  // The global caps are the business's ceiling for the day, not this shopper's.
  // Telling them to "try again tomorrow" would be a lie about whose limit it is.
  if (/global daily/i.test(message)) return "busy";
  if (/daily generation (quota|limit)/i.test(message)) return "daily_limit";
  if (code === "spend_guard" || /spend guard/i.test(message))
    return "spend_guard";
  if (code === "run_active" || /one active generation run/i.test(message))
    return "run_active";
  if (code === "unauthenticated" || code === "forbidden")
    return "unauthenticated";
  if (code === "invalid_input") return "invalid";
  return "unavailable";
}

/** The dispatch half of `POST /api/revisions/approve`. */
export interface DispatchOutcome {
  dispatchState?: unknown;
  acceptedCount?: unknown;
  pendingCount?: unknown;
  errorCode?: unknown;
}
const DISPATCH_ERRORS = ["not_configured", "rejected", "dispatch_failed"];
/**
 * Only the fixed dispatch-error vocabulary counts as a rejection. An idempotent
 * replay legitimately reports nothing accepted and nothing pending because the
 * outbox rows were already published, and that run is healthy.
 */
export function dispatchRejected(outcome: DispatchOutcome): boolean {
  return DISPATCH_ERRORS.includes(text(outcome.errorCode));
}

/**
 * What a shopper is told about one view. Deliberately six words of vocabulary,
 * mapped from durable task state; `terminal_error_code` values such as
 * `style_anchor_missing:<id>` are internal and never reach the screen.
 */
export type CustomerViewStatus =
  | "waiting"
  | "working"
  | "checking"
  | "ready"
  | "preparing";

export function customerViewStatus(
  slot: PersonalizedViewSlot,
): CustomerViewStatus {
  if (slot.presentable) return "ready";
  if (!slot.reachable) return "preparing";
  switch (slot.state) {
    case "generating":
      return "working";
    case "verifying":
      return "checking";
    case "retrying":
    case "queued":
      return "waiting";
    default:
      // ready-without-a-usable-asset, failed, blocked, cancelled and absent all
      // mean the same thing to a customer: this view is not coming from this run.
      return "preparing";
  }
}

/**
 * A run that has produced nothing after this long is not going to be watched any
 * longer by a shopper standing in a shop. Polling continues, but the honest
 * capture path opens so they can leave and still receive the piece.
 */
export const PERSONALIZED_RUN_CEILING_MS = 6 * 60 * 1000;

export function pastCeiling(
  startedAt: number,
  now: number,
  ceilingMs = PERSONALIZED_RUN_CEILING_MS,
) {
  return now - startedAt >= ceilingMs;
}

/**
 * Refusals the client can prove before spending anything. The Arabic identity
 * engine solves exactly one name (`unsupported_arabic_two_name`), so a two-name
 * Arabic pendant would burn a run, a reservation and a slot of the daily
 * allowance only to end blocked. It goes straight to request capture instead.
 */
export type PreflightRefusal = "arabic_two_name";

export function preflightRefusal(specification: {
  script: string;
  names: readonly string[];
}): PreflightRefusal | undefined {
  return specification.script === "Arabic" && specification.names.length > 1
    ? "arabic_two_name"
    : undefined;
}

/**
 * Whether this confirmation should buy a run. Exactly one run per specification:
 * the confirmation checkbox is not persisted and is reset by several unrelated
 * actions, so unticking and reticking, or a reload, must never buy a second one.
 */
export function shouldStartRun(input: {
  enabled: boolean;
  loaded: boolean;
  stage: "design" | "review";
  confirmed: boolean;
  signature: string;
  /** The specification a run was already started for in this session. */
  startedFor?: string;
}): boolean {
  return (
    input.enabled &&
    input.loaded &&
    input.confirmed &&
    input.stage === "review" &&
    input.startedFor !== input.signature
  );
}
