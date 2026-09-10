# Review: bar-fallback routing (`acb2706`) and fix 3 (`d6ca41b`)

Fresh-context `reviewer`, 2026-09-08, recorded by the lead from the agent's report.
Gate re-run by the reviewer: `corepack pnpm build` exit 0.

## Verified closed

M5 (`notes` off the allowlist, nothing in `apps/web` reads it; `audit_events.detail` is not in `AUDIT_READ_COLUMNS`).
M2 mechanics against the live database via `pg_get_functiondef`: `v_book_date` in the cap guard and every write, migration 160000 applied and matching.
`acb2706`: the gate reads the same value persisted in `validation_report.claimed.ringPlacement`, sits before the budget, the reservation and any provider call, fails closed for a repository that never sets the flag.
M3 core: `JEWELO_DEPLOY_TARGET` cannot ship (`localOnlyConfig` with an import-time guard), a `readEnvFiles` throw aborts the deploy, `DEPLOY_ENV_SYNC=0` rewrites only the branch, the `inngest` service is untouched.

## Major

**1. M1 is not closed: `apps/jobs/src/video.ts:160` and `:168` still write fal's raw `result.error` into `p_error_class` and `terminal_error_code`.**
`/api/state` selects the column for every task and the client surfaces it as `terminalErrorCode`.
A fal content-policy message can carry the shopper's name.
`errorClass` is private to `presentation.ts`; hoist it and apply at both sites.

**2. The M1 audit write is a prerequisite for releasing the reservation (`presentation.ts:1230-1245`).**
`blockPreSpend` awaits an unguarded `audit_events` insert before `mark_task_pre_spend_blocked`; if the insert fails, the fallback `fail` at attempt 0 hits `reconcile_provider_attempt`, which returns at once with no attempt row, so `reservation_cents` and `reserved_spend_cents` are never released.
A run that correctly refuses to spend permanently consumes its studio reservation for the day.
Write the detail after the RPC, or guard it.

**3. Booking on `reservation_usage_date` moves the daily cap off the day the money is spent (`20260908160000:88-93` with `20260907030000:92-95`).**
`reserve_provider_attempt` guards and books against the historical booking date; retries never clear it; reconcile charges actual cost to the attempt's date row with `reserved_spend_cents` unchanged, a shape the cap trigger early-returns on.
A bulk retry of yesterday's 200 blocked tasks at 09:00 is checked against yesterday's emptied row and today's real spend exceeds today's cap with nothing raising.
The old bug leaked capacity in the safe direction; this leaks in the paying direction.
Fix: record the booking date per `provider_attempts` row (book on `current_date`, release from the attempt's own stamp); the task-level date stays for the run-start reservation.

**4. M6's invariant rests on `maxDuration`, which the deployed runtime does not implement.**
`grep -rl maxDuration node_modules/next/dist/server` finds no request-path consumer; only build metadata for a hosting platform.
On App Platform with standalone `next start` neither 300 nor 360 kills or extends anything; the true bound is DigitalOcean's ingress timeout, which the runbook does not name.
The change is harmless; the proof claim is not established.

## Minor

5. `errorClass` cuts at the first colon, so `name_mismatch:len=4,script=latin` becomes `name_mismatch` and `style_anchor_missing:on_skin` loses its view; `nameMismatchCode`'s docstring and `personalizedRun.ts:269` still describe the suffixed value. Detail survives only in `audit_events.detail`.
6. Keeping `|` makes the 60-character cap per part, so a composed class can be 180 characters, contradicting the comment above it.
7. Minor 11 half closed: `apps/web/src/lib/supabase-jewelo-client.ts:62` still holds `SIGNED_URL_TTL_MS = 240_000` and backs the operator console.
8. `previewPipeline.ts:276-283,300-303`: a payload without `signedUrlRefreshAfterMs` turns the cache off for every asset, reinstating the iOS Safari decode defect during a rolling deploy; a floor would degrade without re-opening it.
9. Minor 14 not closed in substance: `request-guard.ts` is imported only by anonymous auth, operator session and transliterate; Next evaluates route modules on first request and readiness does not import it, so a typo leaves readiness green and the shopper's first call 500s. `validateWebEnv` does not check it.
10. M4 unproven against the platform: no deployment has shipped an empty GENERAL env, and the one host that ships it (App Platform) overwrites the header anyway.
11. `state/route.ts:194-199`: one asset with a bad segment throws out of `Promise.all` and the shopper loses all four views; unreachable today.
12. Minor 7 widened the comparison both ways: `identityTextMatches("Halima","ʰalima")` is now true; only the shaping coverage gate keeps it unreachable. Worth a docstring line.
13. `scripts/digitalocean/bootstrap-app.mjs:23-33` calls `readEnvFiles`/`appSecretEnvs` with no `deployTarget` check, so `do:bootstrap production` from the laptop still builds the production app from the staging `.env`.

## Safety note

The reviewer's own `psql` probe echoed the pooler URL, which embeds the database password, into its transcript.
Nothing was written to the repository; that transcript is never to be pasted into `PROGRESS.md`, the handover or the PR.

## Verdict

No blocker.
M5, the M2 and M3 mechanics and `acb2706` are genuinely closed against the live database and built artifacts.
M1 is false as stated (video path), the M1 fix couples the reservation release to a logging write, the M2 fix trades a conservative leak for a real daily-cap bypass on cross-day retries, and M6 is a consistency fix presented as a proof of an invariant the host does not enforce.
