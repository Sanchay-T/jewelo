# Generation pipeline review 1 (reviewer, on `dde9058`, 2026-09-08)

Scope: `apps/jobs/src/presentation.ts`, `video.ts`, `apps/web/src/inngest/functions.ts`, `packages/data`, the pipeline SQL functions. Lead reproduced finding 1 with the regex: `"SARA & OMAR"` false, `"O’Neill"` false, `"SARA"` true.

| # | Severity | Finding | Owner |
| --- | --- | --- | --- |
| 1 | blocker | `presentation.ts:434` decides `latinExpected` with a class that excludes `&` and `’`; two-name English (`SARA & OMAR`, joined by `canonical_identity_anchor`) and `O’Neill` are then required to contain Arabic, so every attempt fails, three paid stills per view are spent, and the shopper is told the piece is unavailable. | pipeline fix 1 |
| 2 | blocker | Stale sweeper window 2 min (`functions.ts:247`) versus provider timeout 180 s (`packages/ai/src/studio.ts:139`), no heartbeat during the call: a 2 to 3 minute generation is charged, blocked, sent to operator review, and its correct still then fails the `blocked` to `verifying` transition. | pipeline fix 1: both values in `packages/config`, window derived from timeout plus margin, or heartbeat |
| 3 | major | `presentation.ts:438-440` `passed = scriptOk && (reading.matches \|\| identityTextMatches(...))`: the model's own boolean bypasses the deterministic comparison, the same self-report removed in August. | pipeline fix 1: drop `reading.matches` from the conjunction (P2-6 replaces the tolerance) |
| 4 | major | `reconcile_provider_attempt` (`20260907030000:148`) and `mark_task_pre_spend_blocked` update `principal_daily_usage` for `current_date` without upsert; an attempt crossing UTC midnight records no actual spend and never releases the reservation. | pipeline fix 1: migration using the attempt's `created_at::date` with upsert |
| 5 | major | `presentation.ts:890-897` interpolates unvalidated `referenceAsset.id` into a service-role signed storage path; `..` segments normalise before the request. | pipeline fix 1: validate `^[a-zA-Z0-9_-]{1,128}$`, encode segments in `signedStorageUrl` |
| 6 | minor | `video.ts:432-476` inserts the asset before claiming `ready`, inverse of the still path. | recorded, video is off |
| 7 | minor | `coalesce(p_patch->>..., existing)` in `20260827120000:120` means explicit nulls never clear `provider_status_url` or `terminal_error_code`. | pipeline fix 1 |
| 8 | minor | `presentation.ts:219-233` bare `catch` discards the pre-spend RPC cause. | pipeline fix 1 |
| 9 | minor | No secondary index on `generation_tasks` or `assets(task_id)`; the outbox partial index does not cover `dispatching`. | pipeline fix 1: migration |
| 10 | minor | Literals in business code: 180 s, 60 polls, "10s", 2 min stale, limit 100, `expiresIn: 300`, attempt budget 3 in four places. | pipeline fix 1: `packages/config` |
| 11 | minor | `20260907020000:79` releases against `created_at::date` while reservations use `current_date`; harmless at 0 cents today. | with 4 |

Clean: reservation arithmetic balances end to end in integer cents; open-attempt guard and idempotency short circuit ordered before writes; reconcile guard makes the pre-spend fallback a no-op; Inngest exactly-once on the dispatch key with `retries: 0`; mock path fenced (`provider: "mock"` refused by `personalizedRun.ts`); image order matches the prompt; RLS on every written table, all RPCs `security definer set search_path=''` with revokes; duplicate asset race prevented; `/api/state` projects columns explicitly; no vendor SDK outside the ports; every promise awaited.
