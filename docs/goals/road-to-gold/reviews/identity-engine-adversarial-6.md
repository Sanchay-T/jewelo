# Adversarial pass 6: identity engine after fix pass 6 (`dbb73fb`)

Fresh-context `adversarial-reviewer`, 2026-09-09, probes run against the shared checkout (tree equal to `dbb73fb` except `PROGRESS.md`).
Recorded by the lead from the agent's report; the lead opened `sara-en-classic.png` and confirms blocker 1 by eye.
Probes and renders under the session scratchpad `adv6/`, `adv6b/`, `adv6c/`, `adv6d/` (`matrix.mts` 576 cells, `names2.mts`, `names3.mts`, `letters.mts`, `patch-hooks.mjs`, `harness.mts`, `measure.py`, `report*.py`, `compare5.py`).

## Verdict

One blocker and three majors. P1-5 is not closed.
Pass 5 blockers 1 and 2 are closed: an independent PIL plus scipy decoder reproduces `ringTilt`, `ringOverhang` and `ringSpan` on 568/568 welded cells to 1.8e-15, finds exactly two ring holes by roundness in every cell, and the eight refusals reproduce byte for byte.
What the fix built instead is a different physical object, and nothing measures it.

## Blocker 1. The ring is on a post welded at the foot of the letter, and on Latin faces the post reads as a letter

Stem (anchor to ring centre) over 1136 rings: p50 203, p90 333, p95 346, max 346 px (the cap: `IDENTITY_RING_MAX_LIFT` 320 + `IDENTITY_RING_OUTER` 42 - `IDENTITY_RING_WELD_OVERLAP` 16).
575 rings over 200 px, 219 over 300 px; 67 of 568 cells have a stem longer than the whole name is tall.
Anchor depth below the name's top line as a fraction of name height: p50 0.54, p90 0.948, max 0.974; 637 rings anchor in the bottom half of the lettering, 285 in the bottom quarter.
The ring itself sits at the top line (max 30 px above it), so the whole distance is a free-standing 39 px rod: on the 32 mm pendant a 1.2 mm rod up to 10.9 mm long joined at one point at the foot of the letter.
Cells: `sara-en-classic` rods 333 and 318 px at the feet of `S` and `a`, the finished piece reads `iSarai`; `hasan-en-classic` stem 256 px against a 239 px name; `A` en classic both posts standing outside the letter like poles; `yazan-ar-classic` both stems 346.
Cause: `caleums-arabic-v3.ts:2217-2224` scores `[overhang violation, tilt violation, tilt, distance from top line, overhang, lift]`, so continuous overhang always beats a 300 px shorter post and lift never decides; `settled()` at `:2289-2297` stops at the outermost level rung and never looks at post length.
Disabling `settled()` (source patch, full search, 92 465 steps) gives the identical `Sara`: the full search prefers the foot anchor too.
Contradicts D-020 as written ("at the outer top corner"): 56% of anchors are in the bottom half.
Customer failure: the stencil every OpenAI call is anchored to spells `iSarai`; the added letters are upstream of the verifier and no gate measures post length, post to letter height, or whether the suspension reads as a glyph.

## Major 2. Eleven of fifty-two single Latin letters refuse in both live styles

`H`, `b`, `w` `identity_no_ring_seat`; `K` 0.448, `W` 0.314, `g` 0.310, `q` 0.377 overhang; `X` 23.0, `d` 50.8, `k` 66.0, `p` 59.8 tilt. 22 of 208 cells; every Arabic letter passes.
The fix-6 note's 102-cell one-letter sample (`A B e i M O Z`) contained none of the eleven.

## Major 3. A real Gulf name refuses in a live style

`كوثر` (Kawthar) minimal `identity_ring_tilt_too_steep:deg=15.5,max=15`, one of 180 live-style cells over 90 names outside the matrix.
Thin margins against the 0.30 overhang gate: `قمر` thuluth 0.294, `آدم` 0.289, `كوثر` 0.284, `فجر` 0.279.
Pre-spend routing intact: solver throw inside `signedIdentityUrl` lands in `blockPreSpendTerminally` before `reserveAttempt`; `errorClass` keeps the suffix; the atelier maps it to the customer vocabulary.

## Major 4. The name is drawn smaller and the note does not say so

Recentre downscaled: pass 5 377/576, pass 6 518/568; 295 cells at exactly 0.8941 = 912/1020, the canvas clamp from `leftmostRingX` 44 / `rightmostRingX` 979 (`:1950-1968`) and the 912 px recentre box (`:1357-1380`).
Ring hole area mean 1686 to 1497. On the 16 pass-5 renders that still exist the linear scale is p50 0.930, min 0.887; 13 of 16 shrank, none grew (`muhammad-ar-kufi` 0.995 to 0.883).
The lead's lift hypothesis is disproved as stated: rings are at most 30 px above the top ink; the shrink is horizontal, from rings shoved to the canvas edge.

## Minors

1. The harness delta is insensitive to `HARNESS_OWNERSHIP_GROWTH` (2 to 0: all deltas 0/96) and sensitive to `HARNESS_RING_OUTER` (42 to 52: `WELDED-DELTA 55/96`); no corpus pixel is under a fillet and inside a foreign contour, so the commit message's sentence is wrong while the number is honest.
2. `identity-anchor.test.ts:3` imports `identityAnchorSvg`, which does not exist (pass 5 minor 5, still open).
3. `IDENTITY_RING_MAX_TILT_DEGREES` 15 and `IDENTITY_RING_MAX_OVERHANG_FRACTION` 0.3 are literals in `packages/identity`, not validated configuration.
4. `docs/TASKS.md` P1-5 row still says "no-refusal fallback".
5. `fillPinholes` (`:944-966`): a region whose pixels all map back to pre-thickening ink is filled untested; a notch mapping inside a real counter would refuse a good piece; neither fired (`MATRIX PINHOLES 0`); smallest surviving counter 30 px against the 16 px floor.
6. The overhang denominator includes the ring metal (`:686,714-718`), a few points lenient; the distribution floor is a constant 0.041.
7. `IDENTITY_RING_COUNT` (`shaping.ts:459`) is dead.

## Confirmed closed

Pass 5 blockers 1 and 2 (independent recomputation agrees exactly; `PY TILT max 11.68`, `PY OVERHANG max 0.288`, `RING DETECT MISMATCH 0`); pass 5 major 3 (rail gone, no residue); pass 5 minor 4; determinism (`Ali` byte-identical, fingerprint includes `pngSha256`); refusal reproduction 8/8.

## Recommendation recorded for fix pass 7

Post length becomes a scored term above overhang and a gate; the anchor returns to the top of the stroke as D-020 says; single Latin letters and the wider real-name list join the permanent matrix.
