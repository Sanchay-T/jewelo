# W0a - Database, seeds, storage, env rotation

Written 7 September 2026 by the `platform` agent (W0a) for the overnight launch goal.
Every command below was run from the repository root on branch `codex/overnight-launch-2026-09-08`.
No secret value appears in this file; only variable names.

## Project

| Field | Value |
| --- | --- |
| Project name | `jewelo-caleums` |
| Project ref | `jggalwuvpcqoenhirmnl` |
| Region | `ap-south-1` (Mumbai) |
| Plan | Free |
| Postgres | 17.6.1.166 (server reports `PostgreSQL 17.6 on aarch64-unknown-linux-gnu`) |
| Old project | `hcobuwgwkwxbabfucwdt`, still present, not touched, not deleted |

The Devonel Supabase organization is inside a Free-plan grace period for exceeding the egress quota.
The grace period runs until **29 September 2026**.
Nothing tonight is blocked by it, but sustained image traffic out of Storage is what consumes that quota.

### Direct database host is IPv6-only

`SUPABASE_DB_URL` in `.env` points at `db.jggalwuvpcqoenhirmnl.supabase.co`, which resolves to an IPv6 address only.
This machine has no IPv6 route, so `psql "$SUPABASE_DB_URL"` fails with `No route to host`.
Every SQL check in this document was run through the session pooler instead:

```text
postgresql://postgres.jggalwuvpcqoenhirmnl:<SUPABASE_DB_PASSWORD>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
```

The Supabase CLI already prefers the pooler, so `pnpm db:push` and `pnpm db:types` are unaffected.
Any script that uses `SUPABASE_DB_URL` directly will fail on this machine until that value is switched to the pooler URL.

## Migrations

```text
$ pnpm exec supabase link --project-ref jggalwuvpcqoenhirmnl
{"project_ref":"jggalwuvpcqoenhirmnl","message":""}
exit 0

$ pnpm db:push                       # scripts/supabase-remote.sh push
Applying migration 20260826000000_foundation_baseline.sql...
... 17 migrations, in order, no failures ...
Applying migration 20260827150000_caleums_studio_first_chain.sql...
{"upToDate":false,"dryRun":false,"migrations":[ ...17 entries... ],"seeds":[],"roles":[],"message":"Finished supabase db push."}
exit 0

$ pnpm db:push                       # second run, after the new cap migration
Applying migration 20260907000000_global_daily_spend_cap.sql...
{"upToDate":false,"dryRun":false,"migrations":["20260907000000_global_daily_spend_cap.sql"],"seeds":[],"roles":[],"message":"Finished supabase db push."}
exit 0
```

All 17 historical migrations applied to a fresh Postgres 17 project without a single failure.
No historical migration needed a fix-forward.
No historical migration was edited.

### `supabase migration list --linked`

```text
$ pnpm exec supabase migration list --linked --password "$SUPABASE_DB_PASSWORD"
exit 0

  LOCAL          | REMOTE         | TIME
  ---------------+----------------+--------------------
  20260826000000 | 20260826000000 | 2026-08-26 00:00:00
  20260827000000 | 20260827000000 | 2026-08-27 00:00:00
  20260827010000 | 20260827010000 | 2026-08-27 01:00:00
  20260827020000 | 20260827020000 | 2026-08-27 02:00:00
  20260827030000 | 20260827030000 | 2026-08-27 03:00:00
  20260827040000 | 20260827040000 | 2026-08-27 04:00:00
  20260827050000 | 20260827050000 | 2026-08-27 05:00:00
  20260827060000 | 20260827060000 | 2026-08-27 06:00:00
  20260827070000 | 20260827070000 | 2026-08-27 07:00:00
  20260827080000 | 20260827080000 | 2026-08-27 08:00:00
  20260827090000 | 20260827090000 | 2026-08-27 09:00:00
  20260827100000 | 20260827100000 | 2026-08-27 10:00:00
  20260827110000 | 20260827110000 | 2026-08-27 11:00:00
  20260827120000 | 20260827120000 | 2026-08-27 12:00:00
  20260827130000 | 20260827130000 | 2026-08-27 13:00:00
  20260827140000 | 20260827140000 | 2026-08-27 14:00:00
  20260827150000 | 20260827150000 | 2026-08-27 15:00:00
  20260907000000 | 20260907000000 | 2026-09-07 00:00:00
  20260907010000 | 20260907010000 | 2026-09-07 01:00:00
  20260907020000 | 20260907020000 | 2026-09-07 02:00:00
```

