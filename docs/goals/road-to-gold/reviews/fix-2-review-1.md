# Review: security fix 2 (`3ee31c2`) and pipeline fix 2 (`f3f8775`)

Fresh-context `reviewer`, 2026-09-08, recorded by the lead from the agent's report (the reviewer definition forbids it from writing files).
Gate re-run by the reviewer: `corepack pnpm build` exit 0.

## Verified closed

Two transliteration limiters in conjunction (source key checked before `authenticate`, 20 per 60 s each, request 21 refused).
`operatorMockMode` shared, no new 401.
Readiness never 500s; `smoke.sh` still asserts `keyEnvironment prod` (it sends no cookie).
`identityTextMatches` fails closed on an empty side.
NFKC on the read side creates no false match: `ﻧﻬﺮ` vs `نهر` true, `Soﬁa` vs `Sofia` true, `ＳＡＲＡ` vs `Sara` true, `1234` vs `1234` false, `hhh` vs `ʰʰʰ` false.
Dot and empty segment rejection in `apps/jobs`; `REFERENCE_ASSET_ID` from contracts; `expiresIn` from config; `outbox_pending` dropped; regenerated types add only the two columns.

## Major

**M1. `terminal_error_code` still carries raw error text; the commit's stated property is false.**
`apps/jobs/src/presentation.ts:1214` (`blockPreSpend`, `p_reason: message.slice(0, 300)`) and `:1456` (`fail`, `message.slice(0,120)`), published by `apps/web/src/app/api/state/route.ts:21`.
The fix wrapped only the secondary failure inside `blockPreSpendTerminally` (`:398`).
The outer catch at `:750-757` passes the error straight to `fail`; `#request` builds `Supabase job request ${status}:${body.slice(0,300)}` (`:799-801`), so a PostgREST 400/409 body, including row values, lands in a column the browser reads on every poll.
Fix: `errorClass()` at both call sites; the full message goes only to the audit event detail.

**M2. `reservation_usage_date` moves the midnight bug from run start to the retry top-up.**
`supabase/migrations/20260908150000_reservation_usage_date.sql:247` versus `20260908140000_provider_attempt_budget_policy.sql:54`.
`reserve_provider_attempt` tops up on `current_date` and never touches `reservation_usage_date`.
Attempt 1 reserved X on day D, fails at 23:59, reconcile sets `reservation_cents = 0`; attempt 2 reserved at 00:02 on D+1 books X on the D+1 row; its reconcile releases from D, where nothing is held, `greatest(0, …)` clamps, and X stays reserved on D+1 forever.
Each midnight-crossing retry permanently consumes part of `max_reserved_spend_cents`.
Same class in `mark_task_pre_spend_blocked` (`:291`) and the dependency-terminal branch (`:379`).
Latent: `request_video_task` (`20260908120000_pipeline_release_v2.sql:119`) inserts with no `reservation_usage_date`.

**M3. `deploy.sh` pushes the deploying machine's `.env` into whichever app is named.**
`scripts/digitalocean/deploy.sh:88-98`.
One `.env` serves both environments and `validateWebEnv` is never called; `deploy.sh production main` from the laptop would overwrite production's `PROVIDER_MODE`, `SUPABASE_URL`, `OPENAI_API_KEY`, `OPERATOR_PASSPHRASE` with staging values, with no spec to diff afterwards.
`JEWELO_ENV_FILE` exists but the runbook (`docs/DIGITALOCEAN-DEPLOYMENT.md:166-181`) tells the operator to write into `.env`.

**M4. The documented "trust no header" setting cannot be shipped.**
`scripts/digitalocean/env-contract.mjs:102` (`if (!value) continue;`) against `docs/DIGITALOCEAN-DEPLOYMENT.md:181-185` and `packages/config/src/index.ts:530-540`.
A synthetic env file with `TRUSTED_CLIENT_IP_HEADER=` is reported as absent; the app keeps the `do-connecting-ip` default on a host that does not overwrite it, and every per-source guard is reset by rotating one header, which is exactly the finding the config was added to close.

**M5. `notes` in the `/api/state` allowlist is unbounded model prose.**
`apps/web/src/app/api/state/route.ts:84`, fed by `packages/ai/src/studio.ts:234`.
The verifier writes it after being shown the approved name and asked to explain a failure, so it can carry the misread spelling and model vocabulary.
Nothing in `apps/web` reads `notes`; drop it from `VERIFICATION_FIELDS`.

**M6. The derived 420 s stale window is longer than the executor can legally run.**
`apps/web/src/app/api/inngest/route.ts:8` (`maxDuration = 300`) against `packages/config/src/index.ts:512-525` (180 + 2x60 + 120 s).
The whole still runs in one `step.run` with `retries: 0`; the three provider timeouts alone sum to 300 s, leaving nothing for the render, downloads, upload and writes.
On a host that honours `maxDuration` the request is killed after the image is paid for, and the task sits in `verifying` for a further 120 s.
The invariant "the sweeper can never fire while a provider call is still legally running" is now vacuous rather than proved.

## Minor

7. `studio.ts:307` folds only the read side while `domain.ts:367` accepts Arabic presentation forms as approved text: `ﻧﻬﺮ` approved shapes fine but `identityTextMatches("نهر","ﻧﻬﺮ")` is false, so three paid stills then "preparing" forever. Fold the approved side for comparison only.
8. `domain.ts:366` admits any `\p{M}` (Arabic harakat in a Latin name) and any `\p{Lm}`: `Saraً` and `ʰʰʰ` accept, then shape with `notdef`, blocked pre-spend with a worse message than the old 422.
9. `apps/web/src/features/atelier/model.ts:188` accepts any `\p{L}` for English (`Мария`, `李明` pass the client, 422 from the server).
10. Dot-segment rejection missing from the customer-facing signer at `state/route.ts:186`, which also interpolates `bucket_id` unencoded.
11. `previewPipeline.ts:263` keeps `SIGNED_URL_TTL_MS = 240_000` while the server signs for the config value; lowering the config silently serves expired URLs.
12. Transliteration source limiter 20 per 60 s before auth: one caller behind a carrier NAT holds the window closed for everyone at that address. Theoretical today: no caller of `/api/transliterate` in `apps/web`.
13. Migration `:212` rewrites the studio task's `reservation_cents` from the current policy while the booking-date row holds the run-start amount; a policy change between the two leaves a difference `greatest(0, …)` swallows. Pre-existing.
14. `trustedClientIpHeader()` parses at module import in `request-guard.ts:80`; a typo throws on import and 500s every guarded route rather than failing at boot with a named error.

## Verdict

No blocker.
The never-borrow-a-design chain, the stencil, verifier and anchor identity chain and idempotent dispatch survived every probe.
Two of the commits' own claims are not met (M1, M2), and the deploy-time env sync introduces a production-overwrite path (M3) and an unshippable setting (M4).
