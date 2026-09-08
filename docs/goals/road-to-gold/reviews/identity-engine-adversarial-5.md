# Adversarial pass 5: identity engine after fix pass 5 (`2ad683c`)

Fresh-context `adversarial-reviewer` in its own worktree at `2ad683c`, 2026-09-08.
Recorded by the lead from the agent's report.
Probes and renders under the session scratchpad `adv5/` (`matrix.log`, `matrix/` 576 PNGs, `stats.mjs`, `railprobe.mts`, `names2.log`, `pin.mts`, `det.mts`, `dots.mts`, renders `aisha-ar-classic.png`, `li-ar-minimal-tilt65.png`, `aya-madda-on.png`, `aya-madda-off.png`, `qq-on.png`).

## Verdict

Two blockers and three majors. P1-5 is not closed.
The mechanical evidence of `2ad683c` reproduces to the digit (576/576, FILLET-FOREIGN 0, BAR 20, span min 0.307).
Pass 4 blocker 1 is closed on the welded path; pass 4 blocker 2 is not, because fix 5 measured separation and the customer harm is level.

## Blocker 1. The two rings are not level, on 20% of the matrix, up to 64.7 degrees, and nothing measures it

`caleums-arabic-v3.ts:628-645` compares the hypotenuse of the two hole centres against `IDENTITY_RING_MIN_SPAN_FRACTION`; a pair far apart but 60 degrees out of level passes.
Over 547 welded cells: tilt p50 4.7, p90 15.3, p95 23.9, max 64.7; over 10 degrees 110 cells, over 15 59, over 20 39, over 30 12.
Worst: `li-ar-minimal` 64.7 (rings at 573,528 and 754,145; live style), `li-ar-classic/diwani/signature` 52.4, `aya-ar-minimal` 49.2, `alaa-ar-classic` 35.7, `amir-ar-minimal` 30.0.
The three `li` cells the fix-5 table lists as closed moved from too close to 52 degrees out of level.
Customer scenario: `لي` in minimal hangs almost sideways on the chain; every gate green.

## Blocker 2. `عائشة` in classic puts both rings in the right-hand third, span 0.291, 66% of the piece cantilevered

Carriers `6:0@3, 7:0@0`; rings at x=656 and x=882 on a piece whose ink starts at x=68; ratio 0.291 is below the 0.307 the gate's 0.25 floor was justified against, and `م` in minimal measures 0.257.
`construction.ringCarriers` records candidate index 3 and nothing gates on it; the distance from the outermost ink to the nearest ring is measured nowhere.
Mechanism: the blocker-1 fix itself; the ta-marbuta's dots sit above the outer letter, every seat over the outer three carriers has foreign ink under its fillet, and the search walks inward until both rings are in one corner.
Same pattern: `موزة` overhang 0.570, `آمنة` 0.636 tilt 35.3, `آية` minimal 0.498, `آلاء` 0.564, `خالد` 0.426.

## Major 3. The bar rail grips a diacritic, floats over the rest, and absorbs up to 45% of a mark with no gate looking

`drawBarSuspension` (`:1962-2045`) draws one capsule across the glyph box at `IDENTITY_RING_BAR_WIDTH = 39`.
Measured: `آية` classic rail 756 px, 27% of columns touch ink, madda 37.6% railed; `قق` rail touches only the two nuqta of the final qaf (11%), so the load path is rail to dot to a 24 px bridge; `تسنيم` minimal 11%; `Bartholomewsonlongest` 85%.
No gate scans ink under the rail: `countGlyphPixelsUnderRingMetal` and the harness scan only the annulus-plus-fillet box.
The bar-path closure of pass 4 blocker 1 was achieved by widening the exemption (bar width 24 to 39).

## Major 4. `bar` is a terminal pre-spend block, so "never refuses a customer's name" is false in the shipped path

`presentation.ts:487-490` blocks pre-spend with `identity_bar_fallback`, default on.
Over 40 common Arabic and 20 Latin names in the two live styles: `آية`, `آمنة`, `رقية`, single letters (`A`, `ب`, `م`), and 17-plus-character Latin names in every style but kufi are dead ends, about 7.5% of realistic Arabic names.
The escape hatch `IDENTITY_BAR_FALLBACK_REVIEW=0` makes exactly the pieces in major 3 sellable.

## Major 5. The harness re-derives the engine's rule from the engine's own constants and answer

Carrier-wins precedence, thickening radius, "ink of no contour is nobody's" and the rail capsule are identical by construction; the rail is rebuilt from the engine's reported glyph box with the engine's constants.
`FILLET-FOREIGN 0/576` cannot falsify a wrong rule; it is not the independent proof the commit message says.

## Minor

1. `fillPinholes` (`:819-832`) fills every enclosed region at or under 16 px before the gate looks, so the gate never fires; thirty `e` in kufi has every counter welded solid with `passed: true` (today also a bar block, ships with the flag off). Smallest surviving legitimate counter 17 px.
2. The shared-glyph welded branch is live for one-letter names: `م` minimal at span 0.257 against 0.25.
3. The harness pre-ring plane is Lanczos-resampled where the ringless render downscales.
4. `shaping.ts:700` cites `carrierSeats`, which does not exist.
5. `identity-anchor.test.ts:3` still imports the removed symbol.

## Confirmed closed

Pass 4 blocker 1 on the welded path: zero class-3 pixels under any annulus or fillet on `أمير`, `آلاء`, `مُحَمَّدٌ`, `أسماء`, `عائشة`, `اللّه`.
Pass 4 major 5 (`measure-stencils` default), minor 4 (lift cap 320, deepest 144).
Dots as carriers structurally impossible (largest-contour rule, largest non-maximal contour on any face is a counter at most 0.556 of the body).
Byte-identical renders, fingerprint moves with the PNG sha; rail capsule pixel-identical to `drawBar`; no dual implementation.
