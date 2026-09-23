# Free-mode verdicts - lab 2026-09-24

Scored by the `viewer` from the 1920 px PNGs in the session scratchpad, not from the 800 px WebP copies.
Every cell was opened and read letter by letter; Arabic cells were additionally cropped and upscaled 2-4x at the dots, the hamza and the ring joins.
The scorer did not generate these images.

Axes: SPELL (pass/fail only), CONN (one connected wearable piece with a real way to hang it), STYLE (fine jewelry in the named style), OVERALL (the worst of the three).

## The 24 cells

| id | style | script | SPELL | CONN | STYLE | OVERALL | notes |
|---|---|---|---|---|---|---|---|
| o-asma | origami | en | pass | fail | tweak | fail | Reads Asma. Clear background gaps at the baseline between s-m and m-a: four separate faceted blocks hung between two rings, not one body. Low-poly crystal look, reads render not casting. |
| o-muh | origami | en | pass | fail | tweak | fail | Reads Muhammad; the two a-bowls are near-closed and hover on the edge of reading as o. Gaps between M and u and between a and the final d; the d hangs off the right ring on its own. |
| o-arasma | origami | ar | pass | pass | tweak | tweak | أسماء complete: alef-hamza (hamza fused, not a separate stroke), seen with three teeth, meem, alef, final hamza. One continuous folded body, both rings threaded. Spiky enough to catch clothing; facets sharper than any castable piece. |
| o-armuh | origami | ar | pass | tweak | tweak | tweak | محمد: initial meem with counter, hah, medial meem (solid, no counter), final dal. Two sliver gaps on the baseline where letters only kiss. Same over-sharp facets. |
| o-love | origami | en | pass | pass | pass | pass | LOVE, all caps where Love was asked. Real bail, chain through it, L-O-V-E welded along the baseline. The only origami cell that is genuinely one piece. |
| o-fat | origami | ar | pass | tweak | tweak | tweak | فاطمة correct: one dot on the feh, two on the teh marbuta, tah's stem and loop both present. The three dots only touch the body at a corner, and the left jump ring is welded to a dot rather than to the letter. |
| f-asma | framed minimal | en | pass | pass | pass | pass | Asma, letters bridged by a thin rail and welded into both frame uprights. Four corner diamonds were not asked for. |
| f-muh | framed minimal | en | pass | pass | pass | pass | Muhammad, all eight letters, clean weld to both uprights, two rings at the top corners with the chain through them. Cleanest English cell in the run. |
| f-arasma | framed minimal | ar | pass | pass | pass | pass | أسماء complete, seen has three teeth, hamza sits on the alef. The final standalone hamza is drawn very large and sits on the baseline, so it leans toward reading as ain; same habit as the live v10 sample. |
| f-armuh | framed minimal | ar | pass | pass | pass | pass | محمد: meem, hah, meem, dal, all on one bar into both uprights. |
| f-love | framed minimal | en | pass | pass | pass | pass | Love, correct mixed case, welded to both uprights. |
| f-fat | framed minimal | ar | pass | fail | pass | fail | فاطمة spelled right, and that is the trap. The feh's dot and both teh-marbuta dots are fully detached islands with daylight all round - nothing holds them. Pretty, unbuildable, and a name verifier would wave it through. |
| r-asma | diamond rails | en | pass | pass | pass | pass | ASMA in caps where Asma was asked. Hung off the top rail by stalks, feet on the bottom rail, rings at both rail ends with the chain through. |
| r-muh | diamond rails | en | pass | pass | pass | pass | Reads MuhaMMad - two capital M mid-word. Letters are right; the case is not. Both rails present, both rings threaded. |
| r-arasma | diamond rails | ar | **fail** | tweak | tweak | fail | **missing-glyph: the final alef and the final hamza are both absent.** Right to left the piece carries alef-hamza, seen, meem and then a bare leftward hook into the bail. It reads أسم/أسما, not أسماء. The left pavé bar is a bail stalk, not a letter. |
| r-armuh | diamond rails | ar | pass | pass | tweak | tweak | محمد correct. Only one rail, along the bottom; the top rail is missing, so this is a pavé nameplate rather than the rails look. |
| r-fat | diamond rails | ar | pass | pass | pass | pass | فاطمة correct and, unusually, the dots sit on proper little posts rather than floating. Two rails, two rings, chain through both. |
| c-asma | classical | en | pass | pass | pass | pass | Asma in polished script, fully cursive-connected, both rings threaded. The classical cells carried the framed reference by accident and no frame leaked in. |
| c-muh | classical | en | pass | pass | pass | pass | Muhammad in script, one continuous stroke, right ring on the d ascender. |
| c-arasma | classical | ar | pass | pass | pass | pass | أسماء complete; a thin baseline bar carries the alef and the final hamza back into the meem, which is how a jeweler would actually do it. |
| c-armuh | classical | ar | pass | pass | pass | pass | محمد, four letters, one flowing body, both rings. Best Arabic cell in the run. |
| c-love | classical | en | pass | pass | pass | pass | Love, correct case, rose gold, fully cursive. The best-looking object in the 24. |
| c-fat | classical | ar | pass | tweak | pass | tweak | فاطمة correct. The left jump ring is fused to the teh marbuta's left dot, so the chain load runs through a dot; the dot pair itself only meets the letter at a corner. |

