const API_VERSION = "2026-07";
const REQUIRED_SCOPES = ["read_orders", "write_draft_orders"];
const domainPattern = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;

function fail(message) {
  console.error(`Shopify readiness failed: ${message}`);
  process.exitCode = 1;
}

const domain = (process.env.SHOPIFY_STORE_DOMAIN ?? "").trim().toLowerCase();
if (!domainPattern.test(domain)) {
  fail("SHOPIFY_STORE_DOMAIN must be a bare <shop>.myshopify.com hostname");
  process.exit();
}

if (!(
  process.env.SHOPIFY_WEBHOOK_SECRET?.trim() ||
  process.env.SHOPIFY_CLIENT_SECRET?.trim()
)) {
  fail(
    "set SHOPIFY_WEBHOOK_SECRET (required when no Client Secret is available)",
  );
  process.exit();
}

async function token() {
  if (process.env.SHOPIFY_ADMIN_ACCESS_TOKEN)
    return process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  if (!process.env.SHOPIFY_CLIENT_ID || !process.env.SHOPIFY_CLIENT_SECRET) {
    throw new Error(
      "set SHOPIFY_ADMIN_ACCESS_TOKEN or both SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET",
    );
  }
  const response = await fetch(`https://${domain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: process.env.SHOPIFY_CLIENT_ID,
      client_secret: process.env.SHOPIFY_CLIENT_SECRET,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok)
    throw new Error(`authentication returned ${response.status}`);
  const payload = await response.json();
  if (typeof payload.access_token !== "string" || !payload.access_token)
    throw new Error("authentication returned no access token");
  return payload.access_token;
}

try {
  const accessToken = await token();
  const response = await fetch(
    `https://${domain}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-shopify-access-token": accessToken,
      },
      body: JSON.stringify({
        query: `query JeweloReadiness { shop { name myshopifyDomain } currentAppInstallation { accessScopes { handle } } }`,
      }),
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) throw new Error(`Admin API returned ${response.status}`);
  const payload = await response.json();
  if (payload.errors?.length)
    throw new Error(payload.errors.map((error) => error.message).join(", "));
  const shop = payload.data?.shop;
  if (shop?.myshopifyDomain?.toLowerCase() !== domain)
    throw new Error("authenticated app belongs to a different shop");
  const scopes = new Set(
    payload.data?.currentAppInstallation?.accessScopes?.map(
      (scope) => scope.handle,
    ) ?? [],
  );
  const missing = REQUIRED_SCOPES.filter((scope) => !scopes.has(scope));
  if (missing.length) throw new Error(`missing scopes: ${missing.join(", ")}`);
  console.log(
    JSON.stringify(
      {
        ready: true,
        shop: { name: shop.name, domain: shop.myshopifyDomain },
        apiVersion: API_VERSION,
        requiredScopes: REQUIRED_SCOPES,
        ordersPaidWebhook: {
          check:
            "verify the released app version in Dev Dashboard or linked CLI config",
        },
      },
      null,
      2,
    ),
  );
} catch (error) {
  fail(error instanceof Error ? error.message : "unknown error");
}
