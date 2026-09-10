# CALEUMS handover

This file is the handover. Its content is mirrored into the description of
https://github.com/Sanchay-T/jewelo/pull/12; that pull request is the deliverable.

## The whole story, in plain paragraphs

CALEUMS is a pendant studio for Omran's jewelry shop in the UAE. A shopper types
an English or Arabic name, chooses a look and metal, and should receive four
photographs of that exact pendant: studio, on skin, close up, and dark. The
deterministic stencil owns the name and geometry; the image model only dresses
it, and verification refuses drift.

The identity engine, prompt registry, anchors, operator queue, spend ledger,
Inngest runner, security fixes, and the shopper's honest mock-degrade path are
implemented. P1-5 remains open because the last two adversarial identity passes
must still find nothing above minor. P5-2/P5-3 remain open because the first
paid OpenAI run needs Sanchay's explicit spend decision and the measured
identity gate must be complete.

This session closed the cloud-provider ambiguity. Local development may use the
mock adapter. Any `NODE_ENV=production` process selects the real provider and
fails startup without the required credential; DigitalOcean deploy/bootstrap no
longer creates or preserves `PROVIDER_MODE`, `JEWELO_CLOUD_BUILD`, or
`JEWELO_CLOUD_TARGET`. Staging is now running the production runtime with
OpenAI configured, but no image generation was requested and no paid spend has
occurred.

## Status

| | |
| --- | --- |
| Live URL | https://jewelo-staging-gqumd.ondigitalocean.app/en/design/new |
| Active deployed commit | `cc9fb01c8153d1c562a50da281f9137605eda5b0` (`cc9fb01`), DigitalOcean deployment `b50be520-f728-4234-870e-7141dbea3cfa` (ACTIVE, 9/9) |
| Branch head | `codex/overnight-launch-2026-09-08` at `cc9fb01` |
| Provider mode | Production runtime: `real` selected from `NODE_ENV=production`; protected readiness reports `provider: real`. Local development/test defaults remain mock unless explicitly set otherwise. |
| Live readiness | HTTP 200: Supabase configured; Inngest configured, self-hosted, `keyEnvironment=prod`, crons registered; OpenAI configured; trusted client IP header valid. |
| Build/lint | `corepack pnpm build`: 13/13; `corepack pnpm lint`: 13/13. |
| Phase / next task | Phase 0 closed; P1-5 identity proof, then P2-3/P5-2 remain. The cloud provider guard is deployed; no paid run was made. |
| Sessions | 5 (7–10 September 2026) |

## What a shopper gets today

The staging URL is live and its public health endpoint returns HTTP 200. The
protected readiness probe is also HTTP 200 with the production dependency proof
above. The page still uses the honest non-sellable/mock path for any run that is
not authorized to spend: fake assets are refused by the UI and the customer is
told the shop will send the photograph. No customer-facing real image was
generated in this session. The browser viewport ladder, RTL, and reduced-motion
staging pass are still open.

The local app is open in the Codex in-app Browser at
`http://localhost:3011/en/design/new`. Its local Next dev server returns HTTP
200 from `/api/health`, the interactive studio controls and name textbox are
visible, and the browser recorded no console errors. It uses the existing
cloud-backed environment for Supabase/OpenAI and the local Inngest dev server
(`127.0.0.1:8288/health` returns 200); it does not use the DigitalOcean process
for local rendering. Runway is intentionally the prompt-lab bench, not a
production runtime dependency: the app's production socket is OpenAI, and no
Runway or OpenAI generation was invoked.

## Done this session

- Production provider invariant and readiness/smoke proof (`32404c7`).
- Staging deployment of the invariant: `9439c0a6-0810-4d9b-96c7-58d55dfb7791`,
  ACTIVE, source `32404c70a04fabbd981fdb74f2720e60b747838e`.
- Removed legacy cloud activation/build flags from deploy and bootstrap; pushed
  as `cc9fb01` and deployed ACTIVE as `b50be520-f728-4234-870e-7141dbea3cfa`.
