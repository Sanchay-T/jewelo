# Image lab ledger - 2026-09-24 - universal free route, mark inventory (UNIV-7)

Model `gpt-image-2.5-sunburst`, ratio 1:1, via Runway MCP, compiler `caleums-still-compiler-v4`.
Question: UNIV-6's dot inventory fixed the dot counts but silently dropped every hamza.
Its sentences "This name has no dots at all" and "No other letter has any dot" read as "no marks", so أحمد, إبراهيم and مؤمن lost their hamza.
UNIV-7 replaces that sentence with a mark inventory that names hamza and madda alongside the dots, and changes nothing else.

## The one axis

Directly after `spelled letter for letter.` each prompt now carries:

`Its marks, exactly and only: <items>. No other letter has any dot or mark, and none is added anywhere else.`

Items are listed in reading order, right to left, joined with ", ".
Dots read as `two dots above ق`, `one dot below ب` and so on; ش reads as `three dots above ش in a small triangle`.
Hamza and madda read as `a small hamza above the alif (أ)`, `a small hamza below the alif (إ)`, `a small hamza above the waw (ؤ)`, `a small hamza above the tooth of ئ, which has no dots`, and `a madda, a short flat wave, above the alif (آ)`.
No name in this round has zero marks, so the empty-inventory sentence was never emitted.

## Base

Classical cells start from the eight UNIV-6 prompts in `../lab-2026-09-24-universal-6/prompts/classical-<slug>-ar-A2.txt`; the build strips the UNIV-6 dot sentence and inserts the mark sentence in its place.
Rails cells start from the UNIV-5 prompts in `../lab-2026-09-24-universal-5/prompts/diamond-rails-<slug>-ar.txt`, which carried no inventory sentence at all, and only gain the new sentence.
Both source families are the byte string the production compiler emits on the free route, so nothing but the inventory sentence differs from what UNIV-5 and UNIV-6 scored.

Build command:

```
python3 <scratchpad>/univ7-build.py
```

The script holds the mark table, and asserts per prompt that `spelled letter for letter.` occurs exactly once before and after the insert, that no UNIV-6 inventory sentence survives, that `Its marks, exactly and only:` occurs exactly once, and that removing the inserted sentence reproduces the stripped base byte for byte.
All twelve passed; the script exits non-zero on the first `FAIL`.

Specification shape, unchanged from UNIV-5 and UNIV-6: lettering `classic`, arabicStyle `contemporary`, stoneCoverage `none`, gemstone `none`, metalColor `yellow`, metalKarat `18K`, finish `polished`, layout `single-name`, connector `none`, sizeProfile `classic`, dimensions 32 x 12 x 1.2 mm, chain cable 45 cm.

References: exactly what production sends on the free route for the construction - the `classical` look crop only for classical cells, the `diamond-rails` look crop only for rails cells. No stencil, no style anchor, no master.
The uploaded bytes are `caleums-private/look-references-v1/classical.png` (sha256 begins `e234cea88cc74ae8`) and `caleums-private/look-references-v1/diamond-rails.png` (sha256 begins `d573cd4b346ba893`, the same file UNIV-5 used); both are private brand reference and are not in git.

Echo check: for all twelve submissions the `promptText` Runway echoed back is byte-identical to the file in `prompts/`, including the trailing newline.

Credits: 199153 before the run, 198745 after the last submission, 408 credits for 24 stills (12 cells, two takes each, 17 credits per still).
Full-size PNGs stay local in `img/` (gitignored by `docs/goals/road-to-gold/lab-*/img/`). No signed URL is recorded here.

Verdicts are `pending-blind-viewer`; the generating agent never scores.

## The inserted sentence, per cell

