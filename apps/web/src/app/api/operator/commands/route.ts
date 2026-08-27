import {
  adminConfig,
  jsonError,
  readJson,
  supabaseRequest,
} from "../../../../lib/backend/supabase-rest";
import { requireOperatorSession } from "../../../../lib/backend/operator-session";
import { attemptImmediateDispatch } from "../../../../lib/backend/trigger-dispatch";

export async function POST(request: Request) {
  try {
    requireOperatorSession(request);
    const admin = adminConfig();
    const input = await readJson<{
      command: string;
      designId: string;
      targetId: string;
      payload?: Record<string, unknown>;
      idempotencyKey: string;
    }>(request, ["command", "designId", "targetId", "idempotencyKey"]);
    let result: unknown;
    if (input.command === "issue_quote") {
      result = await supabaseRequest(
        admin,
        `/rest/v1/quotes?id=eq.${encodeURIComponent(input.targetId)}&design_id=eq.${encodeURIComponent(input.designId)}&status=eq.requested`,
        {
          method: "PATCH",
          headers: { prefer: "return=representation" },
          body: JSON.stringify({
            status: "issued",
            total: input.payload?.total,
            issued_at: new Date().toISOString(),
            expires_at: input.payload?.expiresAt,
          }),
        },
      );
    } else if (input.command === "review_task") {
      result =
        input.payload?.decision === "retry"
          ? await supabaseRequest(
              admin,
              "/rest/v1/rpc/operator_retry_generation_task",
              {
                method: "POST",
                body: JSON.stringify({
                  p_task_id: input.targetId,
                  p_retry_key: input.idempotencyKey,
                  p_reason: input.payload?.reason,
                }),
              },
            )
          : await supabaseRequest(
              admin,
              `/rest/v1/generation_tasks?id=eq.${encodeURIComponent(input.targetId)}`,
              {
                method: "PATCH",
                headers: { prefer: "return=representation" },
                body: JSON.stringify({
                  status: "failed",
                  terminal_error_code: input.payload?.reason,
                }),
              },
            );
    } else if (input.command === "fulfillment_transition") {
      result = await supabaseRequest(
        admin,
        `/rest/v1/orders?id=eq.${encodeURIComponent(input.targetId)}`,
        {
          method: "PATCH",
          headers: { prefer: "return=representation" },
          body: JSON.stringify({ status: input.payload?.status }),
        },
      );
    } else if (input.command === "request_video") {
      result = await supabaseRequest(admin, "/rest/v1/rpc/request_video_task", {
        method: "POST",
        body: JSON.stringify({
          p_run_id: input.payload?.runId,
          p_kind: input.payload?.kind,
          p_source_task_id: input.targetId,
          p_request_key: input.idempotencyKey,
        }),
      });
    } else
      return Response.json(
        { error: "Unknown operator command", code: "not_found" },
        { status: 404 },
      );
    await supabaseRequest(admin, "/rest/v1/audit_events", {
      method: "POST",
      body: JSON.stringify({
        design_id: input.designId,
        actor_type: "operator",
        action: `operator.${input.command}`,
        detail: {
          targetId: input.targetId,
          idempotencyKey: input.idempotencyKey,
        },
      }),
    });
    const resultRecord = Array.isArray(result)
      ? (result[0] as Record<string, unknown> | undefined)
      : (result as Record<string, unknown> | undefined);
    const dispatchAggregateId =
      input.command === "request_video"
        ? String(resultRecord?.id ?? "")
        : input.command === "review_task" && input.payload?.decision === "retry"
          ? input.targetId
          : "";
    const dispatch = dispatchAggregateId
      ? await attemptImmediateDispatch(dispatchAggregateId)
      : undefined;
    return Response.json({ ...(resultRecord ?? {}), ...(dispatch ?? {}) });
  } catch (error) {
    return jsonError(error);
  }
}
