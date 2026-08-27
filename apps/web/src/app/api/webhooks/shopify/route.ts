import { createHash } from "node:crypto";
import {
  parseShopifyDomain,
  verifyShopifyHmac,
} from "../../../../lib/backend/shopify";
import {
  adminConfig,
  jsonError,
  supabaseRequest,
} from "../../../../lib/backend/supabase-rest";

export async function POST(request: Request) {
  try {
    const declaredLength = Number(request.headers.get("content-length") ?? "0");
    if (declaredLength > 1_000_000)
      return Response.json({ error: "Payload too large" }, { status: 413 });
    const raw = new Uint8Array(await request.arrayBuffer());
    if (raw.byteLength > 1_000_000)
      return Response.json({ error: "Payload too large" }, { status: 413 });
    if (!verifyShopifyHmac(raw, request.headers.get("x-shopify-hmac-sha256")))
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    const deliveryId = request.headers.get("x-shopify-webhook-id");
    if (!deliveryId)
      return Response.json({ error: "Missing delivery ID" }, { status: 400 });
    const topic = request.headers.get("x-shopify-topic");
    const shopDomain = request.headers.get("x-shopify-shop-domain");
    const configuredDomain = parseShopifyDomain(
      process.env.SHOPIFY_STORE_DOMAIN,
    );
    if (shopDomain?.toLowerCase() !== configuredDomain)
      return Response.json({ error: "Unexpected shop" }, { status: 401 });
    const rawText = new TextDecoder().decode(raw);
    const payloadSha256 = createHash("sha256").update(raw).digest("hex");
    const payload = JSON.parse(rawText) as {
      id?: number;
      admin_graphql_api_id?: string;
      financial_status?: string;
      note_attributes?: Array<{ name: string; value: string }>;
    };
    const quoteId = payload.note_attributes?.find((item) =>
      ["caleums_quote_id", "jewelo_quote_id"].includes(item.name),
    )?.value;
    const validQuoteId = Boolean(
      quoteId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        quoteId,
      ),
    );
    const shopifyOrderId =
      payload.admin_graphql_api_id ?? String(payload.id ?? "");
    if (topic !== "orders/paid" || payload.financial_status !== "paid")
      return Response.json({ accepted: true, ignored: true });
    const admin = adminConfig();
    if (!validQuoteId || !shopifyOrderId) {
      const incident = await supabaseRequest<Record<string, unknown>>(
        admin,
        "/rest/v1/rpc/record_shopify_webhook_incident",
        {
          method: "POST",
          body: JSON.stringify({
            p_delivery_id: deliveryId,
            p_payload_sha256: payloadSha256,
            p_shop_domain: configuredDomain,
            p_topic: topic,
            p_reason: !quoteId
              ? "Paid order is missing Jewelo quote correlation"
              : !validQuoteId
                ? "Paid order has an invalid Jewelo quote correlation"
                : "Paid order is missing Shopify order ID",
            p_shopify_order_id: shopifyOrderId || null,
          }),
        },
      );
      return Response.json(incident);
    }
    const result = await supabaseRequest<Record<string, unknown>>(
      admin,
      "/rest/v1/rpc/ingest_shopify_paid_webhook",
      {
        method: "POST",
        body: JSON.stringify({
          p_delivery_id: deliveryId,
          p_payload_sha256: payloadSha256,
          p_shop_domain: configuredDomain,
          p_quote_id: quoteId!,
          p_shopify_order_id: shopifyOrderId,
        }),
      },
    );
    return Response.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
