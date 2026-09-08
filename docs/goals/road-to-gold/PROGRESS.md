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

- P1-4 in `af13e2b`: `fuse()` deleted; `bridgeAll` and `drawBar` ported with an exact distance transform and capsule bars; ink preservation asserted before recentre (`identity_bridge_moved_ink`); recentre matches Pillow LANCZOS and reports offset and scale; 216 cells (17 ZIP names plus Asma, both scripts, six live styles) are one piece with zero moved pixels, and the Python ruler agrees on all. Lead opened `muhammad-en-classic` and `asma-ar-classic`: letters where the font put them, bars on the baseline, rings still on the old rule. Behaviour change noted: every style now thickens two passes like the lab, not one.

- P1-5 and P1-5a in `c68fdc7`: `addRings` ported from `make_stencil.py` (11x11 erosion, corner anchors, weld fillet) plus one deliberate improvement, the ring lifts until its hole holds no name ink (the lab punches 7 to 55 pixels out of a hairline on 6 of its own 16 stencils; this engine punches 0 on 464 renders). 232/232 rings-on cells have exactly two ring holes, sizes within 1.7% of the lab's; rings-off gives 0 ring holes and one piece. `IDENTITY_RINGLESS_CONSTRUCTIONS` is validated config (normalises case, spaces, trailing comma; rejects non-hyphen ids) and is absent from the staging spec. Lead compared `asma-en-classic` against the committed lab stencil: same rings, same holes.
- Review 1 of the engine (P1-2 to P1-4) recorded in `docs/goals/road-to-gold/reviews/identity-engine-review-1.md`: the port's maths verified against the sources; four majors (ink assertion checked before rings, endpoint-only cluster coverage, ring literal 560, customer name in error-class columns) and ten minors, each with an owner.

- Review 1 fixes in `12087fa`, reproved by the lead: `identity_ring_punched_ink` fires on an injected block (642 pixels); character coverage is per codepoint with `setClusterLevel(2)` plus a reshape probe so ligature-swallowed indices (آلاء, عبدالله on rakkas) pass while a private-use or unsupported combining mark mid-name fails with the index; no customer text in any solver error message (four persistence paths in `presentation.ts` listed); `identity_fit_overflow` at 45 Latin characters while `Abdulrahman Nooralhuda` still fits; `ENVELOPE_BOUNDARY`; diagnostics `pathExists` from `existsSync`. New follow-up: the minimum font size now sets a hard name-length ceiling (about 40 Latin characters) and the customer form does not say so.

- P1-6 in `5fbbb07`: `IdentityValidationReport` widened to measured numbers and booleans plus `measuredBy`, `rule`, `bbox`, `holes`, `ringHoles` and the construction block; the solver encodes, then decodes its own PNG through the rasterizer port's `decodePng` and measures it with `measureMask`; `passed` is a conjunction of those measurements and disagreement throws by name. Lead reran: `MATCH 16/16` with exact ring counts (Asma has four holes, two of them letter counters, which the old `>=` check could never tell apart), and the tampered decodes throw `identity_ring_gate_failed:holes=1,expected=2` and `identity_component_gate_failed:components=2`. `PIPELINE_RELEASE_ID` config, default `caleums-final-media-v2`; migration `20260908120000_pipeline_release_v2.sql` written, functions `expand_final_media_run` and `request_video_task` read the active release instead of a literal; not yet pushed.

- P1-7 in `e5e598b`, staging deployment `ebdca539-24c8-422d-a659-369e2e21032f`: migration applied (`pipeline_releases`: v2 active with `caleums-identity-v4`, v1 legacy); 16 production stencils regenerated and identical under both rulers; two staging mock runs (`5917f2df` Rania en, `46030711` ريم ar) complete on v2 with `engine_release caleums-identity-v4`, the bucket stencils deep-equal their stored `validation_report`; an injected Devanagari name blocked as `identity_shaping_gate_failed:notdef=4,uncovered=4` with dependents unspent. Lead opened both staging stencils: Playfair and Naskh, one piece, two rings. `identity_artifacts` by engine: 19 latin-existing-v1, 15 arabic-v3, 2 identity-v4.
- Adversarial review 1 recorded in `docs/goals/road-to-gold/reviews/identity-engine-adversarial-1.md`: two highs (a ring can be welded onto a floating dot with every gate passing; pipeline release lineage not cross-checked), four mediums, six lows, each with an owner.

- Adversarial fixes in `6d7382b`, deployed to staging as `08d63e17` (health 200, readiness ready): ring placement lifts and shifts outward until the hole is clear and no name ink sits under the metal (`identity_ring_welded_to_glyph`, 0/232 cells after 130/232 before); per-task `identity_pipeline_release_mismatch` when the stamped release differs from the active row; migration `20260908130000_one_active_pipeline_release.sql` applied (partial unique index, one active release); `blockPreSpend` failure on a retry falls back to terminal `fail` instead of rejecting; negative-proof outputs in `dogfood-2026-09-08/identity-gates.md`.
- Lead dogfood of `08d63e17` in the in-app browser, recorded in `dogfood-2026-09-08/staging-journey.md`: Rania journey approves (`drafts 201`, `approve 201`), polling stops at a terminal state, the four tiles read "Being prepared" with the contact fallback, and every image on the page is an Asma example, so no mock asset is shown as the customer's piece. 390x844 has no horizontal overflow. P6-1 sticky numbers unchanged.

