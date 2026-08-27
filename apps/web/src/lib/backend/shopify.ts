import "server-only";
import { ApiError } from "./supabase-rest";
import {
  parseShopifyDomain,
  SHOPIFY_API_VERSION,
  shopifyConfigured,
} from "./shopify-core";

export {
  parseShopifyDomain,
  shopifyConfigured,
  verifyShopifyHmac,
} from "./shopify-core";

export interface DraftOrderInput {
  quoteId: string;
  designId: string;
  locale: "en" | "ar";
  idempotencyKey: string;
  title: string;
  amountAed: number;
}

export interface DraftOrderResult {
  mode: "mock" | "shopify";
  draftOrderId: string;
  checkoutUrl: string;
}

type TokenCache = {
  key: string;
  token: string;
  expiresAt: number;
};

type GraphqlError = { message?: string };

let tokenCache: TokenCache | undefined;
let tokenRequest: Promise<string> | undefined;

const REQUEST_TIMEOUT_MS = 10_000;
const TOKEN_SAFETY_SKEW_MS = 60_000;

function requestSignal() {
  return AbortSignal.timeout(REQUEST_TIMEOUT_MS);
}

function authCacheKey(domain: string) {
  return `${domain}:${process.env.SHOPIFY_CLIENT_ID ?? "offline"}`;
}

function clearCachedToken() {
  tokenCache = undefined;
}

async function requestClientCredentialsToken(domain: string): Promise<string> {
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret)
    throw new Error("Shopify client credentials are incomplete");

  const key = authCacheKey(domain);
  if (tokenCache?.key === key && tokenCache.expiresAt > Date.now())
    return tokenCache.token;
  if (tokenRequest) return tokenRequest;

  tokenRequest = (async () => {
    const response = await fetch(`https://${domain}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
      signal: requestSignal(),
    });
    if (!response.ok)
      throw new Error(`Shopify authentication failed:${response.status}`);
    const payload = (await response.json()) as {
      access_token?: unknown;
      expires_in?: unknown;
    };
    if (
      typeof payload.access_token !== "string" ||
      !payload.access_token ||
      typeof payload.expires_in !== "number" ||
      !Number.isFinite(payload.expires_in)
    )
      throw new Error("Shopify authentication returned an invalid response");
    tokenCache = {
      key,
      token: payload.access_token,
      expiresAt:
        Date.now() +
        Math.max(0, payload.expires_in * 1_000 - TOKEN_SAFETY_SKEW_MS),
    };
    return payload.access_token;
  })();

  try {
    return await tokenRequest;
  } finally {
    tokenRequest = undefined;
  }
}

async function accessToken(domain: string) {
  const offlineToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  if (offlineToken) return offlineToken;
  return requestClientCredentialsToken(domain);
}

async function graphql<T>(
  domain: string,
  query: string,
  variables: Record<string, unknown>,
  retryUnauthorized = true,
): Promise<T> {
  const token = await accessToken(domain);
  const response = await fetch(
    `https://${domain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-shopify-access-token": token,
      },
      body: JSON.stringify({ query, variables }),
      signal: requestSignal(),
    },
  );
  if (
    response.status === 401 &&
    retryUnauthorized &&
    !process.env.SHOPIFY_ADMIN_ACCESS_TOKEN
  ) {
    clearCachedToken();
    return graphql<T>(domain, query, variables, false);
  }
  if (!response.ok)
    throw new Error(`Shopify Admin API failed:${response.status}`);
  const payload = (await response.json()) as {
    data?: T;
    errors?: GraphqlError[];
  };
  if (payload.errors?.length)
    throw new Error(
      `Shopify GraphQL rejected request:${payload.errors.map((item) => item.message ?? "Unknown error").join(",")}`,
    );
  if (!payload.data) throw new Error("Shopify GraphQL returned no data");
  return payload.data;
}

function quoteTag(quoteId: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      quoteId,
    )
  )
    throw new Error("Shopify Draft Order requires a UUID quote ID");
  return `jwq-${quoteId.toLowerCase()}`;
}

