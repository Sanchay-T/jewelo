# NAME-2 - two candidate blind spelling gates for the free Arabic route

Measured 2026-09-24. Scratchpad scripts, no product code changed.
Model: the same `OPENAI_VERIFIER_MODEL` production uses, same `/v1/responses` call shape as `OpenAINameReader`, `detail: "high"`, `max_output_tokens` 8192, structured output.
Neither reader is ever told the name.

## What was measured

34 stills, all Arabic, all taken from the blind viewer scores which are the ground truth here:
13 the viewer marked misspelled and 21 it marked spelled correctly, dotted names first.
Sources: `blind-scores.md` (UNIV-2), `blind-scores-classical.md` and `blind-scores-rails.md` (UNIV-3), resolved through the blinded-id maps.

Each still is cropped to the pendant letter band before the call: the gold mask's wide-row band is taken (which drops the chain and the rings), padded 8 percent, and upscaled so the long side is 1536 px.
Crop script: `gate2-crop.py`; reader script: `gate2-read.mts`; raw output: `gate2-merged.json`.

- **V1** - blind per-letter skeleton plus dot count. The model lists every letter body right to left as a dotless rasm family (`alif, tooth, haa, daal, raa, seen, saad, taa, ayn, faa, kaaf, laam, meem, hah, waaw, hamza`) with dots above, dots below and any hamza or madda. Code decomposes the expected name the same way and compares.
  Letters that share a skeleton are one family (`ب ت ث ن ي ى ئ` are all `tooth`, `ف ق` are both `faa`), so the dots carry the whole decision - which is also where every measured defect lives.
- **V2** - the same crop, no name given, three numbers only: total dots above, total dots below, number of separate letter groups. Code compares with the counts derived from the expected name.

## Confusion tables

The bar the lead set: every misspelling refused, at most 1 in 10 correct names refused.

### V1 (31 of 34 stills measured, 3 stopped by the USD cap)

| scoring | misspellings refused | correct names refused | no-text or error reads |
|---|---|---|---|
| strict: family + dots + mark | 12 / 13 | 17 / 18 | 0 |
| dots and marks only, sequence as returned | 12 / 13 | 11 / 18 | 0 |
| dots and marks only, either reading direction | 12 / 13 | 10 / 18 | 0 |

The one misspelling V1 passes under every scoring is **w04** (`نور` with a spare crescent hanging off the left ring): the model lists three letter bodies with the right dots and simply does not report the extra shape as a letter body, even though the prompt asks for shapes that are not real letters.
The one correct name V1 passes strictly is **c16** (`ظافر`).

Two systematic V1 problems, both visible in the rows below:

1. The rasm family is guessed badly. `ك ر ي م` comes back as `saad tooth meem laam`, `غادة` as `faa laam raa faa`, `قاسم` as `meem alif laam seen`. Strict family matching is therefore useless; only the dot columns carry signal.
2. The model frequently lists the letters left to right despite the instruction, so the dot sequence has to be scored in both directions to avoid a pure ordering artefact. That is the "either reading direction" row.

### V2 (30 of 34 stills measured, 4 stopped by the USD cap)

| scoring | misspellings refused | correct names refused | no-text or error reads |
|---|---|---|---|
| dots above + dots below + letter groups (as asked) | 13 / 13 | 10 / 17 | 0 |
| dots above + dots below only (groups column dropped) | 13 / 13 | 4 / 17 | 0 |

V2 is the only variant that refuses **every** misspelling, including w04 and w05 where V1 or the strict scoring let one through.
Its false-refusal rate is driven mostly by the `groups` column: the model cannot reliably count joined-letter runs on a pendant (it reads `ذكرى` as one group, `أحمد` as one group, `غادة` as one group), and dropping that column takes correct-name refusals from 10/17 to 4/17.

The four correct names V2 still refuses on dots alone: **c06** and **c08** (`إبراهيم`, counts 4 dots below where the name has 3), **c07** (`ضحى`, invents one dot below), **c22** (`مؤمن`, counts the hamza on the waw as a second dot above).

### Verdict against the bar

| variant | every misspelling refused | correct names refused | passes the bar |
|---|---|---|---|
| V1 strict | no (w04) | 94 percent | no |
| V1 dots only, either direction | no (w04) | 56 percent (10 of 18) | no |
| V2 as asked | yes | 59 percent | no |
| V2 dots only | yes | 24 percent | no - 2.4x the allowed rate |

Neither variant can gate the free route as measured.
The closest is V2 with the groups column dropped: it caught 13 of 13 misspellings and would turn away roughly one correct name in four.

## Refusals and errors

There were no refusals from the model and no empty responses in either variant: 61 of 61 attempted calls returned parseable structured output.
That is a change from the earlier blind transcription reader, which often returned no text at all; cropping to the letter band and asking for counts instead of a transcription removed that failure entirely.
The only rows with no result are the 7 cells stopped by the USD cap, listed as `cap-stopped` below.

## Cost

USD 1.9824 of OpenAI across 61 calls (34 stills, two variants, minus the 7 cap-stopped cells), metered from `usage.input_tokens` and `usage.output_tokens` at 1.25 and 10.00 USD per million.
Hard cap was USD 2.00; the run was stopped by the script's own budget check at USD 1.78 of new spend, which is why `r03`, `r09`, `r18` (V1 and V2) and `c24` (V2) were not called. All 13 misspellings were measured on both variants.

## Exact prompts

### V1

```
This photograph shows a gold pendant cut from a single sheet, carrying one word of Arabic script. Do not guess what the word is and do not name it. Describe only the shapes you can actually see.

Working right to left, list every letter body in the word. For each letter body report:
- "base": the dotless skeleton it is drawn on, exactly one of: alif, tooth, haa, daal, raa, seen, saad, taa, ayn, faa, kaaf, laam, meem, hah, waaw, hamza
- "above": how many separate round or diamond dots sit ABOVE that letter body (0, 1, 2 or 3)
- "below": how many separate round or diamond dots sit BELOW that letter body (0, 1, 2 or 3)
- "mark": one of none, hamza-above, hamza-below, madda

Rules:
- Count a dot even when it is welded to the letter by a small post or bar; the post is not a dot.
- A three-dot cluster counts as 3, a two-dot pair as 2.
- Do not report a dot you cannot see, and do not omit one you can see, even if the result is not a word you recognise.
- The small rings and the chain at the top are not letters. Plain bars or rails above and below the word are not letters.
- A shape with no dots that is not a real letter still gets listed, on the base it most resembles.

Reply with JSON {"letters": [...], "notes": "<one short line>"} only.
```

