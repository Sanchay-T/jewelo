# Tasks

**Written:** 7 September 2026, from four read-only gap analyses plus live probes of staging and localhost.
**Status:** the ordered work list for `docs/ROAD-TO-GOLD.md`. `docs/GOAL-PROMPT.md` points here.

## How to use this file

- Take the first task whose state is `open` inside your scope and whose `needs` are met.
- States: `open`, `doing (session date)`, `done (commit sha, evidence path)`, `blocked (what on)`, `dropped (why)`.
- Proof means: it builds, it is deployed or run, and you looked at the result in your own browser or read the script's printed measurements. No tests, no CI (Sanchay, 7 September 2026).
- Owner `agent` means do it. Owner `Sanchay` means it needs a credential, money, or a product call; do everything that does not depend on it, then ask once.
- When a task's evidence changes what the plan says, update `docs/ROAD-TO-GOLD.md` in the same commit.
- Sizes: S under half a day, M one to two days, L three days or more.

## Decisions Sanchay owns

Work continues around these; each one gates the tasks that name it.

| Id | Decision | Recommendation | Gates |
| --- | --- | --- | --- |
| DS-1 | Supabase Devonel org is at 52.5 GB of 5 GB egress; grace ends **29 September 2026**, then every project returns 402 | Upgrade the org to Pro this week, or move `jewelo-caleums` to another org; delete the old `jewelo-v2-mumbai` project either way | everything after that date |
| DS-2 | `Sanchay-T/jewelo` is public | Make it private | anything that would ever commit brand or shop material |
| DS-3 | Identity engine: (A) keep Pango by family name and only prove stencils on Linux, or (B) new engine that opens the pinned font bytes directly with HarfBuzz and is deterministic on every machine | B. It changes the engine release named in `docs/CALEUMS-FINAL-E2E-CONTRACT.md` (`caleums-arabic-v3` becomes v4); the fingerprint already includes the engine release so nothing else moves | P1-2 onward |
| DS-4 | Which looks the shop sells if only framed minimal plus Classic prove out | Sell what is proven; show the rest as "the shop prepares this one" only if Omran wants the range on the page | P6-2 |
| DS-5 | Wait on the page for the photograph, or keep send-it-to-you as the default | Wait when the studio still arrives inside 90 seconds, otherwise capture and send; measure the real latency in P5 first | P6-3 |
| DS-6 | Phase 5 smoke before or after anchor publication | Studio-only smoke before publication, so one run bills one image, not up to twelve | P5-1 |
| DS-7 | Shop URL: launch on the staging URL, or bootstrap `jewelo-production` plus a Caleums domain | Production app plus domain before Omran demos to a customer; staging until then | L-1 |
| DS-8 | New-request notification channel for the shop | WhatsApp to Omran's number if an API account exists, otherwise email | P7-3 |
| DS-9 | Error tracking accounts (Sentry, PostHog) | Create both, hand over DSN and key | P7-5 |
| DS-10 | Inngest durability: accept in-process loss with operator recovery, Inngest Cloud account, or a DO Valkey instance | Inngest Cloud; one env var, free tier fits the load | P7-6 |
| DS-11 | Development spend ceiling for the paid replay of the vision readers in P2-5 | USD 10 | P2-5 |

## Phase 0 - unblockers and hygiene (all S, all agent)

