# W0b - Inngest replaces Trigger.dev

7 September 2026. User-instructed stack change (goal `overnight-launch-2026-09-08`, workstream W0).
Trigger.dev's prod environment is paused until 1 October and the user chose not to continue with it.

## What changed

Trigger.dev is gone from the repository. The durable job engine is now Inngest, and the functions run inside the existing Next.js app.

```text
POST /api/revisions/approve
  -> Postgres RPC commits the revision, run, tasks and one outbox row
  -> attemptImmediateDispatch(runId)
       -> dispatchPendingOutbox  (unchanged, packages/data)
            -> sendJobEvent      (the only thing that changed)
                 -> inngest.send({ id: <dispatch_idempotency_key>, name, data })
  -> Inngest server calls  POST /api/inngest  ->  presentation-task
       -> step.run("execute-presentation-task")  -> executePresentationTask
       -> step.run("dispatch-dependent-outbox")  -> releases on_skin/close_up/dark
```

| Layer | Before | After |
| --- | --- | --- |
| Engine | Trigger.dev Cloud, separate deployed worker (`apps/jobs`) | Inngest, functions served by `apps/web` at `/api/inngest` |
| Transport | `POST api.trigger.dev/api/v1/tasks/<id>/trigger` | `inngest.send()` |
| Exactly-once | Trigger `idempotencyKey` option | Inngest **event id** = the same durable `outbox_events.dispatch_idempotency_key` |
| Queues | named queues `openai-image`, `fal-video` | keyed concurrency, constant CEL keys `"openai-image"` / `"fal-video"` |
| Schedules | `schedules.task` crons in the worker | cron-triggered Inngest functions, registered only where `INNGEST_CRON_ENABLED=1` |
| Video polling | task re-triggering itself once per poll | one durable run with `step.sleep("10s")` between polls |
| Deployment | `pnpm jobs:deploy` (`trigger deploy`) | nothing extra; the web deploy carries the functions |

`apps/jobs` keeps every pure job body (`executePresentationTask`, `submitVideoTask`, `pollVideoTask`, `markVideoPollTimeout`, `dispatchPendingOutbox`, `renderIdentityAnchor`) and now has no engine SDK at all. It is consumed by `apps/web` through workspace subpath exports (`@jewelo/jobs/presentation`, `/outbox`, `/video`), the same pattern the `packages/*` workspaces already use.

## Functions

| id | trigger | concurrency | retries |
| --- | --- | --- | --- |
| `presentation-task` | `jewelo/presentation.requested` | `[{ key: '"openai-image"', limit: OPENAI_STILL_CONCURRENCY_LIMIT }]` | 0 |
| `video-submit` | `jewelo/video.submit.requested` | `[{ key: '"fal-video"', limit: FAL_VIDEO_CONCURRENCY_LIMIT }]` | 0 |
| `video-poll` | `jewelo/video.poll.requested` | none | 3 |
| `outbox-recovery` | cron `* * * * *` | 1 | 3 |
| `stale-media-recovery` | cron `*/2 * * * *` | 1 | 0 |

Four decisions worth defending:

**No function-level `idempotency`.** The plan first called for `idempotency: "event.data.taskId"`. That is wrong here: the outbox re-dispatches the same `taskId` legitimately - an operator retry, and the two-minute stale sweeper from migration `20260827110000` with keys shaped `recovery:<task>:attempt:<n>:stale:<ts>`. A 24-hour function-level key on `taskId` would silently swallow every one of those. Exactly-once is carried instead by the event `id`, which is the durable `dispatch_idempotency_key`: a duplicate dispatch of the *same row* is deduplicated, a legitimate re-dispatch writes a *new* key and runs. Asserted in `apps/web/src/inngest/functions.test.ts`.

**`retries: 0` on everything that spends money.** A process retry cannot prove whether OpenAI or fal already accepted and charged for the interrupted attempt. The paid-attempt budget (3) lives in `reserveAttempt` in Postgres, and re-dispatch is the stale sweeper's job. This matches the Trigger configuration it replaces (`maxAttempts: 1`).

