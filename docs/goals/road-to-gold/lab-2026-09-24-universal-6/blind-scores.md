# univ6 blind scoring - 16 classical pendants

Method: every file opened with the Read tool at full frame, then crop-zoomed (2x-3x) on every
dot cluster, every hamza position and every letter junction. Connectivity cross-checked with a
gold mask (r-b threshold) and connected-component labelling of the pendant band, then confirmed
by eye on the zoom.

Reference for hamza: the engine can render hamza - k07, k09 and k15 show a clear separate hamza
mark. Its absence in k01, k06, k10, k11, k14 is therefore a dropped glyph, not a style choice.

| image | expected | read | spelled | one_piece | presentable | tags |
|---|---|---|---|---|---|---|
| k01.png | أحمد | احمد (ا ح م د; alif has a broad flag head, no hamza) | N | Y | Y | missing-glyph (hamza on alif) |
| k02.png | شيخة | شيخة but the sheen carries 4 dots (1 above + 3 in a row) | N | Y | Y | extra-glyph (4th dot on ش) |
| k03.png | قاسم | قاسم (ق 2 above, ا, س 3 teeth, م with eye) | Y | N | N | disconnected-component (full-height gap between ا and س; piece is two parts held only by the chain) |
| k04.png | كريم | كريم (ك, ر, ي 2 below, م with eye) | Y | Y | Y | - |
| k05.png | قاسم | قاسل - final letter is a plain hook with an ascender, no م eye | N | Y | Y | wrong-spelling (م rendered without its eye, reads ل) |
| k06.png | إبراهيم | ابراهيم (ب 1 below, ر, ا, ه, ي 2 below, م); no hamza under the first alif | N | Y | Y | missing-glyph (hamza under alif) |
| k07.png | عائشة | عائشة (ع, ا, ئ with hamza, ش 3 dots triangular, ة 2 above) | Y | Y | Y | - |
| k08.png | تسنيم | تسنيم (ت 2 above, س 3 teeth, ن 1 above, ي 2 below, م with eye) | Y | Y | Y | - |
| k09.png | مؤمن | مؤمن (م, ؤ with hamza fused to the waw, م, ن 1 above) | Y | Y | Y | - |
| k10.png | مؤمن | مومن - no hamza anywhere on the waw | N | Y | Y | missing-glyph (hamza on waw); ؤ-م junction is a near-tangential touch, marginal |
| k11.png | إبراهيم | ابراهيم; no hamza under the first alif | N | N | N | missing-glyph (hamza); disconnected-component (three separate parts: [ا], [بر], [اهيم] - the بر part carries no ring and is unsupported) |
| k12.png | شيخة | شيخة (ش 3 dots triangular, ي 2 below, خ 1 above, ة 2 above) | Y | Y | Y | - |
| k13.png | تسنيم | تسنيم (ت 2 above, س 3 teeth, ن 1 above, ي 2 below, م with eye) | Y | Y | Y | - |
| k14.png | أحمد | احمد - plain alif, no hamza | N | Y | Y | missing-glyph (hamza on alif) |
| k15.png | عائشة | عائشة (ع, ا, ئ with hamza, ش 3 dots, ة 2 above) | Y | Y | Y | - |
| k16.png | كريم | كريم (ك, ر, ي 2 below, م with eye) | Y | Y | Y | - |

## Totals

- spelled Y: 9 of 16 (k03, k04, k07, k08, k09, k12, k13, k15, k16)
- spelled N: 7 of 16 (k01, k02, k05, k06, k10, k11, k14)
- one_piece Y: 14 of 16
- one_piece N: 2 of 16 (k03, k11)
- presentable Y: 14 of 16; N: 2 (k03, k11)
- both spelled and one_piece: 8 of 16 (k04, k07, k08, k09, k12, k13, k15, k16)
- no stones appeared in any of the 16; metal is polished yellow gold in all 16; both rings present in all 16

## Defect histogram

- missing-glyph (hamza dropped): 5 (k01, k06, k10, k11, k14)
- disconnected-component: 2 (k03, k11)
- extra-glyph (extra dot): 1 (k02)
- wrong-spelling (م lost its eye): 1 (k05)

## Per-name pairs

- أحمد: 0 of 2 correct - hamza dropped both times
- إبراهيم: 0 of 2 - hamza dropped both times, k11 also breaks into three parts
- قاسم: 0 of 2 clean - k03 spells right but is two parts, k05 is one part but loses the م eye
- مؤمن: 1 of 2 - k09 correct, k10 drops the hamza
- شيخة: 1 of 2 - k12 correct, k02 puts 4 dots on the ش
- عائشة: 2 of 2
- تسنيم: 2 of 2
- كريم: 2 of 2
