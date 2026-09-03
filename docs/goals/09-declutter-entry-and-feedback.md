# Goal 09 — declutter the entry form and make generation feedback honest

**Brief alias:** this is **G-13** in `docs/planning/ITERATION-BRIEF-2026-09-03.md` §5.
It is filed as `09-…` because `docs/goals/` is sequential on disk (00–05, 07, 08)
and this is the next goal actually being worked. Where the brief says G-13, it
means this file.

**Branch:** `main` (owner decision, 3 Sep 2026 — CLAUDE.md rule 3 is stale).
**Status:** in progress.

## Objective

A first-time visitor types one name and reaches "approve my design" on **one
page**, with no wizard chrome, no option surface they did not ask for, and no
provider call before they have entered a name. Generation feedback tells the
truth about what is queued, running, verifying, failed, retrying or cancelled.

Concretely:

1. Collapse the six-stage construction wizard in `apps/web/src/features/entry/`
   into a single configurator page with a review strip at the bottom of the same
   page — not a separate route or step.
2. Reduce the visible option surface to Omran's shape: one name field (second
   name is an affordance, not a mode switch), 6 design styles, 3 layouts,
   3 metals, and everything else defaulted inside one collapsed "details"
   section.
3. Fix the six browser-walkthrough defects recorded as items 19–24 in the brief.
4. Make pending/progress UI honest: shimmer only for real pending work, no fake
   percentages, no raw enum strings shown to customers.

## Excluded scope

Deliberately **not** in this goal. Do not let it creep in:

- **No pipeline work.** `packages/ai`, `apps/jobs`, `packages/identity`
  solvers, provider adapters, prompt releases, spend/reservation/quota logic,
  and Trigger task definitions are untouched.
- **No model or provider calls.** No paid render, no new provider, no fal/video
  reintroduction (removed 3 Sep 2026, commit `046818b`).
- **No Supabase migration and no new backend enum values.** `ArabicStyle`,
  `PendantLayout`, `StoneCoverage`, `Gemstone`, `SizeProfile` and `ChainStyle`
  keep exactly today's members. The UI regroups and relabels; it does not
  invent vocabulary the identity compiler cannot render.
- **No rendered style tiles yet.** Showing a real pre-rendered pendant per style
  is **G-12** (style library with the partner) and needs Omran's licence answer
  plus a paid pre-render budget. This goal ships the *layout and information
  architecture* for tiles using existing `apps/web/public/fixtures/` and text,
  so G-12 only has to drop images in. Partner WhatsApp images are **not** copied
  into this public repo.
- **No "Design not found" 404 status change.** See "Known deferrals" below.
- No CRM, no CI/deploy work (G-10), no observability work (G-11), no verifier
  work (G-14).

## Locked UI decisions

These were decided by the owner with Omran's feedback and are not open for an
implementing agent to re-litigate.

### Name

- One name input. Script toggle English / العربية.
- The second name is an **"add a second name"** affordance that reveals a second
  input plus a remove control. It is not a "One name / Two names" mode switch.
- Arabic shows an editable **approved spelling** field. The human is the
  spelling authority (CLAUDE.md rule 8); the model only proposes.
- Two-name Arabic is **not renderable today** —
  `classifyArabicIdentityInput` in `packages/identity/src/caleums-arabic-v3.ts`
  returns `unsupported_arabic_two_name`. The UI must say so **at the affordance**,
  not only at the bottom of the page, so nobody walks into the atelier-review
  dead end by accident.

### 6 design styles

Map onto the six existing non-`none` `ArabicStyle` values. No new enum member,
no migration. This is not an approximation: `LIVE_STYLES` in
`packages/identity/src/caleums-arabic-v3.ts` already holds exactly six styles,
and `identity-anchor.ts` already maps `contemporary → "classic"` for the solver.

| Tile label | `ArabicStyle` value | Solver style | Font of record |
| --- | --- | --- | --- |
| Classical | `contemporary` | `classic` | Noto Naskh Arabic |
| Minimal | `minimal` | `minimal` | Scheherazade New |
| Diwani | `diwani` | `diwani` | Noto Naskh Arabic |
| Thuluth | `thuluth-inspired` | `thuluth-inspired` | Rakkas |
| Kufi | `kufi` | `kufi` | Noto Kufi Arabic |
| Signature | `signature` | `signature` | Noto Naskh Arabic |

Omran's "plus classical" is satisfied by relabelling `contemporary` from
"Classic" to "Classical"; the enum value must not move because the solver and
`identity-anchor.ts` key on it.

**Styles are shown for Arabic only.** `arabicStyle` is read by
`apps/jobs/src/identity-anchor.ts` only when `language === "ar"`; for English it
is `"none"` and reaches the model as prose alone. Offering English customers a
style picker that the pipeline ignores would be a fake choice, so English gets a
single honest "English script" statement instead. English style tiles require a
contracts change and belong to G-12.

### Layouts

Omran's text said 3 layouts ("Normal, downwards, in the frame"); his later voice
note said frame / vertical / horizontal / square. **`frame` and `square` have no
`PendantLayout` member and no geometry in the identity compiler**, so inventing
them would break deterministic identity. Per the owner's instruction, when the
mapping is ambiguous we keep the existing ids and change only the presentation:

| Visible chip | `PendantLayout` value |
| --- | --- |
| Normal · side by side | `side-by-side` |
| Downwards · stacked | `stacked` |
| Joined with a heart | `connected-heart` |

