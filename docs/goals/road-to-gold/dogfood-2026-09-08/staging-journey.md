# Staging journey, deployment 08d63e17 (2026-09-08)

Driven by the lead in the in-app browser against `https://jewelo-staging-gqumd.ondigitalocean.app` (PROVIDER_MODE=mock).
The in-app browser cannot save screenshots to disk, so the record is DOM measurements plus what the lead saw.
The pane was hidden for part of the run; visual layout at 390x844 is therefore not trusted here, only the DOM numbers.

## 1440x900

- Landing, scroll 0: `sticky {top:339,bottom:1115}`, `actionBar {top:814,bottom:900}`. Same numbers as session 1; P6-1 stays open.
- Typed `Rania`, clicked "Preview my piece": no backend call (only `GET /api/state?designId=d305b6ac… 200`). Same as session 1 defect 6.
- Ticked "I confirm the spelling…": `POST /api/designs/drafts 201`, `POST /api/revisions/approve 201`, then 7 polls of `GET /api/state?designId=a141ebb2-8500-460c-9f40-e8030670831b 200` and polling stopped, i.e. the run reached a terminal state.
- Page after the run: the four tiles read "Being prepared", the caption reads "Rania · Being prepared", and the fallback copy "We could not photograph your piece here. Leave one way to reach you and we will send it." is shown with WhatsApp/Phone/Email fields.
- Every `<img>` on the page is an `asma-*.png` example (six images, natural width 1122). No mock asset is shown as the customer's piece. Honest degrade confirmed.
- No customer copy says AI, generate, prompt or magic.

## 390x844

- `scrollWidth 390 == innerWidth 390`, no horizontal overflow.
- Fallback copy top at 1970 px document offset; 8 leaf nodes read "Being prepared" (4 tiles + 4 strip labels).
- Same six example images, same alt text.

## Not done in this pass

- 1280x720, 1024x768, 768x1024, 390x600, 320x568, RTL, reduced motion: not driven this session. Phase 1 is an engine phase; the customer surface did not change since session 1, whose viewport pass stands. Full ladder is owed again when Phase 6 touches the surface.

## Database side of the Rania run (REST, service role from `.env`)

- run `b06061ca-ae95-41d7-9a0e-44c5f10c3bd1`: `status complete`, `pipeline_release_id caleums-final-media-v2`, `actual_spend_cents 0`, no operator review reason.
- four tasks (`studio`, `on_skin`, `close_up`, `dark`): `ready`, attempt 1, `terminal_error_code null`, `pipeline_release caleums-final-media-v2`.
- So the "Being prepared" tiles are the UI refusing the mock 1x1 assets of a completed run, which is the honest degrade documented for `PROVIDER_MODE=mock`.

## Deploy `f617a568` (branch tip `503e252`, code `f3f8775`), lead browser pass

In-app browser, `https://jewelo-staging-gqumd.ondigitalocean.app/en/design/new`, 1440x900 then 390x844.
Typed `Ali`, chose Classical, "Preview my piece", ticked the confirmation.
Network: `POST /api/designs/drafts` 201, `POST /api/revisions/approve` 201, `GET /api/state?designId=6d7574c4-…` 200 polling.
Console: no errors at either viewport.
Tiles went "Waiting to start" then "Being prepared"; after about 35 s the honest-degrade contact card appeared ("We could not photograph your piece here. Leave one way to reach you and we will send it.") with WhatsApp, Phone, Email, which is the mock-mode outcome: the run completes with fake assets the UI refuses to show.
At 390x844: `scrollWidth 390 == innerWidth`, no horizontal overflow, four view tiles at 76 px, contact card present.
Observation: at 1440x900 the review step scrolled so that a large empty band sat above the design summary (screenshot showed the summary starting mid-viewport). Pre-existing, related to the UX review B1/B2 rows; not a regression of this deploy.
The platform agent's API re-proof (runs `5d873850` Ali and `0975a48c` أمير complete, `verification_result` keys `passed, exactText, identityScore, notes` only, readiness 200 with a forged cookie, transliterate 429 on the 21st call with 21 distinct principals, `'''` and `محمد٠١` refused 422, `O’Neill` 201) is recorded in `PROGRESS.md`.

## Deploy `b1ea4b6d` (`5b3f065`)

Branch tip `65a93ad`, code `5b3f065` (P1-5 fix pass 6 `dbb73fb` plus the bar routing cleanup).
Deployed from `home-mini`, `deploy.sh staging codex/overnight-launch-2026-09-08`, exit 0; `deployment_id=b1ea4b6d-300b-4924-b427-0937b54dc8de`, `doctl apps list-deployments ec09c9fd-84e4-45c5-b60a-fd62277af322` reports `ACTIVE 9/9`.
`DEPLOY_DRY_RUN=1` first: 14 env keys merged, values never printed, and `IDENTITY_BAR_FALLBACK_REVIEW` is not among them - the key left the contract with the bar routing.
`INNGEST_BASE_URL`, `INNGEST_CRON_ENABLED` and `TRUSTED_CLIENT_IP_HEADER` are absent from the environment file, as before.
`bash scripts/digitalocean/smoke.sh https://jewelo-staging-gqumd.ondigitalocean.app` exit 0: health 200, readiness 200 bound to a prod Inngest signing key.

