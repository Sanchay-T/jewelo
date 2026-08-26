import { createHmac, timingSafeEqual } from "node:crypto";

export function shopifyConfigured(
  environment: Record<string, string | undefined> = process.env,
) {
  return Boolean(
    environment.SHOPIFY_STORE_DOMAIN &&
    environment.SHOPIFY_CLIENT_ID &&
    environment.SHOPIFY_CLIENT_SECRET,
  );
}

export function verifyShopifyHmac(
  rawBody: string,
  provided: string | null,
  secret = process.env.SHOPIFY_WEBHOOK_SECRET,
): boolean {
  if (!secret || !provided) return false;
  const expected = createHmac("sha256", secret)
    .update(rawBody)
    .digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}
