import {
  adminConfig,
  jsonError,
  supabaseRequest,
} from "../../../../lib/backend/supabase-rest";
import { requireOperatorSession } from "../../../../lib/backend/operator-session";

export async function POST(request: Request) {
  try {
    requireOperatorSession(request);
    const admin = adminConfig();
    const input = (await request.json()) as {
      command: string;
      designId: string;
      targetId: string;
      payload?: Record<string, unknown>;
      idempotencyKey: string;
    };
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
    } else
      return Response.json(
        { error: "Unknown operator command" },
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
    return Response.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