Four runs driven by API against the deployed app (anonymous principal, `POST /api/designs/drafts` 201, `POST /api/revisions/approve` 201, classic lettering, 32 mm, no stones; an Arabic name carries `arabicStyle: "contemporary"`).
`PROVIDER_MODE=mock`, so every `provider_attempts` row is a mock attempt with `actual_cost_cents 0`.

- `آية` classic, run `989ca554-3f4a-4453-b340-0554243177cb` (design `4e1f532c`, revision `40b43b8b`): `status complete`, `actual_spend_cents 0`, `operator_review_reason null`, four tasks (`studio`, `on_skin`, `close_up`, `dark`) `ready` at attempt 1 with `terminal_error_code null`, four assets, four provider attempts all `succeeded` at `actual_cost_cents 0`.
  Identity artifact `bb6487a0`: `validation_report.claimed.ringPlacement welded`, `measured.ringTilt 0`, `measured.ringOverhang 0.050059594755661505`, `measured.componentsFinal 1`, `claimed.glyphPixelsUnderRingMetal 0`, `claimed.glyphPixelsPunchedByRings 0`, rings on glyphs 1 and 5, `engineRelease caleums-identity-v4`, `pipelineRelease caleums-final-media-v2`.
  On `d4bb713f` the same name landed in `operator_review` with `identity_bar_fallback`; with the pass 6 engine it welds and completes.
- `علي` classic, run `0f4e18a4-12c9-45e7-97c1-be58af08c6d6` (revision `923365cb`): `complete`, four `ready` tasks, four assets, `ringPlacement welded`, `ringTilt 0`, `ringOverhang 0.04111842105263158`, `componentsFinal 1`, rings on glyphs 1 and 3.
- `Ali` classic, run `9a3be903-1808-43b5-8418-027a5725bed4` (revision `6b6b1d64`): `complete`, four `ready` tasks, four assets, `ringPlacement welded`, `ringTilt 0`, `ringOverhang 0.04550438596491228`, `componentsFinal 1`, rings on glyphs 0 and 2.
- `Bartholomewsonlongest` classic, run `33424925-c497-4b61-8392-f1ffec3d9ead`: `status operator_review`, `operator_review_reason identity_no_ring_seat:left=6,right=6,steps=420888`, studio task `blocked` at attempt 0 with `terminal_error_code identity_no_ring_seat:left=6,right=6,steps=420888`, the other three `blocked` with `dependency_blocked`, zero `provider_attempts` rows, zero assets, no identity artifact.
  The refusal happens before spend, which is what the pre-spend block is for.

Stencil readback: the `آية` PNG downloaded from the private `identity-anchors` bucket with the service role (`principal/51bc8a4a-…/revision/40b43b8b-…/identity-5aaac376….png`, 10921 bytes), sha256 `dc13f0b9294d60bbd527cef50b54f8920f548f681259e2f9da2ce14415897bdc` equal to `identity_artifacts.png_sha256`.