async function findExistingDraftOrder(
  domain: string,
  input: DraftOrderInput,
): Promise<DraftOrderResult | undefined> {
  const data = await graphql<{
    draftOrders: {
      nodes: Array<{
        id: string;
        invoiceUrl: string | null;
        customAttributes: Array<{ key: string; value: string | null }>;
      }>;
    };
  }>(
    domain,
    `
      query FindJeweloDraft($query: String!) {
        draftOrders(first: 10, query: $query) {
          nodes {
            id
            invoiceUrl
            customAttributes {
              key
              value
            }
          }
        }
      }
    `,
    { query: `tag:"${quoteTag(input.quoteId)}"` },
  );
  const matches = data.draftOrders.nodes.filter((node) =>
    node.customAttributes.some(
      (attribute) =>
        attribute.key === "caleums_quote_id" &&
        attribute.value === input.quoteId,
    ),
  );
  if (matches.length > 1)
    throw new Error("Multiple Shopify Draft Orders require operator review");
  const match = matches[0];
  if (!match) return undefined;
  if (!match.id || !match.invoiceUrl)
    throw new Error("Existing Shopify Draft Order is missing checkout data");
  return {
    mode: "shopify",
    draftOrderId: match.id,
    checkoutUrl: match.invoiceUrl,
  };
}

export async function reconcileShopifyDraftOrder(
  input: DraftOrderInput,
): Promise<DraftOrderResult | undefined> {
  if (!shopifyConfigured())
    throw new ApiError("Checkout is not available yet", 503, "checkout_unavailable");
  const domain = parseShopifyDomain(process.env.SHOPIFY_STORE_DOMAIN);
  return findExistingDraftOrder(domain, input);
}

export async function createShopifyDraftOrder(
  input: DraftOrderInput,
): Promise<DraftOrderResult> {
  if (!shopifyConfigured()) {
    const partialConfiguration = [
      process.env.SHOPIFY_STORE_DOMAIN,
      process.env.SHOPIFY_CLIENT_ID,
      process.env.SHOPIFY_CLIENT_SECRET,
      process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
    ].some((value) => Boolean(value?.trim()));
    if (
      process.env.NODE_ENV === "production" ||
      process.env.SHOPIFY_MOCK_MODE !== "true" ||
      partialConfiguration
    )
      throw new ApiError("Checkout is not available yet", 503, "checkout_unavailable");
    return {
      mode: "mock",
      draftOrderId: `mock:${input.quoteId}`,
      checkoutUrl: `/${input.locale}/commerce/${input.designId}?checkout=mock`,
    };
  }
  const domain = parseShopifyDomain(process.env.SHOPIFY_STORE_DOMAIN);
  const existing = await findExistingDraftOrder(domain, input);
  if (existing) return existing;
  const data = await graphql<{
    draftOrderCreate?: {
      draftOrder?: { id?: string; invoiceUrl?: string | null } | null;
      userErrors?: Array<{ message?: string }>;
    };
  }>(
    domain,
    `
      mutation CreateDraft($input: DraftOrderInput!) {
        draftOrderCreate(input: $input) {
          draftOrder {
            id
            invoiceUrl
          }
          userErrors {
            field
            message
          }
        }
      }
    `,
    {
      input: {
        note: `Caleums quote ${input.quoteId}`,
        tags: [quoteTag(input.quoteId)],
        customAttributes: [
          { key: "caleums_quote_id", value: input.quoteId },
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
  );
  const result = data.draftOrderCreate;
  const userErrors = result?.userErrors ?? [];
  if (!result?.draftOrder || userErrors.length)
    throw new Error(
      `Shopify Draft Order rejected:${userErrors.map((item) => item.message ?? "Unknown error").join(",")}`,
    );
  if (!result.draftOrder.id || !result.draftOrder.invoiceUrl)
    throw new Error("Shopify Draft Order returned incomplete checkout data");
  return {
    mode: "shopify",
    draftOrderId: result.draftOrder.id,
    checkoutUrl: result.draftOrder.invoiceUrl,
  };
}
