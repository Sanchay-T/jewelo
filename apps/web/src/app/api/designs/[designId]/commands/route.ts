import {
  adminConfig,
  authenticatedUser,
  jsonError,
  readJson,
  supabaseRequest,
} from "../../../../../lib/backend/supabase-rest";

export async function POST(
  request: Request,
  context: { params: Promise<{ designId: string }> },
) {
  try {
    const { designId } = await context.params;
    const { user, bearer, config } = await authenticatedUser(request);
    const input = await readJson<{
      command: "estimate" | "request_quote" | "accept_quote" | "set_resume";
      quoteId?: string;
      revisionId?: string;
      resumePath?: string;
      idempotencyKey?: string;
      checkoutIdempotencyKey?: string;
    }>(request, ["command"]);
    const admin = adminConfig();
    const designs = await supabaseRequest<
      Array<{ active_revision_id: string }>
    >(
      admin,
      `/rest/v1/designs?id=eq.${encodeURIComponent(designId)}&owner_principal_id=eq.${user.id}&select=active_revision_id`,
    );
    const design = designs[0];
    if (!design)
      return Response.json(
        { error: "Design not found", code: "not_found" },
        { status: 404 },
      );

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

    const revisionId = input.revisionId ?? design.active_revision_id;

    if (input.command === "estimate") {
      const snapshot = await supabaseRequest<Record<string, unknown>>(
        config,
        "/rest/v1/rpc/estimate_revision",
        {
          method: "POST",
          body: JSON.stringify({ p_revision_id: revisionId }),
        },
        bearer,
      );
      return Response.json(snapshot, { status: 201 });
    }

    if (input.command === "request_quote") {
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
        `/rest/v1/design_revisions?id=eq.${encodeURIComponent(revisionId)}&owner_principal_id=eq.${user.id}&select=specification`,
      );
      if (revisions[0]?.specification.spellingConfirmed !== true)
        throw new Error("Persisted spelling confirmation required");
      const snapshots = await supabaseRequest<
        Array<Record<string, unknown>>
      >(
        config,
        `/rest/v1/price_snapshots?revision_id=eq.${encodeURIComponent(revisionId)}&select=*&order=created_at.desc&limit=1`,
        {},
        bearer,
      );
      const snapshot = snapshots[0];
      if (!snapshot) throw new Error("Estimate required");
      if (Date.parse(String(snapshot.expires_at)) < Date.now())
        throw new Error("Estimate expired; request a new estimate");
      const low = Number(snapshot.low_amount);
      const high = Number(snapshot.high_amount);
      const rows = await supabaseRequest<Array<Record<string, unknown>>>(
        admin,
        "/rest/v1/quotes",
        {
          method: "POST",
          headers: { prefer: "return=representation" },
          body: JSON.stringify({
            design_id: designId,
            revision_id: revisionId,
            owner_principal_id: user.id,
            status: "requested",
            currency: String(snapshot.currency ?? "AED"),
            total: Math.round((low + high) / 2),
            snapshot,
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
