# Overnight goal - CALEUMS launch-ready for the shop visit (8 September 2026)

Written 7 September 2026 for an autonomous `/goal` run.
Read this whole file before doing anything.
It supersedes `docs/goals/responsive-customer-experience.md` as the active objective.
Everything in `docs/CHAT-HANDOFF-2026-09-07.md` remains true history.

## Mission

Tomorrow Sanchay walks into a jewelry shop and hands the owner a URL.
A customer types their name in English or Arabic, chooses a look, gets a realistic photograph of their own name pendant, adds it to a bag, and the shop gets the request.
No broken jewelry: no disconnected gold, no floating stones, no invented rings, no wrong spelling, no duplicate pendants, no chain that does not thread through the rings, no letters hovering off the piece.
No lies: no borrowed photo of a different design, no "missing photo" dead end, no fake progress.

The visual style of the current CALEUMS UI stays exactly as it is.
Palette, typography, layout, sticky preview, view tiles, bottom action bar, bag drawer: unchanged.
You may add states and reorder sections.
You may not restyle.

## What is already true (do not rediscover)

- Repo `Sanchay-T/jewelo`, branch base `main` at `e8d3dc0`.
- Customer UI: `apps/web/src/features/atelier/` (`Atelier.tsx`, `model.ts`, `catalogue.ts`, `usePhotographicPiece.ts`, `previewHandoff.ts`).
- Dev server: `next dev -p 3001`. `.env` at repo root has every key. `NEXT_PUBLIC_SENTRY_DSN=` (empty) breaks `z.url().optional()`; fix the schema first (treat `""` as unset).
- Verified on 7 September with agent-browser: exact-match resolver holds, order-independent, missing and failed states are distinct, bag and reload work, 5 widths, RTL, reduced motion.
- Verified defects: 57 of 131,328 configurations have photos; v2 Diwani file spells أسمك; older families drift across views; yellow to white swaps the scene; desktop preview shows 46% of image height; autoplay rotates views; rejected Three.js renderer still imported (10 Playwright failures); stale env schema.
- Prompt R&D lives on branch `codex/prompt-system-rnd` (worktree `.claude/worktrees/prompt-system-rnd`). Read in order: `docs/rnd/HANDOFF.md`, `docs/rnd/image-loop.md`, `docs/rnd/dual-loop.md`, `docs/rnd/prompt-slots.md`, `docs/rnd/GPT-IMAGE-2-RESEARCH.md`, `reviews/2026-09-06-creative-name-v2/report.md`, `reviews/2026-09-06-prompt-system/rubric.json`, `scripts/prompt-lab/v3/`.
  Results so far: v1 30/48, v2 17/48 with Arabic 1/24, v3 compiler built but never run.
  Fonts for stencils: `packages/identity/engines/caleums-arabic-v3/fonts/` (Noto Naskh, Scheherazade New, Noto Kufi, Rakkas, Amiri, Playfair Display SemiBold).
- Backend: `POST /api/designs/drafts` -> `POST /api/revisions/approve` -> `POST /api/designs/{id}/run` -> outbox -> (today) Trigger `presentation-task-v1` -> `executePresentationTask` in `apps/jobs/src/presentation.ts` -> `OpenAIStillAdapter` (`packages/ai/src/studio.ts:91`, images/edits, order: reference, identity, style-anchor, inspiration) -> `GET /api/state`.
  Fail-closed gates in `presentation.ts`: style anchors (all four seeded `missing`, the hard blocker), identity anchor, prompt lineage, reservation and attempt budget (3), daily spend cap (`max_reserved_spend_cents` in `runtime_policy`), name reader (`OpenAINameReader`).
  `PROVIDER_MODE=mock` today. Real mode requires `OPENAI_API_KEY`, `FAL_KEY` (video only, not needed tonight), and published anchors.