| Id | Task | Files | Proof |
| --- | --- | --- | --- |
| P0-1 | Fix the lab agent definitions: Runway tool prefix is `mcp__a1e64602-de39-48a8-9594-462640d77969__*`, not `mcp__claude_ai_RunwayML__*`; repo path is this checkout, not `hq/projects/personal/devonel.com/jewelo`; contract is `docs/ROAD-TO-GOLD.md` | `.claude/agents/image-lab.md`, `.claude/agents/viewer.md`, `.claude/agents/implementer.md`, `.claude/agents/reviewer.md`, `.claude/agents/platform.md` | dispatch an `image-lab` agent that calls `whoami` and returns the credit balance |
| P0-2 | `.env.local` still carries the old Supabase project ref and `TRIGGER_*`; the documented bootstrap order would ship old credentials | `.env.local`, `docs/DIGITALOCEAN-DEPLOYMENT.md` | `pnpm do:check-env` clean; no `TRIGGER` line in either env file |
| P0-3 | Lab bookkeeping: `report.py` crashes on null `creditsAfter`; `finalise.py` does not know stage 2; `ingest_results.mjs` defaults to the stale stage-2 ringed index | `docs/goals/overnight-launch/lab/report.py:42`, `lab/finalise.py:18-29,53`, `lab/ingest_results.mjs:37` | both scripts run clean over the 91-row ledger and the report shows stage 2 |
| P0-4 | Correct the stale claims: holdout names were generated (12 PNGs in `lab/stage2/`); the lab's current release is v4.3 not v4.2; 91 ledger rows not 73 | `docs/goals/overnight-launch/IMAGE-LAB.md:428-450,496-660`, `docs/ROAD-TO-GOLD.md` defect 3 | doc diff |
| P0-5 | Real mode couplings: `PROVIDER_MODE=real` throws without `FAL_KEY` although video is out of scope; every studio still auto-requests a fal motion preview (200 cents) | `packages/config/src/index.ts:94-105`, `apps/jobs/src/presentation.ts:1008-1020,1119` | real mode validates with no `FAL_KEY`; a mock run creates four image tasks and zero video tasks when video is off |
| P0-6 | `docs/DIGITALOCEAN-DEPLOYMENT.md:37-63` describes GitHub workflows that no longer exist; `infra/digitalocean/spec-contract.json:5` pins `main` while the app deploys `codex/overnight-launch-2026-09-08` | those two files | doc and contract match `doctl apps get` |
| P0-7 | Delete the seven dead worktree entries and the stale branches on `home-mini` (`git worktree prune`); park the out-of-credits Claude session there | `home-mini` only | `git worktree list` shows only live trees |

## Phase 1 - the identity engine (needs DS-3)

Rule for every task: the geometry report is produced by `measureMask(decode(pngBytes))`, a module that never touches the renderer's in-memory mask.
Today `identity-anchor.ts:140-142` and `caleums-arabic-v3.ts:57-60,204-207` return `passed: true` as a literal, and the type cannot express failure.

