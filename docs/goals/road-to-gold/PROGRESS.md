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

Done:

- Phase 0 closed. P0-2, P0-3, P0-7 in `ff5e1a8`; P0-4, P0-5 in `77c9dfa`; P0-6 and P1-1 in `e6b8f0f`. Each was implemented by an Opus 5 subagent and its proof rerun by the lead before commit (`do:check-env` clean, `report.py` and `finalise.py` exit 0 over 91 rows, P0-5 config and completion-path scripts, P1-1 `MATCH 16/16`).
- Ledger truth measured by the lead: 91 rows, 73 with a verdict; stage 2 has 12 holdout PNGs, 6 verdicts sit unmerged in `lab/stage2/verdicts-{en,ar}.jsonl` (5 pass, 1 tweak), 11 images unscored. Documents now say so.
- P1-1 ruler: `measureMask` (pure, `packages/identity/src/geometry.ts`) and `decodeMask` (sharp, `apps/jobs/src/decode-mask.ts`) reproduce `verify_stencil.py` exactly on 16 lab and 16 production stencils. The ruler already shows the production renderer lying: English names measure 4 to 7 components while `render-report.json` says 1 and `passed: true`.
- DS-3 default B taken for Phase 1; D-019 and the `caleums-identity-v4` release bump are part of P1-2.

- P1-2 in `a54b1d3`: `packages/identity/src/shaping.ts` shapes with harfbuzzjs 1.6.1 over the pinned font bytes resolved from `import.meta.url`; `fontSha256Measured` and `exactCharactersPreserved` are measured; a name with an uncovered codepoint now throws `identity_shaping_gate_failed`; engine release `caleums-identity-v4`, D-019. Lead reran the proofs: Kufi and Naskh gids differ for four names, Latin advances equal `hb-shape` at 0% drift. The rendered PNGs are still byte-identical across styles because the raster still goes through Pango `<text>`; P1-3 replaces that.
- P1-1 proof is durable: `corepack pnpm --filter @jewelo/jobs measure-stencils [dir] [manifest]` (tsx 4.23.13 dev dependency). Production stencils measure 4 to 7 components for every English name with no claim in `render-report.json`.
- plan-reviewer challenged P1-3 to P1-7 and found four blockers (test import breaks the build gate on export removal; solver has no PNG decoder; ring-free contradicts the frozen prompts; canvas and ink rule unspecified) and six majors (style-to-font map, pipeline release pin, silent identity failures, Next asset tracing, WASM deployability found last). Rows amended in `9f6f160`: P1-2b deploy probe and P1-5a prompt dependency added, rings default on with `IDENTITY_RINGLESS_CONSTRUCTIONS` behind config.

- P1-2b in `8838de5`, deployed to staging as `6a536690-41aa-4182-a051-486f864b11cc` (smoke passed). The lead called the route on the live URL: 401 without a session, 200 with one, harfbuzz 14.4.0, `wasmLoaded: true`, Playfair, Naskh and Kufi resolved from `.next/server/assets` with the same shas as the laptop. The probe found a live defect on its first run: `identityFontUrl` built the URL by string interpolation, which Turbopack cannot follow, so the deployed bundle returned Amiri for every requested face; fixed with a static per-file `import.meta.url` map and an unknown file now throws. No Next config change was needed; staging Node is 24.15.0 against the pinned 24.18.1.
- P1-3 in `2f51a44`: path-only SVG from the HarfBuzz outlines on the 1024 lab canvas, black on white, no alpha; one `IdentityRasterizer` and `solveIdentity` for both scripts; Kufi English on `cairo.ttf`; `<text>`, fontconfig and the bucketed Latin advance table deleted; tests excluded from the jobs tsconfig; `render-stencils` script. Lead opened the renders: real Playfair, Cairo, Naskh, Kufi; letters still overlap because `fuse()` moves islands and rings still land on glyphs (P1-4, P1-5).

Doing:

- P1-4 (implementer): port `bridge_all` and `draw_bar`; islands are never moved; ink preservation asserted in pre-recentre coordinates.

Follow-ups found by subagents, not fixed (outside the task rows):

- `.env.production.local` at the repo root holds stale Convex keys from February; inert and gitignored; delete in a hygiene slice.
- `scripts/digitalocean/check-env.mjs` still accepts several env files although the runbook forbids it; a one-line guard would enforce it.
- `scripts/digitalocean/bootstrap-app.mjs:87-92` rebuilds `services` from the contract alone, so running it against staging would delete the `inngest` component. Warned in the runbook; script unchanged.
- `scripts/digitalocean/configure-github.sh` and the `do:github` script entry are dead (write a token into GitHub environments nothing reads).
- `apps/jobs/src/video.ts:69,140` uses `config.FAL_KEY!`; an operator video command in real mode with video off would fail at runtime instead of at the gate.
- `VIDEO_ENABLED` is not yet listed in `docs/DIGITALOCEAN-DEPLOYMENT.md` or the app spec.
- The stage 2 and v4.3 verdict files were never merged into the ledger (`merge_verdicts.py`); that is P3-1's first step.
- `lab/final/reference-studio-prompt.txt` is still the v4.2 compile while `compile.mjs` emits v4.3.
- `review/sample-images-board` on `home-mini` was refused by `git branch -d` (remote tip diverges); left in place.
- DigitalOcean token expires 25 November 2026 (Sanchay).

Open:

- The parked Claude session on `home-mini` (`hq-claude2:2.1`) is stuck on an out-of-credits prompt with two background agents pending; only Sanchay can answer it.
- Everything under Open in session 1 still stands.