**One `step.run` around `executePresentationTask`.** The plan review asked for phase-split steps. The code does not allow it honestly: the function is a single closure over a reservation, an attempt counter and a name-check regeneration loop, and splitting it would require serialising `GeneratedMedia` - the raw provider image bytes - into Inngest step state. That both bloats the run and puts customer media outside private Supabase Storage, against rule 22. It stays one step; the outbox dispatch that follows it is a second step.

**`video-poll` carries no fal concurrency key.** The rate-limited resource is submission, not status reads, and an Inngest run holds its concurrency slot across `step.sleep`, so a polling run would otherwise occupy a submission slot for the full ten-minute window.

## Cron guard

`outbox-recovery` and `stale-media-recovery` claim work from the shared `outbox_events` table with service-role credentials. They are registered only when `INNGEST_CRON_ENABLED=1`, which is set on the DigitalOcean `web` component and left unset locally, so a developer's `inngest dev` can never claim a live shopper's task. `functions.test.ts` asserts both the default (3 functions) and the enabled (5 functions) shapes.

## Self-hosted deployment (the fallback that shipped)

Inngest Cloud was not signed in when this had to ship, so the goal document's fallback applies. The server runs as a second App Platform service component in the same app as `web`.

```text
app jewelo-staging (ec09c9fd-84e4-45c5-b60a-fd62277af322), region blr

  service web      git, Node buildpack, http_port 8080, public "/" ingress
    INNGEST_EVENT_KEY        SECRET
    INNGEST_SIGNING_KEY      SECRET
    INNGEST_BASE_URL         ${inngest.PRIVATE_URL}
    INNGEST_CRON_ENABLED     1

  service inngest  image inngest/inngest:v1.44.0-amd64, run_command "inngest start"
                   internal_ports [8288], instance_count 1, TCP health check
    INNGEST_EVENT_KEY        SECRET
    INNGEST_SIGNING_KEY      SECRET
    INNGEST_POSTGRES_URI     SECRET
    INNGEST_SDK_URL          ${web.PRIVATE_URL}/api/inngest
    INNGEST_PORT             8288
    INNGEST_HOST             0.0.0.0
```

Both directions stay on the app's private network, so neither the Inngest dashboard nor the long-running function calls touch the public edge.

### Four things that had to be discovered, not assumed

1. **Supabase's direct database host is IPv6-only** (`db.<ref>.supabase.co` resolves to AAAA only) and App Platform documents that apps cannot connect to IPv6 hosts. `INNGEST_POSTGRES_URI` must use the IPv4 **session** pooler on port 5432, `postgres.<ref>@aws-0-ap-south-1.pooler.supabase.com`, not the transaction pooler on 6543 that the Management API returns by default.
2. **`inngest start` rejects a prefixed signing key**: `Error: signing-key must be hex string with even number of chars`. The first deployment failed on exactly this. Both the server and the SDK now take the same bare 64-character hex value; the SDK strips the `signkey-<env>-` prefix that Inngest Cloud issues, so one value serves both worlds.
3. **A second service with `http_port` collides on the ingress**: App Platform generates a route for it and rejects the spec with `rule matching path prefix "/" already in use by rule with component: "web"`. `internal_ports: [8288]` gives the component a private address and no public route at all.
4. **Schema isolation works through the pooler.** `?options=-c search_path=inngest` with a pre-created `inngest` schema puts all 14 Inngest tables there and none in `public`, so `supabase db diff` stays clean.

### Durability caveat

`--postgres-uri` persists configuration, apps, functions, runs and history. Queue and run state stay in the process (an embedded Redis with SQLite snapshots) unless `--redis-uri` is given, and App Platform has no persistent volume. A restart of the `inngest` component therefore loses in-flight run state. That is tolerable only because Supabase, the outbox and the two-minute stale sweeper remain the durable truth: a lost run leaves its task stale and it is re-dispatched. It is the strongest argument for moving to Inngest Cloud, and it is why `instance_count` is pinned at 1.