### V2

```
This photograph shows a gold pendant cut from a single sheet, carrying one word of Arabic script. Do not guess what the word is and do not name it. Count only.

Report three numbers:
- "above": the TOTAL number of separate dots sitting above the letters of the word
- "below": the TOTAL number of separate dots sitting below the letters of the word
- "groups": the number of separate letter groups, that is runs of joined letters, reading the word right to left (a word breaks into a new group after a letter that does not join to its left)

Rules:
- Count a dot even when it is welded to the letter by a small post or bar; the post is not a dot.
- A three-dot cluster counts as 3, a two-dot pair as 2.
- A hamza or a madda is not a dot; do not count it.
- The rings and the chain at the top are not letters. Plain bars or rails above and below the word are not letters and do not break a group.

Reply with JSON {"above": <n>, "below": <n>, "groups": <n>, "notes": "<one short line>"} only.
```

## Per-image rows

`label` is the blind viewer's spelling verdict and is the ground truth.

### V1 per-image rows

| id | label | expected | source still | viewer ground truth | model letter list (as returned) | expected decomposition | strict | dots only | dots either direction |
|---|---|---|---|---|---|---|---|---|---|
| c01 | correct | كريم | `lab-2026-09-24-universal-3/img/classical-karim-ar-a.png` | spelling pass | `saad/0^0v tooth/0^2v meem/0^0v laam/0^0v` | `kaaf/0^0v raa/0^0v tooth/0^2v meem/0^0v` | refuse | refuse | pass |
| c02 | correct | غادة | `lab-2026-09-24-universal-3/img/classical-ghada-ar-a.png` | spelling pass | `faa/1^0v laam/0^0v raa/0^0v faa/2^0v` | `ayn/1^0v alif/0^0v daal/0^0v hah/2^0v` | refuse | pass | pass |
| c03 | correct | غادة | `lab-2026-09-24-universal-3/img/classical-ghada-ar-b.png` | spelling pass | `faa/1^0v alif/0^0v saad/0^0v faa/2^0v` | `ayn/1^0v alif/0^0v daal/0^0v hah/2^0v` | refuse | pass | pass |
| c04 | misspelled | تسنيم | `lab-2026-09-24-universal-3/img/classical-tasneem-ar-a.png` | ya one dot below | `faa/2^0v seen/0^0v faa/1^0v tooth/0^1v ayn/0^0v` | `tooth/2^0v seen/0^0v tooth/1^0v tooth/0^2v meem/0^0v` | refuse | refuse | refuse |
| c05 | correct | ضحى | `lab-2026-09-24-universal-3/img/classical-duha-ar-b.png` | spelling pass | `faa/1^0v laam/0^0v alif/0^0v hah/0^0v` | `saad/1^0v haa/0^0v tooth/0^0v` | refuse | refuse | refuse |
| c06 | correct | إبراهيم | `lab-2026-09-24-universal-3/img/classical-ibrahim-ar-a.png` | spelling pass | `hah/0^1v alif/0^0v haa/0^0v tooth/0^2v` | `alif/0^0v+hamza-below tooth/0^1v raa/0^0v alif/0^0v hah/0^0v tooth/0^2v meem/0^0v` | refuse | refuse | refuse |
| c07 | correct | ضحى | `lab-2026-09-24-universal-3/img/classical-duha-ar-a.png` | spelling pass | `faa/1^0v alif/0^0v ayn/0^0v seen/0^0v raa/0^0v` | `saad/1^0v haa/0^0v tooth/0^0v` | refuse | refuse | refuse |
| c08 | correct | إبراهيم | `lab-2026-09-24-universal-3/img/classical-ibrahim-ar-b.png` | spelling pass (two bodies, not a spelling fault) | `alif/0^1v tooth/0^1v alif/0^0v meem/0^0v tooth/0^2v haa/0^0v` | `alif/0^0v+hamza-below tooth/0^1v raa/0^0v alif/0^0v hah/0^0v tooth/0^2v meem/0^0v` | refuse | refuse | refuse |
| c09 | correct | آمنة | `lab-2026-09-24-universal-3/img/classical-amna-ar-a.png` | spelling pass | `kaaf/0^0v meem/0^0v tooth/1^0v tooth/0^0v faa/2^0v` | `alif/0^0v+madda meem/0^0v tooth/1^0v hah/2^0v` | refuse | refuse | refuse |
| c10 | correct | ذكرى | `lab-2026-09-24-universal-3/img/classical-dhikra-ar-b.png` | spelling pass | `faa/1^0v laam/0^0v tooth/0^0v haa/0^0v` | `daal/1^0v kaaf/0^0v raa/0^0v tooth/0^0v` | refuse | pass | pass |
| c11 | correct | جميلة | `lab-2026-09-24-universal-3/img/classical-jamila-ar-b.png` | spelling pass | `tooth/0^1v ayn/0^0v tooth/0^2v laam/0^0v tooth/2^0v hah/0^0v` | `haa/0^1v meem/0^0v tooth/0^2v laam/0^0v hah/2^0v` | refuse | refuse | refuse |
| c12 | misspelled | مؤمن | `lab-2026-09-24-universal-3/img/classical-mumin-ar-b.png` | extra dot below the final noon | `meem/0^0v hah/1^0v meem/0^0v daal/1^1v` | `meem/0^0v waaw/0^0v+hamza-above meem/0^0v tooth/1^0v` | refuse | refuse | refuse |
| c13 | correct | ظافر | `lab-2026-09-24-universal-3/img/classical-zafir-ar-b.png` | spelling pass | `hah/0^0v alif/1^0v faa/1^0v seen/0^0v` | `taa/1^0v alif/0^0v faa/1^0v raa/0^0v` | refuse | refuse | refuse |
| c14 | misspelled | قاسم | `lab-2026-09-24-universal-3/img/classical-qasim-ar-a.png` | qaf one dot above | `meem/0^0v alif/0^0v laam/0^0v seen/0^0v` | `faa/2^0v alif/0^0v seen/0^0v meem/0^0v` | refuse | refuse | refuse |
| c15 | correct | ذكرى | `lab-2026-09-24-universal-3/img/classical-dhikra-ar-a.png` | spelling pass | `faa/1^0v laam/0^0v alif/0^0v hah/0^0v` | `daal/1^0v kaaf/0^0v raa/0^0v tooth/0^0v` | refuse | pass | pass |
| c16 | correct | ظافر | `lab-2026-09-24-universal-3/img/classical-zafir-ar-a.png` | spelling pass | `taa/1^0v alif/0^0v faa/1^0v raa/0^0v` | `taa/1^0v alif/0^0v faa/1^0v raa/0^0v` | pass | pass | pass |
| c17 | correct | جميلة | `lab-2026-09-24-universal-3/img/classical-jamila-ar-a.png` | spelling pass | `tooth/0^1v meem/0^0v tooth/0^2v alif/0^0v faa/2^0v` | `haa/0^1v meem/0^0v tooth/0^2v laam/0^0v hah/2^0v` | refuse | pass | pass |
| c18 | correct | أحمد | `lab-2026-09-24-universal-3/img/classical-ahmad-ar-a.png` | spelling pass | `alif/0^0v laam/0^0v laam/0^0v haa/0^0v` | `alif/0^0v+hamza-above haa/0^0v meem/0^0v daal/0^0v` | refuse | refuse | refuse |
| c19 | misspelled | أحمد | `lab-2026-09-24-universal-3/img/classical-ahmad-ar-b.png` | extra dot below the meem | `alif/0^0v laam/0^0v hah/0^0v tooth/0^1v` | `alif/0^0v+hamza-above haa/0^0v meem/0^0v daal/0^0v` | refuse | refuse | refuse |
| c20 | misspelled | قاسم | `lab-2026-09-24-universal-3/img/classical-qasim-ar-b.png` | qaf one dot above | `meem/0^0v hah/0^0v meem/0^0v daal/0^0v` | `faa/2^0v alif/0^0v seen/0^0v meem/0^0v` | refuse | refuse | refuse |
| c21 | correct | تسنيم | `lab-2026-09-24-universal-3/img/classical-tasneem-ar-b.png` | spelling pass | `haa/2^0v seen/0^0v faa/1^0v tooth/0^2v haa/0^0v` | `tooth/2^0v seen/0^0v tooth/1^0v tooth/0^2v meem/0^0v` | refuse | pass | pass |
| c22 | correct | مؤمن | `lab-2026-09-24-universal-3/img/classical-mumin-ar-a.png` | spelling pass | `meem/0^0v faa/1^0v meem/0^0v tooth/0^0v faa/1^0v` | `meem/0^0v waaw/0^0v+hamza-above meem/0^0v tooth/1^0v` | refuse | refuse | refuse |
| c23 | misspelled | كريم | `lab-2026-09-24-universal-3/img/classical-karim-ar-b.png` | extra dot below the meem | `seen/0^0v tooth/0^2v hah/0^1v` | `kaaf/0^0v raa/0^0v tooth/0^2v meem/0^0v` | refuse | refuse | refuse |
| c24 | correct | آمنة | `lab-2026-09-24-universal-3/img/classical-amna-ar-b.png` | spelling pass | `alif/0^0v+hamza-above meem/0^0v tooth/1^0v ayn/0^0v` | `alif/0^0v+madda meem/0^0v tooth/1^0v hah/2^0v` | refuse | refuse | refuse |
| r02 | misspelled | ذكرى | `lab-2026-09-24-universal-3/img/diamond-rails-dhikra-ar-a.png` | extra letter-like crescent | `tooth/1^0v waaw/0^0v raa/0^0v` | `daal/1^0v kaaf/0^0v raa/0^0v tooth/0^0v` | refuse | refuse | refuse |
| r03 | correct | إبراهيم | `lab-2026-09-24-universal-3/img/diamond-rails-ibrahim-ar-b.png` | spelling pass | (not called - USD cap) | | cap-stopped | cap-stopped | cap-stopped |
| r09 | correct | قاسم | `lab-2026-09-24-universal-3/img/diamond-rails-qasim-ar-b.png` | spelling pass | (not called - USD cap) | | cap-stopped | cap-stopped | cap-stopped |
| r15 | misspelled | ذكرى | `lab-2026-09-24-universal-3/img/diamond-rails-dhikra-ar-b.png` | extra crescent plus two dots under the final letter | `tooth/2^0v laam/0^0v raa/0^0v tooth/0^2v` | `daal/1^0v kaaf/0^0v raa/0^0v tooth/0^0v` | refuse | refuse | refuse |
| r18 | correct | تسنيم | `lab-2026-09-24-universal-3/img/diamond-rails-tasneem-ar-a.png` | spelling pass | (not called - USD cap) | | cap-stopped | cap-stopped | cap-stopped |
| r19 | misspelled | جميلة | `lab-2026-09-24-universal-3/img/diamond-rails-jamila-ar-a.png` | jim has no dot, reads حميلة | `meem/0^0v hah/0^0v meem/0^0v daal/0^0v` | `haa/0^1v meem/0^0v tooth/0^2v laam/0^0v hah/2^0v` | refuse | refuse | refuse |
| r21 | misspelled | تسنيم | `lab-2026-09-24-universal-3/img/diamond-rails-tasneem-ar-b.png` | three dots above the ta, reads ث | `seen/3^0v alif/0^0v alif/0^0v alif/0^0v kaaf/1^0v tooth/0^2v ayn/0^0v` | `tooth/2^0v seen/0^0v tooth/1^0v tooth/0^2v meem/0^0v` | refuse | refuse | refuse |
| w01 | misspelled | شيخة | `lab-2026-09-24-universal-2/img/classical-shaikha-ar-A-b.png` | ya carries ONE dot below | `raa/0^0v seen/3^0v saad/0^0v tooth/0^1v faa/1^0v laam/0^0v haa/2^0v` | `seen/3^0v tooth/0^2v haa/1^0v hah/2^0v` | refuse | refuse | refuse |
| w04 | misspelled | نور | `lab-2026-09-24-universal-2/img/classical-noor-ar-B-b.png` | spare crescent glyph | `tooth/1^0v waaw/0^0v raa/0^0v` | `tooth/1^0v waaw/0^0v raa/0^0v` | pass | pass | pass |
| w05 | misspelled | نور | `lab-2026-09-24-universal-2/img/classical-noor-ar-B-a.png` | two dots above the noon | `alif/0^0v laam/0^0v hah/0^0v meem/0^0v daal/0^0v` | `tooth/1^0v waaw/0^0v raa/0^0v` | refuse | refuse | refuse |

