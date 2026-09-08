import { requireOperatorSession } from "../../../../lib/backend/operator-session";
import {
  adminConfig,
  jsonError,
  supabaseRequest,
} from "../../../../lib/backend/supabase-rest";

/**
 * The runs a person has to look at.
 *
 * A run in `operator_review` is one the pipeline stopped on purpose: it has a
 * reason on the run row and, usually, a terminal code on the task that stopped.
 * Nothing in the shop could read either until now, so a stopped piece sat in
 * the database and nobody was told. This route publishes exactly the columns
 * the queue needs to say what happened and to offer the retry the database
 * already supports; the private lineage (provider keys, reservation cents,
 * prompt snapshots) stays on the server, as it does on `/api/state`.
 */
const RUN_COLUMNS = [
  "id",
  "design_id",
  "revision_id",
  "status",
  "operator_review_reason",
  "created_at",
  "updated_at",
].join(",");

const TASK_COLUMNS = [
  "id",
  "run_id",
  "presentation_view",
  "status",
  "attempt",
  "terminal_error_code",
  "cancel_requested_at",
].join(",");

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function GET(request: Request) {
  try {
    requireOperatorSession(request);
    const requested = Number(
      new URL(request.url).searchParams.get("limit") ?? DEFAULT_LIMIT,
    );
    const limit = Number.isFinite(requested)
      ? Math.min(Math.max(Math.trunc(requested), 1), MAX_LIMIT)
      : DEFAULT_LIMIT;
    const admin = adminConfig();
    const runs = await supabaseRequest<Array<Record<string, unknown>>>(
      admin,
      `/rest/v1/generation_runs?select=${RUN_COLUMNS}&status=eq.operator_review&order=created_at.desc&limit=${limit}`,
    );
    // One query for every run's tasks, or none at all when nothing is waiting.
    const runIds = runs.map((run) => String(run.id));
    const tasks = runIds.length
      ? await supabaseRequest<Array<Record<string, unknown>>>(
          admin,
          `/rest/v1/generation_tasks?select=${TASK_COLUMNS}&run_id=in.(${runIds
            .map(encodeURIComponent)
            .join(",")})&order=created_at`,
        )
      : [];
    return Response.json(
      {
        runs: runs.map((run) => ({
          id: String(run.id),
          designId: run.design_id ? String(run.design_id) : undefined,
          revisionId: run.revision_id ? String(run.revision_id) : undefined,
          status: String(run.status),
          reason: run.operator_review_reason
            ? String(run.operator_review_reason)
            : undefined,
          createdAt: String(run.created_at),
          tasks: tasks
            .filter((task) => String(task.run_id) === String(run.id))
            .map((task) => ({
              id: String(task.id),
              view: task.presentation_view
                ? String(task.presentation_view)
                : undefined,
              status: String(task.status),
              attempt: Number(task.attempt ?? 0),
              errorCode: task.terminal_error_code
                ? String(task.terminal_error_code)
                : undefined,
              cancelRequested: Boolean(task.cancel_requested_at),
            })),
        })),
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return jsonError(error);
  }
}