| Id | Task | Files | Change | Proof | Size |
| --- | --- | --- | --- | --- | --- |
| P1-1 | Build the ruler first | new `packages/identity/src/geometry.ts`, new `apps/jobs/src/decode-mask.ts` | Port `lab/verify_stencil.py:18-44`: 4-connected components, holes (background not reaching the border) with sizes, bbox, ink count; sharp decode with alpha > 96 or L < 128 | a script prints components and holes for all 16 committed `lab/stencils/*.png` and they equal `manifest.json` | S |
| P1-2 | Shape from the pinned font bytes, not a family name | new `packages/identity/src/shaping.ts` (`harfbuzzjs`); `caleums-arabic-v3.ts:161-164,198-199`; `identity-anchor.ts:66,210-220` | Open the pinned file, hash the loaded bytes into `fontSha256Measured`, shape with HarfBuzz, take glyph outlines; `exactCharactersPreserved` becomes "no gid 0 and every NFC codepoint is covered by a cluster". Root cause today: sharp's bundled Pango never consults fontconfig on macOS and the engine asks by family name, so Latin renders in the system sans and Kufi and Naskh produce byte-identical files (`268f77d4…` for نور, `dbb5dccf…` for أسماء) | rendered Kufi differs from Naskh for four names; Latin outlines are Playfair (compare against `hb-shape --font-file` advances, within 2%) | M |
| P1-3 | Rasterise outlines only | replaces `identityAnchorSvg` (`identity-anchor.ts:38-80`) and `typeset` (`:147-182`) | Path-only SVG on a 1024 px canvas, fit-by-probe sizing as `lab/make_stencil.py:207-219`, reserved ring band; no `<text>` element anywhere | render the four names in both scripts and open them in the browser; per-glyph widths match P1-2 | M |
| P1-4 | Bridge, never move | replaces `fuse()` (`caleums-arabic-v3.ts:216-277`) | Port `bridge_all` and `draw_bar` (`make_stencil.py:90-140`): thicken 2, 24 px capsule bridge to the nearest island. Today `fuse()` translates the smallest island, so a hamza or dot can move while "exact" is reported | every pre-bridge ink pixel is still ink at the same coordinate; P1-1 reports one component for the 17 ZIP names plus Asma, Noor, Layla, Muhammad in both scripts and all live styles | M |
| P1-5 | Rings: attached, name-aware, opt-out | delete `addJumpRings` (`caleums-arabic-v3.ts:339-368`) and the fixed circles (`identity-anchor.ts:64-65`) | Port `add_rings` (`make_stencil.py:143-178`): 11x11 erosion so a dot never anchors a ring, outer-corner centre, weld fillet; `rings` derived from `specification.construction`, ring-free for framed minimal and diamond rails. Today the rings sit at x=255 and x=945 while the glyph run spans about 180 to 1020, so they always land inside letters | rings on: exactly two round holes above the glyph bbox, no glyph ink inside a hole (Asma regression); rings off: zero holes, one component | M |
| P1-6 | Report equals measurement | `IdentityValidationReport` (`caleums-arabic-v3.ts:46-61`), `identity-anchor.ts:125-142`, `presentation.ts:715-717` | Numbers and booleans plus `measuredBy`, `bbox`, `holes`, `fontSha256Measured`; `passed` computed by P1-1 over the encoded PNG; throw `identity_*_gate_failed` otherwise (the DB check at `supabase/migrations/20260827080000_…:38` already rejects a false `passed`); one solver for both scripts; store the measured font sha instead of `existing-latin` | the report deep-equals an independent run of P1-1; a PNG with a ring hole filled in fails | S |
| P1-7 | Second oracle and the real runtime | `lab/stencils/production/`, `lab/verify_stencil.py`, staging `identity-anchors` bucket | Regenerate the production stencils and run the Python gate on them: numbers must match P1-1. Then trigger one mock run on staging per script and pull the stencil the deployed Node buildpack rendered from the bucket: it must pass P1-1 too. Font and WASM assets resolve from `import.meta.url`, not `process.cwd()` (`identity-anchor.ts:232-242`); add `harfbuzzjs` to `serverExternalPackages` | four staging-rendered stencils open in the browser and pass the gate | S |

## Phase 2 - the real verifier

