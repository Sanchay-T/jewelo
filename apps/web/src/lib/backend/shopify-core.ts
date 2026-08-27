import { createHmac, timingSafeEqual } from "node:crypto";

export const SHOPIFY_API_VERSION = "2026-07";

const SHOPIFY_DOMAIN = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;

export function parseShopifyDomain(value: string | undefined): string {
  const domain = value?.trim().toLowerCase() ?? "";
  if (!SHOPIFY_DOMAIN.test(domain)) {
    throw new Error(
      "SHOPIFY_STORE_DOMAIN must be a bare <shop>.myshopify.com hostname",
    );
  }
  return domain;
}

export function shopifyConfigured(
  environment: Record<string, string | undefined> = process.env,
) {
  if (!environment.SHOPIFY_STORE_DOMAIN) return false;
  const hasOfflineToken = Boolean(environment.SHOPIFY_ADMIN_ACCESS_TOKEN);
  const hasClientCredentials = Boolean(
    environment.SHOPIFY_CLIENT_ID && environment.SHOPIFY_CLIENT_SECRET,
  );
  return hasOfflineToken || hasClientCredentials;
}

export function verifyShopifyHmac(
  rawBody: string | Uint8Array,
  provided: string | null,
  secret = process.env.SHOPIFY_WEBHOOK_SECRET?.trim() ||
    process.env.SHOPIFY_CLIENT_SECRET?.trim(),
): boolean {
  if (!secret || !provided) return false;
  const expected = createHmac("sha256", secret)
    .update(rawBody)
    .digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}
