# Image lab ledger - 2026-09-24 - universal free route, part 3 (UNIV-3)

Model `gpt-image-2.5-sunburst`, ratio 1:1, via Runway MCP, compiler `caleums-still-compiler-v4`.
Question: how the production free studio prompt handles the Arabic letters UNIV-1 never drew - hamza carriers (أ إ آ ؤ), the emphatics (ق ض ظ), ك and ج and غ and ذ and ت, and a final ى - on the one construction UNIV-1 already showed is one piece 12 of 12: diamond-rails.

Method is identical to UNIV-1 (`../lab-2026-09-24-universal/ledger.md`).
Every prompt in `prompts/*.txt` is the exact byte string the production compiler emits on the free route, produced by the SP-2d path - the real `buildPromptVariableSnapshot` and `compileStillPrompt` from `@jewelo/ai` against the live minimal `image.packshot@v4` template - with the route forced to `"free"`, bypassing `stillRoute`, which would send every one of these names to the stencil today.

The compile command:

```
corepack pnpm --filter @jewelo/jobs exec tsx <scratchpad>/univ3-compile.mts docs/goals/road-to-gold/lab-2026-09-24-universal-3
```

Specification shape, unchanged from UNIV-1: lettering `classic`, arabicStyle `contemporary`, stoneCoverage `none`, gemstone `none`, metalColor `yellow`, metalKarat `18K`, finish `polished`, layout `single-name`, connector `none`, sizeProfile `classic`, dimensions 32 x 12 x 1.2 mm, chain cable 45 cm.
The script asserts the pinned SP-2d sha256 `92835ad907bc30db5da34b51351b0afb88d5e55b92280d944bb98074ab098511` for `classical-muhammad-ar` through this exact path and reproduced it, so the compile path is the same one UNIV-1 used.

References: exactly what production sends on the free route for this construction - the `diamond-rails` look crop only, no stencil, no style anchor, no master.
The uploaded bytes are `caleums-private/look-references-v1/diamond-rails.png`, the PNG `LOOK_REFERENCES` pins by sha256; it is private brand reference and is not in git.

Echo check: for all 12 submissions the Runway response echoed back `promptText` byte for byte, including the trailing newline, identical to the file in `prompts/`.
UNIV-1 sent the prompt without its trailing newline; UNIV-3 sends the compiled string as the compiler emits it, so the recorded sha256 is the sha256 of exactly what was sent.

Credits: 200513 before the run, 200105 after, so 408 credits for 24 stills (12 cells, two takes each).
Full-size PNGs stay local in `img/` (gitignored by `docs/goals/road-to-gold/lab-*/img/`). No signed URL is recorded here.
Contact sheet for the viewer: `<scratchpad>/univ3-rails.webp`.

Verdicts are `pending-blind-viewer`; the generating agent never scores.

## Cells