| Id | Task | Files | Change | Proof | Size |
| --- | --- | --- | --- | --- | --- |
| P2-1 | Contract | `packages/ai/src/studio.ts:24-35`, `apps/jobs/src/presentation.ts:387-395,409-443` | `VerificationDecision` gains `gates: [{id, passed, measured, threshold}]`; a failed gate throws `verification_failed:<ids>` and takes the same reject-and-regenerate path the name mismatch already uses | a mock run with an injected bad still shows the task retrying with the gate id in `terminal_error_code` | S |
| P2-2 | Photo pendant mask | new `apps/jobs/src/photo-mask.ts` | Edge based, never colour thresholds: Sobel via sharp `convolve`, Otsu on the gradient, close r=3, fill, largest component, chain stripped by opening at about 1.5% of width | overlay the mask on ten lab passes in the browser; registration IoU against the stencil at or above 0.85 on studio views | M |
| P2-3 | `DeterministicStudioVerifier` | new in `apps/jobs`, geometry from `packages/identity` | G1 exact NFC text versus `identity_artifacts.approved_text`; G2 pendant components == 1; G3 round holes == expected rings; G4 bbox at least 2% from every edge; G5 stones requested implies bright low-saturation blobs inside the mask; G6 stencil-to-photo IoU at or above 0.85 and no stone centroid inside a registered hole | P2-4 | M |
| P2-4 | Replay harness | new `apps/jobs/scripts/replay-lab.mts` | Reads `docs/goals/overnight-launch/ledger.jsonl` (91 rows, 80 with a verdict), fetches `file://` stills, writes `lab/replay-report.json` with a confusion matrix per defect tag. Zero cost | 0 false passes on the 15 deterministic-owned defects (extra ring 3, missing ring 1, disconnected 2, floating mark 1, floating stone 1, wrong stones 4, wrong display 3); at most 10% false fails on the 55 human passes. Wrong look, cgi look and unsupported geometry are prompt axes, reported but not claimed | M |
| P2-5 | Name reader keeps spelling authority | `studio.ts:293-302,325-388`, `presentation.ts:397-444` | Run only after the deterministic gates pass, so a geometry fail never buys a paid read; fix `identityTextMatches`: the one-edit tolerance accepts a transposed five-letter Latin name. `--with-readers` replay is paid (needs DS-11) | replay with readers: transposed-name fixture rejected | S |
| P2-6 | Attachment reader | replaces the retired `OpenAIStudioVerifier` (`studio.ts:169-264`) | Structured per-ring JSON `{somethingThroughHole, daylightBothSides}` on a 2x crop around each G3 hole, phrased from `VIEWER-RUBRIC.md` "Ring and chain" | replay with readers: 5 of 5 chain-not-through-ring caught, at most 2 false fails | M |
| P2-7 | Wire it | `presentation.ts:1116-1147` | Real branch: composite of deterministic plus attachment, then the name reader; mock branch keeps `MockStudioVerifier` (the mock generator emits a 1x1 PNG). Inngest `retries: 0` (`apps/web/src/inngest/functions.ts:126`) means a thrown failure is re-queued by the stale sweeper, which is why P2-1 routes through the regenerate path | mock run unchanged; real branch selected by `PROVIDER_MODE` in a printed dependency dump | S |

## Phase 3 - prove the prompts on Runway (needs P0-1, P0-3)

Runway: workspace "Sanchay", `gpt-image-2`, 305,042 credits on 7 September, about 20 per image, 50 tasks in flight.
Current best: look `framed-minimal`, release `caleums-universal-v4.3` (`lab/compile.mjs:14,49-53`).
Seen name: Asma in both scripts. Holdout trio for v4.3 only: Noor, Layla, Muhammad.

| Id | Task | Change | Proof | Size |
| --- | --- | --- | --- | --- |
| P3-1 | Score what is already generated, zero credits | Dispatch one `viewer` on the 11 unscored images: v4.3 studio en a5-a7, ar a6-a7; holdout layla-en a2, layla-ar a2, muhammad en and ar a1-a2. Merge with `merge_verdicts.py`, rerun `finalise.py` | both phase-3 gates become decidable: 3/3 on both scripts (v4.3 a5-a7) and 10/12 holdout (5 pass, 1 tweak, 6 unscored today; needs 5 of the 6) | S |
| P3-2 | Holdout policy that cannot leak | new `lab/holdout.json` keyed by `promptSha256`; `compile.mjs` refuses to compile a holdout name for a hash that is not frozen | Any v4.4 written in reaction to layla-en a1 makes the trio "seen"; its holdout must be fresh names frozen per prompt hash | S |
| P3-3 | Missing stencils | six Kufi `-norings` holdout stencils; `build_stencils.py` emits and manifests them | `verify_stencil.py` one component each | S |
| P3-4 | Grid planner | new `lab/plan_grid.mjs` emitting prompts and `index.json` from `compile.mjs`; results, credits and download assembly scripted; in-flight accounting; ledger row at submit so a restart is safe | plan for looks 4 x scripts 2 x letterings 2 x names x 3 attempts compiles with no hand edits | M |
| P3-5 | Run the studio grid | `image-lab` agent generates with `count=4`, 12 calls in flight; `viewer` scores; lead merges. One axis per release; a generator never reads verdicts of a release before its batch is complete | one look at 3/3 both scripts, then 10 of 12 holdout, with per-cell evidence in `IMAGE-LAB.md` | L |
| P3-6 | Dependent views on holdout names | on-skin, close-up, dark from each passed holdout master, under the winning release; prove either `DEPENDENT_REFERENCE_RULE` plus blurred anchor (what production does, `presentation.ts:180-185,793-800`) or the lab's stencil-plus-master pattern, and make production match the winner | at or above 8 of 8 per view as in stage 3 | M |
| P3-7 | Lab prompt becomes production prompt | `packages/ai/src/prompt-registry.ts:21-39,89-91,196-211,370-382`; `POST /api/operator/prompts` | Express v4.x per profile with the look brief baked in; add the missing `construction` slot; publish `image.packshot@v2`, `image.worn@v2`, `image.macro_gift@v2`, `image.dark_editorial@v2` through the registry | a mock run pins the v2 releases in `generation_tasks.prompt_release` | M |

