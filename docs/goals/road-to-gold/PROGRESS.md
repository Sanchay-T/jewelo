# Road to gold - progress

One entry per session, newest at the bottom.
Each entry: what was done with evidence paths, what is open, the next task id from `docs/TASKS.md`.
Update while working, not at the end; a session can die at any minute and this file is what survives.

## 2026-09-07 - session 1 (laptop, Opus 5)

Done:

- Synced the overnight run off `home-mini`: `1a0219e` pushed with 188 MB of lab and QA evidence; salvaged five branches that existed only on that machine (`backup/pre-reset-2026-09-03`, `codex/shopify-integration-ready`, `work/caleums-e2e`, `codex/gcp-production-deployment` plus the main branch).
- Found the six style anchors outside git at `~/.codex/state/jewelo/caleums-style-anchors/v1/` on `home-mini`; mirrored to `~/hq/projects/devonel/caleums-private/style-anchors-v1/` on the laptop; checksums match the manifest and the source task ids match `docs/CALEUMS-FINAL-E2E-CONTRACT.md`. Not committed: the repository is public.
- `pnpm lint` was red on `@jewelo/jobs` at `1a0219e` (unused binding in `presentation.test.ts`); fixed in `594d378`. Typecheck 13/13, test 16/16 tasks.
- Staging redeployed to `594d378`: DigitalOcean deployment `77c680bb-b6ee-46db-bcf8-dc8d774711bf`, "App updated", `/api/readiness` ready.
- Live audit of the shopper flow on staging at 1440x900: draft 201, approve 201, run `complete`, 5 tasks `ready` with mock assets, UI correctly degraded to contact capture. Layout defect measured: preview panel 339 to 1115 px in a 900 px viewport, bottom 86 px behind the fixed action bar at rest; at 1024x768 the panel needs 676 px against a 558 px budget.
- Wrote `docs/ROAD-TO-GOLD.md`, `docs/MINDSET.md`, `docs/GOAL-PROMPT.md` (3,390 characters), D-018 in `docs/DECISION-REGISTER.md`.
- Runway MCP confirmed from this session: workspace "Sanchay", `gpt-image-2` available, 305,042 credits.
- Local dev server runs from `.claude/launch.json` on port 3011 (3001 is held by an unrelated two-day-old `server.mjs`).

Open:

- `docs/TASKS.md` is being built from four gap analyses (identity and verifier, prompt lab and anchors, infra and operator, localhost dogfood).
- Product decisions still unanswered: which looks the shop sells if only framed minimal plus Classic prove out; wait-on-page versus send-it-to-you.
- Supabase Devonel org egress grace ends 29 September 2026: Sanchay's action.
- Repository `Sanchay-T/jewelo` is public: Sanchay's action.
- A Claude session is parked mid-task in a jewelo tmux pane on `home-mini`, out of usage credits.

Next: first open task in `docs/TASKS.md`.