### V2 per-image rows

| id | label | expected | source still | viewer ground truth | model counts | expected counts | as asked | dots only |
|---|---|---|---|---|---|---|---|---|
| c01 | correct | كريم | `lab-2026-09-24-universal-3/img/classical-karim-ar-a.png` | spelling pass | `above=0 below=2 groups=2` | `above=0 below=2 groups=2` | pass | pass |
| c02 | correct | غادة | `lab-2026-09-24-universal-3/img/classical-ghada-ar-a.png` | spelling pass | `above=3 below=0 groups=1` | `above=3 below=0 groups=3` | refuse | pass |
| c03 | correct | غادة | `lab-2026-09-24-universal-3/img/classical-ghada-ar-b.png` | spelling pass | `above=3 below=0 groups=3` | `above=3 below=0 groups=3` | pass | pass |
| c04 | misspelled | تسنيم | `lab-2026-09-24-universal-3/img/classical-tasneem-ar-a.png` | ya one dot below | `above=3 below=1 groups=2` | `above=3 below=2 groups=1` | refuse | refuse |
| c05 | correct | ضحى | `lab-2026-09-24-universal-3/img/classical-duha-ar-b.png` | spelling pass | `above=1 below=0 groups=2` | `above=1 below=0 groups=1` | refuse | pass |
| c06 | correct | إبراهيم | `lab-2026-09-24-universal-3/img/classical-ibrahim-ar-a.png` | spelling pass | `above=0 below=4 groups=2` | `above=0 below=3 groups=4` | refuse | refuse |
| c07 | correct | ضحى | `lab-2026-09-24-universal-3/img/classical-duha-ar-a.png` | spelling pass | `above=1 below=1 groups=1` | `above=1 below=0 groups=1` | refuse | refuse |
| c08 | correct | إبراهيم | `lab-2026-09-24-universal-3/img/classical-ibrahim-ar-b.png` | spelling pass (two bodies, not a spelling fault) | `above=0 below=4 groups=2` | `above=0 below=3 groups=4` | refuse | refuse |
| c09 | correct | آمنة | `lab-2026-09-24-universal-3/img/classical-amna-ar-a.png` | spelling pass | `above=3 below=0 groups=1` | `above=3 below=0 groups=2` | refuse | pass |
| c10 | correct | ذكرى | `lab-2026-09-24-universal-3/img/classical-dhikra-ar-b.png` | spelling pass | `above=1 below=0 groups=2` | `above=1 below=0 groups=3` | refuse | pass |
| c11 | correct | جميلة | `lab-2026-09-24-universal-3/img/classical-jamila-ar-b.png` | spelling pass | `above=2 below=3 groups=1` | `above=2 below=3 groups=1` | pass | pass |
| c12 | misspelled | مؤمن | `lab-2026-09-24-universal-3/img/classical-mumin-ar-b.png` | extra dot below the final noon | `above=2 below=1 groups=1` | `above=1 below=0 groups=2` | refuse | refuse |
| c13 | correct | ظافر | `lab-2026-09-24-universal-3/img/classical-zafir-ar-b.png` | spelling pass | `above=2 below=0 groups=2` | `above=2 below=0 groups=2` | pass | pass |
| c14 | misspelled | قاسم | `lab-2026-09-24-universal-3/img/classical-qasim-ar-a.png` | qaf one dot above | `above=0 below=0 groups=2` | `above=2 below=0 groups=2` | refuse | refuse |
| c15 | correct | ذكرى | `lab-2026-09-24-universal-3/img/classical-dhikra-ar-a.png` | spelling pass | `above=1 below=0 groups=1` | `above=1 below=0 groups=3` | refuse | pass |
| c16 | correct | ظافر | `lab-2026-09-24-universal-3/img/classical-zafir-ar-a.png` | spelling pass | `above=2 below=0 groups=2` | `above=2 below=0 groups=2` | pass | pass |
| c17 | correct | جميلة | `lab-2026-09-24-universal-3/img/classical-jamila-ar-a.png` | spelling pass | `above=2 below=3 groups=1` | `above=2 below=3 groups=1` | pass | pass |
| c18 | correct | أحمد | `lab-2026-09-24-universal-3/img/classical-ahmad-ar-a.png` | spelling pass | `above=0 below=0 groups=1` | `above=0 below=0 groups=2` | refuse | pass |
| c19 | misspelled | أحمد | `lab-2026-09-24-universal-3/img/classical-ahmad-ar-b.png` | extra dot below the meem | `above=0 below=1 groups=1` | `above=0 below=0 groups=2` | refuse | refuse |
| c20 | misspelled | قاسم | `lab-2026-09-24-universal-3/img/classical-qasim-ar-b.png` | qaf one dot above | `above=0 below=0 groups=1` | `above=2 below=0 groups=2` | refuse | refuse |
| c21 | correct | تسنيم | `lab-2026-09-24-universal-3/img/classical-tasneem-ar-b.png` | spelling pass | `above=3 below=2 groups=1` | `above=3 below=2 groups=1` | pass | pass |
| c22 | correct | مؤمن | `lab-2026-09-24-universal-3/img/classical-mumin-ar-a.png` | spelling pass | `above=2 below=0 groups=1` | `above=1 below=0 groups=2` | refuse | refuse |
| c23 | misspelled | كريم | `lab-2026-09-24-universal-3/img/classical-karim-ar-b.png` | extra dot below the meem | `above=0 below=3 groups=2` | `above=0 below=2 groups=2` | refuse | refuse |
| c24 | correct | آمنة | `lab-2026-09-24-universal-3/img/classical-amna-ar-b.png` | spelling pass | (not called - USD cap) | | cap-stopped | cap-stopped |
| r02 | misspelled | ذكرى | `lab-2026-09-24-universal-3/img/diamond-rails-dhikra-ar-a.png` | extra letter-like crescent | `above=2 below=0 groups=3` | `above=1 below=0 groups=3` | refuse | refuse |
| r03 | correct | إبراهيم | `lab-2026-09-24-universal-3/img/diamond-rails-ibrahim-ar-b.png` | spelling pass | (not called - USD cap) | | cap-stopped | cap-stopped |
| r09 | correct | قاسم | `lab-2026-09-24-universal-3/img/diamond-rails-qasim-ar-b.png` | spelling pass | (not called - USD cap) | | cap-stopped | cap-stopped |
| r15 | misspelled | ذكرى | `lab-2026-09-24-universal-3/img/diamond-rails-dhikra-ar-b.png` | extra crescent plus two dots under the final letter | `above=1 below=2 groups=3` | `above=1 below=0 groups=3` | refuse | refuse |
| r18 | correct | تسنيم | `lab-2026-09-24-universal-3/img/diamond-rails-tasneem-ar-a.png` | spelling pass | (not called - USD cap) | | cap-stopped | cap-stopped |
| r19 | misspelled | جميلة | `lab-2026-09-24-universal-3/img/diamond-rails-jamila-ar-a.png` | jim has no dot, reads حميلة | `above=2 below=2 groups=1` | `above=2 below=3 groups=1` | refuse | refuse |
| r21 | misspelled | تسنيم | `lab-2026-09-24-universal-3/img/diamond-rails-tasneem-ar-b.png` | three dots above the ta, reads ث | `above=4 below=2 groups=2` | `above=3 below=2 groups=1` | refuse | refuse |
| w01 | misspelled | شيخة | `lab-2026-09-24-universal-2/img/classical-shaikha-ar-A-b.png` | ya carries ONE dot below | `above=6 below=1 groups=1` | `above=6 below=2 groups=1` | refuse | refuse |
| w04 | misspelled | نور | `lab-2026-09-24-universal-2/img/classical-noor-ar-B-b.png` | spare crescent glyph | `above=0 below=0 groups=2` | `above=1 below=0 groups=2` | refuse | refuse |
| w05 | misspelled | نور | `lab-2026-09-24-universal-2/img/classical-noor-ar-B-a.png` | two dots above the noon | `above=0 below=0 groups=2` | `above=1 below=0 groups=2` | refuse | refuse |