- Trigger.dev is out. Its prod environment is paused because the free $5 credits are exhausted until 1 October, and Sanchay does not want to continue with it. The orchestration layer is replaced tonight (W0). `apps/jobs/src/trigger/*` and `trigger.config.ts` are to be removed once the replacement is green, with `docs/FINAL-STACK.md` and `docs/DECISION-REGISTER.md` (D-005) updated to record the supersession.
- Supabase is being re-provisioned from scratch. The `.env` project `hcobuwgwkwxbabfucwdt` belongs to a login this machine's Chrome does not have, and the "Jewelo Development" project in the Devonel org may already be deleted. Sanchay authorized deleting any remaining Supabase project and creating a new one. The dashboard is logged in via Claude in Chrome (Work profile); the Supabase CLI runs through `npx supabase`; a personal access token can be created at `supabase.com/dashboard/account/tokens` and stored as `SUPABASE_ACCESS_TOKEN` in `.env`.
- Deploy: DigitalOcean app `jewelo-staging` id `ec09c9fd-84e4-45c5-b60a-fd62277af322`, URL `https://jewelo-staging-gqumd.ondigitalocean.app`, region blr, currently pinned to stale branch `review/sample-images-board`.
  `scripts/digitalocean/deploy.sh staging <ref>` retargets the branch and preserves encrypted env.
  `scripts/digitalocean/smoke.sh` checks `/api/health`.
  App env holds the OLD Supabase and Trigger keys plus OpenAI and operator keys (W0 rotates them); `NEXT_PUBLIC_JEWELO_DATA_MODE=remote`.
  Production app does not exist; `bootstrap-app.mjs` blocks creation without `JEWELO_ALLOW_PRODUCTION_BOOTSTRAP=yes`.
  Runbook `docs/DIGITALOCEAN-DEPLOYMENT.md` is partly stale (env allowlist).
- Runway MCP: workspace "Sanchay", `gpt-image-2` available, 306,882 credits on 7 September, roughly 20 credits per image at the v2 rate.
- `doctl` and `gh` are installed and authenticated (`gh` as `kaldrex`, admin on the repo). `supabase` runs via `npx supabase`. Claude in Chrome is connected to Sanchay's Work Chrome profile with Supabase and Trigger dashboards logged in; DigitalOcean, OpenAI and Runway dashboards are not logged in there, but their API/MCP access works. Use Claude in Chrome only for dashboard actions this goal names; use agent-browser for all app testing.

## Authorizations granted for this run (Sanchay, 7 September)

- Use every key in `.env`.
- Use the Runway MCP with `gpt-image-2` for the prompt lab. Hard cap 50 tasks in flight. Credit cap for the night: **40,000 credits**. Stop the lab at the cap and report.
- Use the OpenAI key for the production adapter in real mode once the gate below is met. Daily spend cap in the database must be set before the first real call: **USD 60** for the night, **USD 40/day** after launch until Sanchay changes it.
- Supabase: delete any remaining Jewelo project in the Devonel org, create a new Free-plan project in Mumbai (`ap-south-1`) named `jewelo-caleums`, generate and store its database password, URL, publishable key, service-role key and project ref in `.env` and in the DigitalOcean app env. Never print the values.
- Orchestration: replace Trigger.dev with **Inngest** (decided by Sanchay, 7 September). Functions are served from the Next.js app at `/api/inngest` on the existing DigitalOcean app, so no extra worker component and no Redis. Inngest Cloud free tier is the target: Sanchay signs in once (GitHub or Google) in his Work Chrome before the run starts; the agent then creates the app and keys through Claude in Chrome, stores `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` in `.env` and the DO app env, and syncs the live URL. Creating the Inngest account itself is not agent work. Fallback if the account is not signed in when the run starts: self-host the Inngest server as one small DO service component (`inngest start` with `--postgres-uri` pointing at the new Supabase database, keys generated locally), same SDK code, `INNGEST_BASE_URL` set; record the fallback in PROGRESS.md and keep the Cloud path a one-env-var switch.
- Deploy to the existing DigitalOcean app. Creating a separate production app is **not** authorized tonight; the staging URL is the URL customers get tomorrow unless Sanchay says otherwise in the morning.
- Push the work branch and open a PR to `main`. Do **not** merge. Do **not** push to `main`.
- Spawn Opus 5 subagents at extra-high effort for implementation, image lab, browser QA and review.

Not authorized: Shopify payment, pricing claims, fal video generation, changing the stack beyond the two substitutions above (Supabase project, Trigger replacement), the Three.js renderer, nearest-image fallback, creating accounts or entering passwords on third-party sites, purchasing anything or upgrading any plan, sending messages to anyone.

## Definition of done in plain words