## Phase 4 - publish the six anchors (no generation)

The PNGs and `manifest.json` are at `~/hq/projects/devonel/caleums-private/style-anchors-v1/` (laptop) and `~/.codex/state/jewelo/caleums-style-anchors/v1/` (home-mini); source task ids match `docs/CALEUMS-FINAL-E2E-CONTRACT.md`; never commit them.

| Id | Task | Change | Proof | Size |
| --- | --- | --- | --- | --- |
| P4-1 | `scripts/style-anchors/publish.mjs` | Per anchor: sha256 equals manifest; profile map (worn, packshot, macroGift, darkEditorial, studioHero, billboard); `sourceTaskId` equals `STYLE_ANCHOR_SOURCE_TASK_IDS` (`prompt-registry.ts:148-155`); PUT bytes to `style-anchors/<profile>/v1/<sourceTaskId>.png` with the service role; `rpc/create_style_anchor_release` with `p_bucket_id='style-anchors'`; `rpc/publish_style_anchor_release` against the seeded pointer `00000000-0000-0000-0000-00000000060N`; re-download via signed URL and re-hash | script output lists six releases `published` version 2; SQL `select p.profile, r.version, r.status from style_anchor_publications p join style_anchor_releases r on r.id = p.release_id` | M |
| P4-2 | Prove real mode no longer fails closed, zero spend | `new SupabasePresentationRepository(url, key, false).signedStyleAnchorUrl({style_anchor_release_id, presentation_view: 'on_skin'})` returns a low-passed `data:image/png;base64` anchor instead of throwing `style_anchor_missing:<sourceTaskId>` | printed result for all four customer profiles | S |

## Phase 5 - plug in OpenAI (needs P1, P2, P3, DS-6)

| Id | Task | Change | Proof | Size |
| --- | --- | --- | --- | --- |
| P5-1 | Cap before the first call | live `runtime_policy`: `global_max_reserved_spend_cents=800`, `global_daily_generation_limit=2`, `daily_generation_limit=2`; studio-only smoke before P4 publication per DS-6, or cancel the three dependent tasks at run creation. A run reserves 400 cents and the cap bounds reservations, not calls: 4 tasks x 3 attempts can be 12 images | SQL readback | S |
| P5-2 | Flip and smoke | DO env `PROVIDER_MODE=real`, `OPENAI_API_KEY` present, deploy, `smoke.sh`; one run per script driven through `/api/designs/drafts` then `/api/revisions/approve` with `construction=framed-minimal` (the UI refuses that look until P6-2) | the studio still passes P2-3, matches the Runway image for the same stencil and prompt hash, `provider_attempts.actual_cost_cents` and `principal_daily_usage` recorded, both stills opened in the browser | S |
| P5-3 | Rollback rehearsed | `PROVIDER_MODE=mock`, `scripts/digitalocean/rollback.sh`, policy values restored | readiness ready in mock after rollback | S |

