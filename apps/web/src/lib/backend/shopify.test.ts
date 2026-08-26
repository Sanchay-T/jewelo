import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { shopifyConfigured, verifyShopifyHmac } from "./shopify-core";

describe("Shopify Draft Order seam", () => {
  it("stays disabled until all three activation values exist", () => {
    expect(shopifyConfigured({})).toBe(false);
    expect(
      shopifyConfigured({
        SHOPIFY_STORE_DOMAIN: "store.myshopify.com",
        SHOPIFY_CLIENT_ID: "client",
        SHOPIFY_CLIENT_SECRET: "secret",
      }),
    ).toBe(true);
  });

  it("uses timing-safe HMAC verification and rejects altered payloads", () => {
    const secret = "test-only-secret";
    const raw = JSON.stringify({ id: 1 });
    const signature = createHmac("sha256", secret).update(raw).digest("base64");
    expect(verifyShopifyHmac(raw, signature, secret)).toBe(true);
    expect(verifyShopifyHmac(`${raw}x`, signature, secret)).toBe(false);
  });
});