A shopper on the live URL can:

1. Type a name in English or Arabic and pick a look while seeing an honest, continuous sample pendant that changes with every relevant click (never a dead end, never a wrong design).
2. Press Preview my piece and, within a few minutes, see their own name rendered as a real-looking pendant in the chosen look and metal, in at least the Studio view, with the other views filling in.
3. Add it to the bag and leave a way to be contacted.

If the personalized generation cannot pass its quality gate by 06:30, the deployed app must degrade honestly: the shopper sees the illustrated sample plus "Your personalized preview is being prepared. We will send it to you." and the request is stored for the operator.
It must never show broken jewelry and never show a photo of a different design as theirs.

## Team

Create these agent definitions in `.claude/agents/` at the start (frontmatter `model: claude-opus-5`, `effort: xhigh`, tools as needed), then dispatch with the Agent tool.
Verify in the first dispatch that the subagent reports its model as Opus 5; if the frontmatter effort is ignored on this build, say so in PROGRESS.md and continue.

| Agent | Owns | Never does |
| --- | --- | --- |
| `implementer` | code changes in a named workstream, tests, typecheck, lint | declares a workstream done without running its gate |
| `platform` | W0 only: Supabase project, migrations, seeds, Inngest wiring, env rotation on DO | prints a secret, touches customer UI |
| `image-lab` | stencil build, Runway generation, ledger | scores its own images |
| `viewer` | opens every candidate image file, scores against the rubric, writes verdicts | generates images |
| `browser-qa` | agent-browser journeys against local and live URLs, screenshots | edits source |
| `reviewer` | fresh-context adversarial review of each PR-sized slice | fixes what it finds (reports back) |

