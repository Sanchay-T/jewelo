import {
  authenticatedUser,
  jsonError,
  supabaseRequest,
} from "../../../../../lib/backend/supabase-rest";

export async function POST(
  request: Request,
  context: { params: Promise<{ taskId: string; action: string }> },
) {
  try {
    const { taskId, action } = await context.params;
    const { bearer, config } = await authenticatedUser(request);
    if (!["retry", "cancel"].includes(action))
      return Response.json({ error: "Unknown action" }, { status: 404 });
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
    const result = await supabaseRequest<Record<string, unknown>>(
      config,
      path,
      { method: "POST", body: JSON.stringify(body) },
      bearer,
    );
    return Response.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
