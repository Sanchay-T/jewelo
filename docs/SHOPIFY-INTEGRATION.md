# Shopify checkout integration

## Supported production shape

Jewelo keeps its existing UI and Supabase identity. An accepted Jewelo quote is
converted to a Shopify Draft Order with one custom-priced line item. The browser
is redirected to Shopify's hosted `invoiceUrl`; Jewelo receives `orders/paid`
and atomically records the order in Supabase.

The first production path is an app created **inside the merchant's Shopify
organization**. That lets the server use Shopify's client-credentials grant.
The access token is server-only, cached with its expiry, and refreshed after a
single 401. A merchant in another Shopify organization cannot use these client
credentials: either create the app in that merchant's organization (preferred
for this single-client build), or implement custom distribution plus OAuth and
supply the resulting offline token as `SHOPIFY_ADMIN_ACCESS_TOKEN`.

## What to obtain from a client

1. The permanent `*.myshopify.com` hostname—not the branded storefront domain.
2. Permission to create/install an app in the same Shopify organization as the
   store.
3. Client ID and Client Secret from that app. Store both only in Vercel/server
   secrets; never paste them into source or browser code.
4. A released app version with exactly `write_draft_orders` and `read_orders`.
5. An `orders/paid` webhook on API `2026-07` pointing to
   `https://<jewelo-host>/api/webhooks/shopify`.

`SHOPIFY_WEBHOOK_SECRET` may be omitted only when the app Client Secret is
present and Shopify signs with it. Offline-token installations must provide a
webhook signing secret separately. Rotate the old and new deployment secrets
together, then replay a signed test delivery.

## Burner-store validation

The Shopify account must first have a Partner/Dev organization. Shopify requires
real contact/address information and acceptance of its Partner agreement; do
not invent these fields.

1. In Dev Dashboard, create a development store for testing only.
2. Create `Jewelo Checkout` from Dev Dashboard. Dev Dashboard is the shortest
   path for connecting an existing system; Shopify CLI is needed mainly for a
   CLI-managed/distributed app or extensions.
3. Create/release a version with the scopes and webhook above, then install it
   on the development store.
4. Put the domain, Client ID, and Client Secret in an uncommitted server env.
5. Run `pnpm shopify:probe`. It authenticates, verifies the exact shop and
   checks scopes without printing a credential or access token. App-scoped
   webhooks do not appear in Shopify's `webhookSubscriptions` Admin API query,
   so verify `orders/paid` in the released Dev Dashboard version or linked CLI
   config.
6. Deploy the Supabase migration and web app preview.
7. Create a Jewelo quote, open its Shopify checkout URL, and complete a test
   payment using the development store's test payment method.
8. Verify one Shopify Order, one Jewelo order, a completed quote/design, and one
   processed webhook delivery. Replay the same webhook and verify it reports a
   duplicate without creating a second order.
9. In Shopify, verify the completed Order contains `caleums_quote_id` in its
   note/custom attributes. This live check is the acceptance gate for metadata
   propagation from Draft Order to Order.

## Tooling

- Shopify CLI is pinned as `@shopify/cli@4.7.0` and isolated through
  `pnpm shopify:cli` (a fixed-version `pnpm dlx`). It is deliberately not a
  workspace dependency because its transitive types conflict with the web app.
- Shopify Dev MCP is pinned and isolated the same way at
  `@shopify/dev-mcp@1.14.5` through `pnpm shopify:dev-mcp`. It provides
  documentation/schema/query validation; it is not an authenticated
  store-admin automation surface.
- `shopify/shopify.app.toml.example` is a template, not a linked app config.
  Prefer `pnpm shopify:cli app config link` after the real app exists; do not
  deploy placeholder configuration.

## Failure and recovery behavior

- A deterministic tag and quote/idempotency attributes are written to every
  Draft Order. Before a write, Jewelo searches for an existing tagged draft and
  reattaches it.
- Shopify does not promise idempotency for `draftOrderCreate`. An ambiguous
  timeout/5xx remains `checkout_status=draft`. After the reservation lease
  expires, checkout performs a read-only tagged reconciliation: exactly one
  match is reattached, zero remains provider-unknown, and multiple matches
  require operator review. It never repeats the mutation automatically.
- Mock checkout requires `SHOPIFY_MOCK_MODE=true`, is rejected in production,
  and is also rejected if any partial Shopify configuration is present.
- Webhook receipt, payload-hash conflict detection, deduplication, order
  completion, audit creation, and `processed_at` are one database transaction.
  A failed transaction remains retryable when Shopify redelivers it.
- A paid event missing the Jewelo quote attribute creates an operator-visible
  `shopify.webhook_incident` instead of being silently ignored.

## Deliberate Phase-1 boundary

This integration synchronizes successful payment only. Shopify remains the
hosted checkout and payment record. Refunds, cancellations, fulfillment,
`app/uninstalled`, customer-account SSO, and Shopify Plus checkout UI extensions
are not synchronized by this phase and must not be represented as implemented.