---

# V3 held-out

Pre-registered by the lead on 2026-09-24 **before any of these stills was read**: the prompt below, the scoring rule below and the held-out set below were all fixed first, then the calls were made once.
Nothing was tuned after seeing the results.

## The scoring rule (fixed in advance)

From the same decomposition table as V1, for the expected name compute `expA` and `expB` (dots above and below, dots only), `expH` (hamza marks), `expM` (madda marks), and where the hamza marks sit, `hA` above and `hB` below.
A still **passes** only if all four hold:

- `hamza == expH`
- `madda == expM`
- `above` is `expA` or `expA + hA + expM`
- `below` is `expB` or `expB + hB`

Anything else refuses.
The two-valued dot totals exist so a model that counts a hamza or a madda as a dot is not punished for it.

## The held-out set

32 stills the gate had never seen, labelled by blind viewer scores (the spelling column is ground truth):
16 diamond-rails from `lab-2026-09-24-universal-5/blind-scores.md` and 16 classical from `lab-2026-09-24-universal-6/blind-scores.md`, resolved through each lab's `blind-map.json`.
13 misspelled, 19 correct.

UNIV-7 was **not** added: `S/univ7-blind/SCORES.md` did not exist when this run finished, so there was no ground truth to score against. Budget was not the constraint - USD 0.78 of the USD 1.20 cap was still free.

