import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  supabaseRequest: vi.fn(),
}));

vi.mock("./supabase-rest", () => ({
  adminConfig: () => ({ url: "https://supabase.invalid", key: "test-key" }),
  jsonError: (error: unknown) =>
    Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    ),
  supabaseRequest: mocks.supabaseRequest,
}));

import { POST } from "../../app/api/webhooks/shopify/route";

const originalEnvironment = { ...process.env };
const secret = "webhook-test-secret";

function request(
  payload: Record<string, unknown>,
  overrides: Record<string, string> = {},
) {
  const raw = JSON.stringify(payload);
  return new Request("https://jewelo.example/api/webhooks/shopify", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-shopify-hmac-sha256": createHmac("sha256", secret)
        .update(raw)
        .digest("base64"),
      "x-shopify-webhook-id": "delivery-1",
      "x-shopify-topic": "orders/paid",
      "x-shopify-shop-domain": "burner.myshopify.com",
      ...overrides,
    },
    body: raw,
  });
}

afterEach(() => {
  process.env = { ...originalEnvironment };
  mocks.supabaseRequest.mockReset();
});

describe("Shopify paid-order webhook", () => {
  it("rejects a valid signature from the wrong shop", async () => {
    process.env.SHOPIFY_STORE_DOMAIN = "burner.myshopify.com";
    process.env.SHOPIFY_WEBHOOK_SECRET = secret;
    const response = await POST(
      request({}, { "x-shopify-shop-domain": "attacker.myshopify.com" }),
    );
    expect(response.status).toBe(401);
    expect(mocks.supabaseRequest).not.toHaveBeenCalled();
  });

  it("sends a correlated paid order to the atomic ingestion RPC", async () => {
    process.env.SHOPIFY_STORE_DOMAIN = "burner.myshopify.com";
    process.env.SHOPIFY_WEBHOOK_SECRET = secret;
    mocks.supabaseRequest.mockResolvedValue({
      accepted: true,
      duplicate: false,
    });
    const response = await POST(
      request({
        id: 42,
        admin_graphql_api_id: "gid://shopify/Order/42",
        financial_status: "paid",
        note_attributes: [
          {
            name: "caleums_quote_id",
            value: "11111111-1111-4111-8111-111111111111",
          },
        ],
      }),
    );
    expect(response.status).toBe(200);
    expect(mocks.supabaseRequest).toHaveBeenCalledWith(
      expect.anything(),
      "/rest/v1/rpc/ingest_shopify_paid_webhook",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("records an operator-visible incident when correlation is missing", async () => {
    process.env.SHOPIFY_STORE_DOMAIN = "burner.myshopify.com";
    process.env.SHOPIFY_WEBHOOK_SECRET = secret;
    mocks.supabaseRequest.mockResolvedValue({ accepted: true, incident: true });
    await POST(
      request({
        id: 42,
        admin_graphql_api_id: "gid://shopify/Order/42",
        financial_status: "paid",
        note_attributes: [],
      }),
    );
    expect(mocks.supabaseRequest).toHaveBeenCalledWith(
      expect.anything(),
      "/rest/v1/rpc/record_shopify_webhook_incident",
      expect.anything(),
    );
  });

  it("defines hash-conflict and retry semantics inside one SQL transaction", () => {
    const migration = readFileSync(
      new URL(
        "../../../../../supabase/migrations/20260827060000_shopify_webhook_atomicity.sql",
        import.meta.url,
      ),
      "utf8",
    );
    expect(migration).toContain("for update");
    expect(migration).toContain(
      "Shopify delivery ID reused with a different payload",
    );
    expect(migration.indexOf("public.complete_shopify_order")).toBeLessThan(
      migration.indexOf("set processed_at = now()"),
    );
  });
});
