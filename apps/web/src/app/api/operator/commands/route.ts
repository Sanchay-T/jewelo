import {
  adminConfig,
  authenticatedUser,
  jsonError,
  supabaseRequest,
} from "../../../../lib/backend/supabase-rest";

export async function POST(request: Request) {
  try {
    const { user } = await authenticatedUser(request);
    const admin = adminConfig();
    const profiles = await supabaseRequest<Array<{ role: string }>>(
      admin,
      `/rest/v1/profiles?id=eq.${user.id}&select=role`,
    );
    if (profiles[0]?.role !== "operator")
      return Response.json(
        { error: "Operator role required" },
        { status: 403 },
      );
    const input = (await request.json()) as {
      command: string;
      designId: string;
      targetId: string;
      payload?: Record<string, unknown>;
      idempotencyKey: string;
    };
    let result: unknown;
    if (input.command === "issue_quote") {
      result = await supabaseRequest(admin, "/rest/v1/quotes", {
        method: "POST",
        headers: { prefer: "return=representation" },
        body: JSON.stringify({
          design_id: input.designId,
          revision_id: input.payload?.revisionId,
          owner_principal_id: input.payload?.ownerPrincipalId,
          status: "issued",
          currency: "AED",
          total: input.payload?.total,
          snapshot: input.payload?.snapshot,
          checkout_idempotency_key: input.idempotencyKey,
          issued_at: new Date().toISOString(),
          expires_at: input.payload?.expiresAt,
        }),
      });
    } else if (input.command === "review_task") {
      result = await supabaseRequest(
        admin,
        `/rest/v1/generation_tasks?id=eq.${encodeURIComponent(input.targetId)}`,
        {
          method: "PATCH",
          headers: { prefer: "return=representation" },
          body: JSON.stringify({
            status: input.payload?.decision === "retry" ? "retrying" : "failed",
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
        principal_id: user.id,
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
