import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  parseShopifyDomain,
  shopifyConfigured,
  verifyShopifyHmac,
} from "./shopify-core";

describe("Shopify Draft Order seam", () => {
  afterEach(() => {
    delete process.env.SHOPIFY_WEBHOOK_SECRET;
    delete process.env.SHOPIFY_CLIENT_SECRET;
  });
  it("stays disabled until all three activation values exist", () => {
    expect(shopifyConfigured({})).toBe(false);
    expect(
      shopifyConfigured({
        SHOPIFY_STORE_DOMAIN: "store.myshopify.com",
        SHOPIFY_CLIENT_ID: "client",
        SHOPIFY_CLIENT_SECRET: "secret",
      }),
    ).toBe(true);
    expect(
      shopifyConfigured({
        SHOPIFY_STORE_DOMAIN: "store.myshopify.com",
        SHOPIFY_ADMIN_ACCESS_TOKEN: "offline-token",
      }),
    ).toBe(true);
  });

  it("only accepts a bare myshopify.com hostname", () => {
    expect(parseShopifyDomain("Store-Name.myshopify.com")).toBe(
      "store-name.myshopify.com",
    );
    expect(() =>
      parseShopifyDomain("https://store-name.myshopify.com/path"),
    ).toThrow("bare");
    expect(() => parseShopifyDomain("store-name.example.com")).toThrow("bare");
  });

  it("uses timing-safe HMAC verification and rejects altered payloads", () => {
    const secret = "test-only-secret";
    const raw = JSON.stringify({ id: 1 });
    const signature = createHmac("sha256", secret).update(raw).digest("base64");
    expect(verifyShopifyHmac(raw, signature, secret)).toBe(true);
    expect(verifyShopifyHmac(`${raw}x`, signature, secret)).toBe(false);
  });

  it("falls back to a nonempty Client Secret when webhook secret is blank", () => {
    process.env.SHOPIFY_WEBHOOK_SECRET = "";
    process.env.SHOPIFY_CLIENT_SECRET = "client-signing-secret";
    const raw = JSON.stringify({ id: 2 });
    const signature = createHmac("sha256", "client-signing-secret")
      .update(raw)
      .digest("base64");
    expect(verifyShopifyHmac(raw, signature)).toBe(true);
  });
});