Rules for the lead (you):
- Keep your own context for orchestration. Dispatch reading-heavy work.
- Run independent workstreams in parallel. W0, W1 and W2 start together. W3 starts when W1 is green. W4 starts when W0 and W1 are green. W5 starts when W3 and W4 (or W4's honest degrade) are green. W6 runs continuously.
- Every workstream ends with its gate command output pasted into PROGRESS.md.
- Commit a coherent slice about hourly on branch `codex/overnight-launch-2026-09-08`, push, never commit red.
- Write `docs/goals/overnight-launch/PROGRESS.md` after every slice: done, evidence, blocked, next. Treat it as the durable truth for a restart.

## Workstream W0 - Platform reset: fresh Supabase, Inngest replaces Trigger.dev (platform, 2-3 h, starts immediately)

Goal: the backend has a database that exists and a job engine that runs, both owned by accounts Sanchay controls, with no Trigger.dev code left.

Supabase:
1. Through Claude in Chrome (Work profile, already logged in), open `supabase.com/dashboard/org/_/general` for the Devonel org.
   Delete every remaining Jewelo project (type the confirmation name; this is authorized).
   Create project `jewelo-caleums`, Free plan, region Mumbai `ap-south-1`, generated database password.
   Create a personal access token at `supabase.com/dashboard/account/tokens` named `jewelo-agent-2026-09-08`.
2. Store `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_ANON_KEY`/publishable key, `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_DB_PASSWORD` in `.env` with a shell redirect or `sed`, never by echoing values into the transcript.
   Remove the old `hcobuwgwkwxbabfucwdt` values.
3. `npx supabase link --project-ref <ref>` then `npx supabase db push` for all migrations in `supabase/migrations`; then `supabase/seed.sql` and the prompt-release / runtime-policy seeds the repo already has (`pnpm db:seed` or the documented script).
   Set `runtime_policy.max_reserved_spend_cents` to the night cap.
   Regenerate DB types if the repo generates them (`pnpm db:types`), commit if changed.
4. Create the private Storage buckets the migrations expect if they are not created by SQL; verify with `bash scripts/e2e-backend.sh` in mock mode against the new project.
5. Rotate the DO app env (`doctl apps update --spec` or the repo's `scripts/digitalocean/*` helpers) to the new Supabase values and remove `TRIGGER_*`.

Inngest:
6. Add `inngest` to `apps/web` (and `apps/jobs` stays the home of the pure functions).
   Create `packages/jobs-runtime` or reuse `apps/jobs/src` exports so the Next app can import `executePresentationTask`, `dispatchPendingOutbox`, video submission and poll without importing Trigger.
7. `apps/web/src/inngest/client.ts`: `new Inngest({ id: "jewelo-caleums" })`.
   `apps/web/src/inngest/functions.ts`: `presentation-task` (trigger `jewelo/presentation.requested`, `idempotency: "event.data.taskId"`, `concurrency: [{ key: '"openai-image"', limit: OPENAI_STILL_CONCURRENCY_LIMIT }]`, `retries: 0` because paid retries are owned by durable attempt state, body = one `step.run` per phase of `executePresentationTask` if the function is already phase-split, otherwise one step), `outbox-recovery` (cron `* * * * *`, concurrency 1), `stale-media-recovery` (existing cadence), `video-submit` and `video-poll` (fal queue, concurrency from env, `step.sleep` between polls instead of a re-trigger loop).
   `apps/web/src/app/api/inngest/route.ts`: `serve({ client, functions })` with `maxDuration = 300`.
8. Replace `triggerTask` in `apps/web/src/lib/backend/trigger-dispatch.ts` (rename the module to `job-dispatch.ts`) with `inngest.send({ name, id: outboxId, data })`, keeping the outbox id as the event id for exactly-once dispatch.
   Keep the outbox and the `dispatchPendingOutbox` reconciliation exactly as they are; only the transport changes.
   Error vocabulary stays `not_configured | rejected | dispatch_failed`.
9. Delete `apps/jobs/src/trigger/*`, `apps/jobs/trigger.config.ts`, the `@trigger.dev/*` dependencies, the `trigger:*` and `jobs:deploy` scripts, and `TRIGGER_*` from `packages/config`.
   Add `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, optional `INNGEST_BASE_URL` to the server env schema.
10. Local proof: `npx inngest-cli dev -u http://localhost:3001/api/inngest`, run `bash scripts/e2e-backend.sh` with `E2E_MOCK=1`; the dev UI shows the outbox event and a completed run.
    Then set the Cloud keys (or fallback), deploy in W5, sync, and prove one live run.
11. Docs: update `docs/FINAL-STACK.md`, `docs/ARCHITECTURE.md`, `docs/MEDIA-CONCURRENCY.md`, `CLAUDE.md` binding decisions and rules 10/12/17, `docs/DECISION-REGISTER.md` (D-005 superseded by D-017 Inngest, D-003 project re-provisioned) as a user-instructed stack change dated 7 September.
    Replace "Trigger" wording with "Inngest" where it describes the engine; leave historical decision text intact with a superseded note.

Gate: `pnpm typecheck`, `pnpm lint`, `pnpm test` green; `grep -rn "trigger.dev\|@trigger.dev\|TRIGGER_" apps packages --include=*.ts --include=*.json` returns nothing; `supabase migration list` shows every migration applied remotely; local e2e-backend green through Inngest dev server with the screenshot of the completed run; `.env` and DO env hold the new values (report key names only).

## Workstream W1 - Foundation and honesty fixes (implementer, 1-2 h)

Files: `packages/config/src/index.ts`, `apps/web/src/features/atelier/*`, `apps/web/src/features/atelier/sample-assets.json`.

1. Env schema: empty string for optional URL and key fields means unset. Add a unit test. `next dev` must start from a fresh `.env.example` copy.
2. Remove every import from `apps/web/src/features/atelier/renderer/` in `Atelier.tsx`, `usePhotographicPiece.ts`, `previewHandoff.ts`. Move `assemblyKey`, `Capture`, `saveSnapshotRecord`, `SnapshotImage` to non-renderer modules or reimplement the parts the photographic path needs. Delete `renderer/scene.ts` and the Three.js dependency if nothing else uses them. Gate: `pnpm --filter @jewelo/web test:atelier:e2e` 45/45 with the two chunk-guard assertions passing.
3. Disconnect the misspelled Diwani file (`v2/arabic-diwani-v2.png`) and any Arabic file the viewer rejects after a word-by-word read of every connected Arabic image (14 Arabic lettering files, 5 two-name files). Keep the files on disk; mark `rejected` in the manifest with the reason.
4. Preview box: change the photo container to the images' 4:5 ratio on desktop and tablet (or a 1:1 crop that never cuts the pendant, verified on the stacked and interlocked families). No letters cut at 1024 and 1440.
5. Autoplay off by default while the shopper is in the design stage; allow it on the review stage. Keep the play control.
6. Arabic locale strings for "Your name" and the example label; Arabic alt text for Arabic two-name photos.

Gate: typecheck, lint, unit, e2e all green; agent-browser screenshot of stacked family at 1440 showing the whole pendant.

## Workstream W2 - Image lab: the universal prompt that just works (image-lab + viewer, runs all night)

Purpose: produce (a) a universal prompt release that reliably yields photoreal, physically correct, correctly spelled name pendants from a fonted stencil, and (b) the assets the product needs tonight: four published style anchors and a continuous illustrated catalogue for the launch looks.

Start by reading the R&D branch documents listed above.
Then run a 30-minute research pass (agent-reach or web) on current best practice for GPT Image 2 edits with reference images, jewelry product photography prompting, Arabic text fidelity in image models, and evaluator-optimizer loops.
Write the findings to `docs/rnd/RESEARCH-2026-09-08.md` with URLs.
Do not let research exceed 30 minutes.

### Method

- Identity first. Render the name with the pinned font for the lettering (Loop A in `dual-loop.md`) into a stencil PNG: exact spelling, one connected piece, two jump rings. Upload to Runway, pass as `referenceImages[0]` tagged `stencil`. Never text-only for identity.
- One prompt family with slots (`docs/rnd/prompt-slots.md`), including the CASTING block (one mould, fused letters, no islands), the attachment rule (chain threads through both rings, rings integral to the body), and the photography bar (real metal, real shadow, finite depth of field, no CGI).
- Generator and viewer are different agents. The viewer opens the file, compares against the stencil, and returns `pass`, `tweak` (one named defect and the single axis to change), or `fail`. Pretty but wrong is `fail`. Uncertain is not a pass.
- Change one axis per iteration: identity or attachment defects change geometry or stencil, never adjectives; fake-photo defects change lighting and camera language; wrong look changes the look brief only.
- Three paid attempts per cell, then stop and record. Never spend a fourth hoping.
- Ledger every task: prompt hash, references, task id, credits before and after, verdict, defect tags. `docs/goals/overnight-launch/ledger.jsonl`.
- Defect tags (fixed vocabulary): `wrong-spelling`, `extra-glyph`, `missing-glyph`, `disconnected-component`, `floating-mark`, `floating-stone`, `extra-ring`, `missing-ring`, `chain-not-through-ring`, `duplicate-pendant`, `rotated-letters`, `unsupported-geometry`, `cgi-look`, `wrong-look`, `wrong-display`, `wrong-metal`, `wrong-stones`.

### Cells, in order

Launch looks are the four constructions already in the UI: Classical, Origami ribbon, Framed minimal, Diamond rails.
Lettering for the lab: Classic (Playfair for English, Noto Naskh for Arabic) and Kufi (Noto Kufi).
Names: Asma, أسماء, plus holdouts Noor, نور, Layla, ليلى, Muhammad, محمد.

1. Stage 1, Studio only, yellow gold, no stones, 32 mm, Cable: 4 looks × 2 scripts × Classic = 8 cells with Asma/أسماء. Advance a look only when 3 of 3 attempts pass on both scripts.
2. Stage 2, holdout names on the passing looks: 3 names × 2 scripts on each passing look. This is the "unseen name" test the product depends on. A look is launch-eligible only if 10 of 12 pass.
3. Stage 3, the other three views (On skin, Close-up, Dark) for each launch-eligible look using the passed Studio image as `reference` plus the stencil, per the production dependent-view rule. A view passes only if the viewer confirms the same pendant.
4. Stage 4, metal and stone variants (white, rose; accent, partial, full) as edits of the passed Studio master, the v8 method. Verify stone count and placement identical across metals.
5. Stage 5, Kufi lettering on the launch-eligible looks, both scripts.

Hard stop at 40,000 credits or 05:30, whichever first.

### Outputs

- `packages/ai/src/prompt-registry.ts`: publish the winning family as a new immutable prompt release (`caleums-universal-v4` or next id) through the existing registry, with the exact template text, slot contract, and the ledger evidence linked. Do not edit historical releases.
- Style anchors: for each of the four views, take the best passed image, store it via the anchor release path (`style_anchor_releases` and `style_anchor_publications`), mark `published`, and verify `signedStyleAnchorUrl` no longer throws in a real-mode dry run. This unblocks W4.
- Catalogue: connect every passed image into the atelier catalogue as a new versioned manifest (`v10`), with prompts, parents, review notes, checksums, in the existing manifest shape. Every connected family must be continuous (same pendant across its views, same geometry across its metals). Rejected attempts stay on disk under `rejected/` with reasons.
- `docs/goals/overnight-launch/IMAGE-LAB.md`: per-cell results, pass rates per stage, the final prompt, the defects that kept recurring and what fixed them.

## Workstream W3 - Design stage that never dead-ends (implementer, after W1)

Style unchanged. Restructure only what the shopper sees while choosing.

1. Two tiers. Tier 1 is illustrated live from the catalogue: language, one or two names (with layout), construction, lettering. Tier 2 is applied at preview: gold colour, stones, gem, size, chain. Tier 2 controls stay exactly where they are, keep their swatches, and get one quiet line in the preview panel: "Shown in 18K yellow gold with no stones. Your gold and stones appear in your personalized preview."
2. The resolver keys the illustrated photo on Tier 1 only, still exact-match, still order-independent. If a Tier 1 combination has no continuous family, the option is shown but marked "sample coming" and the preview keeps the last valid family for the same script and construction, clearly labelled as the sample for that look (this is a labelled sibling of the same look, not the rejected nearest-image fallback across looks; write a unit test that proves a metal or stone click can never change the displayed design).
3. Preview my piece is never disabled for a missing sample. It always leads to review with the customer's specification.
4. Camera tiles: unavailable views are hidden rather than shown as grey placeholders when a family has fewer than four views; Studio is always present.
5. Every catalogue family shown must come from W2 stage outputs or from the existing families the viewer re-approved in W1 step 3.

Gate: unit tests for tiering and the never-changes-design invariant; Playwright options suite updated and green; agent-browser journey at 390 and 1440 with screenshots after every click showing the pendant never changes design on Tier 2 clicks.

## Workstream W4 - Personalized preview through the real pipeline (implementer, after W1, in parallel with W3)

Goal: Preview my piece creates a real run for the customer's name and the review stage shows the generated Studio image, then the other views as they land.

1. Map the atelier draft to `CreateDraftInput` in `previewHandoff.ts`. Resolve the eight recorded gaps with explicit product defaults documented in the code (finish polished, connector integral rings, chain length 45 cm, size profile from 22/32 mm, complexity from stones, source `caleums-atelier`), and add `construction` and English `lettering` to the contracts where missing. No invented values without a comment naming the default and why.
2. Replace `runMockPersonalizedPreview` with a real implementation of the same shape that calls `POST /api/auth/anonymous` (if needed), `POST /api/designs/drafts`, `POST /api/revisions/approve` with `spellingConfirmed` from the checkbox, `POST /api/designs/{id}/run`, then subscribes to `GET /api/state` (poll, then Realtime if already wired). Keep the mock path behind `PROVIDER_MODE=mock` for tests.
3. Review stage shows the run: queued, generating, verifying, ready, retrying, failed per view, using the existing slot components and states. The Studio slot is the hero as soon as it is ready. The illustrated sample stays visible, labelled, until the first personalized view is ready, then moves to the small tile row.
4. Jobs: set `PROVIDER_MODE=real` in the DO app env (the Inngest functions run inside the Next app), redeploy, confirm the Inngest sync shows `presentation-task`, `outbox-recovery`, `stale-media-recovery`, set `max_reserved_spend_cents` for the night cap, confirm the four anchors are `published` (from W2), run one real dry run for أسماء and one for Asma, and read the name reader output. The verification gate in code is still the mock verifier; add the pixel viewer's checklist as a `verification.image` call only if it can be wired in under two hours, otherwise record it as the top morning risk.
5. Honest degrade. If real mode cannot pass two consecutive dry runs on each script by 06:30, or the anchor gate cannot be met, ship the request-capture path: the review stage shows the illustrated sample plus "Your personalized preview is being prepared. We will send it to you.", stores the specification and contact field, and the operator queue lists it. This path must also be built and tested regardless, because it is the failure state in production.
6. Bag stores the run id and the ready image references, not the sample id, once a personalized image exists.

Gate: `bash scripts/e2e-backend.sh` green against local with `E2E_MOCK=1`; one real run each for Asma and أسماء with the resulting Studio image opened by the viewer and passed; Playwright photo-journey updated and green; spend ledger for the real calls in PROGRESS.md.

## Workstream W5 - Deploy and live QA (implementer + browser-qa, after W3)

1. Build locally with `pnpm do:build`. Fix anything the production build rejects.
2. `bash scripts/digitalocean/deploy.sh staging codex/overnight-launch-2026-09-08`, then `bash scripts/digitalocean/smoke.sh`. Confirm with `doctl apps get` that the active deployment's source commit equals the branch head. Add `NEXT_PUBLIC_SENTRY_DSN` handling so the build does not need the empty var.
3. Set any missing app env (`FAL_KEY` is not needed; confirm `TRIGGER_SECRET_KEY` and `OPENAI_API_KEY` present). Never print values.
4. browser-qa runs the full shopper journey against the live URL at 320, 390, 768, 1024, 1440 and at 390×600, plus `/ar/design/new` at 390 and 1440: type a name, choose Arabic Framed minimal Kufi rose gold accent, preview, wait for the personalized Studio image or the honest degrade state, add to bag, reload, edit, then repeat with English two names Stacked yellow. Screenshots after every step into `docs/goals/overnight-launch/live-qa/`. Console errors and failed requests recorded.
5. Load a second shopper in parallel (second agent-browser session) to confirm concurrent runs do not collide and the spend cap holds.
6. Update `docs/DIGITALOCEAN-DEPLOYMENT.md` where it is stale.

Gate: smoke exits 0, live journey screenshots exist for every step, zero console errors, `doctl` shows ACTIVE at the branch head.

## Workstream W6 - Review, hygiene, morning packet (reviewer + lead, continuous)

- After each of W1, W3, W4, W5, dispatch `reviewer` with the diff and the gate outputs. It must try to break the never-borrow-a-design rule, the spend caps, the secret boundary, and the honest-degrade path. Fix findings before the next slice.
- Run `bash scripts/scan-secrets.sh` before every push.
- Keep `docs/goals/overnight-launch/PROGRESS.md` current. Format: Done (with evidence), In progress, Blocked (exact reason), Spend (Runway credits, OpenAI USD), Next.
- At the end write `docs/CHAT-HANDOFF-2026-09-08.md` (what is live, the URL, what a customer sees, what to say to the shop owner, what is degraded and why, the numbers), point `docs/START-HERE.md` at it, and publish a visual report artifact with the live-QA screenshots and the image-lab contact sheets.
- Open the PR to `main` with the completion packet from `CLAUDE.md`. Do not merge.

## Operating rules

- Evidence before claims. A gate is passed when its command output or screenshot is in PROGRESS.md.
- Never restore nearest-image fallback across designs. Never show a photo of a different construction, script or lettering as the shopper's.
- Never ship a generated image a viewer has not opened and passed.
- Never exceed 50 Runway tasks in flight, 40,000 Runway credits, or the OpenAI daily cap.
- Secrets stay server-side and out of logs, screenshots, commits and PROGRESS.md. When a dashboard shows a key, copy it with the page's copy button into a file write, never into chat text.
- Preserve originals and rejected attempts with reasons.
- Preserve Sanchay's local draft and bag: use isolated agent-browser sessions only.
- If the `.next` cache returns ENOSPC or 500s, clear only `apps/web/.next` and restart.
- If a subagent is idle or looping without tool use for more than two turns, stop it and redispatch with a narrower task.
- When something is impossible tonight, write it down and build the honest alternative; do not widen scope to compensate.

## Morning handoff must answer

1. The URL, and what a customer sees on their phone in the first 20 seconds.
2. Personalized generation: live or degraded, pass rate from the dry runs, cost per run.
3. Universal prompt: release id, stage pass rates, the recurring defects and the fixes.
4. Catalogue: which looks are continuous across views and metals, which are "sample coming".
5. What was spent: Runway credits, OpenAI USD.
6. What is blocked and needs Sanchay: production app creation, domain, pricing, payment, Inngest account if the fallback was used, anything requiring a purchase or approval.
7. The PR link.
