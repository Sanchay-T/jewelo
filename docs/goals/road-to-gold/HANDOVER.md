# CALEUMS handover

This file is the handover. Its content is mirrored into the description of
https://github.com/Sanchay-T/jewelo/pull/12; that pull request is merged into
`main` and remains the durable delivery record.

## The whole story, in plain paragraphs

CALEUMS is a pendant studio for Omran's jewelry shop in the UAE. A shopper types
an English or Arabic name, chooses a look and metal, and should receive four
photographs of that exact pendant: studio, on skin, close up, and dark. The
deterministic stencil owns the name and geometry; the image model only dresses
it, and verification refuses drift.

The identity engine, prompt registry, anchors, operator queue, spend ledger,
Inngest runner, security fixes, and the shopper's honest mock-degrade path are
implemented. The atelier now exposes every construction and lettering style in
the request contract; the identity and verifier gates still decide whether a
specific name can be made. P1-5 remains open because the latest pass-7 work
still needs its full matrix, named-render inspection, and two consecutive clean
adversarial reviews. P2-3 through P2-7 remain open because the live real-provider
branch still uses `MockStudioVerifier` and the deterministic photographic gate
has not yet been wired and proved. P5-2/P5-3 remain open because the first paid
OpenAI run needs Sanchay's explicit spend decision and the measured identity
gate must be complete.

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
| Active deployed commit | `eba96fd6edcdecc92e9133dbfa5c449e18156a25` (`eba96fd`), DigitalOcean deployment `84f54bd8-927f-48cd-b871-071e7fc78923` (ACTIVE) |
| Branch head | `main` at merged commit `bbeed032c13c39836ef4cca5ff5d8c5ea5dc9f13` (`bbeed03`); source branch `codex/overnight-launch-2026-09-08` remains at `b734e57` |
| Provider mode | Production runtime: `real` selected from `NODE_ENV=production`; protected readiness reports `provider: real`. Local development/test defaults remain mock unless explicitly set otherwise. |
| Live readiness | HTTP 200: Supabase configured; Inngest configured, self-hosted, `keyEnvironment=prod`, crons registered; OpenAI configured; trusted client IP header valid. |
| Deployment scope | Production intentionally skipped; one DigitalOcean staging instance only. |
| Build/lint | `corepack pnpm build`: 13/13; `corepack pnpm lint`: 13/13. |
| Phase / next task | Phase 0 closed; P1-5 identity proof, then P2-3/P2-7 and P5-2/P5-3 remain. The cloud provider guard and all-look cleanup are deployed; two bounded paid validation runs completed, but the latest prompt wording fix is not deployed. |
| Merge | PR #12 merged 10 September 2026 at `ebea6d06a87107e85b0dc205ea8665f29c466f5d`; prompt wording fix PR #14 merged at `abd1371`; paid-run identifiers PR #17 merged at `bbeed03`; no direct `main` push was used. |
| Sessions | 8 (7–10 September 2026) |

## What a shopper gets today

The staging URL is live and its public health endpoint returns HTTP 200. The
protected readiness probe is also HTTP 200 with the production dependency proof
above. All four constructions and six lettering styles are selectable in the
normal flow; there is no deployment allowlist and no Reference-only lockout.
The page still uses the honest mock-degrade path until a paid real run is
authorized: fake assets are refused by the UI and the customer is told the shop
will send the photograph. No customer-facing real image was generated in this
session. The full shopper flow is coherent through request capture, but the
seven-viewport, RTL, and reduced-motion staging ladder is still open.

The local app is open in the Codex in-app Browser at
`http://localhost:3011/en/design/new`. Its local Next dev server returns HTTP
200 from `/api/health`, the interactive studio controls and name textbox are
visible, and the browser recorded no console errors. It uses the existing
cloud-backed environment for Supabase/OpenAI and the local Inngest dev server
(`127.0.0.1:8288/health` returns 200); it does not use the DigitalOcean process
for local rendering. Runway is intentionally the prompt-lab bench, not a
production runtime dependency: the app's production socket is OpenAI, and no
Runway or OpenAI generation was invoked.

Fal is present only as the optional Seedance video adapter. The local runtime
defaults `VIDEO_ENABLED` to off, so the active API path is still-image logic,
not Fal video submission. Local development also defaults provider selection to
mock; hosted Supabase is real, but no provider spend occurs from opening or
using the local design page.

## Done this session