All 20 local migrations are applied remotely, captured at 06:25 IST.

`20260907010000_preview_requests.sql` (the honest-degrade `preview_requests` table) was written by another
workstream while this document was being produced, and was applied later in the night; a final `pnpm db:push`
reports `{"upToDate":true,...,"message":"Remote database is up to date."}` and
`select to_regclass('public.preview_requests')` returns the table.
`20260907020000_dependent_view_terminal_gate.sql` arrived the same way and is also applied.
W0a did not push either file; their owners did.

## New migration: global daily spend cap

`supabase/migrations/20260907000000_global_daily_spend_cap.sql`.

The problem it fixes: **the existing cap is per anonymous principal, not global.**
`enforce_daily_provider_spend_cap` compares one `principal_daily_usage` row against
`runtime_policy.max_reserved_spend_cents`, and `start_studio_run`, `approve_and_start_studio`,
`expand_final_media_run`, `reserve_provider_attempt` and `request_video_task` each check only the owning
principal's reservation.
A shop demo mints a fresh anonymous principal for every browser session, so the nightly budget was unbounded
in aggregate: N sessions multiplied by the per-shopper cap.

What the migration does:

- adds `runtime_policy.global_max_reserved_spend_cents` (default 6000) and `global_daily_generation_limit` (default 100);
- rewrites `enforce_daily_provider_spend_cap` to keep the per-principal check unchanged and add a global check;
- the global check sums `actual_spend_cents + reserved_spend_cents` and `runs_started` over every
  `principal_daily_usage` row for the same `usage_date`;
- the trigger now also fires on `update of runs_started`;
- the global check is skipped when the row's totals are not increasing, so reconciliation, cancellation and
  stale recovery can always record money that has already been committed;
- the aggregate read is serialized with `pg_advisory_xact_lock` keyed on the usage date, taken after the
  caller's row lock on every path, so two concurrent sessions cannot both pass a stale sum.

Error text keeps the words `spend guard` and `generation limit` so that
`apps/web/src/lib/backend/supabase-rest.ts` still maps them to HTTP 429 `spend_guard`.

Every reservation path in this schema writes `public.principal_daily_usage`, so the BEFORE trigger on that
table is the single choke point and covers future paths as well.
The nine functions confirmed to write it on the live database are `approve_and_start_studio_legacy`,
`cancel_generation_task`, `expand_final_media_run`, `mark_task_pre_spend_blocked`,
`reconcile_provider_attempt`, `recover_stale_generation_tasks`, `request_video_task`,
`reserve_provider_attempt` and `start_studio_run_legacy`.

### Proof

Run inside one transaction that was rolled back, with the global cap temporarily lowered to 800 cents and two
throwaway anonymous principals A and B.
Verified afterwards that the policy row was unchanged and that no usage rows or test users survived.

```text
--- 1. principal A reserves 500c (global cap 800) : expect OK ---
(no error)
--- 2. principal B reserves 400c (500+400 > 800) : expect global spend guard ---
ERROR:  global daily spend guard exceeded
CONTEXT:  PL/pgSQL function public.enforce_daily_provider_spend_cap() line 39 at RAISE
--- 3. principal B reserves 200c (500+200 = 800) : expect OK ---
(no error)
--- 4. principal B raises to 400c (500+400 > 800) : expect global spend guard ---
ERROR:  global daily spend guard exceeded
--- 5. reconcile at the ceiling (reserved 200 -> actual 200) : expect OK ---
 11111111-...  reserved=500 actual=0
 22222222-...  reserved=0   actual=200
--- 6. per-principal cap still enforced: A raises to 1300c (> 1200) : expect daily spend guard ---
ERROR:  daily spend guard exceeded
CONTEXT:  PL/pgSQL function public.enforce_daily_provider_spend_cap() line 13 at RAISE
--- 7. global generation limit: cap 2 runs, A=2 then B=1 : expect generation limit ---
ERROR:  global daily generation limit exceeded

=== after rollback ===
 max_reserved_spend_cents=1200  global_max_reserved_spend_cents=6000  global_daily_generation_limit=100  daily_generation_limit=6
 leftover_usage_rows=0
 leftover_test_users=0
```

