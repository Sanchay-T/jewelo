import { createHash } from "node:crypto";
import { verifyShopifyHmac } from "../../../../lib/backend/shopify";
import {
  adminConfig,
  jsonError,
  supabaseRequest,
} from "../../../../lib/backend/supabase-rest";

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (!verifyShopifyHmac(raw, request.headers.get("x-shopify-hmac-sha256")))
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    const deliveryId = request.headers.get("x-shopify-webhook-id");
    if (!deliveryId)
      return Response.json({ error: "Missing delivery ID" }, { status: 400 });
    const admin = adminConfig();
    const inserted = await fetch(`${admin.url}/rest/v1/webhook_deliveries`, {
      method: "POST",
      headers: {
        apikey: admin.key,
        authorization: `Bearer ${admin.key}`,
        "content-type": "application/json",
        prefer: "resolution=ignore-duplicates,return=representation",
      },
      body: JSON.stringify({
        provider: "shopify",
        delivery_id: deliveryId,
        payload_sha256: createHash("sha256").update(raw).digest("hex"),
      }),
    });
    if (!inserted.ok)
      throw new Error(`Webhook deduplication failed:${inserted.status}`);
    const rows = (await inserted.json()) as Array<Record<string, unknown>>;
    if (!rows.length) return Response.json({ accepted: true, duplicate: true });
    const payload = JSON.parse(raw) as {
      id?: number;
      admin_graphql_api_id?: string;
      note_attributes?: Array<{ name: string; value: string }>;
    };
    const quoteId = payload.note_attributes?.find(
      (item) => item.name === "jewelo_quote_id",
    )?.value;
    if (quoteId) {
      await supabaseRequest(
        admin,
        `/rest/v1/quotes?id=eq.${encodeURIComponent(quoteId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ checkout_status: "completed" }),
        },
      );
      await supabaseRequest(admin, "/rest/v1/audit_events", {
        method: "POST",
        body: JSON.stringify({
          actor_type: "webhook",
          action: "shopify.checkout_completed",
          detail: { quoteId, deliveryId },
        }),
      });
    }
    await supabaseRequest(
      admin,
      `/rest/v1/webhook_deliveries?provider=eq.shopify&delivery_id=eq.${encodeURIComponent(deliveryId)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ processed_at: new Date().toISOString() }),
      },
    );
    return Response.json({ accepted: true, duplicate: false });
  } catch (error) {
    return jsonError(error);
  }
}