- Production provider invariant and readiness/smoke proof (`32404c7`).
- Staging deployment of the invariant: `9439c0a6-0810-4d9b-96c7-58d55dfb7791`,
  source `32404c70a04fabbd981fdb74f2720e60b747838e`; it was superseded after
  the env-spec cleanup, not used as the active rollback target.
- Removed legacy cloud activation/build flags from deploy and bootstrap; pushed
  as `cc9fb01` and deployed ACTIVE as `b50be520-f728-4234-870e-7141dbea3cfa`.
- Removed the custom `NEXT_PUBLIC_SELLABLE_*` look allowlist and made the
  request-contract set code-owned (`f9dcdc1`, followed by documentation/comment
  cleanup in `eba96fd`). All four constructions and six lettering styles remain
  selectable; stale allowlist keys are deleted during deploy sync. The branch
  was deployed as `84f54bd8-927f-48cd-b871-071e7fc78923` and smoke-tested live.
- `corepack pnpm build`, `corepack pnpm lint`, shell/module syntax, and diff
  checks passed. No provider or image-generation call occurred.
- PR #12 was marked ready and merged with squash commit
  `ebea6d06a87107e85b0dc205ea8665f29c466f5d`; local `main` was fast-forwarded
  to that exact commit and the tracked worktree is clean.
- The prompt compatibility slot was corrected in PR #14 so English prompts say
  `lettering style` rather than `Arabic style`; the existing `arabic_style` key
  remains stable for stored releases and Arabic runs.
- Two bounded staging validations used synthetic names and the active staging
  runtime: English `Layla` (Diamond rails, Minimal, 22 mm, yellow gold, no
  stones) and Arabic `ريم` (Framed minimal, Kufi, 32 mm, rose gold, accent ruby).
  Each produced Studio, On skin, Close-up and Dark OpenAI assets with the
  customer-visible fields `passed=true`, `exactText=true`, and
  `identityScore=1`. Actual ledger spend was 160 cents ($1.60) across eight
  attempts; the 800-cent reservation was not fully used. Raw files remain in
  `/tmp/jewelo-paid-validation/` and were inspected visually. These runs used
  the active staging source `eba96fd`; deployment of the wording fix remains
  deferred until local approval.
- The exact design and run identifiers were added in PR #17 and mirrored into
  this handover so the paid evidence is directly traceable from the delivery
  record.

## Evidence

- `docs/goals/road-to-gold/PROGRESS.md`, Sessions 5–8 entries.
- `scripts/digitalocean/smoke.sh` against the live URL: health and protected
  readiness both passed; protected readiness returned `provider=real`,
  `keyEnvironment=prod`, configured Supabase/OpenAI, self-hosted Inngest and a
  valid trusted IP header. Secrets were not printed.
- In-app Browser proof: local `http://localhost:3011/en/design/new` and live
  staging `/en/design/new` both show all four constructions and six lettering
  styles; Framed minimal + Kufi selects without a Reference-only label, and the
  staging browser recorded zero console errors.
- DigitalOcean deployment record `84f54bd8-927f-48cd-b871-071e7fc78923` is
  ACTIVE from branch `codex/overnight-launch-2026-09-08` at
  `eba96fd6edcdecc92e9133dbfa5c449e18156a25`. The live web env key list
  contains none of `PROVIDER_MODE`, `JEWELO_CLOUD_BUILD`,
  `JEWELO_CLOUD_TARGET`, or `NEXT_PUBLIC_SELLABLE_*`.
- Existing identity adversarial reviews and the prompt/style-anchor lab remain
  in `docs/goals/road-to-gold/reviews/` and `docs/goals/overnight-launch/`.
- The all-look browser proof is in
  `docs/goals/road-to-gold/dogfood-2026-09-10/declutter-styles-390x844.png`
  and `declutter-styles-expanded-390x844.png`; the merge proof is PR #12 and
  the `main`/`origin/main` equality at `ebea6d0`.

## Decisions taken by default

- Production provider selection is derived from `NODE_ENV`; the local
  `PROVIDER_MODE` convenience is not a cloud control.
- The existing spend ceiling remains the automatic guard: no real dispatch
  without the configured daily reservation and attempt ceilings.
- Existing defaults remain: HarfBuzz identity engine (DS-3/D-019), the full
  request-contract look set (D-022), studio-only smoke (DS-6), dependency-free SMTP/log
  notification (DS-8), empty-key observability (DS-9), and the Inngest sweeper
  recovery model (DS-10).

## Needs Sanchay

