# Codex brief: the customer page after Umayr's feedback (P6-8, P6-9)

Self-contained. Read nothing else first except the two files named under "Before you start".

## Repo and rules

- Repo `/Users/sanchay/hq/projects/devonel/jewelo`, branch `codex/overnight-launch-2026-09-08`. Work on this branch, commit each item as its own commit with a message that says what changed and why, plain hyphens, no attribution trailers. Never push `main`, never merge.
- Node: prefix every command with `export PATH=$HOME/.local/share/mise/installs/node/24.18.1/bin:$PATH` and use `corepack pnpm`, never bare `pnpm`.
- The only mechanical gate is `corepack pnpm build` (must print `13 successful, 13 total`). Lint with `corepack pnpm --filter @jewelo/web lint`. No tests exist by decision; never run or edit any `*.test.ts` file; never add CI.
- Do not touch `packages/identity/**`, `apps/jobs/**`, `apps/web/src/app/api/**` or anything under `apps/web/src/features/admin/**`; other work is in flight there.
- Copy rules (`docs/OMRAN-BUSINESS-CONTEXT.md`): customer copy never says AI, generate, generation, prompt, magic, model, preview engine, or atelier. The shopper is buying gold. Short sentences a shop assistant would say out loud. Every string exists in English and in the Arabic dictionary at the top of `Atelier.tsx` (the `arabic` map, keyed by the English string; `t()` looks it up).
- Never weaken a gate: a still is shown only when `readPersonalizedRun` marks it presentable. Never show a sample as the shopper's piece.
- Local preview: `corepack pnpm --filter @jewelo/web dev` serves on port 3011 (port 3001 belongs to someone else, do not kill it). `PROVIDER_MODE=mock` locally and on staging, so a run always ends in the "we will send it" refusal within about 20 s; that is the honest path, not a bug.

## Before you start

1. `docs/goals/road-to-gold/feedback/umayr-2026-09-09/README.md` and its seven images (open them). This is what the broker saw and said.
2. `docs/goals/road-to-gold/dogfood-2026-09-09/before-umayr-fixes.md`: the DOM measurements of the same defects.
3. Optional: `p6-8-partial-unverified.patch` in this folder is a stopped agent's half-done attempt at items 1 to 3. It never built or ran. Use it as a map of where things are, not as code to apply.

## The file map (`apps/web/src/features/atelier/`)

- `Atelier.tsx` (about 2500 lines): the whole customer page. Dictionary lines 80 to 250. Sample card and caption around 400 to 470 and 2160 to 2200. Tiles around 2240 to 2350. Design step fields around 1340 to 1520. Header line 1258. Spelling echo box line 1467. Selections summary line 2416.
- `atelier.module.css`: `.preview*` and the sticky column at line 390 (`position: sticky`), short-height rules around 1205 to 1240 and 1470.
- `usePersonalizedPreview.ts`: the run state the tiles read (`ready`, in flight, `unavailable`).
- `personalizedRun.ts`: read-side of a run; `readPersonalizedRun` decides `presentable`. Read only.
- `sample-assets*.json`: the shop sample images and which option combinations have one.
- `packages/config/src/sellable.ts`: all four constructions and six lettering styles are selectable; the identity solver/verifier remains the safety gate for a specific name.

## Items, in order. Each has its acceptance check.

### 1. One preview state while the piece is being made, and after it cannot be

Today (measured): after the spelling checkbox is ticked, the tiles switch to "We will photograph it in the shop and send it" but the four thumbnails and the big picture still show the Asma sample. Umayr read that as "it generated Asma again".

Change:
- While a run is in flight (any of the four tasks neither `ready` nor terminal): all four tiles show the same calm placeholder (no `!`, no red, no sample image), and one line above the tiles: en "Your photograph is being made. About two minutes." ar "جارٍ تصوير قطعتك. نحو دقيقتين." The big picture is the same placeholder, not the sample.
- When the run ends without a presentable still (mock refusal, `operator_review`, any refusal code): every tile and the big picture show the placeholder with en "The shop will photograph it and send it to you." ar "سيصوّرها المتجر ويرسلها إليك." No sample image anywhere in the preview column from this point on. Keep the existing contact capture line and form as they are.
- When a still is presentable: unchanged.

Accept: in the browser at 1440x900, type `Umayr`, Review my piece, tick the checkbox; within 25 s every tile and the big picture carry the "shop will photograph" line and `document.querySelectorAll('img[src*="atelier/v1"]').length` inside the preview column is 0. Before ticking, the sample is shown once (item 2).

### 2. The sample is unmistakably not the shopper's

Today the sample card carries the "Asma example" pill, the footer "CALEUMS - THE NAME COLLECTION · Asma example", the round "Sample look, not your piece" badge, and two grey paragraphs under it.

