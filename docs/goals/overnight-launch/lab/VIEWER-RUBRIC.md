# Viewer rubric - CALEUMS image lab

The viewer opens the actual pixels. It never generates, and it never scores its own work.
Pretty but wrong is `fail`. Uncertain is not a pass.

## Names in the lab

| slug | English | Arabic | codepoints |
| --- | --- | --- | --- |
| asma | Asma | أسماء | U+0623 U+0633 U+0645 U+0627 U+0621 |
| noor | Noor | نور | U+0646 U+0648 U+0631 |
| layla | Layla | ليلى | U+0644 U+064A U+0644 U+0649 |
| muhammad | Muhammad | محمد | U+0645 U+062D U+0645 U+062F |

Arabic reads right to left.
أسماء is alif-with-hamza-above, seen (three teeth), meem, alif, standalone hamza.
نور is nun (one dot above), waw, ra.
ليلى is lam, ya (two dots below), lam, alef maksura (no dots).
محمد is meem, hah, meem, dal.

## Looks

- **Classical** - the letters ARE the whole pendant. No frame, no plate, no rail, no border. Two rings where the ringed stencil puts them.
- **Origami ribbon** - the same outline, but the gold is a flat strip FOLDED like a paper ribbon: each stroke shows two or three straight flat facets at different angles meeting at sharp crease lines, one facet visibly brighter than the next, mitred corners, never a smooth rounded bend. A flat continuous polished nameplate is the wrong look.
- **Framed minimal** - the lettering inside ONE thin plain rounded-rectangular gold frame, cast as one piece with the letters. Exactly two rings, one at each TOP CORNER OF THE FRAME. The stencil is ring-free, so no eyelet may sit on a letter.
- **Diamond rails** - the lettering held between TWO straight parallel plain gold rails, top and bottom, cast as one piece. Exactly two rings, one at each OUTER END OF THE RAILS. The stencil is ring-free, so no eyelet may sit on a letter. With "no stones" the rails are plain polished gold.

## Views

- **Studio** 1:1 - catalogue packshot, pendant near flat, whole pendant and both rings in frame and in focus, warm off-white matte paper.
- **On skin** 4:5 - worn, base of neck to top of chest, face out of frame, pendant flat on the skin below the collarbones and fully readable.
- **Close up** 1:1 - tight three-quarter macro, cast edge thickness visible, one ring with the chain through it in frame, the complete name still readable.
- **Dark** 9:16 - low key on dark textured stone, one narrow soft source upper left, whole pendant and both rings still readable.

## Hard gates - any failure is a fail

**Identity.** Exact spelling letter by letter against the stencil. No extra, missing or duplicated glyph. No second copy of the name anywhere in frame. For Arabic, check every dot and hamza individually and count the seen's teeth. Letter shapes must match the stencil, not merely be the right letters in another font. Nothing rotated.

**Construction.** One connected piece, every letter fused to its neighbour or to the frame/rails. No floating letter, dot, hamza or island. Exactly two jump rings belonging to the pendant and no third eyelet anywhere, especially not on a letter. No duplicate pendant, no extra charm, no second chain. Thickness and joins look makeable.

**Ring and chain (settled after Stage 1 attempt 1).** The pendant's own two eyelets are "the two jump rings". ONE small connector link per side, between an eyelet and the chain, is ACCEPTABLE - that is normal jewellery. The defect is an eyelet whose hole is EMPTY while the chain or connector passes behind, beside, or hooked over the outside of it. The test: for each ring, can you see something passing through the hole, with daylight visible through the hole on both sides of it?

**Photography.** Must read as a real camera photograph of metal on a jewellery set: real specular response, true contact shadow, finite depth of field, believable background material. Fail signals: 3D-render or CGI look, plastic or candy gold, uniform flat brightness with no reflected environment, glow, bloom, neon rim light, beauty-filter smoothing, watermark, logo, caption, or any added words.

**Selections.** The requested metal, the requested stone coverage, the requested chain, the requested look, the requested view.

**Dependent views (Stage 3).** The view passes only if it is unmistakably the SAME physical pendant as the Studio master: same letters, same thickness, same rings, same metal.

## Defect tags - use only these strings

`wrong-spelling` `extra-glyph` `missing-glyph` `disconnected-component` `floating-mark` `floating-stone` `extra-ring` `missing-ring` `chain-not-through-ring` `duplicate-pendant` `rotated-letters` `unsupported-geometry` `cgi-look` `wrong-look` `wrong-display` `wrong-metal` `wrong-stones`

## Verdict line

```json
{"file":"...","cell":"...","attempt":N,"verdict":"pass|tweak|fail","defects":["..."],"axis":"identity|geometry|stencil|lighting|camera|look-brief|view-brief|none","note":"<=240 chars, what you actually saw","confidence":"high|medium|low"}
```

`axis` is the single axis the next attempt should change.
Identity or attachment defects change geometry or the stencil, never adjectives.
Fake-photo defects change lighting or camera language.
A wrong look changes only the look brief. A wrong display changes only the view brief.
`none` for a pass.