Case 2 is the requirement: two principals whose reservations together exceed the global cap, and the second
one is refused with a `spend guard` error that the API maps to 429.

## Seeds

There is no separate seed step.
`supabase/seed.sql` is a one-line no-op comment, `pnpm db:push` reported `"seeds":[]`, and there is no
`db:seed` script.
Every seed the backend needs is an `insert` inside a migration, so a clean `db push` produces them.
Verified on the live database after the push:

- `runtime_policy` - 1 row.
- `prompt_releases` - 12 rows across `image.billboard`, `image.dark_editorial`, `image.macro_gift`,
  `image.packshot`, `image.studio`, `image.studio_hero`, `image.worn`, `verification.image`,
  `video.final` v1 and v2, `video.preview` v1 and v2.
- `prompt_profile_publications` - 10 rows, one per profile, `published_by = system:migration`.
- `style_anchor_releases` - 6 rows, all `status = missing`, `bucket_id`, `object_path` and `checksum_sha256`
  all null, with the contract's authoritative source task IDs:
  `image.packshot ddd3862a-...`, `image.worn ee78f9a4-...`, `image.macro_gift 44f3b981-...`,
  `image.dark_editorial ba0b8433-...`, `image.studio_hero d0c0bac4-...`, `image.billboard f7de6e1b-...`.
- `style_anchor_publications` - 6 rows pointing at those `missing` releases.
  This is the fail-closed gate W2 must clear by publishing real anchors.
- `pipeline_releases` - 2 rows: `caleums-one-view-v1` (legacy) and `caleums-final-media-v1` (active).
- 27 base tables in `public`.

There are no operator or organization seed rows.
Operator access is by `OPERATOR_EMAIL` / `OPERATOR_PASSPHRASE` env, not a database row.

## runtime_policy

Verified with a REST GET as the service role:

```text
$ curl -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    "$SUPABASE_URL/rest/v1/runtime_policy?select=*"
HTTP_STATUS=200

[{"id":true,
  "environment":"development",
  "supabase_region":"ap-south-1",
  "daily_generation_limit":6,
  "max_reserved_spend_cents":1200,
  "studio_reservation_cents":100,
  "video_reservation_cents":200,
  "global_max_reserved_spend_cents":6000,
  "global_daily_generation_limit":100,
  "updated_at":"2026-09-06T21:35:37.185247+00:00"}]
```

`supabase_region` was corrected from the seeded default `ap-northeast-2` to `ap-south-1` so the row records
where the project actually lives.
No code reads that column; it is a record only.

### The caps, in plain numbers

| Cap | Value | Scope | Enforced by |
| --- | --- | --- | --- |
| `global_max_reserved_spend_cents` | 6000 (USD 60) | all principals, one UTC day | new trigger |
| `max_reserved_spend_cents` | 1200 (USD 12) | one principal, one UTC day | existing trigger and RPCs |
| `global_daily_generation_limit` | 100 | all principals, one UTC day | new trigger |
| `daily_generation_limit` | 6 | one principal, one UTC day | `start_studio_run` quota check |
| `studio_reservation_cents` | 100 | per still task | reservation |
| `video_reservation_cents` | 200 | per video task | reservation |

**After launch, lower `global_max_reserved_spend_cents` to 4000 (USD 40/day).**

```sql
update public.runtime_policy set global_max_reserved_spend_cents = 4000, updated_at = now() where id = true;
```

### Two operational warnings about these caps

**`usage_date` is UTC.**
It defaults to `CURRENT_DATE` evaluated in the database's UTC timezone, so the day rolls over at
**05:30 IST**, not at local midnight.
Work done at 02:00 IST on 7 September and work done at 09:00 IST on 7 September are on two different budget
days; work done at 23:00 IST on 7 September and 05:00 IST on 8 September share one.

**`daily_generation_limit = 6` per principal per UTC day will be hit fast on one shop device.**
The shop owner's phone or tablet keeps one anonymous principal per browser profile, so the seventh shopper of
the day on that device is refused with `daily generation quota exceeded` unless they get a fresh session.
Six runs also equals 2400 cents of the 6000-cent global cap from that one device.
If the shop uses a single demo device tomorrow, raise `daily_generation_limit` before the visit or expect the
seventh customer to be blocked.

