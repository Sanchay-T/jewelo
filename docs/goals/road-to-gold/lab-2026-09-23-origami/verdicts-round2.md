# Refined origami, round 2 - viewer verdicts (2026-09-24)

Five images from the second 2026-09-23 Runway run, scored against `stencils/*-origami-v5.png` and `prompts/*.txt`.
Every image was opened and looked at, plus enlarged crops of each ring, each bail, the A counters and the Arabic letter joins.
Note: `docs/goals/overnight-launch/VIEWER-RUBRIC.md` still does not exist in this repo, so the four axes in the dispatch were used as written, as in round 1.

The prompt diff was checked before scoring.
`v2-love.txt` and `v3-love.txt` differ in exactly one sentence of the Style paragraph, the fine-jewelry proportions sentence, which in v3 reads "the letter bars are noticeably slim, about one fifth thinner than a standard nameplate, an even 2.0 mm apparent stroke width across the whole name".
`opt-bail-love.txt` differs from `v2-love.txt` in three places: the stencil paragraph now says to ignore the two side rings and add one small round bail at the top centre, the chain paragraph now says the end link passes through the bail and forbids side rings, and the photo paragraph asks for the bail rather than both rings to be sharp.

## Per image

| Image | 1. Spelling | 2. Rings and chain / bail | 3. Folded origami | 4. Decent | Overall |
| --- | --- | --- | --- | --- | --- |
| v3-love | pass - L O V E exact, E has all three arms, O counter open and polygonal, one connected piece | pass - two rings, both holes open, the chain end link visibly looped through each | pass - large triangular panels, fold direction alternates along every stroke, crisp creases, real thickness | tweak - still reads bold; measured stem width over letter height is 0.154 against v2's 0.151, so the slimming did not land | tweak - unchanged stroke mass (axis: stroke slimness, re-apply harder) |
| v3-asma | tweak - A S M A all present and readable, but both A counters are filled solid where the stencil cuts an open triangle | pass - both rings open, chain end link through each hole, no extra ring or bail | tweak - facets read pillowed and inflated, creases rounded rather than crisp, a regression against v2-asma | tweak - stems still slab-like, 0.229 against v2's 0.242, about a 5 percent change | tweak - filled A counters (axis: counter openness) |
| v3-asmaar | pass - أسماء correct right to left: alif with hamza above, seen with three teeth in the right order, meem with tail, alif, hamza on its seat at the left; nothing added, dropped or wrongly joined | pass - both rings open, chain end link looped through each, ring stems land where the stencil puts them | pass - large clean panels, clear fold direction changes, crisp creases, visible 3D depth | pass - measured 0.225 against v2's 0.299, a real 25 percent slimming, restrained and elegant | pass |
| opt-bail-love | pass - L O V E exact, O counter open, one connected piece | tweak - no leftover side rings and the chain does pass through the bail, but the bail is a tapered tube plus a separate jump ring, and that jump ring meets the V apex with no visible hole to pass through | pass - same crisp large-panel v2 construction | pass - slim, restrained, the most photogenic piece in the lab | tweak - two-part bail with an unresolved join (axis: bail construction) |
| opt-bail-asma | tweak - A S M A readable, but both A counters are filled solid as in v3-asma | tweak - no side rings, chain through the bail, but the same tube bail plus jump ring, and the jump ring disappears behind the M top with no hole | pass - crisp flat panels, sharp creases, better than v3-asma | pass - reads as refined jewelry, helped by the calmer top | tweak - two-part bail with an unresolved join (axis: bail construction) |

No wrong spelling, no extra or missing glyph, no floating stone or mark, no extra side ring and no chain lying beside a ring in any of the five.

One finding that round 1 recorded as a pass and should not have: the filled A counters in ASMA are present in v2-asma as well, not just v3-asma.
This is a standing defect of the Latin ASMA stencil rendering, not something the slimness change introduced.
Round 1 is left untouched; this is recorded here only.

## Did the slimness change help?

It did nothing on the two Latin pieces and clearly helped the Arabic one.

Measured as the median vertical stem width divided by the letter band height, on the gold mask of each image:

| Pair | v2 | v3 | Change |
| --- | --- | --- | --- |
| love | 0.151 | 0.154 | none, marginally thicker |
| asma | 0.242 | 0.229 | about 5 percent thinner, far short of the 20 percent asked |
| asmaar | 0.299 | 0.225 | about 25 percent thinner, the change asked for |

Side by side, v3-love and v2-love are the same weight of piece; the only visible difference is that v3 sits slightly larger in the frame, which if anything makes it read heavier.
v3-asma is not meaningfully slimmer than v2-asma and it lost ground on construction: its facets are pillowed and its creases rounded where v2-asma's were flat and sharp, so on balance that pair moved backwards.
v3-asmaar is the one real win: visibly slimmer strokes, taller and cleaner alifs, the same crisp panels and correct threading, and it now reads unambiguously as fine jewelry rather than a nameplate.

Verdict on the axis: the instruction did not overshoot anywhere, and it did nothing on Latin caps.
A Latin capital's stem width is driven by the typeface in the stencil far more than by a sentence in the prompt, so the next attempt at slimness on LOVE and ASMA should change the stencil's font weight rather than the prompt's adjective.

## Which single image to show Omran

**v3-asmaar.**

It is the only one of the eleven that passes all four axes with nothing to qualify.
The name is letter-exact right to left, both rings are open with the chain end link visibly through them, the folded construction is crisp and clearly three-dimensional metal, and it is the single slimmest piece in the lab by a wide margin, which is exactly what "the same in a more decent manner" asked for.
It is also the right piece politically: it is an Arabic name rendered correctly, which is the thing Omran's shoppers will judge first and the thing a wrong render would embarrass him with.
The runner-up to keep in the back pocket is opt-bail-love, which is the prettiest photograph in the lab, but it carries an unresolved bail join and it is a Latin word, so it proves less.

## Is the centre bail worth offering as an option?

**Yes.**

Three reasons.
It removes the hardest thing in the whole media graph to render and to verify: two side rings, each with an open hole, each with a chain end link genuinely looped through rather than lying beside it.
One bail is one join to check instead of two, and both bail images came back with the chain correctly through the bail on the first attempt.
It also looks like ordinary fine jewelry rather than a nameplate, the piece hangs centred and flat, and the chain stops crossing the top corners of the letters.

One condition before it is offered.
In both images the model built the bail as a tube plus a separate jump ring, and in both the jump ring meets the letter top with no visible hole to pass through, which is a piece that cannot be made.
The prompt must say one bail only, no jump ring, the bail loop growing directly out of the top of the letter it sits on, and the verifier must check that join the way it checks the side rings today.
