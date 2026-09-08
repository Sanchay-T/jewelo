# Identity engine adversarial review 2 (on `6d7382b`, 2026-09-08)

Fresh-context adversarial-reviewer over the adversarial-1 fixes. Verdict: finding 2 of review 1 (ring welded onto a floating dot) is not closed.
The lead confirmed F-1 by eye on `docs/goals/overnight-launch/lab/stencils/production/noor-ar-kufi.png`: the right ring hangs off the dot of ن.

| # | Severity | Finding | Owner |
| --- | --- | --- | --- |
| F-1 | high | `countGlyphPixelsUnderRingMetal` exempts every pre-ring pixel within `IDENTITY_RING_WELD_ZONE` (46 px) of the anchor, ~18% of each annulus; a dot (~80 px) survives the 11x11 erosion and becomes the anchor. `noor-ar-kufi`, `noor-ar-classic` weld the ring to the ن dot with `glyphPixelsUnderRingMetal: 0`, `passed: true`. | fix pass 3 |
| F-2 | medium | Placement search: the canvas guard `break`s the shift loop at shift 0, so no lift is tried when `seatX < 44`; 5 of 32 committed rings (`noor-en-*`, `layla-en-*`, `muhammad-en-kufi`, left, x 42) never enter the search. | fix pass 3 |
| F-3 | medium | `docs/TASKS.md` P1-5 proof says holes "above the glyph bbox"; `render-stencils.mts:512` asserts `aboveAnchor`; 1 of 32 holes is above the bbox top. | decision: `aboveAnchor` is the standard (the lab seats rings at corner anchors); row reworded in fix pass 3 |
| F-4 | medium | `presentation.ts:232` `prompt_compile_failed` calls `blockPreSpend` without the retry fallback; bare throws at `:204`, `:258` and a failing `materializePromptSnapshot` have the same stuck shape. | fix pass 3 |
| F-5 | low | `passed` cannot be false: every conjunct already threw. | comment only |
| F-6 | low | `measure-stencils` compares `measured` against the same ruler on the same bytes; a determinism check, not a cross-check. | fix pass 3: add `CLAIM` cross-check against `claimed`; Python oracle stays independent |
| F-7 | low | Pipeline release compared after the render (`presentation.ts:710`). | fix pass 3: compare first |
| F-8 | low | `layla-ar-kufi` lost 2.0% ink to the outward shift's downscale; no pre-fix baseline recorded. | baseline recorded in `dogfood-2026-09-08/identity-gates.md` |

Not falsified: ring can never detach (fillet starts inside the annulus at any lift or shift); recentre mapping after a shifted ring; the partial unique index enforces one active release (409 proven by the platform re-proof); the `components` and `holeSizes` disagreement set; the config `superRefine`; 232 = 16 + 18x2x6.
