import { afterEach, describe, expect, it, vi } from "vitest";
import { createShopifyDraftOrder } from "./shopify";

const originalEnvironment = { ...process.env };

const input = (quoteId: string) => ({
  quoteId,
  designId: "design-1",
  locale: "en" as const,
  idempotencyKey: `checkout:${quoteId}`,
  title: "Custom Caleums name pendant",
  amountAed: 125_000,
});

function configure(domain: string) {
  process.env.SHOPIFY_STORE_DOMAIN = domain;
  process.env.SHOPIFY_CLIENT_ID = `client-${domain}`;
  process.env.SHOPIFY_CLIENT_SECRET = "test-secret";
  delete process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
}

afterEach(() => {
  process.env = { ...originalEnvironment };
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Shopify Admin adapter", () => {
  it("requires an explicit non-production mock mode and rejects partial config", async () => {
    delete process.env.SHOPIFY_STORE_DOMAIN;
    delete process.env.SHOPIFY_CLIENT_ID;
    delete process.env.SHOPIFY_CLIENT_SECRET;
    delete process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
    process.env.SHOPIFY_MOCK_MODE = "true";
    vi.stubEnv("NODE_ENV", "development");
    await expect(
      createShopifyDraftOrder(input("00000000-0000-4000-8000-000000000000")),
    ).resolves.toMatchObject({ mode: "mock" });

    vi.stubEnv("NODE_ENV", "production");
    await expect(
      createShopifyDraftOrder(input("00000000-0000-4000-8000-000000000000")),
    ).rejects.toThrow("not completely configured");

    vi.stubEnv("NODE_ENV", "development");
    process.env.SHOPIFY_STORE_DOMAIN = "partial.myshopify.com";
    await expect(
      createShopifyDraftOrder(input("00000000-0000-4000-8000-000000000000")),
    ).rejects.toThrow("not completely configured");
  });

  it("reuses one client-credentials token across concurrent requests", async () => {
    configure("token-cache.myshopify.com");
    let authRequests = 0;
    const mutationInputs: Array<Record<string, unknown>> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: string | URL | Request, init?: RequestInit) => {
        const url = String(request);
        if (url.endsWith("/admin/oauth/access_token")) {
          authRequests += 1;
          return Response.json({ access_token: "token", expires_in: 86_400 });
        }
        const body = JSON.parse(String(init?.body)) as {
          query: string;
          variables?: { input?: Record<string, unknown> };
        };
        if (body.query.includes("FindJeweloDraft"))
          return Response.json({ data: { draftOrders: { nodes: [] } } });
        mutationInputs.push(body.variables?.input ?? {});
        return Response.json({
          data: {
            draftOrderCreate: {
              draftOrder: {
                id: "gid://shopify/DraftOrder/1",
                invoiceUrl: "https://token-cache.myshopify.com/invoice/1",
              },
              userErrors: [],
            },
          },
        });
      }),
    );

    await Promise.all([
      createShopifyDraftOrder(input("11111111-1111-4111-8111-111111111111")),
      createShopifyDraftOrder(input("22222222-2222-4222-8222-222222222222")),
    ]);

    expect(authRequests).toBe(1);
    expect(mutationInputs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tags: ["jewelo-quote-11111111-1111-4111-8111-111111111111"],
          customAttributes: expect.arrayContaining([
            {
              key: "caleums_quote_id",
              value: "11111111-1111-4111-8111-111111111111",
            },
          ]),
        }),
      ]),
    );
  });

  it("evicts a rejected token and retries a 401 exactly once", async () => {
    configure("retry-auth.myshopify.com");
    let authRequests = 0;
    let graphqlRequests = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: string | URL | Request) => {
        const url = String(request);
        if (url.endsWith("/admin/oauth/access_token")) {
          authRequests += 1;
          return Response.json({
            access_token: `token-${authRequests}`,
            expires_in: 86_400,
          });
        }
        graphqlRequests += 1;
        if (graphqlRequests === 1) return new Response(null, { status: 401 });
        return Response.json({
          data: {
            draftOrders: {
              nodes: [
                {
                  id: "gid://shopify/DraftOrder/2",
                  invoiceUrl: "https://retry-auth.myshopify.com/invoice/2",
                  customAttributes: [
                    {
                      key: "caleums_quote_id",
                      value: "33333333-3333-4333-8333-333333333333",
                    },
                  ],
                },
              ],
            },
          },
        });
      }),
    );

    const result = await createShopifyDraftOrder(
      input("33333333-3333-4333-8333-333333333333"),
    );

    expect(result.draftOrderId).toContain("DraftOrder/2");
    expect(authRequests).toBe(2);
    expect(graphqlRequests).toBe(2);
  });

  it("recovers an existing tagged draft instead of creating another", async () => {
    configure("recover.myshopify.com");
    let mutations = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: string | URL | Request, init?: RequestInit) => {
        const url = String(request);
        if (url.endsWith("/admin/oauth/access_token"))
          return Response.json({ access_token: "token", expires_in: 86_400 });
        const body = JSON.parse(String(init?.body)) as { query: string };
        if (body.query.includes("CreateDraft")) mutations += 1;
        return Response.json({
          data: {
            draftOrders: {
              nodes: [
                {
                  id: "gid://shopify/DraftOrder/3",
                  invoiceUrl: "https://recover.myshopify.com/invoice/3",
                  customAttributes: [
                    {
                      key: "caleums_quote_id",
                      value: "44444444-4444-4444-8444-444444444444",
                    },
                  ],
                },
              ],
            },
          },
        });
      }),
    );

    await createShopifyDraftOrder(
      input("44444444-4444-4444-8444-444444444444"),
    );
    expect(mutations).toBe(0);
  });

  it("rejects top-level GraphQL errors", async () => {
    configure("graphql-error.myshopify.com");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: string | URL | Request) => {
        if (String(request).endsWith("/admin/oauth/access_token"))
          return Response.json({ access_token: "token", expires_in: 86_400 });
        return Response.json({ errors: [{ message: "Denied by Shopify" }] });
      }),
    );

    await expect(
      createShopifyDraftOrder(input("55555555-5555-4555-8555-555555555555")),
    ).rejects.toThrow("Denied by Shopify");
  });
});