## Phase 6 - make the interface honest (needs DS-4, DS-5 for P6-2, P6-3)

| Id | Task | Files | Change | Proof | Size |
| --- | --- | --- | --- | --- | --- |
| P6-1 | Preview panel under the action bar | `apps/web/src/features/atelier/atelier.module.css:129-133,1468-1478,1560,1703-1705` | Do not move `.intro` (at 767 px and below `.preview { order: -1 }` puts the photo first and the h1 would fall below it; at 768 to 1099 the h1 would wrap in a half column). Add `--action-bar-block: 86px`; subtract it in `.previewSticky` max-height and add it to `.main` padding-bottom; then lower the 280 px photo floor or compact `.previewDock` at short heights: at 1024x768 the dock alone is 396 px against a 558 px budget, and at 1280x720 the overlap at rest is 295 px | measured in the browser at 1440x900, 1280x720, 1024x768: `previewSticky` bottom at or above `actionBar` top after scroll, and no control hidden at rest; screenshots under `docs/goals/road-to-gold/dogfood-<date>/` | M |
| P6-2 | Silent style refusals | `Atelier.tsx:828-870` (`choices`, one `<small>` and `data-sample-coming`), `personalizedRun.ts:344-360` | Per DS-4: either hide the unrenderable options or add an orthogonal `data-not-photographed` note with EN and AR copy (no AI, generate, magic words); the design stage must import `preflightRefusal`, never re-list its constants; note Kufi is both sample-coming and refused, so define precedence | pick every construction and lettering at 1440 and 390; the shopper knows before the checkbox | M |
| P6-3 | "Preview my piece" does what it says | `Atelier.tsx:521-609,1322-1327,1653,1997-2008`; AR dictionary keyed by English literal at `:49,:60`; `docs/goals/overnight-launch-2026-09-08.md:62,183` | Per DS-5: either the button starts the run with the spelling confirm inline, or it is renamed to what it does and the checkbox stays the commitment; update the AR key or Arabic silently falls back to English; amend the goal-doc lines that name the old label | click through in EN and AR; the network tab shows the run starting where the label says | M |
| P6-4 | Confirm checkbox accessibility | `Atelier.tsx:1322-1327` | Add `id` and `aria-describedby`; today it has neither and does not surface in the accessibility tree by name | keyboard-only pass at 1440x900 reaches it and the name is read | S |
| P6-5 | Arabic loose ends | `Atelier.tsx` dictionary, fonts | "Checkout is coming soon" and slideshow aria labels untranslated; no Arabic web font served (system font); caption label half untranslated after a run | `/ar/design/new` at 1440 and 390 shows no English strings and a served Arabic face | S |
| P6-6 | Residual polling | `personalizedRun.ts:115-120` | An unrecognised run or task status maps to `queued` and polls the full six minutes; map unknown terminal statuses to stopped | injected unknown status stops the poll | S |
| P6-7 | Tablet shared state | `Atelier.tsx` bag and last reference | One tablet is one anonymous principal; bag and reference are shared across shoppers. "New piece" between customers must clear both without burning an anonymous sign-in (30 per hour per IP) | two consecutive shoppers on one tab at 1024x768 see no bleed | S |

## Phase 7 - close the shop loop