```
corepack pnpm --filter @jewelo/jobs exec tsx scripts/measure-stencils.mts <scratch>/stencils render-report.json
SINGLE-PIECE 1/1
MATCH 1/1
CLAIM 1/1
```

The PNG and its `render-report.json` stay in the session scratchpad (`deploy-5b3f065/stencils/`); the earlier deploy sections kept their downloads out of the tree too.

Endpoint checks: `GET /api/state?designId=4e1f532c-…` with no session answers 401 `{"error":"Unauthorized","code":"unauthenticated"}`; `GET /api/readiness` without the token answers 200 `{"status":"ready"}`; with `x-readiness-token` it answers 200 with `supabase configured`, `inngest keyEnvironment prod`, `transport self_hosted`, `cronsRegistered true`, `openai configured`, `trustedClientIpHeader valid`.

Two notes against the brief: the contract is 14 keys, not 13 (`IDENTITY_BAR_FALLBACK_REVIEW` was never in the environment file, so removing it from the contract did not change the count), and `deploy.sh` did print `deployment_id` over non-interactive ssh this time.

## P5-1 caps (2026-09-08 22:00 UTC)

The launch ceiling is set on the live `public.runtime_policy` singleton of the staging Supabase project (`jggalwuvpcqoenhirmnl`), by UPDATE over the pooler.
No migration file: this is operational state for the shop day, not schema.

Previous values, recorded so P5-3 can restore them:

```
id | daily_generation_limit | max_reserved_spend_cents | global_max_reserved_spend_cents | global_daily_generation_limit | studio_reservation_cents | provider_attempt_budget | updated_at
t  |                     30 |                     6000 |                            6000 |                           100 |                      100 |                       3 | 2026-09-07 06:13:48.831055+00
```

Restore statement for P5-3:

```sql
update public.runtime_policy
set global_max_reserved_spend_cents = 6000,
    global_daily_generation_limit = 100,
    daily_generation_limit = 30,
    updated_at = now()
where id = true;
```

Values after the P5-1 update (full row readback):

```
id                              | t
environment                     | development
supabase_region                 | ap-south-1
daily_generation_limit          | 2
max_reserved_spend_cents        | 6000
studio_reservation_cents        | 100
updated_at                      | 2026-09-08 22:04:36.994673+00
video_reservation_cents         | 200
global_max_reserved_spend_cents | 800
global_daily_generation_limit   | 2
provider_attempt_budget         | 3
```

`max_reserved_spend_cents` (the per-shopper ceiling) and `provider_attempt_budget` were left as found; the row names only the three values above.

### What the numbers mean

A run reserves 400 cents in two bookings: 100 at `approve_and_start_studio` for the studio still, then 300 in `expand_final_media_run` for the three dependent views, both inside the same run-creation call.
`global_max_reserved_spend_cents = 800` therefore allows two runs' worth of reservations to be outstanding at once, and `global_daily_generation_limit = 2` allows two run starts per UTC day in total, across every principal.
The spend ceiling bounds reservations, not provider calls: `reserve_provider_attempt` tops a task up by `greatest(estimate - reservation_cents, 0)`, which is zero on a retry, so with `provider_attempt_budget = 3` two runs can still bill up to 24 stills.
The run count is what actually bounds the money, because `runs_started` is never released while a reservation is.

### Usage before

```
usage_date | principals | runs_started | reserved | actual
2026-09-08 |         21 |           22 |        0 |      0
2026-09-07 |         21 |           32 |      400 |      0
2026-09-06 |          2 |            3 |        0 |      0
```

The UTC day 2026-09-08 already carried 22 mock run starts from P1 and P3 work, so with the cap in place no run can start on staging for the rest of that UTC day.
The day rolls over at 00:00 UTC / 05:30 IST, and from that moment the whole system has exactly two runs and 800 cents.

### Proof that the cap binds, zero spend

1. Fresh anonymous principal `6a598942`, `POST /api/designs/drafts` 201 then `POST /api/revisions/approve` -> **429** `{"error":"global daily generation limit exceeded","code":"spend_guard"}`.
   Refused inside `approve_and_start_studio`, at the `principal_daily_usage` update that increments `runs_started`, so no `generation_runs` row, no `generation_tasks` row, no `provider_attempts` row and nothing in the operator queue; only a `design_drafts` row (`c77abe2c-b052-4ad7-bd7e-2102a1d8a6b6`) survives.

