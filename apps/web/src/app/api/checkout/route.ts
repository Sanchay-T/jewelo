import { createShopifyDraftOrder } from "../../../lib/backend/shopify";
import {
  adminConfig,
  authenticatedUser,
  jsonError,
  supabaseRequest,
} from "../../../lib/backend/supabase-rest";

export async function POST(request: Request) {
  try {
    const { user } = await authenticatedUser(request);
    const { quoteId, idempotencyKey } = (await request.json()) as {
      quoteId: string;
      idempotencyKey: string;
    };
    const admin = adminConfig();
    const quotes = await supabaseRequest<Array<Record<string, unknown>>>(
      admin,
      `/rest/v1/quotes?id=eq.${encodeURIComponent(quoteId)}&owner_principal_id=eq.${user.id}`,
    );
    const quote = quotes[0];
    if (!quote)
      return Response.json({ error: "Quote not found" }, { status: 404 });
    if (quote.shopify_draft_order_id)
      return Response.json({
        mode: String(quote.shopify_draft_order_id).startsWith("mock:")
          ? "mock"
          : "shopify",
        draftOrderId: quote.shopify_draft_order_id,
        checkoutUrl: quote.checkout_url,
      });
    if (quote.checkout_idempotency_key !== idempotencyKey)
      return Response.json(
        { error: "Checkout idempotency key mismatch" },
        { status: 409 },
      );
    const reservation = await supabaseRequest<Array<Record<string, unknown>>>(
      admin,
      `/rest/v1/quotes?id=eq.${encodeURIComponent(quoteId)}&owner_principal_id=eq.${user.id}&checkout_status=eq.not_created&shopify_draft_order_id=is.null`,
      {
        method: "PATCH",
        headers: { prefer: "return=representation" },
        body: JSON.stringify({ checkout_status: "draft" }),
      },
    );
    if (!reservation[0]) {
      const winner = await supabaseRequest<Array<Record<string, unknown>>>(
        admin,
        `/rest/v1/quotes?id=eq.${encodeURIComponent(quoteId)}&owner_principal_id=eq.${user.id}`,
      );
      if (winner[0]?.shopify_draft_order_id)
        return Response.json({
          draftOrderId: winner[0].shopify_draft_order_id,
          checkoutUrl: winner[0].checkout_url,
          deduplicated: true,
        });
      return Response.json(
        { status: "creating", deduplicated: true },
        { status: 202 },
      );
    }
    await supabaseRequest(admin, "/rest/v1/audit_events", {
      method: "POST",
      body: JSON.stringify({
        design_id: quote.design_id,
        principal_id: user.id,
        actor_type: "customer",
        action: "checkout.draft_order_reserved",
        detail: { quoteId, idempotencyKey },
      }),
    });
    let result;
    try {
      result = await createShopifyDraftOrder({
        quoteId,
        idempotencyKey,
        title: "Custom Jewelo name pendant",
        amountAed: Number(quote.total),
      });
    } catch (error) {
      await supabaseRequest(admin, "/rest/v1/audit_events", {
        method: "POST",
        body: JSON.stringify({
          design_id: quote.design_id,
          principal_id: user.id,
          actor_type: "system",
          action: "checkout.draft_order_requires_review",
          detail: { quoteId, idempotencyKey },
        }),
      });
      throw error;
    }
    const updated = await supabaseRequest<Array<Record<string, unknown>>>(
      admin,
      `/rest/v1/quotes?id=eq.${encodeURIComponent(quoteId)}&checkout_status=eq.draft&shopify_draft_order_id=is.null`,
      {
        method: "PATCH",
        headers: { prefer: "return=representation" },
        body: JSON.stringify({
          shopify_draft_order_id: result.draftOrderId,
          checkout_url: result.checkoutUrl,
          checkout_status: "ready",
        }),
      },
    );
    if (!updated[0]) throw new Error("Checkout reconciliation requires review");
    await supabaseRequest(admin, "/rest/v1/audit_events", {
      method: "POST",
      body: JSON.stringify({
        design_id: quote.design_id,
        principal_id: user.id,
        actor_type: "customer",
        action: "checkout.draft_order_created",
        detail: { quoteId, mode: result.mode },
      }),
    });
    return Response.json(result, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
