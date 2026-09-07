# Overnight launch progress - 7/8 September 2026

Durable truth for a restart. Goal: `docs/goals/overnight-launch-2026-09-08.md`.
Branch: `codex/overnight-launch-2026-09-08` (base `main` at `e8d3dc0`).

## Clock

- Run started 02:49 IST, 7 September 2026. 14 hour wall-clock limit ends 16:49 IST.
- The goal file's "05:30" lab stop and "06:30" real-mode decision are read as relative deadlines for this run: lab hard stop 12:00 IST, real-mode go/degrade decision 13:30 IST, deploy and live QA after that.

## Environment facts found at start

- Inngest Cloud: NOT signed in in the Work Chrome profile (redirected to sign-in). The self-hosted fallback from the goal file applies: `inngest start` as a DO service component with `--postgres-uri` on the new Supabase database, keys generated locally, `INNGEST_BASE_URL` set. Cloud remains a one-env-var switch.
- Supabase dashboard: signed in, org Devonel (Free plan, 1 project).
- Runway MCP: workspace Sanchay, `gpt-image-2` available, 306,862 credits at start.
- doctl works through `scripts/digitalocean/doctl.sh` (token from `.env`); app `jewelo-staging` `ec09c9fd-84e4-45c5-b60a-fd62277af322`.
- gh authenticated as kaldrex. Disk 28 GiB free.

## Done (with evidence)