2. Both ceilings proved arithmetically in a rolled-back pooler transaction against a synthetic `usage_date` 2027-01-01, so nothing was left behind (`left behind | 0`):
   two rows with `runs_started = 1` accepted (sum 2), the third raised `global daily generation limit exceeded` from `enforce_daily_provider_spend_cap` line 56;
   two rows with `reserved_spend_cents = 400` accepted (sum 800), raising one of them to 500 raised `global daily spend guard exceeded` from line 52.

3. The two-then-refused shape driven end to end over HTTP, in mock mode.
   Driving it on the fresh UTC day would have spent the launch day's entire quota on mock runs and left P5-2 nothing, so instead `global_daily_generation_limit` was raised to 24 (the day's baseline 22 plus two) for four minutes, one anonymous principal drove three runs, and the value was set back to 2 and re-read.
   Principal `cb94ceaf-1ed2-489a-ab75-e7ed3a10a630`:
   - `Nadia`: `POST /api/revisions/approve` **201**, run `e2c8f600-1cd6-40ff-9359-5b4f064a167e`, `dispatchState accepted`; run `complete`, four tasks `ready` at attempt 1, `terminal_error_code null`, `reserved_spend_cents 0`, `actual_spend_cents 0`, `operator_review_reason null`.
   - `Omar`: **201**, run `45892bcc-0dba-43bf-99b8-edd1e0aa0b8f`; run `complete`, four tasks `ready` at attempt 1, zero spend, no operator review.
   - `Sara`: **409** `{"error":"daily generation quota exceeded","code":"state_conflict"}` from the per-principal `daily_generation_limit = 2`, raised before any row was written for that run.
   After restoring `global_daily_generation_limit = 2`, a fresh principal `9c3a7976` was refused again with 429 `global daily generation limit exceeded`.

Usage after: `2026-09-08` totals `runs 24, reserved 0, actual 0`; the driving principal `cb94ceaf` shows `runs_started 2, reserved 0, actual 0`.
Every reservation booked by the two runs was released on reconcile, and no test row reached the operator queue.

### Finding: a per-principal quota refusal is a 409, not a 429

`supabase-rest.ts:108` matches `/spend guard|generation limit/i`, and the per-principal refusal message is `daily generation quota exceeded`, so it maps to 409 `state_conflict` while the global one maps to 429 `spend_guard`.
The shopper is unaffected: `classifyStartFailure` in `personalizedRun.ts:279-289` reads the message, not the status, and returns `daily_limit` for the per-principal case and `busy` for the global one.
It matters only to an API consumer or a dashboard that groups refusals by status code. Not fixed here; not in this task's scope.

### DS-6

Default taken: studio-only smoke, so one run bills one image rather than up to twelve.
That default assumed the style anchors were not yet published; P4-1 published all six as version 2 in session 2, so `expand_final_media_run` now finds a publication for every profile and fans a run out to four tasks at creation.
Taking the default therefore needs a change, which P5-1 does not make: the three dependent views are created only in `expand_final_media_run` (`supabase/migrations/20260908150000_reservation_usage_date.sql:170-224`, called by `approve_and_start_studio` at `supabase/migrations/20260827140000_caleums_review_fixes.sql:234`), not anywhere in `apps/web/src/lib/backend/**`.
The smallest honest shape is one additive migration: a `runtime_policy.studio_only boolean not null default false` column plus a `create or replace` of `expand_final_media_run` that, when the flag is on, skips the 300-cent booking and inserts the three dependents as `cancelled` with `reservation_cents = 0`, then `corepack pnpm db:types`. Roughly 60 SQL lines, no TypeScript: the atelier already maps `cancelled` tasks to an honest end state (P6-3, P6-6).
The zero-code alternative, if the lead prefers not to add a column before the first paid call, is `provider_attempt_budget = 1` in the same policy row: it does not stop the fan-out, but it caps the day at 2 runs x 4 views = 8 stills instead of 24.