`stacked-heart`, `infinity` and `interlocked` stay in the contract and stay
reachable behind a "more layouts" disclosure, so a restored draft that already
carries one of them remains valid and visible. The disclosure **auto-opens** when
the restored layout lives inside it.

Frame / square remain an open question for Omran (brief §3.3) and would need a
`PendantLayout` addition plus identity-compiler work — a later goal.

### Metal, and everything else

- Metal: 3 swatches, same page.
- Stones, size and chain collapse into one closed **"Details"** disclosure on the
  same page. Defaults: coverage `none`, gemstone `none`, size `classic`, chain
  `cable`, length `45` cm. **No field leaves the draft or the API contract** —
  they are simply defaulted and folded away.
- The 6-step stepper chrome is removed. The live deterministic identity preview
  stays.

### Draft persistence

`localStorage`, key `caleums:configurator-draft:v2`. The shape changed (the
wizard `stage` field is gone), so the version is bumped and any `v1` payload is
migrated — from **both** `sessionStorage` (where v1 actually lived; the brief §4
was wrong about this) and `localStorage`. Both stores are cleared on approval so
a customer's name does not linger on a shared device.

## Acceptance criteria

Functional:

1. `/en/design/new` and `/ar/design/new` render **one** page. No stepper, no
   `Step n of 6`, no separate review route.
2. Opening either route with no draft issues **zero** requests to
   `/api/transliterate`. A request is only made when script is Arabic **and** the
   visitor has typed at least two characters.
3. Name fields start **empty**. No visitor ever sees "Layla" or "Mariam"
   prefilled, and no other customer's pendant image appears under their name.
4. The price estimate is visible at the moment of approval at 1440×900 **with
   the controls column scrolled to its bottom**, not only at the top of the page.
5. Six style tiles appear for Arabic; English shows an honest script statement.
   Three layout chips appear once a second name exists; the other three are
   reachable and auto-open for a restored draft.
6. A restored `v1` draft from either storage lands intact under the `v2` key,
   including a hidden layout, and corrupt JSON degrades to a clean empty form.
7. `DesignInput` sent to `createDesign` is unchanged in shape from today.
8. No stale copy: nothing claims "Classic and Minimal can proceed directly to
   generation".
9. Generation feedback: shimmer/spinner appear only for `queued`, `generating`,
   `verifying`, `retrying`. `failed`, `cancelled`, `blocked`, `unavailable` and
   `available_on_request` render human copy, never a raw enum string, and never a
   percentage. Status is never conveyed by colour alone (`data-state` retained).
10. Slot dimensions are preserved and stills reveal individually as they become
    ready; no global barrier and no layout jump.

Non-functional:

11. Verified at desktop 1440, mobile 390, `/ar` RTL, and full keyboard operation
    including the new disclosures, with visible focus and reduced-motion respected.
12. `pnpm typecheck && pnpm lint && pnpm test` pass, **and** `pnpm test:e2e`
    passes (root `pnpm test` is vitest only and does not run
    `apps/web/tests/flow.spec.ts`).
13. New vitest coverage exists for the draft migration and for the customer-facing
    status copy.

## Stopping condition

A new visitor on `/en/design/new` types a name and reaches an enabled "approve"
control **without leaving the page**, `/api/transliterate` is provably not called
before they type, the price estimate is visible at approval on desktop, the six
walkthrough defects are closed or explicitly deferred in writing, and the
verification commands above are green with desktop and mobile evidence committed
under `docs/evidence/2026-09-03-declutter-entry/`.

## Known deferrals (do not silently "fix" these)

- **"Design not found" returns HTTP 200** (brief item 24). A true 404 needs
  server-side design resolution: design state resolves client-side, so SSR sees
  no designs for *valid* ids too and calling `notFound()` would 404 real
  designs. It affects three call sites (`studio.tsx`,
  `crafting-transition.tsx`, `CommerceExperience.tsx`) and needs a hydration
  flag on the client store. Own goal.
- **Rendered style tiles** — G-12, blocked on Omran's licence answer.
- **Frame / square layouts** — blocked on Omran confirming, then a contract change.
- **`/ar` translation** — this goal only stops English copy from rendering with
  flipped punctuation inside RTL; it does not ship Arabic strings.
- **`/api/transliterate` ignores provider mode.** The route builds a real
  `OpenAIArabicNameTransliterator` whenever `OPENAI_API_KEY` is set and never
  consults `PROVIDER_MODE` (which is jobs-side config anyway). Browser
  verification for this goal therefore runs with the key unset. Wiring a mock
  mode into the web tier is spend-guard work, not entry-form work.

## Pointers

- Living brief, with all partner evidence: `docs/planning/ITERATION-BRIEF-2026-09-03.md`
- Index of everything: `docs/planning/CONTEXT-INDEX.md`
- Partner media and Scribe transcripts, **outside this public repo**:
  `~/hq/projects/personal/devonel.com/jewelo-intake/whatsapp-jewelry-ai/`
  (12 reference images in `media/`, 6 voice-note transcripts in
  `transcripts/ALL.txt`). Never copy these into the repo.
- Walkthrough screenshots that produced defects 19–24:
  `docs/evidence/2026-09-03-browser-walkthrough/`
- Frozen constraints: `docs/FROZEN-UX.md`, `docs/PRODUCT-CONTRACT.md`, `CLAUDE.md`
