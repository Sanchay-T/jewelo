# Image lab ledger - 2026-09-24 - universal free route, part 5 (UNIV-5)

Model `gpt-image-2.5-sunburst`, ratio 1:1, via Runway MCP, compiler `caleums-still-compiler-v4`.
Question: what the production wording A dot-join clause does on `diamond-rails`.
UNIV-2 measured the same wording on `classical` by hand substitution; UNIV-5 measures it on rails with the wording now living in the production compiler at HEAD.

Every prompt in `prompts/*.txt` is the exact byte string the production compiler emits on the free route today, produced by the SP-2d path - the real `buildPromptVariableSnapshot` and `compileStillPrompt` from `@jewelo/ai` against the live minimal `image.packshot@v4` template - with the route forced to `"free"`.
No hand substitution anywhere in this run.

The compile command:

```
corepack pnpm --filter @jewelo/jobs exec tsx <scratchpad>/univ5-compile.mts docs/goals/road-to-gold/lab-2026-09-24-universal-5
```

That script is `univ3-compile.mts` with the cell list cut to these eight names and the lab/task labels changed; nothing else differs.
Its pinned self-check still asserts the pre-HEAD SP-2d sha256 `92835ad9...` and therefore fails at the end, after all prompts are written - that assertion is stale by design, because HEAD changed the Name paragraph for every Arabic free prompt.
The observed value on that check is `f01665b41b957e29b6fb9ade84f911555e5e6fa42605b9f233d17924a604ea3e`.

Diff against UNIV-3 part 1: for all eight names the only changed paragraph is the Name paragraph.
UNIV-3 part 1 read `... spelled letter for letter, every dot and mark joined to its letter.`
HEAD reads `... spelled letter for letter. Every dot is a small solid gold dot fused to its own letter by a short straight gold bar as thick as the letter strokes, so no dot floats free and none touches only at a point; where a letter has two or three dots, they are fused to each other and to the letter the same way. The two rings sit at the two ends of the name on short plain tabs that never curl or rise into a stroke that could be read as a letter.`
Every one of the eight compiled prompts contains the string `Every dot is a small solid gold dot fused to its own letter` exactly once.
All other paragraphs - look line, Style Rails, Chain, Material, Photo - are byte identical to UNIV-3 part 1.

Specification shape, unchanged from UNIV-1 and UNIV-3: lettering `classic`, arabicStyle `contemporary`, stoneCoverage `none`, gemstone `none`, metalColor `yellow`, metalKarat `18K`, finish `polished`, layout `single-name`, connector `none`, sizeProfile `classic`, dimensions 32 x 12 x 1.2 mm, chain cable 45 cm.

References: exactly what production sends on the free route for this construction - the `diamond-rails` look crop only, no stencil, no style anchor, no master.
The uploaded bytes are `caleums-private/look-references-v1/diamond-rails.png` (sha256 begins `d573cd4b346ba893`); it is private brand reference and is not in git.

Echo check: for all eight submissions the Runway response echoed `promptText` back byte for byte, including the trailing newline, identical to the file in `prompts/`.

Credits: 199697 before the run, 199425 after UNIV-5's last submission, so 272 credits for 16 stills (8 cells, two takes each, 17 credits per still - the same unit price UNIV-3 recorded).
A `whoami` taken at the end of this run reads 199153, which is lower than 199425 because a concurrent UNIV-6 run spends from the same workspace; the per-cell before/after columns below are the balances the Runway submit responses returned for UNIV-5's own calls.
Full-size PNGs stay local in `img/` (gitignored by `docs/goals/road-to-gold/lab-*/img/`). No signed URL is recorded here.
Contact sheet for the viewer: `<scratchpad>/univ5-rails.webp`.

Verdicts are `pending-blind-viewer`; the generating agent never scores.

## Cells