**The UTC rollover was observed live tonight.**
Reservations recorded at 03:15 IST landed on `usage_date = 2026-09-06`; reservations recorded at 06:10 IST
landed on `usage_date = 2026-09-07`.
After three end-to-end runs the current UTC day stands at 700 cents of the 6000-cent global cap across
5 runs and 3 principals.

**Reservations accumulate; they are not released by testing.**
One full run reserves 400 cents (100 for the studio still plus 300 when `expand_final_media_run` pins the three
model views) and stays reserved until the attempt reconciles or is cancelled.
Fifteen test runs exhaust the 6000-cent global cap for the whole UTC day, including tomorrow morning.
Before the shop visit, check and if necessary clear stale test reservations:

```sql
select principal_id, runs_started, reserved_spend_cents, actual_spend_cents
from public.principal_daily_usage where usage_date = current_date;
```

## Storage buckets

The migrations create four buckets, all private.
`20260827000000_caleums_one_view_backend.sql` creates `references`, `identity-anchors` and `generated-assets`
plus the owner-scoped `storage.objects` policies.
`20260827080000_caleums_final_media_pipeline.sql` creates `style-anchors`.

Bucket names the code expects, and where:

| Bucket | Referenced by |
| --- | --- |
| `references` | `apps/web/src/lib/reference-store.ts`, `apps/jobs/src/presentation.ts` |
| `identity-anchors` | `apps/jobs/src/presentation.ts` |
| `generated-assets` | `apps/jobs/src/presentation.ts`, `apps/jobs/src/video.ts` |
| `style-anchors` | not a literal in code; read from `style_anchor_releases.bucket_id` per release |

Nothing was missing, so no bucket had to be created by hand.

```text
$ curl -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    "$SUPABASE_URL/storage/v1/bucket"
HTTP_STATUS=200

  references           public=False size_limit=5242880
  identity-anchors     public=False size_limit=5242880
  generated-assets     public=False size_limit=52428800
  style-anchors        public=False size_limit=10485760
```

All four are private.
The end-to-end run below wrote one object into `references`, which proves the signed upload path and the
owner-scoped insert policy work on the new project.

## Database types

```text
$ pnpm db:types                      # scripts/supabase-remote.sh types
Generated packages/data/src/database.types.ts
exit 0

$ git diff --stat packages/data/src/database.types.ts
 packages/data/src/database.types.ts | 6 ++++++
 1 file changed, 6 insertions(+)
```

The only change is the two new `runtime_policy` columns, in `Row`, `Insert` and `Update`.
Everything else in the checked-in types already matched the new project, which is independent confirmation
that the fresh project's schema equals the schema the code was written against.

## Auth configuration change

Anonymous sign-in was **disabled** on the new project, which is the Supabase default.
The entire customer journey starts with `POST /api/auth/anonymous`, so the backend returned HTTP 500 on its
first call and nothing downstream could run.

```text
$ GET https://api.supabase.com/v1/projects/jggalwuvpcqoenhirmnl/config/auth
  external_anonymous_users_enabled = False
  rate_limit_anonymous_users = 30
  disable_signup = False

$ PATCH .../config/auth  {"external_anonymous_users_enabled":true}
  external_anonymous_users_enabled = True
HTTP_STATUS=200
```

Note `rate_limit_anonymous_users = 30` per hour.
Thirty-one shoppers in one hour from the shop would start being refused at the auth step.

## Backend end-to-end

```text
$ BASE=http://localhost:3001 E2E_MOCK=1 bash scripts/e2e-backend.sh
=== FAIL · 4 failed assertions · 921615ms ===
exit 1
```

The gate was run three times as the platform came up around it.

| Run | When | Failures | What changed |
| --- | --- | --- | --- |
| 1 | before Inngest existed | 5, all dispatch | outbox `failed`, `job_dispatch_rejected:fetch failed` |
| 2 | Inngest serving, `preview_requests` route not yet compiled | 17 | 12 of them the `/api/preview-requests` steps |
| 3 | final | **4** | the run below |

