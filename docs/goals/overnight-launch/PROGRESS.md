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

## In progress

- W0 platform reset (lead does the Supabase dashboard steps; platform agent does CLI, Inngest, DO env).
- W1 foundation fixes (implementer).
- W2 image lab (image-lab + viewer).

## Blocked

- none yet

## Spend

- Runway credits: 0 (start balance 306,862; cap 40,000)
- OpenAI USD: 0 (night cap USD 60)

## Next

- W3 after W1 green; W4 after W0 and W1 green; W5 after W3 and W4.