Change:
- One label on the card, top-left, once: en "Shop sample · Asma" ar "عينة من المتجر · أسماء". Remove the pill, the footer line and the round badge (`Atelier.tsx` around 160 to 170 for the strings, 2160 to 2200 for the markup, the `s.photoCaption` and badge styles in the CSS).
- Under the card, one line: en "A shop sample. Yours is photographed after you confirm the spelling." ar "عينة من المتجر. تُصوَّر قطعتك بعد تأكيد التهجئة." Delete the "Shown in 18K ... Your gold and stones appear in your personalized preview." sentence (`Atelier.tsx:457`) and the long "This is a sample look from the shop..." string (`:168`).
- Review step: the caption "Asma · Asma example" goes; the big picture carries the same single label.
- The "About this example" disclosure and its paragraph (`:2405`) go.

Accept: `grep -c "example" apps/web/src/features/atelier/Atelier.tsx` drops to the e-mail placeholder and the saved-example fallbacks only; on the page the word "example" does not appear in the preview column.

### 3. Copy strip

- `Atelier.tsx:1258` remove the `THE NAME ATELIER` header note and its dictionary entry (`:239`); keep the CALEUMS wordmark, the language link and the bag.
- `:91` and `:1354` "Language / script" becomes en "Language" ar "اللغة".
- `:1467` delete the "YOUR SPELLING · TEXT ONLY" echo box and its wrapper; the input is the spelling. Keep the hint "Enter the exact spelling you want. You can correct it here at any time." and the Arabic two-name advisory.
- The name appears once in the selections summary (`:2416` region): the heading already shows it; remove the duplicate chip or line.
- Grep `Atelier.tsx` for "atelier" (case-insensitive) in string literals and replace with plain words; CSS class names and identifiers may keep it.

Accept: the strings "THE NAME ATELIER", "Language / script", "YOUR SPELLING" no longer exist in `apps/web/src`; the rendered page shows the typed name exactly twice on the design step (input and selections heading).

### 4. Hide unproven looks instead of marking them (DS-4 default)

Today three of four construction tiles say "Not yet photographed" and five of six lettering tiles say "Sample coming"; the page looks three-quarters unfinished.

Change: an option outside the sellable set (`packages/config/src/sellable.ts`) is not rendered at all in the design step. Keep `notPhotographed()` and `data-not-photographed` for an option that is sellable but has no sample yet. If the current selection (restored from the device record) is no longer sellable, reset it to the first sellable option and say nothing. Remove the "Not yet photographed; the shop will confirm this look by hand" field note. Delete the "Sample coming" small text on lettering tiles; a tile either shows a sample or the name rendering from item 5.

Accept: the design step shows all four construction tiles and all six lettering tiles in either script. No deployment value can hide or widen the set; a reviewed identity/verifier change is the only way to alter support.

### 5. The shopper's own name in every lettering tile (P6-9)

Today every lettering tile shows `أسماء` (or a Latin sample word) in the tile's face.

Change: render the typed name in each lettering face as an inline SVG text in the tile, using the same fonts the identity engine ships (`packages/identity/engines/caleums-arabic-v3/` holds the `.ttf` files and `manifest.json` names the face per lettering style; expose the fonts through `next/font/local` or a static route, do not import the engine). Fall back to the sample word while the input is empty. No rings, no bridging, text only; this is a tile, not the stencil.

Accept: type `Umayr`, the English tile shows "Umayr" in Classic; switch to Arabic and type `عمير`, all six tiles show `عمير` in their faces.

### 6. The sticky preview column must fit the viewport

Measured at 1440x900: the preview panel is 1214 px tall, sticky top -333 px at scroll 671, so the column above the sample is blank while scrolling. Umayr's screenshot 03 item 1.

Change: the sticky column is at most `100vh - header - action bar`; inside it the big picture scales to the remaining height and the tile strip stays visible; the sample card sits at the top of the column, not vertically centred in leftover space. Check 1440x900, 1280x720, 1024x768, 768x1024, 390x844.

Accept: at every size above `panel.getBoundingClientRect().height <= window.innerHeight - 124` and the tile strip is inside the viewport at scroll 0 and after scrolling to the bottom of the form.

### 7. Arabic input hint (decision already taken: keep the refusal)

Today typing Latin letters with Arabic selected turns the field orange with "Enter the exact Arabic spelling, or choose English." Keep that. Make it visible at first keystroke, add an en line under it "Your keyboard is in English; switch it to Arabic or choose English above." with the ar equivalent, and set `lang="ar"` and `dir="rtl"` on the input when Arabic is selected so phones offer the Arabic keyboard. No transliteration.

## Proof to hand back

- `corepack pnpm build` output line `13 successful, 13 total`.
- `corepack pnpm --filter @jewelo/web lint` exit 0.
- For each item, the acceptance check result, run in a real browser on `http://localhost:3011/en/design/new` and `/ar/design/new`, at 1440x900 and 390x844, with reduced motion once.
- A list of every dictionary key added or removed, en and ar.
- Do not deploy; do not touch `docs/goals/road-to-gold/PROGRESS.md` or `HANDOVER.md`; add one row per item to `docs/TASKS.md` under phase 6 as P6-8 (items 1 to 4, 6, 7) and P6-9 (item 5) marked done with the commit sha.