### DS-6 done: the studio-only switch (2026-09-09, migration `20260909010000_runtime_policy_studio_only.sql`)

The column and the branch in `expand_final_media_run` described above exist now, pushed to staging and proved at zero spend in mock mode.
`public.runtime_policy.studio_only boolean not null default false`: with it false the function is what it was, statement for statement; with it true the three dependent views are inserted `cancelled`, `reservation_cents = 0`, `reservation_usage_date null`, `terminal_error_code 'studio_only_policy'`, no 300-cent booking, and the `pipeline.final_media_pinned` audit event records `taskCount 1, studioOnly true` instead of a flat 4.

The P5-2 recipe, in order:

```sql
-- 1. the launch caps from the P5-1 section above
update public.runtime_policy
set global_max_reserved_spend_cents = 800,
    global_daily_generation_limit = 2,
    daily_generation_limit = 2,
    updated_at = now()
where id = true;

-- 2. one image per run, before PROVIDER_MODE=real is shipped
update public.runtime_policy set studio_only = true, updated_at = now() where id = true;
select id, studio_only, global_max_reserved_spend_cents, global_daily_generation_limit, daily_generation_limit
from public.runtime_policy;

-- 3. ship PROVIDER_MODE=real, deploy, smoke.

-- 4. once DS-6 is satisfied, the other three views come back
update public.runtime_policy set studio_only = false, updated_at = now() where id = true;
-- then the P5-3 cap restore recorded in the P5-1 section.
```

Both branches driven end to end over HTTPS against `https://jewelo-staging-gqumd.ondigitalocean.app` in `PROVIDER_MODE=mock`, zero spend:

- `studio_only = false`, run `9f5991c0-6f1a-4e2a-ba35-0ed6a7a3cfc3`: four tasks `ready` at attempt 1, four `provider_attempts`, run `complete`, `reserved_spend_cents 0` after reconcile, audit `taskCount 4, studioOnly false`. Unchanged from the two baseline runs above.
- `studio_only = true`, run `d6f03864-1ed3-4483-8aa3-800fa283e84a`: `studio ready` at attempt 1; `on_skin`, `close_up`, `dark` all `cancelled` with `studio_only_policy`, attempt 0, 0 cents, no usage date. Exactly one `provider_attempts` row (`b9ad69f4`, `succeeded`, 0 cents) and exactly one `outbox_events` row for the run, so exactly one image would have been billed. Immediately after approve, `principal_daily_usage` showed `runs_started 1, reserved_spend_cents 100` - the studio reservation alone, not 400. Run reached `complete`, not `partial`: `refresh_run_status` already counts a still view that is `ready` or `cancelled` as settled.

`/api/state` for the studio-only run returns the same four rows the database holds (`studio ready`, three `cancelled` carrying `studio_only_policy`), and `apps/web/src/features/atelier/personalizedRun.ts` reads a `cancelled` task as `reachable: false`, so `customerViewStatus` returns `unavailable` for those three views - the shop photographs them by hand. No TypeScript change was needed.

`studio_only` was set back to `false` and read back in the same statement; the caps were already at the restored values and were not touched.

### P5-1 caps restored by the lead (2026-09-08 22:30 UTC)

The launch caps were proved binding above and then set back to the previous values (`daily_generation_limit 30`, `global_max_reserved_spend_cents 6000`, `global_daily_generation_limit 100`), read back in the same statement.
Reason: staging stays in mock mode for days yet, and a global limit of 2 runs a day blocks the lead's dogfooding, Umayr's testing on his phone and the P7-6 durability drill.
The caps go on as the first step of P5-2, immediately before `PROVIDER_MODE=real` is shipped, using the UPDATE recorded in the P5-1 section.

## P7-6 durability drill (2026-09-08, 21:58-22:05 UTC)

Question the task row asks: kill the `inngest` component mid mock run on staging and watch the task reach `operator_review` inside four minutes.
The drill was run against `https://jewelo-staging-gqumd.ondigitalocean.app` (app `ec09c9fd-84e4-45c5-b60a-fd62277af322`, `PROVIDER_MODE=mock`).
The answer is that the premise is wrong in two independent ways, and both are now measured rather than argued.