### Switching to Inngest Cloud

One environment variable. Remove `INNGEST_BASE_URL` from `web`, replace the two keys with the Cloud values, delete the `inngest` component, and sync `https://<app>/api/inngest` from the Inngest dashboard. No application code changes: the client already reads `baseUrl`, `eventKey` and `signingKey` from the environment.

## Gate

Captured 2026-09-07 06:05 IST. The tree is being edited by four workstreams at
once, so a later run may show different failures; the four `src/features/atelier/*`
collection errors that appeared minutes afterwards are W1 mid-edit.

```text
$ pnpm typecheck                                                    exit 0
  Tasks: 13 successful, 13 total

$ pnpm lint                                                         exit 0
  Tasks: 13 successful, 13 total

$ pnpm test                                                         exit 1
  Tasks: 14 successful, 16 total   Failed: @jewelo/jobs#test
  Two failures, both pre-existing and owned by another workstream:
    identity-anchor.test.ts  "routes unsupported Arabic styles and two-name
                              layouts before spend"
    presentation.test.ts     "blocks a missing exact style anchor before
                              reserving or calling a provider"
  Neither test mentions inngest, trigger or outbox (grep count 0); both follow
  the concurrent Arabic-style policy change in packages/contracts/src/index.ts.
  Everything in this workstream's scope is green:
    @jewelo/config   7/7      @jewelo/data   30/30
    apps/jobs outbox 3/3      apps/web src/inngest/functions.test.ts 6/6

$ grep -rn "trigger.dev\|@trigger.dev\|TRIGGER_" apps packages scripts \
    --include=*.ts --include=*.tsx --include=*.json --include=*.sh --include=*.mjs
  (no matches)
```

### Local proof through a real Inngest server

`npx inngest-cli@latest dev -u http://localhost:3001/api/inngest --no-discovery` against `next dev -p 3001`.

- app `jewelo-caleums` synced; all five functions registered with the expected triggers and concurrency keys (`INNGEST_CRON_ENABLED=1` for the capture, reverted afterwards);
- one full customer run: five tasks `ready`, five outbox rows `published`, five Inngest runs `Completed`;
- `docs/goals/overnight-launch/w0/inngest-dev-run.json` holds the synced function list, the outbox rows with their Inngest event ids, the task states and the run statuses;
- `docs/goals/overnight-launch/w0/inngest-dev.png` is the dev-server Runs page.

`E2E_MOCK=1 BASE=http://localhost:3001 bash scripts/e2e-backend.sh` finished with 7 failed assertions out of ~50. None is a transport failure - every dispatch was accepted and every task ran - and each is explained below.

| assertion | reading |
| --- | --- |
| `06 approve` 200 not 201, `acceptedCount` 0; `08 outbox published` 0 | the `outbox-recovery` cron (enabled for the capture) claimed the row microseconds before the request-scoped dispatch. Reconciliation beating the immediate path is correct behaviour, not a failure. A clean repeat with no cron race returned `{"dispatchState":"accepted","acceptedCount":1}`. |
| `06`/`08` want **4** accepted | stale assertion: `approve_revision_and_start_run` inserts **one** outbox row (the studio still). The other three views are released progressively after studio passes QA. The e2e still encodes the old four-way fan-out. |
| `10 idempotent replay` 201 not 200 | the mirror image of the same race. |
| `16 assets count` 5 not 4 | the motion preview asset is now counted; the task query filters video out, the asset query does not. |
| `38/39 mockfail` | the run did reach `operator_review` with `mock_generation_failed`, just after the 420 s window the driver allowed. |

All five predate this change and belong to the backend/e2e workstream.

### Deployed proof

