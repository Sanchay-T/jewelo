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

- Four read-only gap analyses (identity engine and verifier, prompt lab and anchors, infra and operator, plus my own localhost measurements) became `docs/TASKS.md`: 11 decisions for Sanchay, phases 0 to 7 plus launch, every task with files, change, proof, size, owner.
- Lab state corrected: the holdout trio (Noor, Layla, Muhammad) was already generated for v4.3, 5 of 6 scored passed, 11 images unscored; 91 ledger rows, not 73.
- Removed Playwright (6 configs, 5 specs, 2 scripts, the dependency) and the vendored `agent-browser` skill, `skills-lock.json`, the `browser-qa` agent. Tests and CI/CD suspended on Sanchay's instruction; `pnpm build` and the lead agent's own in-app browser are the gate. Recorded in `FINAL-STACK.md`, `VERIFICATION.md`, `ROAD-TO-GOLD.md`, `MINDSET.md`, `GOAL-PROMPT.md`.
- Rewrote `CLAUDE.md` (62 lines, no launch-time imports) per the Claude Code memory and best-practice docs, the HumanLayer CLAUDE.md guidance, and the Fable 5.1 prompting guide (autonomy block, scope is the deliverable, finish the turn, targeted edits, lead keeps working while subagents run). `AGENTS.md` is now a symlink to it so Codex reads the same file.
- Local git push is pinned to the `Sanchay-T` account in `.git/config`; the active `gh` account had switched to `sanchay-devstrum` and was getting 403.

Open:
- Product decisions still unanswered: which looks the shop sells if only framed minimal plus Classic prove out; wait-on-page versus send-it-to-you.
- Supabase Devonel org egress grace ends 29 September 2026: Sanchay's action.
- Repository `Sanchay-T/jewelo` is public: Sanchay's action.
- A Claude session is parked mid-task in a jewelo tmux pane on `home-mini`, out of usage credits.

Next: first open task in `docs/TASKS.md`.

## 2026-09-08 - session 2 (laptop, Fable 5.1 lead, Opus 5 subagents)

Scope: next open tasks in order, Phase 0 then Phase 1.

Doing:

- Dispatched in parallel at session start: P0-2 (platform), P0-7 (platform, home-mini), P0-3, P0-4, P0-5 (implementer), P1-1 (implementer).
- P0-6 queued behind P0-2 because both edit `docs/DIGITALOCEAN-DEPLOYMENT.md`.
- DS-3 default B taken for Phase 1: to be recorded as D-019 with P1-2.