One change to the crop, made before the run and for a reason unrelated to scoring: the upward pad went from 0.30 to 1.00 of the letter-band height because 0.30 cut the tops of the tall letters on `k01`, `k06`, `k13` and `k14`, and a clipped alif is exactly where a hamza would have been.
The wider crop leaves some chain in frame, which the prompt already tells the model to ignore.

## Confusion table - V3 held out

| | refused | total | rate |
|---|---|---|---|
| misspellings refused | 12 | 13 | 92 percent |
| correct names refused | 4 | 19 | 21 percent |
| no-text or error reads | 0 | 32 | 0 percent |

**The bar is missed.** One misspelling passes, and correct names are refused at about 1 in 5 rather than the allowed 1 in 10.

## By defect type

| defect type | misspellings refused | total | which |
|---|---|---|---|
| dot count wrong (extra, missing or miscounted dot) | 5 | 5 | d01, d06, d09, d11, k02 |
| hamza or madda wrong (dropped or rendered as the wrong mark) | 7 | 7 | d12, d16, k01, k06, k10, k11, k14 |
| letter shape wrong | 0 | 1 | k05 |

**k05 is the one miss, and no counting reader can ever catch it.**
The piece spells `قاسل`: the final meem is drawn as a plain hook with an ascender and has lost its eye, so it reads as a lam.
Every dot and every mark on that pendant is correct and correctly counted - the model returned `above=2, below=0, hamza=0, madda=0`, which is exactly right for `قاسم`.
The defect is in the skeleton of one letter, which V3 never looks at.
A gate built on counts alone is structurally blind to this class, and `k03` (the same name, spelled right but cast in two separate pieces) shows the other class counts cannot see.

The four correct names V3 refuses:

- **d05** (`آمنة`) - the madda over the alif is a real horizontal bar, the model reported `madda=0`.
- **k04** and **k16** (`كريم`) - the model reported `madda=1` on a name with no madda at all, twice, on two different stills of the same name.
- **d04** (`إبراهيم`) - the hamza under the alif is a small fused wedge; the model reported `hamza=0`. Its twin `d15`, where the hamza is a clearer step, passed.

So three of the four false refusals are the hamza and madda columns, which are also the columns that make V3 catch seven misspellings V2 could not see. The two cannot be separated by tuning the scoring rule.

## Cost

USD 0.4161 across 32 calls, metered from `usage.input_tokens` and `usage.output_tokens`. Cap was USD 1.20.

## Exact V3 prompt

```
This photograph shows a gold pendant cut from a single sheet, carrying one word of Arabic script. Do not guess what the word is and do not name it. Count only.

Report four numbers:
- "above": the TOTAL number of separate dots sitting above the letters of the word
- "below": the TOTAL number of separate dots sitting below the letters of the word
- "hamza": the number of hamza marks (a small ء-shaped mark above or below a letter)
- "madda": the number of madda marks (a flat wave above an alif)

Rules:
- Count a dot even when it is welded to the letter by a small post or bar; the post is not a dot.
- A three-dot cluster counts as 3, a two-dot pair as 2.
- A hamza or a madda is not a dot; count it under hamza or madda instead.
- The rings and the chain at the top are not letters. Plain bars or rails above and below the word are not letters.

Reply with JSON {"above": <n>, "below": <n>, "hamza": <n>, "madda": <n>, "notes": "<one short line>"} only.
```

## Per-image rows - V3 held out

`label` is the blind viewer's spelling verdict and is the ground truth.

