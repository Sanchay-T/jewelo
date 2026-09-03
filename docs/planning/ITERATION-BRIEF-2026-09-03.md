# Iteration brief — 3 September 2026

**Status:** living planning document. Update as partner feedback, transcripts and
decisions land. Nothing here is code-locked until it is moved into
`docs/DECISION-REGISTER.md` and a `docs/goals/*.md` file.

**Purpose:** consolidate (1) what today's outside-in audits found we are doing
wrong, (2) what the partner (Omran, "Jewelry AI" WhatsApp group) has asked for,
and (3) the concrete changes to make before the next coding goal starts.

---

## 1. Decisions already taken today

| Decision | Source | Effect |
| --- | --- | --- |
| **Image only. No video / motion generation.** | Owner + Omran ("Videos are not needed", 30 Aug) | fal.ai / Seedance removed from code, config, docs and MCP. CLAUDE.md rules 13–15 and the Motion binding decision are void. |
| **Keep Trigger.dev + outbox.** Drain the stale backlog, do not remove the queue architecture. | Owner | 29 stale scheduled runs cancelled; 22 stuck tasks transitioned to `cancelled` via `transition_generation_task`. |
| **`main` is the live branch.** Work commits directly on `main`; DO deploys stay manual for now. | Owner | CLAUDE.md rule 3 and the PR template (`rebuild/v2-first-principles`) are stale and must be updated. |
| **Real still generation is proven.** | Paid proof run, $0.2183 | `gpt-image-2-2026-04-21` via `/v1/images/edits`, 1 identity reference, 1024×1024 high, 112 s, name-check read "Layla" exactly. |
| **Runway MCP connected** (workspace "Sanchay", 315k purchased credits, `gpt-image-2` available as hosted model). | Owner | Research/evaluation tool only. Not in the production pipeline unless explicitly decided. |
| **ElevenLabs available globally** (`ELEVENLABS_API_KEY` in `~/.zshenv`, `~/.claude/settings.json`, repo `.env`). | Owner | Used for intake transcription (Scribe). Not a product dependency. |
| **Video code + jobs shipped on `main`.** | [Remove video generation…](f6ce0130-ecc9-4907-9327-e09ef6a7da25) | Commits `046818b`, `2bace7b`, `697a8cd`. Trigger prod is `20260903.1` (3 tasks: `presentation-task-v1`, `outbox-recovery-v1`, `stale-media-recovery-v1`). Tests 115/115. Migration `20260903000000_image_only_remove_video.sql` applied to remote Supabase. |

---

## 2. What we are doing wrong (audit findings, ranked)

### Pipeline / operations

1. **Nothing deploys on push.** The DigitalOcean app uses a generic `git.repo_clone_url` source, which has no `deploy_on_push`. Every deploy so far was manual; live is two commits behind `main` and untouched for a week. The GitHub App integration is installed and validated — switching `bootstrap-app.mjs` to `github: { repo, branch, deploy_on_push }` is a one-block change.
2. **Zero CI gate on `main`.** `.github/` holds only a PR template. `typecheck`, `lint`, `test`, `secret:scan` are never run automatically, on a **public** repository with an `.env`-driven secret model.
3. **Trigger worker was dead for ~10 h before anyone noticed** *(worker is now on `20260903.1`; alerting still missing)*. No queue-depth / zero-throughput alert. `DEPLOYMENT_FAILED` is the only DO alert.
4. **Pre-spend guards / tests were red on HEAD** *(fixed in `2bace7b`; 115/115 pass)*. Still no CI gate, so this can regress silently again.
5. **Env var decoys.** `FAL_VIDEO_PREVIEW_MODEL`, `FAL_VIDEO_FINAL_MODEL`, `FAL_VIDEO_PREVIEW_CONCURRENCY`, `FAL_REQUIRED_ACCOUNT_CONCURRENCY`, `FAL_IMAGE_MODEL` were documented but never read. `.env.example` must only contain variables the Zod schema validates. (Moot for fal after removal; the pattern must not recur for OpenAI/Supabase/Trigger.)
6. **Provider credentials in the wrong tier.** `OPENAI_API_KEY` and `TRIGGER_SECRET_KEY` are runtime secrets on the DO web app, contradicting CLAUDE.md rule 7 (job-only). `env-contract.mjs` does this deliberately — either the rule or the contract must change.
7. **Build cache is structurally disabled** (`turbo.json` `build.outputs: []`) so every DO build pays the full ~155 s. Health-check `initial_delay_seconds: 30` adds ~25 s per deploy for nothing.
8. **Docs describe a pipeline that does not exist on `main`** (`docs/DIGITALOCEAN-DEPLOYMENT.md`: workflows, `pnpm verify`, deploy gate). Agents following it fail or "fix" things.
9. **Direct Postgres access fails from dev machines** (`db.<ref>.supabase.co` is IPv6-only here); operational SQL had to go through PostgREST, which is not atomic. Use the Supavisor pooler URL / IPv4 add-on for `SUPABASE_DB_URL`.
10. **Supabase project is in `ap-northeast-2` (Seoul)**, not Mumbai as `docs/FINAL-STACK.md` states. Either move or correct the doc — latency to GCC/India customers is the question.
11. **Verifier drift.** The GPT-5.6 vision verifier was replaced by `MockStudioVerifier` on 27 Aug because it passed wrong names; the only real gate is now `OpenAINameReader`. That is fine for name correctness but there is no automated check for geometry, chain threading, background or duplicate pendants.
12. **Identity anchor font differs by OS.** Local macOS rendered the Latin anchor in a sans-serif fallback although Playfair Display is bundled; Trigger's Linux workers presumably render Playfair. Same fingerprint, different stencil. `pinFontconfig()` in `apps/jobs/src/identity-anchor.ts` must be verified on both.
13. **Unreconciled provider spend.** 12 cancelled fal previews had live request ids; up to ~$24 may have been billed but is not in `actual_spend_cents`. Bookkeeping only, since video is gone.
14. **Observability that the stack promises does not exist.** Sentry and PostHog are env names in `packages/config` only; nothing is installed.