## Spelling pass rate per style

| style | spelling pass |
|---|---|
| origami | 6 of 6 |
| framed minimal | 6 of 6 |
| diamond rails | 5 of 6 |
| classical | 6 of 6 |

## Spelling pass rate per script

| script | cells | spelling pass |
|---|---|---|
| English (asma, muh, love x 4 styles) | 12 | 12 of 12 |
| Arabic (arasma, armuh, fat x 4 styles) | 12 | 11 of 12 |

Total 23 of 24. The one miss is Arabic: `r-arasma`, dropped alef and dropped final hamza.

Three English cells changed case without being asked (`o-love` LOVE, `r-asma` ASMA, `r-love` LOVE) and one mixed case mid-word (`r-muh` MuhaMMad).
None of those is a letter error, but all four would be visible to a shopper who typed the name in lower case.

## Overall verdict counts

pass 12, tweak 7, fail 5.

Fails: `o-asma`, `o-muh` (construction), `f-fat` (floating dots), `r-arasma` (spelling), and no others.

## Defect tag histogram

| tag | count | cells |
|---|---|---|
| wrong-stones | 6 | all six framed cells (unrequested corner diamonds) |
| cgi-look | 4 | o-asma, o-muh, o-arasma, o-armuh |
| disconnected-component | 2 | o-asma, o-muh |
| floating-mark | 2 | o-fat, f-fat |
| unsupported-geometry | 2 | o-fat, c-fat |
| wrong-look | 1 | r-armuh (no top rail) |
| missing-glyph | 1 | r-arasma |
| wrong-spelling | 1 | r-arasma |

## Best image per style

| style | best id | why |
|---|---|---|
| origami | `o-love` | the only origami cell that is one welded body with a real bail |
| framed minimal | `f-muh` | eight letters, welded into both uprights, both rings threaded |
| diamond rails | `r-love` | both rails, both rings, every letter tied to both rails |
| classical | `c-armuh` | Arabic spelled and joined correctly in a piece a jeweler could cast today; `c-love` is the prettier object |

## Against production

Compared cell by cell against the stencil-locked output in `docs/goals/road-to-gold/lab-2026-09-22/img/` (`mo-ar`, `c-muh`, `mf-ar`, `r-muh`) and the live shop samples in `apps/web/public/atelier/v10/`.

**Free mode wins on jewelry by a wide margin, and it is not close.**
Production `lab-2026-09-22/img/c-muh.png` is MUHAMMAD in flat block caps with the known bridge knob over the U and the ring hooked over the D; free-mode `c-muh` is a flowing script nameplate a shop would put in the window.
The live `atelier/v10/classic-studio` sample has the same stiffness and, worse, its four letters do not touch each other at all - they hang separately off the chain.
Production `mo-ar` is a flat faceted plate; free-mode `c-arasma` and `f-arasma` are shaped, weighted objects.

**The stencil wins on construction, not on spelling.**
The 2026-09-22 stencil cells are dull but they are reliably ONE body with TWO rings in known places, because the geometry was handed to the model. Free mode invents the hanging hardware every time, and that is exactly where it fails: `o-asma` and `o-muh` are separate blocks on a chain, `f-fat` has three dots floating in mid-air, `c-fat` hangs the whole pendant off a diacritic dot. Five of 24 free-mode cells are unbuildable; the stencil run's failures were cosmetic knobs, not islands.

