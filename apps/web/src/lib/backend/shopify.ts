import "server-only";
import { shopifyConfigured } from "./shopify-core";

export { shopifyConfigured, verifyShopifyHmac } from "./shopify-core";

export interface DraftOrderInput {
  quoteId: string;
  idempotencyKey: string;
  title: string;
  amountAed: number;
}

export interface DraftOrderResult {
  mode: "mock" | "shopify";
  draftOrderId: string;
  checkoutUrl: string;
}

export async function createShopifyDraftOrder(
  input: DraftOrderInput,
): Promise<DraftOrderResult> {
  if (!shopifyConfigured()) {
    return {
      mode: "mock",
      draftOrderId: `mock:${input.quoteId}`,
      checkoutUrl: `/checkout/mock/${input.quoteId}`,
    };
  }
  const domain = process.env.SHOPIFY_STORE_DOMAIN!;
  const tokenResponse = await fetch(
    `https://${domain}/admin/oauth/access_token`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: process.env.SHOPIFY_CLIENT_ID,
        client_secret: process.env.SHOPIFY_CLIENT_SECRET,
      }),
    },
  );
  if (!tokenResponse.ok)
    throw new Error(`Shopify authentication failed:${tokenResponse.status}`);
  const { access_token: token } = (await tokenResponse.json()) as {
    access_token: string;
  };
  const response = await fetch(
    `https://${domain}/admin/api/2026-07/graphql.json`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-shopify-access-token": token,
        "x-request-id": input.idempotencyKey,
      },
      body: JSON.stringify({
        query: `mutation CreateDraft($input: DraftOrderInput!) { draftOrderCreate(input: $input) { draftOrder { id invoiceUrl } userErrors { field message } } }`,
        variables: {
          input: {
            note: `Jewelo quote ${input.quoteId}`,
            customAttributes: [
              { key: "jewelo_quote_id", value: input.quoteId },
              { key: "jewelo_idempotency_key", value: input.idempotencyKey },
            ],
            lineItems: [
              {
                title: input.title,
                quantity: 1,
                originalUnitPriceWithCurrency: {
                  amount: (input.amountAed / 100).toFixed(2),
                  currencyCode: "AED",
                },
              },
            ],
          },
        },
      }),
    },
  );
  if (!response.ok)
    throw new Error(`Shopify Draft Order failed:${response.status}`);
  const payload = (await response.json()) as {
    data?: {
      draftOrderCreate?: {
        draftOrder?: { id: string; invoiceUrl: string };
        userErrors: Array<{ message: string }>;
      };
    };
  };
  const result = payload.data?.draftOrderCreate;
  if (!result?.draftOrder || result.userErrors.length)
    throw new Error(
      `Shopify Draft Order rejected:${result?.userErrors.map((item) => item.message).join(",")}`,
    );
  return {
    mode: "shopify",
    draftOrderId: result.draftOrder.id,
    checkoutUrl: result.draftOrder.invoiceUrl,
  };
}