- Platform re-proof on `08d63e17` passed: Salma (en) and هدى (ar) mock runs complete on v2, both stencils downloaded from the bucket, sha equal to `png_sha256`, re-measured locally deep-equal to `validation_report.measured`, `glyphPixelsUnderRingMetal 0`; a second active pipeline release is refused with 409 `pipeline_releases_one_active`; diagnostics route 401/200 with harfbuzz 14.4.0 and the pinned font shas. `identity_artifacts` by engine: 19 latin-existing-v1, 15 arabic-v3, 5 identity-v4.
- Adversarial pass 2 recorded in `reviews/identity-engine-adversarial-2.md`: one high (the under-metal count exempts a 46 px disc around the anchor, and a dot survives the 11x11 erosion, so `noor-ar-kufi` and `noor-ar-classic` weld the ring onto the ن dot with every gate green; lead confirmed by eye), three mediums (canvas guard breaks the lift search for five left rings; P1-5 proof wording; `prompt_compile_failed` path lacks the retry fallback), four lows. F-3 decision taken by default: `aboveAnchor` is the standard, row reworded.

- Fix pass 3 in `b2ebea4^`: rings anchor only on 4-connected islands of the pre-bridge raster that are at least `IDENTITY_RING_ANCHOR_MIN_ISLAND_FRACTION` (0.1, measured: moved anchors sat on 2.4-9.9% islands, kept ones on 11.3-100%) of the largest island, so a dot, hamza or bridge bar can never carry a ring; the under-metal count exempts only the weld capsule and drawn fillet; the x-legality guard clamps instead of breaking so the five left-edge rings are searched; `blockPreSpendTerminally` covers `task_prompt_release_mismatch`, `prompt_compile_failed`, `prompt_snapshot_lineage_mismatch`; release compared before the render; `measure-stencils` prints a `CLAIM` cross-check of `measured` against `claimed`. 179/232 ring centres moved. Lead reran: `MATCH 16/16`, `CLAIM 16/16`, build exit 0, and opened `noor-ar-kufi` and `noor-ar-classic`: right ring on the ن stem and bowl, dot free.
- Phase 2 plan review recorded in `reviews/phase2-plan-review.md` and the rows rewritten in `b2ebea4` (P2-0 to P2-7, corpus recount 73/49/13 with 7 geometry defect rows, gates per view, mask threshold measured not assumed, `MOCK_STILL_FIXTURE_DIR` so the verifier runs on staging for zero spend, DS-11 ceiling enforced by the replay script). `ROAD-TO-GOLD.md` phase 2 gate now names the 79 verdict-bearing images.

- P2-0 committed: `packages/ai` tests excluded from the typecheck, `apps/jobs/scripts/**/*.mts` typechecked by the build gate (zero errors surfaced), `pnpm build --force` exit 0.
- P2-1 committed: `merge_verdicts.py` picked up seven unmerged verdicts (six stage-2 plus one stray stage-1 v4.3), ledger now 80 scored, 55 pass, 12 tweak, 13 fail, 11 unscored; `IMAGE-LAB.md` appendix regenerated (all-lab pass rate 54% to 60%); `apps/jobs/scripts/replay-lab.mts` resolves 91/91 stills and 128/128 references with matching sha256 and writes `lab/replay-report.json`; mock baseline: 55/55 passes accepted, 25/25 tagged rows and 13/13 fail rows falsely accepted. The `StudioVerifier` port still takes a stencil URL, so the script passes a `file://` URL and marks gates `projected` until P2-5 adds real gates. Lead reran the script: same census.

- `b2ebea4` deployed to staging as `2334f8a0-b300-4783-8e17-c6a9eeb7b831` (ACTIVE, smoke passed, readiness ready). Re-proof: Noor en run `c4ac9607` and نور ar run `18714ee5` complete on v2, eight tasks ready, zero spend; both stencils downloaded, sha equal to `png_sha256`, deep-equal to `validation_report.measured`, under-metal and punched 0. Lead opened the 3x crop of the Arabic right ring: on the ن stroke, dot separate. Note: this deployment predates fix pass 4, so the "Ali" defect is live on staging until the next deploy.

Doing:
- Fix pass 4 (implementer) on adversarial review 3 (`reviews/identity-engine-adversarial-3.md`): three highs. The 10% island rule still anchors a ring on the tittle of i ("Ali" 13.5%, "Niki" 10.5%, lead confirmed by eye); the under-metal count scans only the annulus and exempts 30.8% of it; five combinations (Maji kufi, أمير kufi, قق in three styles) now throw where `6d7382b` rendered. Plus deterministic RPC raises left to the sweeper, and a harness that reads the engine's own claims. P1-5 reopened; Phase 1 is not closed.
- P2-2 (implementer): edge-based pendant mask with moment-initialised similarity registration, contact sheet under `dogfood-2026-09-08/phase2-mask/`, IoU distribution over the 55 passes; the measured p05 becomes the P2-3 threshold.

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
- `scripts/digitalocean/deploy.sh:63-70` prints no deployment id when run over a non-interactive ssh channel (the `read -r ... < <(...)` yields nothing); the id has to be read from `doctl` afterwards. One-line fix owed.

Open:

- The parked Claude session on `home-mini` (`hq-claude2:2.1`) is stuck on an out-of-credits prompt with two background agents pending; only Sanchay can answer it.
- Everything under Open in session 1 still stands.