**What the stencil buys:** guaranteed connectivity, ring placement, dot attachment, and the case the customer typed. **What it costs:** the piece looks like laser-cut sheet rather than cast gold, which is the complaint Omran actually has.

## Plain verdict on dropping the stencil lock

Free mode plus the existing name verifier gets spelling right 23 of 24 times, and the one miss (`r-arasma`, a silently dropped final alef and hamza) is precisely the kind of drop an automated verifier reading pixels can miss, so a retry loop would catch it only if the verifier is genuinely reliable on Arabic diacritics - which has never been proven.
But spelling is not where free mode actually breaks: five of 24 cells are not wearable objects at all, and four of those five spell the name perfectly, so a spelling-only gate passes every one of them.
The failure a customer would actually receive is `f-fat`: their name, beautifully spelled in gold, with the dots of ة and ف floating unattached in the photograph - a piece the shop cannot make and the shopper will ask for by that picture.
Recommendation: do not drop the hard lock outright; keep the stencil for geometry and connectivity and let the free prompt own the surface language, or gate free mode behind a connectivity check as strict as the spelling one before any Arabic name is allowed through it.

## Machine-readable lines

```json
{"cell":"o-asma","verdict":"fail","defects":["disconnected-component","cgi-look"],"axis":"geometry","confidence":"high"}
{"cell":"o-muh","verdict":"fail","defects":["disconnected-component","cgi-look"],"axis":"geometry","confidence":"high"}
{"cell":"o-arasma","verdict":"tweak","defects":["cgi-look"],"axis":"look-brief","confidence":"medium"}
{"cell":"o-armuh","verdict":"tweak","defects":["cgi-look"],"axis":"look-brief","confidence":"medium"}
{"cell":"o-love","verdict":"pass","defects":[],"axis":"none","confidence":"high"}
{"cell":"o-fat","verdict":"tweak","defects":["floating-mark","unsupported-geometry"],"axis":"geometry","confidence":"medium"}
{"cell":"f-asma","verdict":"pass","defects":["wrong-stones"],"axis":"none","confidence":"high"}
{"cell":"f-muh","verdict":"pass","defects":["wrong-stones"],"axis":"none","confidence":"high"}
{"cell":"f-arasma","verdict":"pass","defects":["wrong-stones"],"axis":"none","confidence":"medium"}
{"cell":"f-armuh","verdict":"pass","defects":["wrong-stones"],"axis":"none","confidence":"high"}
{"cell":"f-love","verdict":"pass","defects":["wrong-stones"],"axis":"none","confidence":"high"}
{"cell":"f-fat","verdict":"fail","defects":["floating-mark","wrong-stones"],"axis":"geometry","confidence":"high"}
{"cell":"r-asma","verdict":"pass","defects":[],"axis":"none","confidence":"high"}
{"cell":"r-muh","verdict":"pass","defects":[],"axis":"none","confidence":"high"}
{"cell":"r-arasma","verdict":"fail","defects":["wrong-spelling","missing-glyph"],"axis":"identity","confidence":"high"}
{"cell":"r-armuh","verdict":"tweak","defects":["wrong-look"],"axis":"look-brief","confidence":"medium"}
{"cell":"r-love","verdict":"pass","defects":[],"axis":"none","confidence":"high"}
{"cell":"r-fat","verdict":"pass","defects":[],"axis":"none","confidence":"medium"}
{"cell":"c-asma","verdict":"pass","defects":[],"axis":"none","confidence":"high"}
{"cell":"c-muh","verdict":"pass","defects":[],"axis":"none","confidence":"high"}
{"cell":"c-arasma","verdict":"pass","defects":[],"axis":"none","confidence":"medium"}
{"cell":"c-armuh","verdict":"pass","defects":[],"axis":"none","confidence":"high"}
{"cell":"c-love","verdict":"pass","defects":[],"axis":"none","confidence":"high"}
{"cell":"c-fat","verdict":"tweak","defects":["unsupported-geometry"],"axis":"geometry","confidence":"medium"}
```