- 03:10 Supabase: new project `jewelo-caleums` created in Devonel org, ref `jggalwuvpcqoenhirmnl`, ap-south-1, Free, Postgres 17, status healthy. PAT `jewelo-agent-2026-09-08` (30 days) created. `.env` rewritten with the new SUPABASE_* values (legacy JWT anon/service_role keys; project ref, URLs, DB password, DB URL, access token); every TRIGGER_* line removed; old `.env` backed up in the session scratchpad only. REST on the new project answered 200 with the service key; Management API answered 200 with the PAT. Finding: the old project `jewelo-v2-mumbai` is the same ref as the old `.env` and IS reachable from this Chrome and from the stored CLI login (the goal's premise was wrong); it is kept until the new project is verified, then deleted. Finding: the Devonel org is in a Free-plan grace period (egress 52.5 of 5 GB, 1,049%) until 29 Sep 2026; after that all its projects return 402. This needs Sanchay (upgrade to Pro or move to another org).
- 03:15 Plan review done: `docs/goals/overnight-launch/reviews/plan-review.md`. Corrections sent to W0a, W0b, W2.

- 02:52 Env schema: empty string for optional URL/key fields now means unset (`packages/config/src/index.ts`, `optionalOf` preprocess). Unit test added. `pnpm --filter @jewelo/config test` -> 7 passed; typecheck clean.
- Agent definitions created in `.claude/agents/`: implementer, platform, image-lab, viewer, browser-qa, reviewer (model claude-opus-5, effort xhigh). This session's Agent tool did not pick up new definitions created after startup ("Agent type 'implementer' not found"), so each role is dispatched as a general-purpose agent with model opus and the role text inline; frontmatter effort therefore could not be applied. Each agent reports its model id in its first report line.

## Done (continued)

- 06:05 W4a request-capture backend done (agent report, model claude-opus-5): migration `20260907010000_preview_requests.sql`, POST/GET `/api/preview-requests`, operator queue route + command + `PreviewRequestQueue`, contracts, 24 route tests, RLS proof 13/13 (`docs/goals/overnight-launch/w4/rls-proof.sql`), e2e steps 47-53. Lead pushed the migration (`supabase db push` applied 20260907010000) and regenerated types (+82 lines); REST probe on `preview_requests` = 200.
- 06:08 Lead fixed three pre-existing `pnpm test` failures on main: `ui-presentation.test.ts` expectation stale since d2bfe4e (all Arabic styles provider-supported), `shopify-adapter.test.ts` expects the deliberate `Checkout is not available yet` 503, `supabase-jewelo-client.ts` guards `document` in node. 10/10 pass.

- 06:12 W1 done (model claude-opus-5): renderer removed, 4 Diwani files rejected (أسمك), 4:5 preview frame, autoplay off in design, Arabic strings. Gates: typecheck 0, lint 0, unit 34/34, e2e 45/45. `docs/goals/overnight-launch/w1/REPORT.md`.
- 06:14 W0b done (model claude-opus-5): Trigger.dev removed entirely; Inngest functions in `apps/web/src/inngest`, served at `/api/inngest`; event id = outbox dispatch key, no function idempotency; crons behind `INNGEST_CRON_ENABLED=1`; readiness/smoke/env-contract/deploy.sh rewritten; self-hosted `inngest/inngest:v1.44.0` deployed as DO component (deployment ad1be728 ACTIVE, 14 tables in schema `inngest`, IPv4 session pooler); local proof: 5 functions synced, one run with 5 tasks ready (`w0/inngest-dev-run.json`, `w0/inngest-dev.png`). Gates: `pnpm typecheck` 0, `pnpm lint` 0, trigger grep empty. Caveat: in-flight Inngest run state is in-process (restart loses it; outbox + sweeper are the durable truth). Docs updated (CLAUDE.md, FINAL-STACK, ARCHITECTURE, MEDIA-CONCURRENCY, DECISION-REGISTER D-017, DIGITALOCEAN-DEPLOYMENT, `w0/INNGEST.md`).

- 06:17 W0b follow-up done: dependent views of a terminal studio still now block once (migration `20260907020000_dependent_view_terminal_gate.sql` applied; `dependencyTerminalStatus` in presentation.ts; 2 unit tests). The two stale `@jewelo/jobs` tests from commit d2bfe4e fixed truthfully. jobs 16/16, data 30/30.

- 06:40 W0a done (model claude-opus-5): project linked, 17 historical migrations applied clean on PG17 + global daily spend cap migration (`20260907000000`, global 6000 cents, 100 runs/day, per-principal 1200 kept, proved in a rolled-back transaction) = 20/20 applied remotely; seeds verified (12 prompt_releases, 6 style_anchor_releases all `missing`, 4 private buckets); anonymous sign-in had to be enabled on the new project (Management API); DO env rotated to the new Supabase values and TRIGGER_SECRET_KEY removed (deployment c2e45a18 auto-started by the spec update). e2e-backend: 4 failures left (06/08 stale want=4 assertions; 38/39 dropped dispatch not reconciled and failed still never retried) handed to W0b. `docs/goals/overnight-launch/w0/DATABASE.md`.

- 11:05 W3 done (model claude-opus-5): two-tier resolver `resolveIllustration` (Tier 1 script/names/layout/construction/lettering; Tier 2 metal/stones/gem/size/chain) with bases exact -> same-script sibling -> other-script -> labelled placeholder; construction never changes; Preview my piece never disabled; only photographed camera tiles render; quiet metal/stones note (EN/AR); `sample-assets-v10.json` ships empty for W2 output. Coverage: 288 Tier 1 designs, 28 exact, 260 labelled siblings, 0 without a photo. Tests: 10 new (never-changes-design across 288 x 19 clicks and 28 x 576 full configs, zero-family base case, Diwani never shown). Gates: typecheck 0, lint 0, unit 75/75, e2e 55/55. Evidence `docs/goals/overnight-launch/w3/` (journeys at 390 and 1440, RTL). Stale non-gated `tests/atelier.spec.ts` left untouched (12/14 failing before W3).

## In progress

- W0 platform reset (lead does the Supabase dashboard steps; platform agent does CLI, Inngest, DO env).
- W1 foundation fixes (implementer).
- W2 image lab (image-lab + viewer).

## Blocked

- 06:45 to 10:50 IST: second Claude session rate limit (HTTP 429, reset 10:50) killed W0b, W2, W3, W4 again. About four hours lost. All resumed at 10:52 with new deadlines: lab hard stop 13:00 IST, real-mode go/degrade decision 14:00 IST, deploy and live QA after, handoff by 16:30. Wall clock ends 16:49 IST.

- Morning items for Sanchay from W0a: `daily_generation_limit=6` per principal per UTC day (one shop tablet = one principal; raise before the visit), budget day rolls at 05:30 IST and test reservations (400 cents each) are not released, so check `principal_daily_usage` before the visit; anonymous auth rate limit 30/hour.

- 04:xx to 05:50 IST: all five subagents were killed by the Claude session rate limit (HTTP 429, reset 05:50 IST). Roughly 90 minutes of wall clock lost; every agent was resumed at 05:52 with its transcript intact.

- none yet

## Spend

- Runway credits: 160 of 40,000 used (balance 306,702; start 306,862; floor 266,862). W2 stage 1 attempt 1, 8 images at 20 credits each. Ledger: `docs/goals/overnight-launch/ledger.jsonl`.
- OpenAI USD: 0 (night cap USD 60)

## Next

- 06:10 W3 (design stage) and W4 UI (review stage, real pipeline, honest degrade) dispatched as implementer agents. W5 after W3 and W4.
