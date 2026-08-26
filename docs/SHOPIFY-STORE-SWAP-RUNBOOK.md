# Shopify store swap runbook

## Purpose

This is the agent handoff for moving the unchanged Jewelo checkout integration
between the development Shopify store and one client Shopify store. The code is
the same in both environments. Only server-side Shopify configuration and the
store's webhook registration change.

Jewelo creates a custom-priced Shopify Draft Order, redirects the buyer to
Shopify's hosted `invoiceUrl`, and records payment after a signed `orders/paid`
webhook. It does not require the client's Shopify product catalog to mirror
Jewelo products.

## Current environment assignment

| Deployment | Shopify store | Status |
| --- | --- | --- |
| Local and Vercel Preview/Development | `Jewelo Checkout Dev` — `jewelo-checkout-dev.myshopify.com` | **Live-proven.** True Shopify dev store with generated test data and the bogus payment gateway. App/API, Draft Order, hosted checkout, test payment, Order creation, and metadata propagation passed on 27 August 2026. |
| Vercel Production | Client store | Pending client invitation, app installation, secrets, and live acceptance proof. |

Never point a Preview deployment at the client production store. Never point
Production at the burner store.

## What “plug and play” means

The application, routes, database contract, UI, Draft Order mutation, webhook
handler, reconciliation logic, and deployment artifact do not change. A store
swap consists of:

1. installing/authorizing the Jewelo app for the target store;
2. replacing that deployment environment's Shopify server secrets;
3. registering the target store's `orders/paid` webhook;
4. redeploying; and
5. running the outside-in acceptance checks below.

A Shopify token from one store cannot be used on another store. “Plug and
play” refers to the integration shape, not credential portability.

## Inputs an agent must obtain

Do **not** request or accept the merchant's Shopify password. The merchant must
invite the operator as staff/collaborator with app-management access, or install
the app through an authorized flow.

Required non-secret input:

- the permanent `<shop>.myshopify.com` hostname, not the branded storefront
  domain;
- confirmation of the target deployment: Preview/Development or Production;
- permission to create/install and configure an app for that store; and
- approval for one end-to-end test checkout when the target is Production.

Use exactly one server authentication mode:

| Mode | Set | Leave unset | Use when |
| --- | --- | --- | --- |
| Merchant-organization client credentials (preferred) | `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET` | `SHOPIFY_ADMIN_ACCESS_TOKEN` | The app is created inside the same Shopify organization as the store. |
| Custom distribution/OAuth offline token | `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_ADMIN_ACCESS_TOKEN`, `SHOPIFY_WEBHOOK_SECRET` | `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET` | The store is in another organization and supplies an app-installation token. |

The installed/released app must grant exactly:

- `write_draft_orders`
- `read_orders`

The released app version must subscribe to `orders/paid` on API `2026-07` and
deliver to:

```text
https://<jewelo-host>/api/webhooks/shopify
```

`SHOPIFY_WEBHOOK_SECRET` defaults to `SHOPIFY_CLIENT_SECRET` for the preferred
mode. Set it explicitly when Shopify supplies a distinct signing secret or an
offline token is used.

## Secret handling

- Store credentials only in the target deployment's encrypted server
  environment. Do not put them in source, committed `.env` files, tickets,
  screenshots, browser JavaScript, or chat.
- Preview/Development and Production must have different Shopify credentials.
- Never print a token, secret, cookie, or signed invitation URL in logs or a
  proof packet.
- `SHOPIFY_MOCK_MODE=false` in every deployed environment. Production fails
  closed if mock mode is enabled or Shopify configuration is partial.

## Agent procedure: bind a development store

1. Verify the visible Shopify account and store identity before changing it.
2. Confirm that the store is a development/burner store and is not a client
   production store.
3. Create or select `Jewelo Checkout` in the store's Shopify organization.
4. Release/install the app with the two scopes and webhook above.
5. Put the development store domain and credentials only into local and Vercel
   Preview/Development server environments.
6. Redeploy the preview and run `pnpm shopify:probe` from an environment that
   can read those secrets. The probe must report the expected shop identity and
   scopes without printing credentials.
7. Complete the acceptance gates below using Shopify test payments.
8. Record the safe store identity here after validation:

```text
Development store name: Jewelo Checkout Dev
Permanent domain:       jewelo-checkout-dev.myshopify.com
Shopify organization:   Jewelo Development
Probe date/result:       27 August 2026 / passed on API 2026-07
```

The authoritative development app is `Jewelo Checkout`, active version
`jewelo-checkout-dev-1`, with only `read_orders` and `write_draft_orders`.

