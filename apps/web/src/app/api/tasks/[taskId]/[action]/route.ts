import {
  authenticatedUser,
  jsonError,
  supabaseRequest,
} from "../../../../../lib/backend/supabase-rest";
import { attemptImmediateDispatch } from "../../../../../lib/backend/trigger-dispatch";

export async function POST(
  request: Request,
  context: { params: Promise<{ taskId: string; action: string }> },
) {
  try {
    const { taskId, action } = await context.params;
    const { bearer, config } = await authenticatedUser(request);
    if (!["retry", "cancel"].includes(action))
      throw new Error("Unknown action not found");
    const input =
      action === "retry"
        ? ((await request.json().catch(() => ({}))) as {
            idempotencyKey?: string;
          })
        : {};
    const path =
      action === "retry"
        ? "/rest/v1/rpc/retry_generation_task"
        : "/rest/v1/rpc/cancel_generation_task";
    const body =
      action === "retry"
        ? {
            p_task_id: taskId,
            p_retry_key: input.idempotencyKey ?? crypto.randomUUID(),
          }
        : { p_task_id: taskId };
    const row = await supabaseRequest<Record<string, unknown>>(
      config,
      path,
      { method: "POST", body: JSON.stringify(body) },
      bearer,
    );
    const dispatch =
      action === "retry"
        ? await attemptImmediateDispatch(taskId)
        : undefined;
    return Response.json({ ...row, ...(dispatch ?? {}) });
  } catch (error) {
    return jsonError(error);
  }
}
