import {
  adminConfig,
  authenticatedUser,
  jsonError,
  supabaseRequest,
} from "../../../../../lib/backend/supabase-rest";

export async function POST(
  request: Request,
  context: { params: Promise<{ designId: string }> },
) {
  try {
    const { designId } = await context.params;
    const { user } = await authenticatedUser(request);
    const input = (await request.json()) as {
      command: "request_quote" | "accept_quote" | "set_resume";
      quoteId?: string;
      estimate?: Record<string, unknown>;
      resumePath?: string;
      idempotencyKey?: string;
      checkoutIdempotencyKey?: string;
    };
    const admin = adminConfig();
    const designs = await supabaseRequest<
      Array<{ active_revision_id: string }>
    >(
      admin,
      `/rest/v1/designs?id=eq.${encodeURIComponent(designId)}&owner_principal_id=eq.${user.id}&select=active_revision_id`,
    );
    const design = designs[0];
    if (!design)
      return Response.json({ error: "Design not found" }, { status: 404 });

    if (input.command === "set_resume") {
      if (!input.resumePath?.startsWith("/"))
        throw new Error("Invalid resume path");
      const rows = await supabaseRequest<Array<Record<string, unknown>>>(
        admin,
        `/rest/v1/designs?id=eq.${encodeURIComponent(designId)}&owner_principal_id=eq.${user.id}`,
        {
          method: "PATCH",
          headers: { prefer: "return=representation" },
          body: JSON.stringify({ resume_path: input.resumePath }),
        },
      );
      return Response.json(rows[0]);
    }

    if (input.command === "request_quote") {
      if (!input.estimate) throw new Error("Estimate required");
      if (!input.idempotencyKey) throw new Error("Idempotency key required");
      const existing = await supabaseRequest<Array<Record<string, unknown>>>(
        admin,
        `/rest/v1/quotes?owner_principal_id=eq.${user.id}&checkout_idempotency_key=eq.${encodeURIComponent(input.idempotencyKey)}`,
      );
      if (existing[0]) return Response.json(existing[0]);
      const revisions = await supabaseRequest<
        Array<{ specification: Record<string, unknown> }>
      >(
        admin,
        `/rest/v1/design_revisions?id=eq.${design.active_revision_id}&owner_principal_id=eq.${user.id}&select=specification`,
      );
      if (revisions[0]?.specification.spellingConfirmed !== true)
        throw new Error("Persisted spelling confirmation required");
      const low = Number(input.estimate.low);
      const high = Number(input.estimate.high);
      const rows = await supabaseRequest<Array<Record<string, unknown>>>(
        admin,
        "/rest/v1/quotes",
        {
          method: "POST",
          headers: { prefer: "return=representation" },
          body: JSON.stringify({
            design_id: designId,
            revision_id: design.active_revision_id,
            owner_principal_id: user.id,
            status: "requested",
            currency: "AED",
            total: Math.round((low + high) / 2),
            snapshot: input.estimate,
            checkout_idempotency_key: input.idempotencyKey,
            expires_at: new Date(Date.now() + 7 * 86400_000).toISOString(),
          }),
        },
      );
      await supabaseRequest(admin, "/rest/v1/audit_events", {
        method: "POST",
        body: JSON.stringify({
          design_id: designId,
          principal_id: user.id,
          actor_type: "customer",
          action: "quote.requested",
          detail: { quoteId: rows[0]?.id },
        }),
      });
      return Response.json(rows[0], { status: 201 });
    }

    if (!input.quoteId) throw new Error("Quote ID required");
    if (!input.idempotencyKey || !input.checkoutIdempotencyKey)
      throw new Error("Idempotency keys required");
    const existing = await supabaseRequest<Array<Record<string, unknown>>>(
      admin,
      `/rest/v1/quotes?id=eq.${encodeURIComponent(input.quoteId)}&design_id=eq.${encodeURIComponent(designId)}&owner_principal_id=eq.${user.id}`,
    );
    if (
      existing[0]?.status === "accepted" &&
      existing[0]?.checkout_idempotency_key === input.checkoutIdempotencyKey
    )
      return Response.json(existing[0]);
    const rows = await supabaseRequest<Array<Record<string, unknown>>>(
      admin,
      `/rest/v1/quotes?id=eq.${encodeURIComponent(input.quoteId)}&design_id=eq.${encodeURIComponent(designId)}&owner_principal_id=eq.${user.id}&status=eq.issued&expires_at=gt.${encodeURIComponent(new Date().toISOString())}`,
      {
        method: "PATCH",
        headers: { prefer: "return=representation" },
        body: JSON.stringify({
          status: "accepted",
          checkout_idempotency_key: input.checkoutIdempotencyKey,
        }),
      },
    );
    if (!rows[0])
      throw new Error("Only a current issued quote can be accepted");
    await supabaseRequest(admin, "/rest/v1/audit_events", {
      method: "POST",
      body: JSON.stringify({
        design_id: designId,
        principal_id: user.id,
        actor_type: "customer",
        action: "quote.accepted",
        detail: { quoteId: input.quoteId },
      }),
    });
    return Response.json(rows[0]);
  } catch (error) {
    return jsonError(error);
  }
}