`doctl apps update` on `ec09c9fd-84e4-45c5-b60a-fd62277af322`; deployment `ad1be728-b9d7-4327-9830-55408b8a846d` ACTIVE. The `inngest` component logs:

```text
{"level":"INFO","msg":"initialized database","db":"postgres"}
{"level":"INFO","msg":"ran database migrations","db":"postgres"}
{"level":"INFO","msg":"starting server","caller":"api","addr":"0.0.0.0:8288"}
```

14 tables in the `inngest` schema, 0 leaked into `public`.

Env key **names** on the app after the update (values never printed):

```text
web      NEXT_PUBLIC_JEWELO_DATA_MODE  NEXT_PUBLIC_SUPABASE_URL
         NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  SUPABASE_URL
         SUPABASE_SERVICE_ROLE_KEY  OPENAI_API_KEY  OPERATOR_EMAIL
         OPERATOR_PASSPHRASE  OPERATOR_SESSION_SECRET  NEXT_PUBLIC_APP_URL
         JEWELO_CLOUD_BUILD  INNGEST_EVENT_KEY  INNGEST_SIGNING_KEY
         INNGEST_BASE_URL  INNGEST_CRON_ENABLED
inngest  INNGEST_EVENT_KEY  INNGEST_SIGNING_KEY  INNGEST_POSTGRES_URI
         INNGEST_SDK_URL  INNGEST_PORT  INNGEST_HOST
```

`TRIGGER_SECRET_KEY` is gone from the app.

## Left for the lead

- **The deployed app still runs the stale branch** `review/sample-images-board`, which has no `/api/inngest`, so the Inngest server has nothing to sync and `/api/readiness` still 503s on the old Trigger check. W5's branch switch fixes both in one deploy. Confirm afterwards that the `inngest` component logs a successful sync and that `pnpm do:smoke` passes its `"keyEnvironment":"prod"` assertion.
- ~~**Unbounded outbox growth on a blocked run.**~~ Fixed - see "Dependent views of a terminal studio still" below.
- **`.env` now also holds** `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, `INNGEST_DEV=1` (local only, never shipped) and `SUPABASE_DB_POOLER_URL`. `INNGEST_CRON_ENABLED` is present but commented out on purpose.

## Dependent views of a terminal studio still (7 September 2026, 06:20 IST)

A run whose studio still ends `blocked`, `failed` or `cancelled` used to leave its three dependent views (`on_skin`, `close_up`, `dark`) queued forever.
The loop had two halves and both are now closed.

**Data layer.** `recover_stale_generation_tasks` re-dispatches anything still `queued` at attempt 0.
A dependent view sits in exactly that state while it waits for its parent, and `executePresentationTask` returns `deferred` for it without touching the row, so `updated_at` never advanced past the stale window.

**Jobs layer.** `executePresentationTask` returned `deferred` unconditionally when the dependency still was not signable, with no way to distinguish "not ready yet" from "never coming".

Measured: 117 outbox rows for three tasks, 3 every 4 minutes from 21:50 to 00:22 UTC, zero paid attempts (the deferral happens before the reservation, so nothing was charged).

### The change

| Layer | File | Behaviour |
| --- | --- | --- |
| Jobs | `apps/jobs/src/presentation.ts` | New optional `PresentationRepository.dependencyTerminalStatus(task)`. When `signedDependencyStillUrl` yields nothing, the task now asks whether the parent is terminal; if it is, it throws `dependency_<status>`, which the existing pre-spend `catch` turns into `blockPreSpend` + `operator_review`. Otherwise it still returns `deferred`. |
| Data | `supabase/migrations/20260907020000_dependent_view_terminal_gate.sql` | `create or replace function public.recover_stale_generation_tasks` gains `left join public.generation_tasks dep on dep.id = t.dependency_task_id` and a new first branch: a task whose `dep.status` is terminal and that has no stored output checkpoint releases its reservation, is set `blocked` with `terminal_error_code = 'dependency_<status>'`, writes one `task.dependency_terminal_blocked` audit event, and returns `recovery_action = 'dependency_terminal'` with **no outbox row**. Every other branch is byte-identical to `20260827110000`. |

The checkpoint guard matters: a task that already has provider output stored but unverified must still be recovered through `verify_stored_output`, even if its parent later failed.

### Proof

Migration pushed to the linked project:

```text
pnpm exec supabase db push --linked --password "$SUPABASE_DB_PASSWORD"
Applying migration 20260907020000_dependent_view_terminal_gate.sql...
{"message":"Finished supabase db push."}
pnpm db:types  ->  Generated packages/data/src/database.types.ts
```

Live behaviour of the replaced function against the three stuck rows, run inside a transaction and rolled back so production state was not mutated:

```text
begin; set local role service_role;
select task_id, recovery_action, coalesce(outbox_id::text,'null')
from public.recover_stale_generation_tasks(now() - interval '10 minutes', 100);