| id | label | defect | expected | source still | model counts | rule expects | verdict | viewer ground truth |
|---|---|---|---|---|---|---|---|---|
| d01 | misspelled | dot | تسنيم | `lab-2026-09-24-universal-5/img/diamond-rails-tasneem-ar-a.png` | `above=4 below=2 hamza=0 madda=0` | `above=3 below=2 hamza=0 madda=0` | refuse | Three fused balls above the initial ت (centre ball on the rail strut, one either side): reads ث, so the piece says ثسنيم. Everything else (س three teeth, ن one dot above, ي two dots below, م) is right |
| d02 | correct | - | غادة | `lab-2026-09-24-universal-5/img/diamond-rails-ghada-ar-a.png` | `above=3 below=0 hamza=0 madda=0` | `above=3 below=0 hamza=0 madda=0` | pass | غ with one dot above on a strut, alif spanning both rails, د, final ة with a fused pair of dots above. Letters meet the rails along wide seams; د sits on the bottom rail with a full-width contact. |
| d03 | correct | - | تسنيم | `lab-2026-09-24-universal-5/img/diamond-rails-tasneem-ar-b.png` | `above=3 below=2 hamza=0 madda=0` | `above=3 below=2 hamza=0 madda=0` | pass | ت two dots above on struts, س three teeth, ن one dot above, ي two dots below on bars down to the bottom rail, م final. Clean. |
| d04 | correct | - | إبراهيم | `lab-2026-09-24-universal-5/img/diamond-rails-ibrahim-ar-b.png` | `above=0 below=3 hamza=0 madda=0` | `above=0 below=3or4 hamza=1 madda=0` | refuse | إ (small hamza wedge fused under the alif foot), ب one dot below on a bar, ر, ا, ه, ي two dots below, م. Hamza is minimal but present, below the alif and attached; nothing floats. |
| d05 | correct | - | آمنة | `lab-2026-09-24-universal-5/img/diamond-rails-amna-ar-a.png` | `above=3 below=0 hamza=0 madda=0` | `above=3or4 below=0 hamza=0 madda=1` | refuse | Alif with a true horizontal madda bar above it, م, ن one dot above, ة two dots above. Marks are bridged to both letter and rail. |
| d06 | misspelled | dot | كريم | `lab-2026-09-24-universal-5/img/diamond-rails-karim-ar-a.png` | `above=0 below=3 hamza=0 madda=0` | `above=0 below=2 hamza=0 madda=0` | refuse | A third dot: besides the ي pair there is a lone dot hanging on a bar under the م arm. كريم carries two dots only, so the piece is misspelled. Construction itself is sound. |
| d07 | correct | - | قاسم | `lab-2026-09-24-universal-5/img/diamond-rails-qasim-ar-a.png` | `above=2 below=0 hamza=0 madda=0` | `above=2 below=0 hamza=0 madda=0` | pass | ق loop with two dots above, each on its own strut to the rail, ا, س three teeth, م. All contacts are full-width bands. |
| d08 | correct | - | قاسم | `lab-2026-09-24-universal-5/img/diamond-rails-qasim-ar-b.png` | `above=2 below=0 hamza=0 madda=0` | `above=2 below=0 hamza=0 madda=0` | pass | Same as d07, cleaner spacing; ق two dots above, س three teeth, م final, stubs to both rails. |
| d09 | misspelled | dot | كريم | `lab-2026-09-24-universal-5/img/diamond-rails-karim-ar-b.png` | `above=0 below=3 hamza=0 madda=0` | `above=0 below=2 hamza=0 madda=0` | refuse | Same defect as d06: an extra lone dot on a bar under the م arm in addition to the ي pair. Three dots on a two-dot name. |
| d10 | correct | - | ظافر | `lab-2026-09-24-universal-5/img/diamond-rails-zafir-ar-b.png` | `above=2 below=0 hamza=0 madda=0` | `above=2 below=0 hamza=0 madda=0` | pass | ظ bowl with its ascender on the left and one dot above, ا, ف with one dot above, ر falling to the bottom rail. Dot struts are real bars. |
| d11 | misspelled | dot | مؤمن | `lab-2026-09-24-universal-5/img/diamond-rails-mumin-ar-b.png` | `above=0 below=0 hamza=1 madda=0` | `above=1or2 below=0 hamza=1 madda=0` | refuse | Two extra dots: a ball sits on the strut above each م (d12 proves the plain strut is the intended connector). Also the ن dot hangs from the top rail and never reaches the ن. |
| d12 | misspelled | hamza-or-madda | مؤمن | `lab-2026-09-24-universal-5/img/diamond-rails-mumin-ar-a.png` | `above=0 below=0 hamza=0 madda=0` | `above=1or2 below=0 hamza=1 madda=0` | refuse | The hamza of ؤ is rendered as a plain round ball, not a hamza, so the waw is not a ؤ; d11 shows the correct wedge. The ن dot again hangs from the rail with a gap to the letter. |
| d13 | correct | - | ظافر | `lab-2026-09-24-universal-5/img/diamond-rails-zafir-ar-a.png` | `above=2 below=0 hamza=0 madda=0` | `above=2 below=0 hamza=0 madda=0` | pass | ظ bowl plus left ascender and one dot above, ا, ف one dot above, ر. Letters tie to both rails with square stubs. |
| d14 | correct | - | غادة | `lab-2026-09-24-universal-5/img/diamond-rails-ghada-ar-b.png` | `above=3 below=0 hamza=0 madda=0` | `above=3 below=0 hamza=0 madda=0` | pass | غ one dot above, ا, د seated on the bottom rail along a long seam, ة with a fused pair of dots above. |
| d15 | correct | - | إبراهيم | `lab-2026-09-24-universal-5/img/diamond-rails-ibrahim-ar-a.png` | `above=0 below=3 hamza=1 madda=0` | `above=0 below=3or4 hamza=1 madda=0` | pass | إ with the fused hamza step under the alif, ب one dot below, ر, ا, ه, ي two dots below, م. All seven letters and both marks are bridged. |
| d16 | misspelled | hamza-or-madda | آمنة | `lab-2026-09-24-universal-5/img/diamond-rails-amna-ar-b.png` | `above=3 below=0 hamza=1 madda=0` | `above=3or4 below=0 hamza=0 madda=1` | refuse | The mark over the alif is a hamza-shaped hook topped by a ball, not a madda stroke: آ is not formed (compare d05, which has the correct flat madda bar). م, ن and ة are correct. |
| k01 | misspelled | hamza-or-madda | أحمد | `lab-2026-09-24-universal-6/img/classical-ahmad-ar-a.png` | `above=0 below=0 hamza=0 madda=0` | `above=0or1 below=0 hamza=1 madda=0` | refuse | احمد (ا ح م د; alif has a broad flag head, no hamza) / tags: missing-glyph (hamza on alif) |
| k02 | misspelled | dot | شيخة | `lab-2026-09-24-universal-6/img/classical-shaikha-ar-a.png` | `above=7 below=2 hamza=0 madda=0` | `above=6 below=2 hamza=0 madda=0` | refuse | شيخة but the sheen carries 4 dots (1 above + 3 in a row) / tags: extra-glyph (4th dot on ش) |
| k03 | correct | - | قاسم | `lab-2026-09-24-universal-6/img/classical-qasim-ar-a.png` | `above=2 below=0 hamza=0 madda=0` | `above=2 below=0 hamza=0 madda=0` | pass | قاسم (ق 2 above, ا, س 3 teeth, م with eye) / tags: disconnected-component (full-height gap between ا and س; piece is two parts held only by the chain) |
| k04 | correct | - | كريم | `lab-2026-09-24-universal-6/img/classical-karim-ar-b.png` | `above=0 below=2 hamza=0 madda=1` | `above=0 below=2 hamza=0 madda=0` | refuse | كريم (ك, ر, ي 2 below, م with eye) / tags: - |
| k05 | misspelled | letter-shape | قاسم | `lab-2026-09-24-universal-6/img/classical-qasim-ar-b.png` | `above=2 below=0 hamza=0 madda=0` | `above=2 below=0 hamza=0 madda=0` | pass | قاسل - final letter is a plain hook with an ascender, no م eye / tags: wrong-spelling (م rendered without its eye, reads ل) |
| k06 | misspelled | hamza-or-madda | إبراهيم | `lab-2026-09-24-universal-6/img/classical-ibrahim-ar-a.png` | `above=0 below=3 hamza=0 madda=0` | `above=0 below=3or4 hamza=1 madda=0` | refuse | ابراهيم (ب 1 below, ر, ا, ه, ي 2 below, م); no hamza under the first alif / tags: missing-glyph (hamza under alif) |
| k07 | correct | - | عائشة | `lab-2026-09-24-universal-6/img/classical-aisha-ar-b.png` | `above=5 below=0 hamza=1 madda=0` | `above=5or6 below=0 hamza=1 madda=0` | pass | عائشة (ع, ا, ئ with hamza, ش 3 dots triangular, ة 2 above) / tags: - |
| k08 | correct | - | تسنيم | `lab-2026-09-24-universal-6/img/classical-tasneem-ar-b.png` | `above=3 below=2 hamza=0 madda=0` | `above=3 below=2 hamza=0 madda=0` | pass | تسنيم (ت 2 above, س 3 teeth, ن 1 above, ي 2 below, م with eye) / tags: - |
| k09 | correct | - | مؤمن | `lab-2026-09-24-universal-6/img/classical-mumin-ar-a.png` | `above=1 below=0 hamza=1 madda=0` | `above=1or2 below=0 hamza=1 madda=0` | pass | مؤمن (م, ؤ with hamza fused to the waw, م, ن 1 above) / tags: - |
| k10 | misspelled | hamza-or-madda | مؤمن | `lab-2026-09-24-universal-6/img/classical-mumin-ar-b.png` | `above=1 below=0 hamza=0 madda=0` | `above=1or2 below=0 hamza=1 madda=0` | refuse | مومن - no hamza anywhere on the waw / tags: missing-glyph (hamza on waw); ؤ-م junction is a near-tangential touch, marginal |
| k11 | misspelled | hamza-or-madda | إبراهيم | `lab-2026-09-24-universal-6/img/classical-ibrahim-ar-b.png` | `above=0 below=3 hamza=0 madda=0` | `above=0 below=3or4 hamza=1 madda=0` | refuse | ابراهيم; no hamza under the first alif / tags: missing-glyph (hamza); disconnected-component (three separate parts: [ا], [بر], [اهيم] - the بر part carries no ring and is unsupported) |
| k12 | correct | - | شيخة | `lab-2026-09-24-universal-6/img/classical-shaikha-ar-b.png` | `above=6 below=2 hamza=0 madda=0` | `above=6 below=2 hamza=0 madda=0` | pass | شيخة (ش 3 dots triangular, ي 2 below, خ 1 above, ة 2 above) / tags: - |
| k13 | correct | - | تسنيم | `lab-2026-09-24-universal-6/img/classical-tasneem-ar-a.png` | `above=3 below=2 hamza=0 madda=0` | `above=3 below=2 hamza=0 madda=0` | pass | تسنيم (ت 2 above, س 3 teeth, ن 1 above, ي 2 below, م with eye) / tags: - |
| k14 | misspelled | hamza-or-madda | أحمد | `lab-2026-09-24-universal-6/img/classical-ahmad-ar-b.png` | `above=0 below=0 hamza=0 madda=0` | `above=0or1 below=0 hamza=1 madda=0` | refuse | احمد - plain alif, no hamza / tags: missing-glyph (hamza on alif) |
| k15 | correct | - | عائشة | `lab-2026-09-24-universal-6/img/classical-aisha-ar-a.png` | `above=5 below=0 hamza=1 madda=0` | `above=5or6 below=0 hamza=1 madda=0` | pass | عائشة (ع, ا, ئ with hamza, ش 3 dots, ة 2 above) / tags: - |
| k16 | correct | - | كريم | `lab-2026-09-24-universal-6/img/classical-karim-ar-a.png` | `above=0 below=2 hamza=0 madda=1` | `above=0 below=2 hamza=0 madda=0` | refuse | كريم (ك, ر, ي 2 below, م with eye) / tags: - |