| Id | Task | Files | Change | Proof | Size | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| P7-1 | Operator queue Omran can run a shop from | `apps/web/src/features/admin/PreviewRequestQueue.tsx`, `api/operator/commands/route.ts:43-115`, `lib/backend/preview-requests.ts:42-46` | Show the linked run's ready stills via signed URLs; `wa.me` and `tel:` links; note field; `fulfilled` and `cancelled` commands (the schema allows them, the route only has `mark_contacted`); status filter; surface the 7 runs in `operator_review` with the existing `review_task` retry that has no UI | screenshots at 1440 and 390, RTL, with the 13 live requests | M | agent |
| P7-2 | Remove the dead commerce surface | `OperatorExperience.tsx:343-427`, `supabase-jewelo-client.ts:487-500`, `Atelier.tsx:1318,2161` | Quotes and orders are always empty; "Customer view" links to a page that does not exist; `issueQuote` sends `total || 2290`. Launch is request-only per the journey lock; checkout stays fail-closed 503 until Omran supplies a Shopify store | operator page has no dead links | S | agent |
| P7-3 | New-request notification | new Inngest function in `apps/web/src/inngest/functions.ts` | Nobody is told today; needs DS-8 | injected request reaches the channel inside two minutes | M | Sanchay picks, agent builds |
| P7-4 | Quotas before a shop day | `runtime_policy`, `principal_daily_usage`, Supabase auth config | Clear test usage (32 of 100 global runs used today), set shop values, note the 05:30 IST UTC rollover and the 30 per hour per IP anonymous cap on shop Wi-Fi | SQL readback | S | agent; values Sanchay |
| P7-5 | Observability | `apps/web/package.json`, `packages/config/src/index.ts:26-28`, `packages/observability/src/index.ts`, DO alert spec | Zero SDKs installed, DSN empty, errors reach only DO runtime logs; add `@sentry/nextjs` and PostHog, wire `jsonError`, add restart and memory alerts; needs DS-9 | a forced error appears in Sentry; DO alert email arrives | M | Sanchay accounts, agent wires |
| P7-6 | Inngest durability | `docs/goals/overnight-launch/w0/INNGEST.md:90-96` | A restart loses in-flight runs; the sweeper routes stale reserved attempts to `operator_review` (no double charge, manual recovery). Per DS-10 | kill the `inngest` component mid mock run on staging; the task reaches `operator_review` inside four minutes, and with Cloud it completes instead | M | Sanchay decides, agent proves |
| P7-7 | Backups | none exist (Free tier, `pitr_enabled: false`) | Pro gives daily backups; otherwise nightly `pg_dump` over the session pooler from `home-mini` plus a restore drill into a scratch database | restored database answers `/api/state` | S | agent; Pro is DS-1 |
| P7-8 | Operator auth hardening | `apps/web/src/lib/backend/operator-session.ts:38-53`, `api/operator/session/route.ts` | Unlimited login attempts on one shared account; add a lockout and a revocation path | 429 after N failures in the browser | S | agent |

## Launch (needs DS-7)

| Id | Task | Change | Proof | Size | Owner |
| --- | --- | --- | --- | --- | --- |
| L-1 | Production app and domain | `pnpm do:bootstrap -- production` behind `JEWELO_ALLOW_PRODUCTION_BOOTSTRAP=yes`; Caleums domain from Omran; env copied with real-mode values and shop quotas | `doctl apps list` shows production ACTIVE; `smoke.sh` on the domain | M | Sanchay approves and supplies DNS, agent executes |
| L-2 | Final dogfood on the live URL | Two unseen names, one per script, on a phone and a laptop, through to the request landing in the operator queue and the notification arriving | screenshots per step under `docs/goals/road-to-gold/dogfood-<date>/` | S | agent |
| L-3 | Omran's runbook | new `docs/SHOP-RUNBOOK.md` | Login (`/en/operator`, credentials handed over out of band), one tablet equals one principal, "New piece" between customers, what to do when a request arrives, what to say when a preview is being prepared and the delivery window the shop can keep, the 05:30 IST budget rollover | Omran reads it and runs one request end to end | S | agent |
| L-4 | Handoff packet | `docs/goals/road-to-gold/PROGRESS.md` final entry, PR to `main` | Objective, exact commands and results, evidence paths, open findings with owners, spend actually used, rollback | PR open, not merged | S | agent |
