# Refined origami, round 3 - viewer verdicts (2026-09-24)

Six images from the third 2026-09-23 Runway run, scored against `stencils/*-origami-v5-w600.png`, `stencils/*-origami-v5-w500.png` and `prompts/r3-*.txt`.
Every image was opened and looked at, then re-opened as enlarged crops of each ring, the bail, both A counters, the M-A ligature and the L-O join.
Baselines re-opened for comparison: `v3-love`, `v3-asma`, `v2-asma`, `opt-bail-love`, `opt-bail-asma`.
Note: `docs/goals/overnight-launch/VIEWER-RUBRIC.md` still does not exist in this repo, so the four axes in the dispatch were used as written, as in rounds 1 and 2.

Prompt diff checked first, with `diff`:

- `r3-love-w600.txt`, `r3-love-w500.txt` and `v3-love.txt` are byte-identical. Same for the ASMA trio. The only variable in those four cells is the stencil weight, as the dispatch states.
- `r3-bail-*-w500.txt` differs from `r3-*-w500.txt` in exactly three sentences: the stencil paragraph now says to ignore the two side rings and to give the piece "exactly one bail, at the top centre: a single closed loop of gold whose two ends grow directly out of the top edge of the letter it sits on, one continuous piece with that letter. There is no second ring, no link and no connector between the bail and the letter"; the chain paragraph says the end link passes through that single bail and forbids side rings, jump rings and a second bail; the photo paragraph asks for the bail rather than both rings to be sharp.
  That is exactly the condition round 2 set before the bail could be offered.

## Per image

| Image | 1. Spelling | 2. Rings and chain / bail | 3. Folded origami | 4. Decent | Overall |
| --- | --- | --- | --- | --- | --- |
| r3-love-w600 | pass - L O V E exact, O counter an open polygonal hole, E has all three arms, V-E ligature as drawn, one connected piece | pass - two rings, both holes open, the chain end link visibly looped through each, ring stems fused to the letter tops | pass - large triangular panels, fold direction alternates along every stroke, crisp creases, real depth | pass - stroke thickness over letter height 0.192 against v3's 0.267, a 28 percent slimming; reads as fine jewelry, not a nameplate | pass |
| r3-love-w500 | pass - L O V E exact, O counter open, three E arms, L foot still touching the O, one connected piece | pass - two rings, both open, chain end link through each, nothing lying beside a ring | pass - the crispest facets in the lab, clear fold reversals, visible metal thickness | pass - 0.178 against v3's 0.267, a 33 percent slimming; slim but nowhere near fragile, every join still has metal in it | pass |
| r3-asma-w600 | pass - A S M A exact; both A counters are open triangular holes for the first time in the lab; M keeps its right stem fused to the A as the stencil draws it | pass - both rings open, chain end link genuinely looped through each, ring bases fused to the letter apexes | pass - flat crisp panels, sharp creases, none of v3-asma's pillowing | pass - 0.220 against v3's 0.347, a 37 percent slimming | pass |
| r3-asma-w500 | pass - A S M A exact, both A counters open holes, M right stem a clear vertical bar ligatured into the A as drawn | pass - both rings open, chain through each, confirmed at 4x on both corners | pass - crisp large panels, strong fold reversals | pass - 0.253 against v3's 0.347, a 27 percent slimming; no thinner than w600 in the photograph despite the lighter stencil | pass |
| r3-bail-love-w500 | pass - L O V E exact, O counter open, three E arms, one connected piece | pass - exactly one bail, a single tapered tube growing straight out of the top of the V, no jump ring and no side ring anywhere; the chain enters and exits at the same height behind the tube's front wall, which is what a real tube bail looks like. The bore itself is hidden by the front wall, so the threading is read from the symmetry, not from a visible hole | pass - same crisp v2-grade construction, the bail itself is smooth rather than faceted, a minor style mismatch | tweak - 0.270, thicker than r3-love-w500's 0.178 on the same stencil; the camera is closer and the strokes came back chunky (axis: stroke slimness) | tweak - chunky strokes despite the w500 stencil (axis: stroke slimness) |
| r3-bail-asma-w500 | tweak - reads A S M A, but the M's right stem has merged into the A's left diagonal into one leaning stroke instead of the vertical bar the stencil draws, so the middle wobbles towards "ASNA" at a glance (axis: ligature fidelity) | pass - exactly one bail, one tapered tube continuous with the top of the M's stem, no jump ring, no side rings, chain entering and exiting level behind it | pass - crisp panels, clear creases, good depth | tweak - 0.297 against r3-asma-w500's 0.253 on the same stencil, and the A legs read heavy (axis: stroke slimness) | tweak - M right stem lost into the A ligature (axis: ligature fidelity) |

No wrong spelling, no extra or missing glyph, no floating stone or mark, no stray jump ring, no chain lying beside a ring, no disconnected component in any of the six.

## 1. Stem width over letter height

Measured by me from the photographs, not from the stencils.
Method: the metal silhouette is everything not reachable from the image border through off-white low-saturation paper, minus enclosed holes over 250 px, so specular highlights inside a stroke count as metal and the O and A counters do not.
Thickness is the median over all metal pixels in the letter band of min(horizontal run, vertical run), which is orientation-tolerant; the letter band height H is the tallest contiguous row block of the silhouette, so rings and chain are excluded.
This estimator is not the one round 2 used, so its absolute numbers are higher than round 2's; the comparisons below are all computed the same way on all images, including the re-measured baselines.