The dev server on 3001 had to be restarted before run 1: it was started before `.env` was rewritten and Next
dev did not re-evaluate the server-side Supabase config, so it was still issuing tokens from the old project.
Anonymous sign-in also had to be enabled on the new project first (see above) or step 01 returns HTTP 500.

### Run 3 - what passes

The complete customer and operator journey now runs end to end against the new project:

```text
[  305ms] 01 auth.anonymous(A) -> 200 ok user=a84c05b1-2f58-47f7-ba40-7d3f586f6987
[  708ms] 02 drafts.create -> 201 ok draft=d24e7b81-36f3-4c24-9be9-c7fb61e6a8a4
[ 1258ms] 03 drafts.confirm-spelling -> 200 ok spelling_confirmed=true
[ 1338ms] 04b transliterate(100 chars rejected) -> 422 ok route caps names at 36 characters
[ 1658ms] 05 references.upload -> 200 ok path=principal/a84c05b1-.../reference.png
[ 2307ms] 06 revisions.approve -> 201 ok run=0884ed65-... dispatch={"dispatchState":"accepted","acceptedCount":1,"pendingCount":0} in 611ms
[ 2449ms] 07 db.still-task count -> - ok 4 {"close_up":"queued","dark":"queued","on_skin":"queued","studio":"queued"}
[ 2619ms] 09 approve.second-run-while-active -> 409 ok code=run_active
[ 2911ms] 10 approve.idempotent-replay -> 200 ok same run
[ 4385ms] 11 poll.motion-preview-created -> - ok task=9c32d7b6-...
[ 5200ms] 12 tasks.cancel(motion) -> 200 ok status=cancelled
[ 5286ms] 13 run.not-cancelled-by-sibling -> - ok run=complete
[ 5476ms] 14 poll.four-stills-ready -> - ok {"close_up":"ready","dark":"ready","on_skin":"ready","studio":"ready"}
[ 5561ms] 15 run.status complete -> - ok complete
[ 5803ms] 16 db.assets count -> - ok 4 provider=mock
[ 6329ms] 17 state.read -> 200 ok {"designs":1,"runs":1,"tasks":5,"assets":4}, 4 signed assets
[ 6874ms] 18 commands.estimate -> 201 ok low=1350 high=1725 currency=AED
[ 7243ms] 20 commands.request_quote -> 201 ok total=1538, idempotent replay ok, no duplicate
[ 7660ms] 21 accept_quote before issue -> 409 state_conflict
[ 7783ms] 22 checkout.fails-closed -> 409 state_conflict
[ 7840ms] 23-27 operator session, prompts, issue_quote, accept_quote, logout -> all ok
[ 8263ms] 28-35 negative suite: 401 unauthenticated, 404 cross-tenant, 422 malformed, 409 state conflict, 401 bad HMAC -> all ok
          47-52 preview-request create, status, owner scoping, E.164 normalisation, audit row,
                idempotent replay, cross-tenant refusal, unusable contact 422, missing bearer 401 -> all ok
```

Storage, RLS, Realtime-backed state, signed URLs, the estimate and quote chain, the operator surface, the
cross-tenant boundary and the honest-degrade `preview_requests` table all work on the fresh project.

### Run 3 - the four failures, exact lines

```text
[ 2336ms] 06 approve acceptedCount -> - FAIL want=4 got=1
[ 2538ms] 08 db.outbox published -> - FAIL want=4 got=1 states=["published"]
[ 9346ms] 38 mockfail.approve -> 200 FAIL want=[201] {"code":"<no-code>","error":""} run=beb4c195-4033-4e91-97a1-f180e9ed4677
[918553ms] 39 mockfail.poll operator_review+blocked -> - FAIL timeout after 900s
```

**06 and 08 are stale assertions in the script, not a backend defect.**
Migration `20260827150000_caleums_studio_first_chain.sql` made the pipeline studio-first: only the studio task
gets an outbox row at approve time, and `release_dependent_tasks` creates the other three after the studio
still is ready.
`acceptedCount=1` and one published outbox row are therefore the correct values at that instant.
The end state of the same run proves the chain completes:

```text
=== run 0884ed65 tasks ===          === its outbox events ===
 close_up        ready               presentation.requested  published
 dark            ready               presentation.requested  published
 on_skin         ready               presentation.requested  published
 studio          ready               presentation.requested  published
 motion_preview  cancelled
```