| cell | name | letters under test | take | Runway task id | prompt sha256 (first 16) | credits before / after |
| --- | --- | --- | --- | --- | --- | --- |
| diamond-rails-ahmad-ar | أحمد | أ (hamza on alif), ح, د | a | `7f2a788c-b0bc-4706-897b-093b5f4ae564` | `b27fa5739f62b569` | 200513 / 200479 |
| diamond-rails-ahmad-ar | أحمد | أ (hamza on alif), ح, د | b | `a6b02429-9dea-4300-a9c3-cbea9bc62d6f` | `b27fa5739f62b569` | 200513 / 200479 |
| diamond-rails-ibrahim-ar | إبراهيم | إ (hamza under alif), ب, ر, ه, ي, م | a | `bd3be16d-df04-4080-add6-d33d83346e21` | `939905df77dcbb91` | 200479 / 200445 |
| diamond-rails-ibrahim-ar | إبراهيم | إ (hamza under alif), ب, ر, ه, ي, م | b | `99f3c7a8-a7ee-447e-a2dd-674eac5a5960` | `939905df77dcbb91` | 200479 / 200445 |
| diamond-rails-amna-ar | آمنة | آ (madda), م, ن, ة | a | `f320ad9b-238c-435a-a47a-8f169bc77a14` | `1ced1541c0b97fda` | 200445 / 200411 |
| diamond-rails-amna-ar | آمنة | آ (madda), م, ن, ة | b | `8bf54b54-4ebd-4bec-8a21-1958a6b0e4e6` | `1ced1541c0b97fda` | 200445 / 200411 |
| diamond-rails-qasim-ar | قاسم | ق (two dots above), ا, س, م | a | `c882db75-6517-4f72-b2c3-8562dd114544` | `7eee65e3e99be3aa` | 200411 / 200377 |
| diamond-rails-qasim-ar | قاسم | ق (two dots above), ا, س, م | b | `6dea926f-ce23-4477-9aaf-52ab4ba18e9f` | `7eee65e3e99be3aa` | 200411 / 200377 |
| diamond-rails-karim-ar | كريم | ك, ر, ي, م | a | `3b215ba9-86fa-4736-abbd-76b2634fe16a` | `88a37d1dc5974e43` | 200377 / 200343 |
| diamond-rails-karim-ar | كريم | ك, ر, ي, م | b | `296546ca-b6bd-4a23-b296-1de8139d2d4b` | `88a37d1dc5974e43` | 200377 / 200343 |
| diamond-rails-jamila-ar | جميلة | ج (one dot below), م, ي, ل, ة | a | `5fb73ff4-1e1c-427a-87b4-aaad0200d485` | `7b4c2af32225917f` | 200343 / 200309 |
| diamond-rails-jamila-ar | جميلة | ج (one dot below), م, ي, ل, ة | b | `30f5cb84-e499-4a5d-ae3d-b7a7aaa8b9e6` | `7b4c2af32225917f` | 200343 / 200309 |
| diamond-rails-ghada-ar | غادة | غ (one dot above), ا, د, ة | a | `9a2f56bb-3a82-494f-bac7-14ce92375ae1` | `b123f9c00a1cb3ca` | 200309 / 200275 |
| diamond-rails-ghada-ar | غادة | غ (one dot above), ا, د, ة | b | `c8f22404-df4e-450d-84fe-8307dc3ded6d` | `b123f9c00a1cb3ca` | 200309 / 200275 |
| diamond-rails-duha-ar | ضحى | ض (one dot above), ح, ى (final alif maqsura) | a | `2f78a92e-5fb9-464a-8d62-a9819b414e1c` | `71d4cbae5a2f30a7` | 200275 / 200241 |
| diamond-rails-duha-ar | ضحى | ض (one dot above), ح, ى (final alif maqsura) | b | `eac49c10-6661-4b11-affa-037faac9e187` | `71d4cbae5a2f30a7` | 200275 / 200241 |
| diamond-rails-zafir-ar | ظافر | ظ (one dot above), ا, ف, ر | a | `6873b54f-852a-4a51-9c7b-f032fde2c807` | `2c51620ccb69a7b3` | 200241 / 200207 |
| diamond-rails-zafir-ar | ظافر | ظ (one dot above), ا, ف, ر | b | `d621bdf0-29ad-4d67-bb80-233dcc650090` | `2c51620ccb69a7b3` | 200241 / 200207 |
| diamond-rails-dhikra-ar | ذكرى | ذ (one dot above), ك, ر, ى | a | `0bd2330b-df01-4dce-9138-4e76189c66e3` | `1bc314ebb30170a3` | 200207 / 200173 |
| diamond-rails-dhikra-ar | ذكرى | ذ (one dot above), ك, ر, ى | b | `f5e926cd-d991-4798-80b6-7a5cc388dcff` | `1bc314ebb30170a3` | 200207 / 200173 |
| diamond-rails-tasneem-ar | تسنيم | ت (two dots above), س, ن, ي, م | a | `7282a0f4-d8e9-452a-8c98-60d8785e2685` | `6e3db916b7d7c3c1` | 200173 / 200139 |
| diamond-rails-tasneem-ar | تسنيم | ت (two dots above), س, ن, ي, م | b | `4c03a840-0701-40b4-a2ab-330041c40095` | `6e3db916b7d7c3c1` | 200173 / 200139 |
| diamond-rails-mumin-ar | مؤمن | م, ؤ (hamza on waw), م, ن | a | `00ceca45-8bd2-4df0-8e41-ef5348c0fb3e` | `da461194910d15be` | 200139 / 200105 |
| diamond-rails-mumin-ar | مؤمن | م, ؤ (hamza on waw), م, ن | b | `636843d1-fc40-49e4-a2e3-21b5f8cf8c9a` | `da461194910d15be` | 200139 / 200105 |