Shopify dev stores are forced to remain storefront-password protected. The
Preferences page has a password field but no disable control. This does not
block Draft Order invoice checkout or test payments. Public storefront access
requires transferring/activating the store on a paid plan; do not do that for
this development environment.

The separate `Jewelo Development` store at `rmizsa-vn.myshopify.com` is an
unpaid trial created during validation. Its invoice URL correctly reached
Shopify but checkout was blocked because the trial store was not taking orders.
Do not use it as the canonical development target.

## Live development-store proof — 27 August 2026

- `pnpm shopify:probe` authenticated to exactly
  `jewelo-checkout-dev.myshopify.com`, API `2026-07`, with both required
  scopes.
- The real adapter created Draft Order `#D11` with a custom AED-priced line,
  a hosted Shopify checkout URL, quote note, deterministic tag, and both custom
  attributes.
- A delayed duplicate request reconciled to the existing Draft Order. Immediate
  tag search was observed to be eventually consistent; the production lease
  remains required before read-only reconciliation.
- Shopify's first live mutation rejected the original
  `jewelo-quote-<UUID>` tag because tags are limited to 40 characters. The
  adapter now uses deterministic `jwq-<UUID>` tags, exactly 40 characters, with
  regression coverage.
- Shopify's Test Payment Gateway completed the ₹25.97 INR checkout without a
  real charge and created paid test Order `#1001`.
- The paid Order retained the quote note, `jwq-<UUID>` tag,
  `caleums_quote_id`, and `jewelo_idempotency_key`.
- The remaining unproved production boundary is delivery of Shopify's real
  `orders/paid` webhook into a deployed Jewelo/Supabase environment. The app
  version must be linked/deployed with the real Jewelo webhook URL before that
  gate can pass.

## Agent procedure: swap Production to a client store

1. Verify the invitation destination, visible Shopify account, client store,
   organization, role, and permissions before accepting or changing anything.
2. Obtain the permanent `*.myshopify.com` domain.
3. Create/install `Jewelo Checkout` inside the client's organization using the
   preferred credential mode. Use offline-token mode only when same-organization
   client credentials are unavailable.
4. Release the exact scopes and `orders/paid` webhook configuration.
5. Replace only the Vercel Production Shopify environment values. Leave the
   development/preview values untouched.
6. Redeploy Production and run the non-secret probe/readiness checks.
7. Create a Jewelo quote and confirm that checkout produces one Shopify Draft
   Order and a hosted Shopify `invoiceUrl` for the expected client store.
8. With explicit approval, complete one test/low-risk checkout and verify the
   paid webhook, database order, metadata, and duplicate-delivery behavior.
9. Record the proof packet without secrets. Do not remove the development store
   configuration; it remains the safe test target.

## Mandatory acceptance gates

The swap is not complete merely because the environment variables were saved.
Every applicable gate must pass:

- `/api/readiness` reports Shopify configured and mock mode disabled;
- `pnpm shopify:probe` authenticates to the exact expected
  `<shop>.myshopify.com` store;
- the granted scopes include `write_draft_orders` and `read_orders`;
- one Jewelo quote creates exactly one Draft Order and returns its Shopify-hosted
  checkout URL;
- the resulting Shopify Order contains `caleums_quote_id` in note/custom
  attributes;
- `orders/paid` atomically completes one Jewelo order in Supabase;
- replaying the identical webhook is reported as a duplicate and creates no
  second order; and
- no `shopify.webhook_incident` exists for the accepted test order.

For Production, distinguish these states in the handoff:

```text
configured -> probe-passed -> checkout-created -> payment-proven -> accepted
```

Only `payment-proven` plus the client's acceptance may be described as live.

## Failure and rollback

If the probe identifies the wrong store, a scope is missing, webhook validation
fails, or checkout targets an unexpected hostname:

1. stop before taking payment;
2. restore the previous deployment's encrypted Shopify values;
3. redeploy;
4. verify readiness and the previous store identity; and
5. preserve the failed proof for diagnosis without exposing secrets.

Do not retry `draftOrderCreate` blindly after an ambiguous timeout. The adapter
uses a deterministic tag and read-only reconciliation because Shopify does not
guarantee mutation idempotency for Draft Order creation.

## Deliberate boundaries

This phase synchronizes successful payment only. It does not synchronize
refunds, cancellations, fulfillment, app uninstall, customer-account SSO, or
Shopify Plus checkout UI extensions. Shopify owns the hosted checkout and
payment record; Jewelo retains its existing UI and Supabase identity.