### Product / UX

15. **The entry form is over-specified for a first visit.** Six construction stages, ~35 selectable values (see §4). Omran's direction is the opposite: fewer, better-rendered choices, seen *before* committing.
16. **Customers cannot see what a style looks like before choosing it.** Omran (30 Aug): "we have prior renderings of what they would actually look like right so that they can see". Style pickers are text/tiles, not rendered pendant examples.
17. **Arabic style quality is below bar.** Omran on the current four Arabic renders: "these four also yes but can and has to be done much better", and the display style "is literally normal writing".
18. **Too many layouts and styles that were never validated with the partner.** 7 Arabic styles × 7 layouts × 3 metals × 4 coverages × 7 gemstones × 4 sizes × 4 chains × 4 lengths is a combinatorial surface no prompt library can cover with quality.

### Browser walkthrough defects (local == live, commit `2f13776`; screenshots in `docs/evidence/2026-09-03-browser-walkthrough/`)

19. **High — paid transliteration fires on every configurator load, even in English.** `new-design-experience.tsx:199` passes `enabled: true` unconditionally, so opening `/en/design/new` sends the default name to `gpt-5.6-luna`. Spend + privacy exposure per visit. Gate on `language === "ar"` and on user input, not on mount.
20. **High — fixed action bar hides the price estimate on desktop review** (`.clm-config-actions` is `position: fixed`; only the "Price estimate" label is visible at 1440×900). Commercial info hidden at the approval moment. Mobile is fine.
21. **Medium — `/ar` mirrors layout but does not translate copy.** English strings inside `dir="rtl"` reorder trailing punctuation (".name", ".precious"). Either ship Arabic copy or keep `/ar` LTR for text until translated.
22. **Medium — stale Arabic-support copy.** All six styles are `providerSupported: true` and read "Supported", but the standing message still says "Classic and Minimal can proceed directly to generation". The atelier-review branch it refers to is unreachable.
23. **Low — "Live preview" shows another customer's pendant.** The preview frame is the static `/fixtures/layla-direction-1-product.png`; "Layla" bleeds through under the visitor's own name on every step. Replace with the deterministic identity preview only, or the pre-rendered style tiles from §4.
24. **Low — "Design not found" returns HTTP 200** for crafting/studio/commerce with a bad id.
25. **Perf — `/api/state` costs 0.5–2.2 s per page load** (Supabase round trip on every navigation). Cache or move to a layout-level fetch.
26. **No commit SHA exposed anywhere** (`/api/health` only returns `contractVersion: foundation-v1`; DO headers carry an app UUID). Add `GIT_SHA` to the DO build env and surface it in `/api/health` so "what is live" is answerable.