## What the viewer should score

Blind, one image at a time, against the rubric already used in UNIV-1's `reader-replay.md`:

1. Spelling - does the pendant read as the intended Arabic name, letter for letter, in the right order? Name the wrong or missing letter.
2. One piece - is every letter, dot and mark fused to the body, with no floating dot and no point-only touch? Name the loose part.
3. Hamza and madda - on أ إ آ ؤ, is the hamza or madda present, on the right carrier, and attached?
4. Rails - are the two straight rails present, one above and one below, with every letter welded to both, and the rings at the ends of the top rail?
5. Ring posts - does any ring post or tab curl into a stroke that could be read as an extra letter (the RING-POST defect)?

All 24 files are in `img/`, named `diamond-rails-<latin>-ar-<a|b>.png`.

## Part 2 - the same 12 names in classical, wording A

Same model, ratio, references discipline and compile path as part 1, one axis changed: the `Name:` paragraph.
The base prompt is the production free-route compile for construction `classical` (look reference `caleums-private/look-references-v1/classical.png`), and in each one the single `Name:` paragraph

```
Name: "<NAME>" in connected Arabic letters, right to left, spelled letter for letter, every dot and mark joined to its letter. The whole pendant is one piece of gold. No other text anywhere.
```

is replaced by wording A, which spells out the dot bridge and forbids a ring tab that curls into a readable stroke.
The build script asserts that paragraph occurs exactly once in each base prompt before substituting and exits with `FAIL <slug>` otherwise; all 12 passed.
Nothing else in the prompt changed, so any difference from UNIV-1's classical cells is attributable to the wording alone.

Prompts: `prompts/classical-<latin>-ar-A.txt`. Images: `img/classical-<latin>-ar-<a|b>.png`.
Echo check: all 12 responses returned `promptText` byte for byte identical to the file, trailing newline included.
Credits: 200105 before part 2, 199697 after, so 408 credits for 24 stills.
Run total for UNIV-3: 200513 before, 199697 after, 816 credits for 48 stills.
Contact sheet: `<scratchpad>/univ3-classical.webp`.

