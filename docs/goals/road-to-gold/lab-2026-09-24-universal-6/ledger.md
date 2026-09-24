# Image lab ledger - 2026-09-24 - universal free route, dot inventory (UNIV-6)

Model `gpt-image-2.5-sunburst`, ratio 1:1, via Runway MCP, compiler `caleums-still-compiler-v4`.
Question: wording A holds the piece together but miscounts dots (UNIV-3 part 2).
Does naming the dots explicitly - an inventory sentence listing every dot the name has and forbidding any other - fix the count without disturbing anything else?

One axis changed against the UNIV-3 part 2 base: a single sentence inserted into the `Name:` paragraph.

## Base

Every base prompt is the exact byte string the production compiler emits at HEAD on the free route for construction `classical`, produced by the SP-2d path - the real `buildPromptVariableSnapshot` and `compileStillPrompt` from `@jewelo/ai` against the live minimal `image.packshot@v4` template - with the route forced to `"free"`.
At HEAD (`cc62ff31` and later) that compile already emits wording A; each base prompt was checked to contain `Every dot is a small solid gold dot fused to its own letter` exactly once, and the per-name sha256 reproduced the UNIV-3 part 2 wording A hashes exactly (for example `classical-qasim-ar` = `dfebe53a3d36a80b...`), so the base is byte-identical to what UNIV-3 part 2 scored.

Compile command:

```
corepack pnpm --filter @jewelo/jobs exec tsx <scratchpad>/univ6-compile.mts <scratchpad>/u6base
```

Note: that script still asserts the pre-wording-A SP-2d hash `92835ad9...` for `classical-muhammad-ar` and now fails that self-check at HEAD, because the compiler changed. It fails after writing all prompts; the check that matters here is the per-name hash match against UNIV-3 part 2, which passed for all eight names.

Specification shape, unchanged from UNIV-1: lettering `classic`, arabicStyle `contemporary`, stoneCoverage `none`, gemstone `none`, metalColor `yellow`, metalKarat `18K`, finish `polished`, layout `single-name`, connector `none`, sizeProfile `classic`, dimensions 32 x 12 x 1.2 mm, chain cable 45 cm.

References: exactly what production sends on the free route for this construction - the `classical` look crop only, no stencil, no style anchor, no master.
The uploaded bytes are `caleums-private/look-references-v1/classical.png`, private brand reference, not in git.

## The one insertion

Directly after `spelled letter for letter.` in the `Name:` paragraph, one space and the name's dot inventory sentence.
The build script asserts the anchor occurs exactly once per prompt and exits with `FAIL <slug>` otherwise; all eight passed.
Nothing else in the prompt changed.

| name | inserted sentence |
| --- | --- |
| قاسم (qasim) | Its dots, exactly and only: two above ق. No other letter has any dot, and no dot is added anywhere else. |
| أحمد (ahmad) | This name has no dots at all; do not add any dot anywhere. |
| كريم (karim) | Its dots, exactly and only: two below ي. No other letter has any dot, and no dot is added anywhere else. |
| تسنيم (tasneem) | Its dots, exactly and only: two above ت, one above ن, two below ي. No other letter has any dot, and no dot is added anywhere else. |
| مؤمن (mumin) | Its dots, exactly and only: one above ن. No other letter has any dot, and no dot is added anywhere else. |
| إبراهيم (ibrahim) | Its dots, exactly and only: one below ب, two below ي. No other letter has any dot, and no dot is added anywhere else. |
| شيخة (shaikha) | Its dots, exactly and only: three above ش, two below ي, one above خ, two above ة. No other letter has any dot, and no dot is added anywhere else. |
| عائشة (aisha) | Its dots, exactly and only: three above ش, two above ة. No other letter has any dot, and no dot is added anywhere else. |