| name | construction | inserted sentence |
| --- | --- | --- |
| أحمد (ahmad) | classical | Its marks, exactly and only: a small hamza above the alif (أ). No other letter has any dot or mark, and none is added anywhere else. |
| إبراهيم (ibrahim) | classical | Its marks, exactly and only: a small hamza below the alif (إ), one dot below ب, two dots below ي. No other letter has any dot or mark, and none is added anywhere else. |
| مؤمن (mumin) | classical | Its marks, exactly and only: a small hamza above the waw (ؤ), one dot above ن. No other letter has any dot or mark, and none is added anywhere else. |
| قاسم (qasim) | classical | Its marks, exactly and only: two dots above ق. No other letter has any dot or mark, and none is added anywhere else. |
| كريم (karim) | classical | Its marks, exactly and only: two dots below ي. No other letter has any dot or mark, and none is added anywhere else. |
| تسنيم (tasneem) | classical | Its marks, exactly and only: two dots above ت, one dot above ن, two dots below ي. No other letter has any dot or mark, and none is added anywhere else. |
| شيخة (shaikha) | classical | Its marks, exactly and only: three dots above ش in a small triangle, two dots below ي, one dot above خ, two dots above ة. No other letter has any dot or mark, and none is added anywhere else. |
| عائشة (aisha) | classical | Its marks, exactly and only: a small hamza above the tooth of ئ, which has no dots, three dots above ش in a small triangle, two dots above ة. No other letter has any dot or mark, and none is added anywhere else. |
| تسنيم (tasneem) | diamond-rails | Its marks, exactly and only: two dots above ت, one dot above ن, two dots below ي. No other letter has any dot or mark, and none is added anywhere else. |
| كريم (karim) | diamond-rails | Its marks, exactly and only: two dots below ي. No other letter has any dot or mark, and none is added anywhere else. |
| مؤمن (mumin) | diamond-rails | Its marks, exactly and only: a small hamza above the waw (ؤ), one dot above ن. No other letter has any dot or mark, and none is added anywhere else. |
| آمنة (amna) | diamond-rails | Its marks, exactly and only: a madda, a short flat wave, above the alif (آ), one dot above ن, two dots above ة. No other letter has any dot or mark, and none is added anywhere else. |

## Cells

