# UNIV-3 part 2 - blind scoring of 24 classical pendants

Method: every file opened and looked at; pendant-band crops at 1.0-3.0x for letter-by-letter reading;
gold mask segmentation at 0 px and 4 px erosion to locate thin necks and detached parts, every call
then confirmed by eye on a close crop.

| image | expected | spelling | one piece | dots attached | presentable | reason |
|---|---|---|---|---|---|---|
| c01 | كريم | pass | pass | yes | yes | ك ر ي م correct, ya two dots below on two clean bars; kaf-ra solid, left half joins the right through the ya dot ball with real metal width - sound but the slimmest link on the piece |
| c02 | غادة | pass | pass | yes | yes | غ ا د ة correct, ghayn dot on a bar, ta marbuta pair joined by a waist bar and set on a clear vertical stalk; single component, alif bridged to dal |
| c03 | غادة | pass | pass | yes | yes | same letters correct; ta marbuta cluster sits on a narrower neck than c02 but the bar is visible and solid |
| c04 | تسنيم | FAIL | pass | yes | no | ya carries ONE dot below, not two - reads تسنبم. Body is one piece and all bars are clean, but the name is wrong |
| c05 | ضحى | pass | pass | yes | yes | ض ح ى correct, single dot above the dad on a stalk, no dots under the maqsura; one component |
| c06 | إبراهيم | pass | pass | yes | yes | hamza below the alif, ba one dot below, ya two dots below, all on bars; whole word one component including the ra-alif bridge |
| c07 | ضحى | pass | pass | yes | yes | as c05; the joint between dad and ha is a little spiky but is not readable as a letter |
| c08 | إبراهيم | pass | FAIL | yes | no | letters and marks are correct, but the pendant is TWO separate pieces: إبر and اهيم do not touch (clean background between ra and alif, confirmed by segmentation at 0 px erosion) |
| c09 | آمنة | pass | pass | yes | yes | madda integral to the alif head, noon dot on a stalk, ta marbuta pair on a bar; one component |
| c10 | ذكرى | pass | pass | yes | yes | ذ ك ر ى correct, one dot above the dhal, no stray marks; word one component |
| c11 | جميلة | pass | pass | yes | yes | jim one dot below, ya two dots below, ta marbuta two above, all on visible bars; one component |
| c12 | مؤمن | FAIL | FAIL | no | no | the noon's dot is a detached diamond floating in the air (no bar at all) and there is an extra dot hung BELOW the final noon; the piece is also therefore not one body |
| c13 | ظافر | pass | pass | yes | yes | ظ ا ف ر correct, dha dot on a horizontal bar, fa dot on a stalk; one component |
| c14 | قاسم | FAIL | pass | yes | no | qaf carries ONE dot above, not two - reads فاسم. Construction itself is clean |
| c15 | ذكرى | pass | pass | yes | yes | as c10, dhal dot on a stalk, kaf-ra joint solid |
| c16 | ظافر | pass | pass | yes | yes | as c13; both dots well attached, one component |
| c17 | جميلة | pass | pass | yes | yes | best built of the set: every dot bar survives 4 px erosion, letters and marks all one body |
| c18 | أحمد | pass | pass | n/a | yes | hamza above the alif, no dots anywhere else as required; one component |
| c19 | أحمد | FAIL | pass | yes | no | an EXTRA dot hangs below the meem on a bar; أحمد has no dots. Otherwise one clean piece |
| c20 | قاسم | FAIL | pass | yes | no | qaf carries ONE dot above, not two - same defect as c14 |
| c21 | تسنيم | pass | pass | yes | yes | ta two above, three sin teeth, noon one above, ya two below, all on bars; one component |
| c22 | مؤمن | pass | pass | yes | yes | م ؤ م ن correct, hamza rendered as a ball on top of the waw, noon dot on a short stalk; one component |
| c23 | كريم | FAIL | pass | yes | no | an EXTRA dot hangs below the meem on a bar, in addition to the correct two under the ya |
| c24 | آمنة | pass | pass | yes | yes | madda, noon dot and ta marbuta pair all correct and joined; the left ring tab lands on the dot cluster rather than on the letter - slightly clumsy but solid metal |

## Totals

- spelling: 18 pass, 6 fail (c04, c12, c14, c19, c20, c23)
- one piece: 22 pass, 2 fail (c08, c12)
- dots attached: 23 yes, 1 no (c12); c18 has no dots to attach
- presentable: 17 yes, 7 no (c04, c08, c12, c14, c19, c20, c23)
- clean on all four columns: 17 of 24

## Per name (2 attempts each)

- غادة 2/2, ضحى 2/2, آمنة 2/2, ذكرى 2/2, جميلة 2/2, ظافر 2/2
- كريم 1/2, تسنيم 1/2, إبراهيم 1/2, مؤمن 1/2, أحمد 1/2
- قاسم 0/2 - both attempts give the qaf one dot instead of two

## Defect pattern

1. Dot count on a single letter is the dominant failure: qaf drawn with one dot (twice), ya drawn with one dot (once).
2. Spurious dot below a meem, on a proper bar, in two otherwise perfect pieces (c19, c23) - the model adds a mark that no letter asks for.
3. Structure fails only twice: one word split in two at the ra-alif break (c08) and one floating mark (c12).