b9578d40-0d44-46cc-9676-59127cba3084|dependency_terminal|null
bd096cc6-ed8c-4fdc-8a69-29a120c7ebab|dependency_terminal|null
ffd139d6-2310-42c9-ba2e-85a9e02105c2|dependency_terminal|null
6fedb8eb-63b3-4016-8f34-a522693d7586|dispatch|1cbff61e-4bd3-4709-bc5c-fb60c506c840
c0134cd1-e0dd-4a90-9762-86b2895351a9|dispatch|62e98526-470c-4c6b-b967-9a27b124cfb6
e6aff6ac-b566-4a0b-907c-5fbd07b5a8e4|dispatch|d7cb65da-d13c-4b0c-b0a1-2407eb77d5ff
6a4153b5-33bc-4125-b367-d64bf677438d|retry|708bd870-6376-49a1-ae73-d806240b5677
rollback;
```

The three looping tasks now take the terminal branch and emit no outbox event; unrelated stale tasks still get their normal `dispatch` and `retry` recoveries.

Honest caveat: those three rows are still `queued` in production because the cron functions are gated behind `INNGEST_CRON_ENABLED`, which is deliberately off, so no sweep has run since 00:22 UTC.
They will be blocked once on the first sweep after the crons are enabled.

Unit tests, `apps/jobs/src/presentation.test.ts`:

- `blocks a dependent view once when its studio still is terminal` - parent `blocked`, expects `{status:"operator_review", attempt:0}`, a `pre_spend_blocked` event, and neither `reserveAttempt` nor the generator called;
- `still defers a dependent view whose studio still can yet arrive` - parent not terminal, expects `{status:"deferred"}` and no block.

```text
pnpm --filter @jewelo/jobs test   ->  3 files, 16 tests passed
pnpm --filter @jewelo/data test   ->  4 files, 30 tests passed
pnpm --filter @jewelo/jobs typecheck / lint  ->  clean
```

## The two stale @jewelo/jobs tests

Earlier in this workstream I reported two failing `@jewelo/jobs` tests as fallout from a concurrent `packages/contracts` edit. That attribution was wrong: `git diff packages/contracts/src/index.ts` contains only `+export * from "./preview-request";`.

Both failures come from **committed commit d2bfe4e** ("All Arabic styles generate for visitors; dark anchor low-pass; prose prompts; atelier review without operator login"), which changed `apps/jobs/src/identity-anchor.ts`, `apps/jobs/src/presentation.ts` and `packages/identity/src/caleums-arabic-v3.ts` without updating their tests. Both source changes are deliberate, so the tests were corrected, not the source.

| Test | Why it broke | Fix |
| --- | --- | --- |
| `identity-anchor.test.ts` - "routes unsupported Arabic styles and two-name layouts before spend" | d2bfe4e added `diwani`, `signature`, `kufi` and `thuluth-inspired` to `LIVE_STYLES` on the certified Naskh face, so `arabicStyle: "signature"` is now supported and no longer rejected. The `unsupported_arabic_style` code still exists for styles the registry does not know. | Assert against a style the registry does not know (`art-deco-neon`); the `unsupported_arabic_two_name` half is unchanged and still passes. |
| `presentation.test.ts` - "blocks a missing exact style anchor before reserving or calling a provider" | d2bfe4e made the studio still skip `signedStyleAnchorUrl` entirely, and the fixture builds `presentation_view: "studio"`, so the throwing stub was never called. | New `asDependentView()` helper re-points the fixture at `on_skin` with a `dependency_task_id`, which is the only shape that still reaches the anchor gate. |

## Backend e2e gate: exit 0 (7 September 2026, 11:15 IST)

```text
BASE=http://localhost:3001 E2E_MOCK=1 bash scripts/e2e-backend.sh
=== Caleums backend E2E · BASE=http://localhost:3001 · E2E_MOCK=1 ===
=== PASS · 0 failed assertions · 412396ms ===
EXIT=0
```

Two steps report `SKIP`, both by design and both pre-existing:
`04 transliterate` needs a real OpenAI call (`E2E_TRANSLITERATE=1`), and `43-44 injected dispatch failure` needs a second web instance with an unreachable `INNGEST_BASE_URL`.
Neither is a failed assertion.

W0a's earlier run had four failures. Each is accounted for below.

### 06 and 08 - stale assertions, corrected

Migration `20260827150000_caleums_studio_first_chain.sql` made the pipeline studio-first: approve dispatches only the studio still, and `release_dependent_tasks` creates the other three outbox rows after that still is ready.
The script still asserted the pre-chain value of 4 at approve time.

Corrected to the current contract, and the strength of the check is preserved by asserting the end state instead of dropping it:

```text
[ 1990ms] 06 approve dispatchState -> - ok accepted
[ 2007ms] 06 approve acceptedCount -> - ok 1
[ 2460ms] 08 db.outbox published (studio only) -> - ok 1 states=["published"]
[ 7400ms] 14 poll.four-stills-ready -> - ok {"close_up":"ready","dark":"ready","on_skin":"ready","studio":"ready"}
[ 7601ms] 08b db.outbox published (all four views) -> - ok 4 states=["published","published","published","published"]
```

`08b` is new: after the four stills are ready, all four outbox rows must be `published`.

### 16 - a real race, assertion made truthful

`16 db.assets count` asserted exactly 4 assets for the run and got 5.
The fifth is the motion preview: the mock fal submit and poll now complete about 0.9 s after the studio still is ready, which is before the step-12 cancel lands.
The task ends `cancelled`; the asset it had already generated and copied into private storage is deliberately kept (rule 11 - a successful asset is never discarded).

The assertion now counts the four stills strictly and reports the motion asset separately:

```text
[ 7817ms] 16 db.assets count (stills) -> - ok 4 {...} provider=mock
[ 7853ms] 16b motion asset kept after cancel -> - INFO 1 (preview finished before the cancel landed)
```

### 38 and 39 - the crons, not a missing retry path

Both W0a symptoms had one cause: `outbox-recovery` (`* * * * *`) and `stale-media-recovery` (`*/2 * * * *`) are gated behind `INNGEST_CRON_ENABLED`, which was unset on the local dev server, so neither was registered and nothing reconciled.

**No new code was needed for the retry path.**
The stale sweeper's existing `status = 'retrying' and attempt_status = 'failed'` branch writes the retry outbox row; with the cron off, that branch simply never ran.

Direct proof, from the run W0a reported as stuck (`beb4c195`):

```text
outbox a0adf84c  created_at 00:38:28  state pending  attempt_count 0   (19 minutes stranded)
--- 3001 restarted with INNGEST_CRON_ENABLED=1 at ~00:56 ---
outbox a0adf84c  published_at 00:57:07  attempt_count 1
```

`outbox-recovery` picked up the 19-minute-old pending event within one minute of the crons existing.
The studio task then ran, failed on the mock provider, and the stale sweeper drove it forward on its own schedule.

The same path, watched live end to end on the new run:

```text
05:22:23  studio retrying a1   run running
05:26:33  studio retrying a2   run running
05:30:44  studio blocked  a3 mock_generation_failed   run operator_review mock_generation_failed
```

Attempt 1 -> 2 -> 3 -> `blocked`, each step driven by the `*/2` sweeper, ending in the honest-degrade state, with the retry budget then refusing a fourth paid attempt:

```text
[409151ms] 39 mockfail.poll operator_review+blocked -> - ok run=operator_review blocked=[{"a":3,"e":"mock_generation_failed"}]
[409678ms] 40.1 mockfail.retry (attempt=3, budget exhausted) -> 409 ok {"code":"state_conflict","error":"provider attempt budget exhausted"}
```

The 409 s the scenario takes is the sweeper cadence, not a hang.

### One real defect found and fixed: clock-skew blindness in the outbox read

W0a also saw `38 mockfail.approve` return HTTP 200 with `acceptedCount 0, pendingCount 0` - immediate dispatch reporting "nothing to dispatch" for an event it had just committed.
The stranded row's `attempt_count` was 0 until the cron claimed it, so `claim_outbox_event` was never called: the *read* had returned zero rows.

`dispatchPendingOutbox` filtered `available_at=lte.<caller clock>`, while `available_at` is written by Postgres `now()`.
A web instance whose clock lags Postgres - routine after a laptop sleep/wake, possible on any host between NTP syncs - reads zero rows for its own fresh event and leaves the run stranded until a cron notices.

`packages/data/src/outbox-dispatch.ts` now reads with a 30 s skew tolerance and lets the database stay authoritative: `claim_outbox_event` re-checks `available_at <= now()` inside Postgres, so an event that is genuinely still backing off is refused there and skipped.
The 200 was not reproducible afterwards; step 38 returned 201 `accepted` on both subsequent runs.

### `PROVIDER_MODE` on the DigitalOcean web component

It was absent. Added from a fresh `doctl apps spec get`, as `GENERAL` / `RUN_TIME` with value `mock`, and added to `optionalRuntimeConfig` in `scripts/digitalocean/env-contract.mjs` (the config schema defaults it to `mock`, so it is optional, but the deployed mode should be visible in the spec rather than implied).

Env key **names** on the `web` component after the update:

```text
NEXT_PUBLIC_JEWELO_DATA_MODE  NEXT_PUBLIC_SUPABASE_URL  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_URL  SUPABASE_SERVICE_ROLE_KEY  OPENAI_API_KEY  OPERATOR_EMAIL  OPERATOR_PASSPHRASE
OPERATOR_SESSION_SECRET  NEXT_PUBLIC_APP_URL  JEWELO_CLOUD_BUILD  INNGEST_EVENT_KEY
INNGEST_SIGNING_KEY  INNGEST_BASE_URL  INNGEST_CRON_ENABLED  PROVIDER_MODE
```

`node scripts/digitalocean/check-env.mjs staging .env` -> `staging web environment is valid`.
Deployment `b28ca9c7-f5f3-460d-af57-15aa0321422f` was created by the update.

### Local runtime state left behind

The 3001 dev server was relaunched from `apps/web` with `INNGEST_CRON_ENABLED=1` in its environment (PID 53292); `/api/readiness` reports `"cronsRegistered": true`, and the Inngest dev server lists all five functions:

```text
jewelo-caleums connected=True count=5
    jewelo-caleums-outbox-recovery        CRON  * * * * *
    jewelo-caleums-presentation-task      EVENT jewelo/presentation.requested
    jewelo-caleums-stale-media-recovery   CRON  */2 * * * *
    jewelo-caleums-video-poll             EVENT jewelo/video.poll.requested
    jewelo-caleums-video-submit           EVENT jewelo/video.submit.requested
```

`INNGEST_CRON_ENABLED` remains commented out in `.env`; only this process has it.