| cell | name | take | Runway task id | prompt sha256 (first 16) | credits before / after |
| --- | --- | --- | --- | --- | --- |
| classical-ahmad-ar-A | أحمد | a | `6a21f7aa-d3f5-4266-b571-a4f572b07cf7` | `91592e7b401fdaac` | 200105 / 200071 |
| classical-ahmad-ar-A | أحمد | b | `fbceb3dd-4b99-4dfc-8d91-2b9c775648d5` | `91592e7b401fdaac` | 200105 / 200071 |
| classical-ibrahim-ar-A | إبراهيم | a | `d9bdaf1f-fb8c-42b3-b22e-6e907f3c2637` | `e44b89a73947ebd4` | 200071 / 200037 |
| classical-ibrahim-ar-A | إبراهيم | b | `f4f68749-f565-4166-bf9e-66c6b3223439` | `e44b89a73947ebd4` | 200071 / 200037 |
| classical-amna-ar-A | آمنة | a | `7b4484ab-cb95-464d-9625-4e14f49a8786` | `6015325bfb5b051e` | 200037 / 200003 |
| classical-amna-ar-A | آمنة | b | `7cc38430-a97c-4db5-84e9-bbd0994fc0fc` | `6015325bfb5b051e` | 200037 / 200003 |
| classical-qasim-ar-A | قاسم | a | `e13f7d9e-37c0-43d1-8fcf-c1088a990abf` | `dfebe53a3d36a80b` | 200003 / 199969 |
| classical-qasim-ar-A | قاسم | b | `ba126749-7259-4446-8cc6-c77ef667cdb2` | `dfebe53a3d36a80b` | 200003 / 199969 |
| classical-karim-ar-A | كريم | a | `b6090c33-f095-40b1-9a8e-1a503a040555` | `6d554939b6572862` | 199969 / 199935 |
| classical-karim-ar-A | كريم | b | `be6d333b-bfe6-45d4-84d6-764b020486b2` | `6d554939b6572862` | 199969 / 199935 |
| classical-jamila-ar-A | جميلة | a | `5660b128-6147-4978-a121-a5ff3915c5d0` | `07f9e61588a61f52` | 199935 / 199901 |
| classical-jamila-ar-A | جميلة | b | `385ec9a0-fdf1-4ee5-bd4e-51ea9c29df4d` | `07f9e61588a61f52` | 199935 / 199901 |
| classical-ghada-ar-A | غادة | a | `e7402e9c-2554-4622-b7fc-a450441e03d1` | `993d69fabe01ed7a` | 199901 / 199867 |
| classical-ghada-ar-A | غادة | b | `afdad6c2-066b-4829-9c8d-fb4bf1339a8c` | `993d69fabe01ed7a` | 199901 / 199867 |
| classical-duha-ar-A | ضحى | a | `f1b48cc3-0dd8-4216-89d6-40053ff7cd7b` | `bafe6b65c8737324` | 199867 / 199833 |
| classical-duha-ar-A | ضحى | b | `3ed1238b-7ddd-44a7-8226-47c429c73dd3` | `bafe6b65c8737324` | 199867 / 199833 |
| classical-zafir-ar-A | ظافر | a | `53fc71c9-bb3c-42a3-8e41-5f9de67387b0` | `d6e92aa86e20b723` | 199833 / 199799 |
| classical-zafir-ar-A | ظافر | b | `8ccecc8d-d5eb-4a32-80bd-7f4643d087ad` | `d6e92aa86e20b723` | 199833 / 199799 |
| classical-dhikra-ar-A | ذكرى | a | `cd35e41b-6721-48f7-9879-b3be39079430` | `3a8e2acab93e5284` | 199799 / 199765 |
| classical-dhikra-ar-A | ذكرى | b | `0605aeba-a721-4de9-9f1c-bf08e8226f96` | `3a8e2acab93e5284` | 199799 / 199765 |
| classical-tasneem-ar-A | تسنيم | a | `8c0a63ab-190f-4c69-85ff-12ae3ba16474` | `f422a9c48e55bac4` | 199765 / 199731 |
| classical-tasneem-ar-A | تسنيم | b | `3d6adf1c-5fe8-4ca7-98fe-64c3a16371a4` | `f422a9c48e55bac4` | 199765 / 199731 |
| classical-mumin-ar-A | مؤمن | a | `58ef9d1c-2b1e-4f1f-8ccd-4baecf1d4fd8` | `89f2a81a763e48e2` | 199731 / 199697 |
| classical-mumin-ar-A | مؤمن | b | `f611197a-138e-441f-8e45-576ba58d3434` | `89f2a81a763e48e2` | 199731 / 199697 |

The viewer scores these on the same five points as part 1, plus the one wording A is meant to move: are the dots bridged to their letters with a visible gold bar rather than floating or touching at a point, and do the ring tabs stay plain instead of curling into a stroke that reads as an extra letter? Compare against UNIV-1's classical cells for the same construction, which used the short wording.