Verified OK: zero console errors on all routes, identical health/readiness payloads local vs live, no layout jumps, Arabic spelling field editable with the human as authority, empty name disables Continue, submit disabled until the spelling checkbox is ticked.

---

## 3. Partner feedback so far (Omran, "Jewelry AI" group)

Source: local `wacli` store, chat `120363424060454271@g.us`, 30 messages, 12 Aug 2026 → 30 Aug 2026.
Media not yet downloaded — `wacli` needs a fresh QR login (`wacli auth`); then run
`~/hq/projects/personal/devonel.com/jewelo-intake/whatsapp-jewelry-ai/pull-and-transcribe.sh`
to fetch 12 images + 6 voice notes and transcribe the voice notes with ElevenLabs Scribe.
Voice-note content and the image references are **pending** and will be appended to §3.1.

Text decisions captured (29–30 Aug):

- On the current four Arabic style renders: **"these four also yes but can and has to be done much better"**. Add **"Plus classical"** as a style.
- The way styles are displayed today "is literally normal writing"; the reference images he sent show "the following styles" and "we can add more things then from these styles". → Style options must be shown as *rendered pendant examples*, sourced from his reference set.
- **Reduce the design options to 6.** ("We reduce it / To 6 options / In terms of design.")
- **Reduce layouts to 3.** ("And 3 for layout.") One of them is **"Normal (downwards) (in the frame)"** — a single name written normally, hanging downward, inside a frame.
- **Show prior renderings of what each option would actually look like** so customers can see before they choose.
- **"Videos are not needed."**
- Earlier (12 Apr): Omran is building CRM and marketing separately — Jewelo does not need to own CRM.

### 3.1 Pending from media / transcripts

- [ ] The 12 reference images (which styles, which layouts, what "classical" means visually).
- [ ] Transcripts of 6 voice notes (4 Omran, 2 Sanchay), 30 Aug 10:34–14:00 UTC.
- [ ] Meeting chat notes from Omran (to be pasted by owner): new form options, changes, feedback, add/delete list.
- [ ] Licensing / rights constraints on reference images and fonts ("the license" mentioned by owner — clarify what is licensed: reference designs, calligraphy fonts, or brand).

---

## 4. Entry form: current state vs. declutter proposal

### Current (apps/web/src/features/entry/configurator-draft.ts + new-design-experience.tsx)

| Stage | Field | Options today |
| --- | --- | --- |
| Name & language | language | en, ar |
| | nameCount | 1, 2 |
| | nameOne / nameTwo (+ Arabic transliteration + refine/edit status) | free text |
| Arabic style (ar only) | arabicStyle | none, contemporary, diwani, thuluth-inspired, kufi, signature, minimal (7) |
| Names & layout | layout | single-name, side-by-side, connected-heart, stacked, stacked-heart, infinity, interlocked (7) |
| Metal | metal | yellow, white, rose |
| Stones | coverage | none, accent, partial-pave, full-pave |
| | gemstone | none, lab-diamond, natural-diamond, ruby, emerald, blue-sapphire, pink-sapphire (7) |
| Size & chain | size | delicate (22 mm), classic (30 mm), statement (36 mm), custom |
| | chain | cable, curb, rolo, box |
| | chainLength | 40, 45, 50, 55 cm |

Draft persisted in `localStorage` under `caleums:configurator-draft:v1`; six-step wizard plus review.

### Proposal (to validate against Omran's images/transcripts before locking)

Principle: **the customer picks from rendered examples, not from vocabulary.** Two screens before generation, everything else defaults and is editable *after* the first render.

**Screen 1 — Name**
- Name (one field; second name is an "add a second name" affordance, not a mode switch).
- Script: English / Arabic (Arabic shows live transliteration with refine).

**Screen 2 — Look** (rendered tiles, each tile is a real pre-rendered pendant of a sample name)
- **Design style: 6 tiles** (Omran's 6; today's 7 Arabic styles collapse into these — candidates: Classical, Contemporary, Diwani, Thuluth, Kufi, Minimal; "Signature" merges into Classical or Diwani pending his images).
- **Layout: 3 tiles** — Normal (downward, in frame), plus two to be confirmed from his set (likely Side-by-side and Connected/Stacked for two names).
- **Metal: 3 swatches** (yellow / white / rose) — visual, single tap.

**Deferred to the studio (after first render, as refinements, all defaulted)**
- Stones: default *none*; single toggle "add diamonds" → coverage; gemstone colour behind a secondary picker. Cut gemstone list to what the partner can actually manufacture.
- Size: default *classic 30 mm*; delicate/statement as a slider or two chips. Drop "custom" from the customer path (operator-only).
- Chain: default *cable 45 cm*; chain style/length live in the commerce step, they do not change the pendant render.