## Post-hoc rescore of the original V2 rows

Labelled **post-hoc**: this rule was chosen after the V2 data had been seen, so these numbers are not evidence about a new still.
Rule: drop the `groups` column, and accept a dot total whether or not the model counted a hamza or a madda as a dot on that side (`above` in `{expA, expA + hA + expM}`, `below` in `{expB, expB + hB}`).

| | refused | total |
|---|---|---|
| misspellings refused | 13 | 13 |
| correct names refused | 1 | 17 |

The single correct name refused is **c07** (`ضحى`), where the model reported one dot below a name that has none.
On its own this looks like it clears the bar. It does not survive contact with held-out data: the same family of rule, with the hamza and madda questions actually asked, refused 4 of 19 correct names on stills it had not seen.
V2 also cannot see a dropped hamza at all, which is the single most common defect in UNIV-6 (5 of 7 misspellings there).

| id | label | expected | model counts | rule expects | post-hoc verdict |
|---|---|---|---|---|---|
| c01 | correct | كريم | `above=0 below=2 groups=2` | `above=0 below=2` | pass |
| c02 | correct | غادة | `above=3 below=0 groups=1` | `above=3 below=0` | pass |
| c03 | correct | غادة | `above=3 below=0 groups=3` | `above=3 below=0` | pass |
| c04 | misspelled | تسنيم | `above=3 below=1 groups=2` | `above=3 below=2` | refuse |
| c05 | correct | ضحى | `above=1 below=0 groups=2` | `above=1 below=0` | pass |
| c06 | correct | إبراهيم | `above=0 below=4 groups=2` | `above=0 below=3or4` | pass |
| c07 | correct | ضحى | `above=1 below=1 groups=1` | `above=1 below=0` | refuse |
| c08 | correct | إبراهيم | `above=0 below=4 groups=2` | `above=0 below=3or4` | pass |
| c09 | correct | آمنة | `above=3 below=0 groups=1` | `above=3or4 below=0` | pass |
| c10 | correct | ذكرى | `above=1 below=0 groups=2` | `above=1 below=0` | pass |
| c11 | correct | جميلة | `above=2 below=3 groups=1` | `above=2 below=3` | pass |
| c12 | misspelled | مؤمن | `above=2 below=1 groups=1` | `above=1or2 below=0` | refuse |
| c13 | correct | ظافر | `above=2 below=0 groups=2` | `above=2 below=0` | pass |
| c14 | misspelled | قاسم | `above=0 below=0 groups=2` | `above=2 below=0` | refuse |
| c15 | correct | ذكرى | `above=1 below=0 groups=1` | `above=1 below=0` | pass |
| c16 | correct | ظافر | `above=2 below=0 groups=2` | `above=2 below=0` | pass |
| c17 | correct | جميلة | `above=2 below=3 groups=1` | `above=2 below=3` | pass |
| c18 | correct | أحمد | `above=0 below=0 groups=1` | `above=0or1 below=0` | pass |
| c19 | misspelled | أحمد | `above=0 below=1 groups=1` | `above=0or1 below=0` | refuse |
| c20 | misspelled | قاسم | `above=0 below=0 groups=1` | `above=2 below=0` | refuse |
| c21 | correct | تسنيم | `above=3 below=2 groups=1` | `above=3 below=2` | pass |
| c22 | correct | مؤمن | `above=2 below=0 groups=1` | `above=1or2 below=0` | pass |
| c23 | misspelled | كريم | `above=0 below=3 groups=2` | `above=0 below=2` | refuse |
| r02 | misspelled | ذكرى | `above=2 below=0 groups=3` | `above=1 below=0` | refuse |
| r15 | misspelled | ذكرى | `above=1 below=2 groups=3` | `above=1 below=0` | refuse |
| r19 | misspelled | جميلة | `above=2 below=2 groups=1` | `above=2 below=3` | refuse |
| r21 | misspelled | تسنيم | `above=4 below=2 groups=2` | `above=3 below=2` | refuse |
| w01 | misspelled | شيخة | `above=6 below=1 groups=1` | `above=6 below=2` | refuse |
| w04 | misspelled | نور | `above=0 below=0 groups=2` | `above=1 below=0` | refuse |
| w05 | misspelled | نور | `above=0 below=0 groups=2` | `above=1 below=0` | refuse |