1. Review the two local visual outputs and approve or reject redeploying the
   prompt wording fix. No further paid run is needed for this representative
   bilingual proof unless a different option matrix is requested.
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
5. `apps/web/src/features/atelier/personalizedRun.test.ts` still contains
   historical expectations for the removed Classical/Classic restriction. The
   repository instruction keeps existing Vitest files untouched and unrun;
   those assertions need a dedicated test-maintenance pass before the suite is
   treated as a gate.
6. P3-6, P3-5, P2-3–P2-7, P5-2/P5-3, P7-4/P7-8, and L-1–L-4 remain in the
   ordered task list.
7. Styles are selectable but not all visually distinct in the deterministic
   identity layer: Arabic classic, diwani, and signature currently share the
   Naskh face; P3-5 owns the broader style-quality proof.
8. The real presentation branch currently combines `OpenAIStillAdapter` with
   `MockStudioVerifier` and `OpenAINameReader`; the photographic verifier and
   exact name/attachment reader acceptance remain P2 work.

## Rollback

- App rollback from `home-mini`: `bash scripts/digitalocean/rollback.sh staging
  b50be520-f728-4234-870e-7141dbea3cfa`; verify the current list first with
  `doctl apps list-deployments`.
- Database migrations are additive; use the migration-specific rollback notes
  in `docs/DIGITALOCEAN-DEPLOYMENT.md` and do not roll past the active `@v2`
  prompt release without the matching worker.

## Spend

- OpenAI: USD 1.60 this session across eight successful still attempts; the
  two runs were synthetic-name validation only and did not deploy code.
- Runway: 0 credits used in this session; anchors remain outside git.
- Automatic real-mode ceilings remain enforced by configuration and the worker.
- DigitalOcean: one staging app; the current and follow-up deployments are
  ordinary App Platform updates.

### Session 7 custom restriction cleanup (2026-09-10)

- Removed the deployment-time `NEXT_PUBLIC_SELLABLE_*` allowlist and the
  customer-facing Reference-only gate. `sellableLooks()` now mirrors the
  request contract directly: four constructions and six lettering styles in
  either script. Missing catalogue photographs may still be labelled honestly,
  but they no longer make a contract option non-sellable.
- Preserved the safety boundaries that are independent of presentation:
  exact spelling and script rules, Arabic one-name support, deterministic
  geometry, provider verification, auth, idempotency, spend reservation and
  rollback/state gates. Invalid or future values outside the contract still
  fail closed before a run starts.
- Local browser proof was captured at
  `docs/goals/road-to-gold/dogfood-2026-09-10/declutter-styles-390x844.png` and
  `declutter-styles-expanded-390x844.png`; live staging proof and smoke used
  deployment `84f54bd8-927f-48cd-b871-071e7fc78923`. Build and lint were both
  13/13; no paid provider call was made.

### Session 8 merge and status refresh (2026-09-10)

- Removed the old no-merge instruction from `CLAUDE.md`, committed as
  `b734e57`, marked PR #12 ready, and merged it through GitHub as squash commit
  `ebea6d06a87107e85b0dc205ea8665f29c466f5d`.
- Fetched `origin/main`, fast-forwarded local `main` to the merge commit, and
  confirmed `main...origin/main` is clean. The generated Next type declaration
  remains ignored/local-only; no customer media, style anchors, or secrets were
  added.
- Read-only audits confirm the journey, all-look selection, identity chain,
  prompt registry, style-anchor publication, operator queue, and deployment
  boundary. The open release gates are recorded above; no paid provider call
  was made.

### Session 10 bounded bilingual paid validation (2026-09-10)

- Used the existing staging runtime without deploying new code. The English
  `Layla` / Diamond rails / Minimal / no-stones run and Arabic `ريم` / Framed
  minimal / Kufi / accent-ruby run each completed all four OpenAI views.
- Run identifiers: English design `8cbde9cd-4c0d-42e8-acc1-f9dc1dc3e331`,
  run `43d18594-fa58-49a2-9cc6-6f3067144fc3`; Arabic design
  `7e28acb4-1ab2-4f43-a57e-4ff94425e365`, run
  `783f615a-8afa-4651-a12b-2ad7a6750bd5`.
- All eight attempts were `succeeded`; the customer-facing projection reported
  `passed=true`, `exactText=true`, and `identityScore=1` for every asset. The
  ledger records 160 cents actual spend against 800 cents estimated reserve.
- Lead visually inspected the eight downloaded PNGs. The pendant remained one
  connected object with the requested construction, chain, material, and scene
  treatment in both scripts. This is useful transfer evidence, not closure of
  P1-5 or P2-3–P2-7 because the current staging worker still uses the mock
  photographic verifier.