### What was run

`doctl apps restart` does have a component flag on the installed `doctl 1.167.0-release`, so no scaling and no spec update were needed:

```text
doctl apps restart ec09c9fd-84e4-45c5-b60a-fd62277af322 --components inngest --format ID,Phase,Cause --wait
Notice: Restarted
ID                                      Phase     Cause
489c7b72-d49e-415d-9fc3-80deb2ba7c81    ACTIVE    restarting app
exit=0
```

Two restarts were issued: `489c7b72-d49e-415d-9fc3-80deb2ba7c81` (fired 22:00:04, `Restarted` 22:01:33, 89 s wall) to calibrate how long a restart takes, and `7fbb8f4c-8465-46ea-8e1a-98009f2b0eb2` (fired 22:02:09, created 22:02:12, ACTIVE 22:03:28) as the drill itself, with `doctl apps logs <app> inngest --type run --follow` recording the component the whole time.
Both deployments carry the cause `restarting app`; the `web` component kept answering HTTP throughout, so a component-scoped restart is not an app-wide outage.

### Timeline, UTC, 2026-09-08

```text
21:58    runtime_policy read before starting: global_daily_generation_limit 100,
         daily_generation_limit 30, updated_at 2026-09-07T06:13:48Z.
         Newest generation_run was 19:50, so no concurrent driver was visible.
21:59    GET /api/readiness with x-readiness-token -> 200
         inngest {configured:true, keyEnvironment:"prod", transport:"self_hosted",
         cronsRegistered:true}, supabase configured, openai configured.
22:00:04 restart 1 fired.
22:00:31 new inngest container: "initialized database" db=postgres,
         "ran database migrations", "starting server" addr 0.0.0.0:8288.
22:01:33 doctl reports Restarted (deployment 489c7b72).
22:01:54 the concurrent P5-1 agent rewrote runtime_policy:
         global_daily_generation_limit 100 -> 24, daily_generation_limit 30 -> 2.
22:02:09 restart 2 fired (deployment 7fbb8f4c).
22:02:48 run 45892bcc-0dba-43bf-99b8-edd1e0aa0b8f (P5-1's, not this drill's)
         dispatches its studio still; 22:02:53 the three dependent views follow.
22:03:01 this drill's own POST /api/revisions/approve is refused:
         429 {"error":"global daily generation limit exceeded","code":"spend_guard"}
         principal_daily_usage for 2026-09-08 summed to 24 of the new cap of 24.
22:03:01.971 inngest ERROR "error checkpointing async steps"
             error="run not found in state store"
22:03:02.169 same
22:03:02.461 same
22:03:02.906 same
22:03:03.716 same
22:03:04.805 run 45892bcc reaches status complete; all four tasks ready at
             attempt 1, four provider_attempts succeeded at actual_cost_cents 0.
22:03:37.492 old inngest container takes the signal: "queue waiting to quit",
             "in-progress jobs finished, exiting queue processor",
             "shutting down server".
22:04    GET /api/readiness -> 200, same JSON as before the restart.
         scripts/digitalocean/smoke.sh -> exit 0, health and readiness pass.
```

### Reading 1: the in-process loss is real and it is visible

`error checkpointing async steps: run not found in state store`, five times inside two seconds, is the caveat in `docs/goals/overnight-launch/w0/INNGEST.md` observed rather than predicted: a restarted Inngest server has no memory of runs the previous process was holding, so their step checkpoints are refused.

### Reading 2: it does not reach the customer, because Postgres is the truth

The run that was in flight across the restart finished normally: `complete`, four tasks `ready` at attempt 1, `terminal_error_code null`, four `provider_attempts` `succeeded`.
The job body executes inside the `web` component and writes its result to Supabase itself; what Inngest loses is its own bookkeeping, not the task.
So the honest statement of the risk is narrower than the task row assumes: a restart can lose an *event that has not been picked up yet*, or the *second step* of a run that had already written its first, and both of those are re-dispatched by the sweeper rather than escalated.

### Reading 3: `operator_review` is not the route an inngest restart takes, and four minutes is not achievable

