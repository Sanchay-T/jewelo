# W1 report - foundation and honesty fixes (agent report, model claude-opus-5, 06:30 IST)

## Result

All four gates green: typecheck 0, lint 0, `test:atelier` 34/34, `test:atelier:e2e` 45/45 including both chunk-guard assertions (no `/api/`, geometry or renderer_scene requests during the photographic journey).

## What changed

- Step 2: every import from `features/atelier/renderer/` removed; `assembly.ts` (key byte-identical), `capture.ts`, `SnapshotImage.tsx`, `snapshotStore.ts` (+tests) replace the renderer modules. Deleted `renderer/`, `tests/atelier-renderer.spec.ts`, `playwright.renderer.config.ts`, four renderer-only scripts under `scripts/atelier/`, and `three` / `@types/three`. Four geometry-only unit tests went with `scene.ts`; no live-behaviour test removed. `apps/web` `dev` is now pinned to `next dev -p 3001`.
- Step 3: 71 Arabic files read letter by letter. 4 rejected, all Diwani (`v2/arabic-diwani-v2.png` and its three v6 views) - they spell أسمك, not أسماء. Marked `rejected` in `sample-assets.json` / `sample-assets-v6.json`; `catalogue.ts` `connected()` filters them; 3 regression tests added. 67 passed (v1, v2 repaired set, v5 one-name and two-name families, v6, v8 Kufi rails, v9).
- Step 4: preview frame is a true 4:5 box at >= 768 px (`aspect-ratio: 4/5`, `object-fit: contain`), measured 0.8000 at 1440 and 1024, whole pendant visible for stacked and interlocked. Trade-off: at 1440 the plate is 325 px wide next to a 369 px dock; enlarging it needs dock changes (W3 hides unavailable tiles).
- Step 5: autoplay off in the design stage, on in review (unless reduced motion); play control kept. Verified live.
- Step 6: Arabic strings for "Your name", the example label, name pairs (أسماء وفاطمة), alt text, and a sweep of remaining English on `/ar/design/new` (sizes, placeholders, aria labels, disclaimer). Only brand lettering, the English font specimen and the route `<title>` remain Latin.

## Evidence

`docs/goals/overnight-launch/w1/`: `stacked-1440-studio.png`, `stacked-1024-studio.png`, `interlocked-1440-studio.png`, `arabic-locale-1440.png`, `review-1440-autoplay-on.png`.

## Observations handed on

- v8 "Accent" coverage renders four stones on the lower rail (should be one) - W2/W3.
- Thuluth hamza neck is thin - manufacturability note.
- `/ar` route `<title>` still English (route metadata).