| cell | name | letters under test | take | Runway task id | prompt sha256 (first 16) | credits before / after |
| --- | --- | --- | --- | --- | --- | --- |
| diamond-rails-qasim-ar | قاسم | ق (two dots above), ا, س, م | a | `f64ed74d-37d0-49dc-87d3-973ed1456995` | `0d503318d2a21703` | 199697 / 199663 |
| diamond-rails-qasim-ar | قاسم | ق (two dots above), ا, س, م | b | `da22b5a2-6ad2-4725-8b26-1ad6f10238e2` | `0d503318d2a21703` | 199697 / 199663 |
| diamond-rails-karim-ar | كريم | ك, ر, ي, م | a | `672e2ebc-e968-41d8-9e15-720a9dd32712` | `358d7f97fd6688e3` | 199663 / 199629 |
| diamond-rails-karim-ar | كريم | ك, ر, ي, م | b | `f774368c-43a2-4770-9886-7075905bb427` | `358d7f97fd6688e3` | 199663 / 199629 |
| diamond-rails-zafir-ar | ظافر | ظ (one dot above), ا, ف, ر | a | `ab22d6f2-6014-4936-b035-252c6dcdd859` | `59caa40635369795` | 199629 / 199595 |
| diamond-rails-zafir-ar | ظافر | ظ (one dot above), ا, ف, ر | b | `441fc0df-a682-40e7-a9f2-b365e454c764` | `59caa40635369795` | 199629 / 199595 |
| diamond-rails-amna-ar | آمنة | آ (madda), م, ن, ة | a | `61bcb60d-ca8d-44b2-a4e3-447f18f0f121` | `4ba672c309571906` | 199595 / 199561 |
| diamond-rails-amna-ar | آمنة | آ (madda), م, ن, ة | b | `1f44c86b-2687-4503-899d-2c9d34c4321b` | `4ba672c309571906` | 199595 / 199561 |
| diamond-rails-tasneem-ar | تسنيم | ت (two dots above), س, ن, ي, م | a | `ba586d02-2fb9-4608-9728-e5d68bf7f0fc` | `27ef8b5823896823` | 199561 / 199527 |
| diamond-rails-tasneem-ar | تسنيم | ت (two dots above), س, ن, ي, م | b | `8a06e507-beab-4a03-a242-d3599ff728f0` | `27ef8b5823896823` | 199561 / 199527 |
| diamond-rails-ibrahim-ar | إبراهيم | إ (hamza under alif), ب, ر, ا, ه, ي, م | a | `1ddde205-ebfc-4e9c-98eb-d78d5f2e45c4` | `21db862ba43ca59f` | 199527 / 199493 |
| diamond-rails-ibrahim-ar | إبراهيم | إ (hamza under alif), ب, ر, ا, ه, ي, م | b | `3958cfa4-0c5f-430f-a4f5-ab864fac2af4` | `21db862ba43ca59f` | 199527 / 199493 |
| diamond-rails-ghada-ar | غادة | غ (one dot above), ا, د, ة | a | `c205db6b-e501-417e-981c-fd2727c73ab4` | `6590aecee0c8443a` | 199493 / 199459 |
| diamond-rails-ghada-ar | غادة | غ (one dot above), ا, د, ة | b | `4ba1ee75-514e-4236-819f-bae2d6c5253f` | `6590aecee0c8443a` | 199493 / 199459 |
| diamond-rails-mumin-ar | مؤمن | م, ؤ (hamza on waw), م, ن | a | `63467ddb-c935-4568-831a-6629f8e9e7c0` | `1d3011fba8f050d8` | 199459 / 199425 |
| diamond-rails-mumin-ar | مؤمن | م, ؤ (hamza on waw), م, ن | b | `6c7147da-8b99-454e-adb3-d71ff670f176` | `1d3011fba8f050d8` | 199459 / 199425 |

The viewer scores these against UNIV-3 part 1's rails cells for the same eight names, which used the short wording: are the dots bridged to their letters with a visible gold bar rather than floating or touching at a point, do the ring tabs stay plain instead of curling into a stroke that reads as an extra letter, and does the name still spell correctly right to left as one piece.