`operator_review` comes from exactly one branch of `public.recover_stale_generation_tasks`, the one guarded by `attempt_status in ('reserved','submitted','ambiguous')`.
That state means a *paid provider attempt* was reserved and its worker never came back, which is a `web` process death, not an `inngest` process death.
An `inngest` restart leaves the task `queued` or `generating` with no live reservation, so the sweeper takes its `dispatch` or `retry` branch and the run continues.

The four-minute figure is not reachable either.
The sweeper's window is derived, not configured: `staleRecoveryWindowMs = executorRequestCapSeconds * 1000 + staleRecoveryMarginMs` in `packages/config/src/index.ts`, and with the shipped defaults `providerRequestTimeoutMs 180000`, `visionRequestTimeoutMs 60000` twice, `localWorkAllowanceMs 60000`, `staleRecoveryMarginMs 120000` that is `360000 + 120000 = 480000 ms`, eight minutes.
`stale-media-recovery` then runs on `*/2 * * * *`.
The earliest a stale task can be recovered is therefore about eight minutes and the latest about ten; four minutes would require shortening the executor request cap, which is deliberately tied to the route's `maxDuration` so the sweeper can never fire while a provider call is still legally running.

### The recovery contract itself, proved by SQL and rolled back

Because no live run could be started (see below), the branch was exercised directly against the deployed function through the session pooler.
An existing row cannot be back-dated - `tasks_touch` is a `BEFORE UPDATE` trigger that rewrites `updated_at` - so the drill inserts a synthetic copy of one finished run and its studio task with `updated_at` fifteen minutes old and a `provider_attempts` row still `reserved`, calls the sweeper with the deployed 480 s window, and rolls the whole transaction back.

```text
psql "$SUPABASE_DB_POOLER_URL" -f sweeper2.sql
BEGIN / set local role service_role

 phase  |   status   | attempt | run_status | attempt_status | estimated_cost_cents |   age
 before | generating |       1 | running    | reserved       |                  100 | 00:15:00.3

 select * from public.recover_stale_generation_tasks(now() - interval '480 seconds', 100);
 task_id                              | recovery_action | outbox_id
 fc0cb1e2-6cc2-4d15-9c2a-7906470dcffa | operator_review | null

 phase | status  | terminal_error_code                    | run_status      | operator_review_reason              | attempt_status | error_class            | actual_cost_cents
 after | blocked | operator_review_ambiguous_paid_request | operator_review | stale_worker_ambiguous_paid_request | ambiguous      | stale_worker_ambiguous |               100

 audit | task.stale_paid_request_blocked | attempt 1 | cost 100 | paidRequestRepeated false
 outbox | rows_for_task 0
ROLLBACK
```

Everything DS-10 promises is there: the run is stopped for an operator, the attempt is closed as `ambiguous` and charged conservatively at its estimate rather than re-spent, an audit event records it, and **no outbox row is written**, so a paid request is never repeated on a guess.

### What could not be done, and why

One live end-to-end run through a restart was not possible.
At 22:01:54 the concurrent P5-1 agent set `global_daily_generation_limit` to 24, and `principal_daily_usage` for 2026-09-08 already summed to exactly 24, so `POST /api/revisions/approve` answered 429 `spend_guard` at 22:03:01.
Per the task's own instruction the cap was not raised; the counter is keyed on `usage_date`, so it clears at 00:00 UTC.
The restart that was fired did land on a live run - P5-1's `45892bcc` - and that run completed unharmed, which is the observation recorded above; no other agent's work was damaged.

### Cloud switch, confirmed by reading only

Nothing was changed. The `web` component would need `INNGEST_BASE_URL` removed and `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` replaced with the Cloud values; the `inngest` component, which carries `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, `INNGEST_POSTGRES_URI`, `INNGEST_SDK_URL`, `INNGEST_PORT` and `INNGEST_HOST`, would be deleted from the spec; and the app URL would be synced once from the Inngest dashboard.
`INNGEST_CRON_ENABLED` stays as it is.
That is one variable to remove, two values to swap and one component to delete - no application code, since the client already reads `baseUrl`, `eventKey` and `signingKey` from the environment.