- `corepack pnpm build`, `corepack pnpm lint`, shell/module syntax, and diff
  checks passed. No provider or image-generation call occurred.

## Evidence

- `docs/goals/road-to-gold/PROGRESS.md`, Session 5 entry.
- `scripts/digitalocean/smoke.sh` against the live URL: health and protected
  readiness both passed; readiness JSON was inspected without printing secrets.
- In-app Browser proof: `http://localhost:3011/en/design/new`, title `Create your
  piece · CALEUMS`, interactive Design steps visible, zero browser error/warning
  logs.
- DigitalOcean deployment record `b50be520-f728-4234-870e-7141dbea3cfa` shows
  source hash `cc9fb01c8153d1c562a50da281f9137605eda5b0`, `pnpm start`, and
  ACTIVE 9/9. The final web env key list contains none of
  `PROVIDER_MODE`, `JEWELO_CLOUD_BUILD`, or `JEWELO_CLOUD_TARGET`.
- Existing identity adversarial reviews and the prompt/style-anchor lab remain
  in `docs/goals/road-to-gold/reviews/` and `docs/goals/overnight-launch/`.

## Decisions taken by default

- Production provider selection is derived from `NODE_ENV`; the local
  `PROVIDER_MODE` convenience is not a cloud control.
- The existing spend ceiling remains the automatic guard: no real dispatch
  without the configured daily reservation and attempt ceilings.
- Existing defaults remain: HarfBuzz identity engine (DS-3/D-019), configured
  sellable set (DS-4/D-022), studio-only smoke (DS-6), dependency-free SMTP/log
  notification (DS-8), empty-key observability (DS-9), and the Inngest sweeper
  recovery model (DS-10).

## Needs Sanchay

1. Approve the first paid OpenAI run after P1-5 identity proof; this is the only
   action that authorizes provider spend.
2. Resolve Supabase billing before 29 September 2026 (upgrade Devonel or move
   the project), or the app will receive 402 responses after the grace period.
3. Provide `NOTIFICATION_TO` and an SMTP sending account if the shop should get
   email notifications; set `INNGEST_CRON_ENABLED=1` for the sweeper.
4. Create Sentry/PostHog projects and a DigitalOcean alert recipient if those
   operational integrations are wanted.
5. Decide whether the public GitHub repository should become private and make
   the product calls on long-post Latin names and refused-name hand review.

## Open findings

1. P1-5 fix pass 7: run the identity matrices, inspect the named renders, and
   complete two consecutive clean adversarial passes (implementer/reviewer).
2. BL-1: post an anonymous request on staging and prove replay returns the same
   row (lead/platform).
3. Fix-review-3 MJ-1 and minors 1–7 remain: operator-note audit, scope-mismatch
   clearing, unknown-order 404 gate, same-origin login, DOM breadcrumbs,
   notification sweep floor, and chunked-body bound (implementer).
4. Run the lead-owned seven-viewport/RTL/reduced-motion staging ladder and save
   screenshots under the next `docs/goals/road-to-gold/dogfood-*` directory.
5. P3-6, P3-5, P2-3–P2-7, P5-2/P5-3, P7-4/P7-8, and L-1–L-4 remain in the
   ordered task list.

## Rollback

- App rollback from `home-mini`: `bash scripts/digitalocean/rollback.sh staging
  9439c0a6-0810-4d9b-96c7-58d55dfb7791`; verify the current list first with
  `doctl apps list-deployments`.
- Database migrations are additive; use the migration-specific rollback notes
  in `docs/DIGITALOCEAN-DEPLOYMENT.md` and do not roll past the active `@v2`
  prompt release without the matching worker.

## Spend

- OpenAI: USD 0 this session; no provider/image-generation call was made.
- Runway: 0 credits used in this session; anchors remain outside git.
- Automatic real-mode ceilings remain enforced by configuration and the worker.
- DigitalOcean: one staging app; the current and follow-up deployments are
  ordinary App Platform updates.