| Image | Stencil weight | Thickness / letter height | Change vs its v3 baseline | Metal coverage of the letter bbox |
| --- | --- | --- | --- | --- |
| v3-love | w800 | 0.267 | - | 0.650 |
| r3-love-w600 | w600 | 0.192 | -28 % | 0.536 |
| r3-love-w500 | w500 | 0.178 | -33 % | 0.547 |
| r3-bail-love-w500 | w500 | 0.270 | +1 % | 0.691 |
| v3-asma | w800 | 0.347 | - | 0.752 |
| r3-asma-w600 | w600 | 0.220 | -37 % | 0.622 |
| r3-asma-w500 | w500 | 0.253 | -27 % | 0.635 |
| r3-bail-asma-w500 | w500 | 0.297 | -14 % | 0.640 |

The stencils themselves, ink coverage of the glyph bounding box: LOVE 0.505 at w800, 0.398 at w600, 0.367 at w500; ASMA 0.576, 0.436, 0.412.

How much the lighter stencil moved it: a lot, and it is the first thing in this lab that moved Latin stroke mass at all.
Round 2 changed the prompt's adjective and got 0.151 to 0.154 on LOVE, that is nothing.
Changing the stencil font weight moved LOVE by 28 percent and ASMA by 37 percent in one step, which is the conclusion round 2 predicted: a Latin capital's stem width is set by the typeface in the stencil, not by a sentence in the prompt.

Does w500 overshoot into fragile-looking: no, and it also does not reliably buy anything more than w600.
On LOVE, w500 is 5 points thinner than w600 and still has visible metal in every join; nothing reads breakable.
On ASMA, w500 came back 3 points *thicker* than w600 in the photograph despite the lighter stencil, so the difference between the two weights is inside the model's own variation.
That matches the engine numbers: w800 to w600 drops ink by 19 percent (168613 to 136417) and w600 to w500 by only 6 percent more (136417 to 128612).
The only fragility signal anywhere is at w500, and it is a spelling risk rather than a looks risk: the one image where a stroke vanished, r3-bail-asma-w500's M right stem, is a w500 image.

## 2. A-counter openness in ASMA

Both counters are open holes at both new weights, and this is a real fix.

- r3-asma-w600: first A counter 2215 px of enclosed background, last A counter 3500 px. Both are clean triangular holes at 4x, background paper visible through them.
- r3-asma-w500: first A 2183 px, last A 2163 px. Both open.
- r3-bail-asma-w500: both A counters open as well, 1136 px and 1973 px.
- v3-asma: neither A has an enclosed hole. The largest enclosed regions in that image are gaps between letters; at 4x the counters are solid faceted gold. Same in v2-asma.

So the filled-counter defect that round 2 recorded as standing in both v2-asma and v3-asma is gone at w600 and at w500, and it was never a prompt problem: the engine's own measurement says the counter went from 3879 px at w800 to 7678 px at w600, roughly double, which is enough opening for the model to read it as a hole instead of a seam.

## 3. Did the bail fix work?

Yes, completely, on the point that was broken.

| Image | Exactly one bail | Continuous with the letter | Stray ring surviving |
| --- | --- | --- | --- |
| r3-bail-love-w500 | yes, one tapered tube at the top of the V | yes, the base flares directly into the V's apex, one piece, no connector | none, and no side rings |
| r3-bail-asma-w500 | yes, one tapered tube at the top of the M's left stem | yes, the base flares into the letter top, one piece | none, and no side rings |

For comparison, the old opt-bail pair, re-opened at 4x: both have a tube plus a separate closed jump ring hanging below it, and in both the jump ring meets the letter with no visible hole to pass through.
That second component is gone in round 3.

One residual, reported but not scored as a failure: in both new images the bail is a tube seen face-on, so its bore is hidden behind the front wall.
The chain enters on the left and exits on the right at the same height, which is exactly how a real tube bail photographs, but a verifier cannot see a hole through it.
If the verifier is going to check this join the way it checks the side rings, the prompt should ask for the bail turned very slightly so the bore reads, or for a flat round loop instead of a tube.
Second residual: the bail is polished smooth on both, while the letters are faceted, so it reads as a bought finding rather than part of the folded piece.

## 4. Which weight, and which single image

**Default Latin origami weight: 600.**

It is where all the gain is and where none of the risk is.
w600 opens both A counters, slims LOVE by 28 percent and ASMA by 37 percent, and keeps enough metal in the ring stems and in the M-A ligature that nothing dropped out.
w500 adds only 6 percent less ink on the engine side, did not read slimmer than w600 on ASMA at all, and produced the one spelling defect in the whole round: the M right stem that merged away in r3-bail-asma-w500.
Take w600 as the default and keep w500 on the shelf for very long names where the letters get crowded.

**The single image to show Omran: `img/r3-asma-w600.webp`.**

It is a customer's name rather than an English word, it is spelled exactly, and it is the first ASMA in eleven attempts whose two A counters are open holes you can see paper through, which was the standing defect on this name.
Both rings are open with the chain end link genuinely looped through each, the folded construction is crisp and clearly three-dimensional gold, and at 0.220 it is a 37 percent slimmer piece than the v3 Omran last saw.
It is the answer to "the same in a more decent manner" on the exact object he will be judged on, a name plate with a real name.

Keep two in the back pocket: `v3-asmaar.webp`, round 2's pick, as the Arabic proof, and `r3-love-w500.webp`, which is the prettiest photograph in the lab and the best Latin construction, but proves less because LOVE is a word every nameplate shop already stocks.