`scripts/e2e-backend.sh` steps 06 and 08 should expect 1 at approve time and 4 after the studio still is ready.
This is a script fix for whoever owns that file; W0a did not change it because another workstream is editing it.

**38 and 39 are a real orchestration gap and belong to the Inngest workstream.**
The injected-failure run never started at all.
Its outbox event was created and then simply sat there:

```text
=== outbox event for run beb4c195 ===
 event_type              state    err  published_at  leased
 presentation.requested  pending  -    (null)        false

=== its tasks ===                    === its run ===
 close_up  queued  attempt 0          status queued, operator_review_reason null
 dark      queued  attempt 0
 on_skin   queued  attempt 0
 studio    queued  attempt 0
```

Two separate defects are visible here:

1. immediate dispatch on approve did not accept the event (HTTP 200 instead of 201, `dispatchState` not
   `accepted`), and the event stayed `pending` with no error recorded;
2. `outbox-recovery` did not reconcile that pending event in 900 seconds, which is what the every-minute cron
   exists to do.

Run 2 showed a third, related failure mode on the same step: there the studio task did dispatch, failed with
`error_class = mock_generation_failed`, moved to `status = retrying` at attempt 1, and then never retried and
never reached `blocked` / `operator_review`.
No second outbox event and no attempt 2 were ever created.

Together these mean **a shopper's run can silently never start, or can stall forever in `retrying`, and never
reaches the honest-degrade state.**
That is launch-critical and it is the top item for the Inngest workstream.
No W0a change can fix it.

## DigitalOcean environment rotation

App `jewelo-staging`, id `ec09c9fd-84e4-45c5-b60a-fd62277af322`, region `blr`.

```text
$ bash scripts/digitalocean/doctl.sh apps spec get ec09c9fd-... --format json    # exit 0
$ bash scripts/digitalocean/doctl.sh apps update ec09c9fd-... --spec <scratchpad>/spec-after.json --output json
Notice: App updated
exit 0
```

Applied changes, on the single `web` service:

```text
  kept     NEXT_PUBLIC_JEWELO_DATA_MODE
  rotated  NEXT_PUBLIC_SUPABASE_URL
  rotated  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  rotated  SUPABASE_URL
  rotated  SUPABASE_SERVICE_ROLE_KEY
  removed  TRIGGER_SECRET_KEY
  kept     OPENAI_API_KEY
  kept     OPERATOR_EMAIL
  kept     OPERATOR_PASSPHRASE
  kept     OPERATOR_SESSION_SECRET
  kept     NEXT_PUBLIC_APP_URL
  kept     JEWELO_CLOUD_BUILD
```

Live spec after the update, key names and scope only:

```text
app: jewelo-staging   region: blr
service: web   branch: review/sample-images-board   (unchanged, as instructed)
  NEXT_PUBLIC_JEWELO_DATA_MODE           scope=RUN_AND_BUILD_TIME type=SECRET   value=ciphertext
  NEXT_PUBLIC_SUPABASE_URL               scope=RUN_AND_BUILD_TIME type=SECRET   value=ciphertext
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY   scope=RUN_AND_BUILD_TIME type=SECRET   value=ciphertext
  SUPABASE_URL                           scope=RUN_TIME           type=SECRET   value=ciphertext
  SUPABASE_SERVICE_ROLE_KEY              scope=RUN_TIME           type=SECRET   value=ciphertext
  OPENAI_API_KEY                         scope=RUN_TIME           type=SECRET   value=ciphertext
  OPERATOR_EMAIL                         scope=RUN_TIME           type=SECRET   value=ciphertext
  OPERATOR_PASSPHRASE                    scope=RUN_TIME           type=SECRET   value=ciphertext
  OPERATOR_SESSION_SECRET                scope=RUN_TIME           type=SECRET   value=ciphertext
  NEXT_PUBLIC_APP_URL                    scope=RUN_AND_BUILD_TIME type=GENERAL  value=plain
  JEWELO_CLOUD_BUILD                     scope=BUILD_TIME         type=GENERAL  value=plain
TRIGGER_* present: False
```

The spec file was written only under the session scratchpad with mode 600 and deleted immediately afterwards.