Net effect: first-visit decisions go from 10 fields / ~35 values to 3 visual choices + a name; combinatorial prompt surface drops from ~230k to 54 (6 × 3 × 3) renderable combinations, which is small enough to **pre-render every tile** and to QA every prompt profile by hand.

Open questions for Omran (ask before implementing §4):
1. Exact six design styles and the reference image for each.
2. The three layouts; how two names appear in "Normal (downwards)".
3. Which stone/gemstone combinations he can manufacture and price.
4. Whether the customer ever needs chain choice before checkout.
5. What "classical" means — Naskh-like Arabic, serif Latin, or both.

---

## 5. Changes to make (proposed goal order)

Each item becomes one `docs/goals/*.md` file with a stopping condition before coding.

1. **G-09 Repo truth reset** — *partially done:* image-only docs landed in `697a8cd`; `.cursor/` is gitignored; fal MCP removed from Cursor config. Still open: `main` as base in CLAUDE.md/PR template; stale DO runbook; `.env.example` = Zod schema only; Supabase region statement. *Stop when `rg -i 'seedance|fal\.ai|video'` in docs returns only the decision-register entry.*
2. **G-10 Push-to-live** — GitHub source with `deploy_on_push` (staging), CI workflow (`typecheck`, `lint`, `test`, `secret:scan`) required on `main`, turbo `outputs`, health-check timing, `DEPLOYMENT_LIVE` alert, rollback target recorded. *Stop when a docs-only push reaches the live URL unattended in < 4 min with CI green.*
3. **G-11 Operational safety** — queue-depth / zero-throughput alert for Trigger; Sentry actually installed (web + jobs); pooler-based `SUPABASE_DB_URL`; job-only provider keys or amended rule 7; reconcile fal spend ledger. *Stop when a deliberately paused Trigger worker pages within 10 min.*
4. **G-12 Style library with the partner** — ingest Omran's reference images + transcripts; define 6 styles × 3 layouts; author and QA one prompt profile + style anchor per style; pre-render tile sets for sample names; verify Playfair/Arabic fonts render identically on macOS and Linux. *Stop when every tile renders correctly for two Latin and two Arabic sample names with name-check pass.*
5. **G-13 Declutter entry** — implement §4 screens; move stones/size/chain to post-render refinements; fix walkthrough defects 19–24 (transliteration gating, action-bar overlap, `/ar` copy, stale support copy, Layla fixture bleed, 404s); RTL/mobile/keyboard verification; Playwright flow test updated. *Stop when a new visitor reaches first render in ≤ 3 taps after typing a name and no provider call happens before the name is submitted.*
6. **G-14 Visual QA beyond the name** — restore a real structured verifier (geometry, chain threading, background, duplicate pendant) with deterministic fallbacks, now that video budget is freed. *Stop when injected bad renders are caught ≥ 95% on the fixture set.*

Deliberately **not** doing: CRM (Omran owns it), video, per-PR preview apps, instance upsizing, Runway in production.

---

## 6. Evidence and artefacts

- Paid proof run: `docs/evidence/2026-09-03-gpt-image-2-proof/` (`output.png`, `response.json`, `prompt.txt`).
- Backlog drain: 29 Trigger runs cancelled (`POST /api/v2/runs/{id}/cancel`), 22 tasks → `cancelled`, 22 `audit_events` rows `task.stale_worker_cancelled`.
- WhatsApp intake: `~/hq/projects/personal/devonel.com/jewelo-intake/whatsapp-jewelry-ai/` (chat.json now; media + transcripts after `wacli auth`). Kept outside the public repo on purpose.
- Live app: `jewelo-staging` `ec09c9fd-84e4-45c5-b60a-fd62277af322`, region `blr`, known-good rollback deployment `9c4eb261-c3f0-4636-bad9-8265c8298b19`.

## 7. Human actions outstanding

- `wacli auth` (QR) so media/voice notes can be pulled; then run the intake script.
- Paste Omran's meeting chat notes into §3.1.
- Confirm fal billing for 26–27 Aug (ledger only).
- Rotate the ElevenLabs key at some point — it was shared in a chat transcript.
- Decide: Supabase region (stay Seoul vs. move to Mumbai) and provider keys on the web tier (rule 7).