Prompts: `prompts/classical-<latin>-ar-A2.txt`. Images: `img/classical-<latin>-ar-<a|b>.png` (gitignored).
Echo check: for all eight prompts the `promptText` Runway echoed back is byte-identical to the file's `Name:` paragraph, and the rest of the file is the shared constant verified identical across all eight.
Credits: 199561 before, 199153 after, 408 credits for 16 stills.
Contact sheet: `<scratchpad>/univ6.webp`.

| cell | name | take | Runway task id | prompt sha256 (first 16) |
| --- | --- | --- | --- | --- |
| classical-qasim-ar-A2 | قاسم | a | `f1fbc7ff-7ba4-46f2-ad57-a5f45c517ad7` | `c1470cb1eed789d3` |
| classical-qasim-ar-A2 | قاسم | b | `267e457e-412d-4418-a17c-04b9585629c4` | `c1470cb1eed789d3` |
| classical-ahmad-ar-A2 | أحمد | a | `5d902760-97b7-432b-b30d-dee25a966bba` | `c84c4a7bd2252a59` |
| classical-ahmad-ar-A2 | أحمد | b | `c1bb108d-5eaf-45b8-bbf0-46ee89bd0472` | `c84c4a7bd2252a59` |
| classical-karim-ar-A2 | كريم | a | `24cc8436-c45a-4236-aa46-725080ab1566` | `a474a088d0a94a87` |
| classical-karim-ar-A2 | كريم | b | `0d8f5007-003b-4479-9a08-ac1b50e36904` | `a474a088d0a94a87` |
| classical-tasneem-ar-A2 | تسنيم | a | `085a11c1-39ed-436e-be5e-5dff79355735` | `ae388b64368ce7cd` |
| classical-tasneem-ar-A2 | تسنيم | b | `f95e12bd-fbf4-41dc-b841-35994c08e71a` | `ae388b64368ce7cd` |
| classical-mumin-ar-A2 | مؤمن | a | `9309dc34-1197-489f-99e7-7b046d61d9f7` | `d5ec364ff31b95ae` |
| classical-mumin-ar-A2 | مؤمن | b | `80856b51-a248-426a-9b45-b6bbf3637e14` | `d5ec364ff31b95ae` |
| classical-ibrahim-ar-A2 | إبراهيم | a | `3ca8a82a-4f2b-4a34-8b63-117185536489` | `c9432bde9b309588` |
| classical-ibrahim-ar-A2 | إبراهيم | b | `917bbbf4-017c-413b-b15d-28ce8aaa1cce` | `c9432bde9b309588` |
| classical-shaikha-ar-A2 | شيخة | a | `4082a940-a44d-44df-922f-203e9337c4d3` | `da39a5567cd391ff` |
| classical-shaikha-ar-A2 | شيخة | b | `3f7c7843-5e67-4a77-86c9-a9d86eb704e7` | `da39a5567cd391ff` |
| classical-aisha-ar-A2 | عائشة | a | `b6e035d7-bd88-44b3-b888-e752ad4127a5` | `b52d2c39bded2d44` |
| classical-aisha-ar-A2 | عائشة | b | `33df21e3-5326-45fe-9fa0-c34be49c86cf` | `b52d2c39bded2d44` |

## What the viewer scores

Blind, one image at a time, same rubric as UNIV-3:

1. Dot count - does the piece carry exactly the dots the inventory names, no more and no fewer, on the right letters and on the right side (above or below)? This is the axis under test.
2. Spelling - does the pendant read as the intended Arabic name, letter for letter, right to left?
3. One piece - is every letter, dot and mark fused to the body, with no floating dot and no point-only touch?
4. Hamza and madda - on أ إ ؤ ائ, is the hamza present, on the right carrier, and attached?
5. Ring posts - does any ring post or tab curl into a stroke that could be read as an extra letter?

Compare each cell against the same name in `../lab-2026-09-24-universal-3/` (wording A, no inventory) to judge whether the inventory sentence moved the dot count.