The spec update caused DigitalOcean to start deployment `c2e45a18-6921-456e-b2f0-c75100c61050`
(`Cause: app spec updated`, phase BUILDING).
That is the unavoidable side effect of a spec update; no deployment was triggered deliberately, and the branch
was not changed.
It builds the stale `review/sample-images-board`, which W5 retargets later.

`NEXT_PUBLIC_JEWELO_DATA_MODE` is stored as an encrypted SECRET, so its plaintext cannot be read back from the
spec.
Its key is present and its value was not touched, so it still holds whatever it held before (`remote`).

### Env keys the app still lacked at this historical snapshot

The following bullets describe the app before the Session 5 provider/deployment
cleanup. They are retained as W0 evidence, not as the current runbook. The
current staging spec has OpenAI configured and contains neither
`PROVIDER_MODE` nor either retired cloud activation flag; see the Session 5
deployment proof in `docs/goals/road-to-gold/PROGRESS.md`.

- `PROVIDER_MODE` is **not set on the DigitalOcean app at all**.
  At that time W4 still treated it as a required activation step; production
  now derives the real provider from `NODE_ENV=production` and fails closed if
  the OpenAI credential is absent.
- `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` and optionally `INNGEST_BASE_URL` still have to be added by the
  Inngest workstream.

### `scripts/digitalocean/env-contract.mjs`

`TRIGGER_SECRET_KEY` was removed from `runtimeConfig`, and a new `optionalRuntimeConfig` list holds
`INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` and `INNGEST_BASE_URL`.
`appSecretEnvs` now iterates a `knownWebConfig` union, so those keys ship to the app when they exist in `.env`
but do not fail the contract while they do not.

```text
$ node scripts/digitalocean/check-env.mjs staging "$PWD/.env"
staging web environment is valid
exit 0
```

`pnpm do:check-env` itself currently fails before it reaches the script, with
`ERR_PNPM_IGNORED_BUILDS: Ignored build scripts: protobufjs@7.6.6` from the pnpm preinstall check.
That is a repository-wide pnpm issue owned by another workstream, not an environment-contract failure;
invoking the script directly with `node` passes.

## Blocked

1. **Outbox dispatch and recovery are unreliable under Inngest.**
   Steps 38 and 39 of the backend e2e fail: an approved run's outbox event stayed `pending`, unleased and
   without an error, for 900 seconds, and a failed still in an earlier run stayed `retrying` forever.
   Owner: the Inngest workstream. No W0a change affects it.
2. **`scripts/e2e-backend.sh` steps 06 and 08 assert the pre-studio-first-chain behaviour.**
   They want 4 dispatched tasks at approve time; the correct answer since migration `20260827150000` is 1.
   Owner: whoever owns that script.
3. **Anchors are all `missing`.**
   Real-mode generation stays fail-closed until W2 publishes the four style anchors.
4. **`pnpm` scripts fail with `ERR_PNPM_IGNORED_BUILDS`** on `protobufjs@7.6.6` before running anything.
   `pnpm db:push`, `pnpm db:types` and `pnpm do:check-env` were affected; direct `bash`/`node` invocation works.

## Commands run, with exit codes

| Command | Exit |
| --- | --- |
| `pnpm exec supabase link --project-ref jggalwuvpcqoenhirmnl` | 0 |
| `pnpm db:push` (17 migrations) | 0 |
| `pnpm db:push` (global spend cap migration) | 0 |
| `pnpm exec supabase migration list --linked` | 0 |
| `pnpm db:types` | 0 |
| REST `GET /rest/v1/runtime_policy?select=*` | HTTP 200 |
| REST `GET /storage/v1/bucket` | HTTP 200 |
| Management `GET /v1/projects/<ref>/config/auth` | HTTP 200 |
| Management `PATCH /v1/projects/<ref>/config/auth` | HTTP 200 |
| `bash scripts/e2e-backend.sh` (BASE 3001, E2E_MOCK=1), run 3 | 1 (4 failed assertions) |
| `bash scripts/digitalocean/doctl.sh apps spec get` | 0 |
| `bash scripts/digitalocean/doctl.sh apps update --spec` | 0 |
| `node scripts/digitalocean/check-env.mjs staging .env` | 0 |