| cell | name | take | Runway task id | prompt sha256 (first 16) | credits before / after |
| --- | --- | --- | --- | --- | --- |
| classical-ahmad-ar-A3 | أحمد | a | `9438213f-77a6-49ab-b3b2-951c0afaf1de` | `033b6070d890e7e0` | 199153 / 199119 |
| classical-ahmad-ar-A3 | أحمد | b | `e6ce22a2-9f7b-473a-92af-37835e133cad` | `033b6070d890e7e0` | 199153 / 199119 |
| classical-ibrahim-ar-A3 | إبراهيم | a | `3b4e85d7-9b6e-4abb-bc31-935f9c5aa95d` | `48b7cb77870d6c28` | 199119 / 199085 |
| classical-ibrahim-ar-A3 | إبراهيم | b | `8dab9e93-0838-4edf-94b3-6356323b3e53` | `48b7cb77870d6c28` | 199119 / 199085 |
| classical-mumin-ar-A3 | مؤمن | a | `32c72225-a4e8-4f2d-b230-2e4a8f635886` | `fc17d3d2e9e444bd` | 199085 / 199051 |
| classical-mumin-ar-A3 | مؤمن | b | `de43f54c-eb70-43ec-b530-4ab77aae217b` | `fc17d3d2e9e444bd` | 199085 / 199051 |
| classical-qasim-ar-A3 | قاسم | a | `6cc100aa-6306-4edd-88f6-8d10569bcce3` | `fbf8453cb01339ca` | 199051 / 199017 |
| classical-qasim-ar-A3 | قاسم | b | `528cd494-71a7-4477-8759-23f84c00db42` | `fbf8453cb01339ca` | 199051 / 199017 |
| classical-karim-ar-A3 | كريم | a | `10fc94ec-be57-467d-b1c0-9fe724f104ce` | `cd0f894d4a3e36b5` | 199017 / 198983 |
| classical-karim-ar-A3 | كريم | b | `82c704e0-976e-401d-bec9-b8931312ff9d` | `cd0f894d4a3e36b5` | 199017 / 198983 |
| classical-tasneem-ar-A3 | تسنيم | a | `ec64ea74-b390-447b-8729-519e31d04db8` | `76a8e98a5119c50e` | 198983 / 198949 |
| classical-tasneem-ar-A3 | تسنيم | b | `148ce75f-17df-477d-b5dd-87f188aabde2` | `76a8e98a5119c50e` | 198983 / 198949 |
| classical-shaikha-ar-A3 | شيخة | a | `59abcd16-9471-481a-b636-36346068089f` | `f44348b0472f122c` | 198949 / 198915 |
| classical-shaikha-ar-A3 | شيخة | b | `8ddda050-6696-4d30-bc11-7c9d4308bfb7` | `f44348b0472f122c` | 198949 / 198915 |
| classical-aisha-ar-A3 | عائشة | a | `16992098-5e5b-4502-be29-47047d3d454c` | `2e1f5baab5a5038e` | 198915 / 198881 |
| classical-aisha-ar-A3 | عائشة | b | `34bce33f-d162-40d7-a169-ec9652d7f2e7` | `2e1f5baab5a5038e` | 198915 / 198881 |
| diamond-rails-tasneem-ar-A3 | تسنيم | a | `c0fe888d-ffee-4c4b-aa96-4aeb712b92be` | `2444c8141db4c7e8` | 198881 / 198847 |
| diamond-rails-tasneem-ar-A3 | تسنيم | b | `9b091b07-bc59-4ded-989e-b84d3a6910bd` | `2444c8141db4c7e8` | 198881 / 198847 |
| diamond-rails-karim-ar-A3 | كريم | a | `0e3b4dec-7098-4933-b5a5-3a0f6c1e0c00` | `bc1c5d49b0f17163` | 198847 / 198813 |
| diamond-rails-karim-ar-A3 | كريم | b | `9dfe97ef-7a51-4030-9546-5d73b6e87cd5` | `bc1c5d49b0f17163` | 198847 / 198813 |
| diamond-rails-mumin-ar-A3 | مؤمن | a | `91da1080-517c-4a88-8929-5138ae7c7230` | `a522b02c06aa77cf` | 198813 / 198779 |
| diamond-rails-mumin-ar-A3 | مؤمن | b | `ca4dd31b-3e9e-4ae6-bdef-28f15e2ff27f` | `a522b02c06aa77cf` | 198813 / 198779 |
| diamond-rails-amna-ar-A3 | آمنة | a | `873b54a4-284e-41b8-a3ea-5f4cf0722f91` | `61fdc9ce61f0c53c` | 198779 / 198745 |
| diamond-rails-amna-ar-A3 | آمنة | b | `7d4bed37-60ae-4ccc-b3c7-6511f297c344` | `61fdc9ce61f0c53c` | 198779 / 198745 |

## What the viewer scores

Blind, one image at a time, same rubric as UNIV-6, with hamza and madda now the axis under test:

1. Hamza and madda - on أ إ ؤ ئ آ, is the mark present, on the right carrier, on the right side (above or below), and fused to the letter? This is the axis under test.
2. Dot count - does the piece carry exactly the dots the inventory names, no more and no fewer, on the right letters and on the right side?
3. Spelling - does the pendant read as the intended Arabic name, letter for letter, right to left?
4. One piece - is every letter, dot and mark fused to the body, with no floating dot and no point-only touch?
5. Ring posts - does any ring post or tab curl into a stroke that could be read as an extra letter?

Compare the classical cells against the same names in `../lab-2026-09-24-universal-6/` to judge whether naming the marks restored the hamza that the dot-only inventory dropped, and whether it disturbed the dot counts UNIV-6 fixed.
Compare the rails cells against the same names in `../lab-2026-09-24-universal-5/`, which had no inventory sentence at all.
