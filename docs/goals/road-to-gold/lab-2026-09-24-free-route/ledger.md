# Image lab ledger - 2026-09-24 - free route (SP-2d)

Model: `gpt-image-2.5-sunburst`, ratio 1:1, via Runway MCP, compiler `caleums-still-compiler-v4`.
Question: can a studio still be photographed from a free prompt, with no stencil image, and still spell the name as one connected piece?
The prompts are the exact bytes the production compiler emits on the free route (`prompts/*.txt`, sha256 in `index.json` and `tasks.tsv`); the only image sent is the construction's look reference.
Credits: 206133 before the run, 205793 after, so 340 credits for 20 stills (10 cells, two takes each, `a` and `b`).
Evidence: `tasks.tsv` lists every Runway task id, so any image can be fetched again with `get_task`; full-size PNGs stay local in `img/`.
No signed URL is recorded here.

## Cells

| cell | name | language | construction | metal |
| --- | --- | --- | --- | --- |
| classical-muhammad-ar | محمد | ar | classical | yellow |
| origami-ribbon-muhammad-ar | محمد | ar | origami-ribbon | yellow |
| framed-minimal-muhammad-ar | محمد | ar | framed-minimal | yellow |
| diamond-rails-muhammad-ar | محمد | ar | diamond-rails | yellow |
| classical-layla-ar | ليلى | ar | classical | yellow |
| framed-minimal-salma-ar | سلمى | ar | framed-minimal | yellow |
| classical-muhammad-en | Muhammad | en | classical | yellow |
| classical-omar-en | Omar | en | classical | yellow |
| classical-love-en | Love | en | classical | rose |
| classical-asma-en | Asma | en | classical | yellow |

## Viewer scores (blind, from the pixels)

Full table with the crop each verdict rests on: `viewer-scores.md`.

| cell | spelling | one piece | construction |
| --- | --- | --- | --- |
| classical-muhammad-ar | 2/2 | 2/2 | 2/2 |
| origami-ribbon-muhammad-ar | 0/2 (م lost its loop; reads لحمد or الحد) | 2/2 | 2/2 |
| framed-minimal-muhammad-ar | 2/2 | 2/2 | 2/2 |
| diamond-rails-muhammad-ar | 2/2 | 2/2 | 2/2 |
| classical-layla-ar | 2/2 | 0/2 (dots under ي touch at a corner or hang with a gap) | 2/2 |
| framed-minimal-salma-ar | 2/2 | 2/2 | 2/2 |
| classical-muhammad-en | 2/2 | 2/2 | 2/2 |
| classical-omar-en | 2/2 | 2/2 | 2/2 |
| classical-love-en | 2/2 | 2/2 | 2/2 |
| classical-asma-en | 2/2 | 2/2 | 2/2 |

Spelling 18 of 20, one piece 18 of 20, construction 20 of 20; all three pass on 16 of 20.

## Reader replay (production readers on the same 20 stills)

The production `OpenAIPieceReader` and `OpenAINameReader` were run on all 20 stills, model from `.env`, for USD 0.35.

| cell | take | name reader | piece reader | viewer one piece | piece reader verdict |
| --- | --- | --- | --- | --- | --- |
| classical-muhammad-ar | a, b | match, match | true, true | pass, pass | agrees |
| origami-ribbon-muhammad-ar | a, b | match, match | true, true | pass, pass | agrees on the piece; the name reader passed two misspellings |
| framed-minimal-muhammad-ar | a, b | match, match | true, true | pass, pass | agrees |
| diamond-rails-muhammad-ar | a | match | true | pass | agrees |
| diamond-rails-muhammad-ar | b | match | false | pass | false refusal |
| classical-layla-ar | a, b | match, match | false, false | fail, fail | true refusals |
| framed-minimal-salma-ar | a | match | false | pass | false refusal |
| framed-minimal-salma-ar | b | match | true | pass | agrees |
| classical-muhammad-en | a, b | match, match | true, true | pass, pass | agrees |
| classical-omar-en | a | match | false | pass | false refusal |
| classical-omar-en | b | match | true | pass | agrees |
| classical-love-en | a, b | match, match | false, false | pass, pass | false refusals |
| classical-asma-en | a, b | match, match | true, true | pass, pass | agrees |

Name reader: matched 20 of 20, including both origami-ribbon misspellings.
Piece reader: refused both broken ليلى stills, and falsely refused 5 of the 18 stills the viewer passed as one piece.

## Route decision

Dotted Arabic moves to the stencil. After review the Arabic rule became an allowlist: a letter routes free only if it is one of ا ح د ر س ص ط ع ل م ه و ى (`ARABIC_FREE_LETTERS` in `packages/identity/src/still-route.ts`), and every other Arabic letter routes with reason `arabic_letter_not_proven`.
Of those, the lab measured م ح د س ل ى; the rest are admitted on shape, because they have no dot, hamza, madda or separate stroke in any form.
The `still-route.ts` header had pre-registered this: if the lab showed a material failure rate on dotted letters, they would route wide like the rest; ليلى failed 2 of 2.
Origami-ribbon Arabic moves to the stencil with reason `arabic_print_construction:origami-ribbon`, because the free prompt misspelled محمد 2 of 2 and nothing after generation caught it.
Latin capital-plus-lowercase in classical (Muhammad, Omar, Love, Asma) passed 8 of 8 and stays free.
Undotted, gap-free Arabic in classical, framed-minimal and diamond-rails (محمد, سلمى) passed 8 of 8 and stays free.
In the same change, the cases the lab did not prove were closed wide: Arabic with no known construction (`arabic_construction_unknown`), Arabic presentation forms (read after NFKC and flagged `arabic_presentation_form`), any other compatibility form (`compatibility_form`), any combining mark such as harakat or shadda (`combining_mark`), text with no letter (`no_letter`), text that differs from the approved name in the specification (`approved_text_mismatch`), a Latin capital after the first letter (`latin_inner_capital`), and any Latin letter outside plain A-Z and a-z (`latin_letter_not_proven`).
`lab-diff` pins the Arabic rule by drawing every code point in U+0600-06FF, U+0750-077F and U+08A0-08FF and asserting that exactly the allowlist routes free as the last letter, and exactly its forward-joining letters as a middle letter.
`lab-diff` now compares the 8 cells that still route free, asserts the two new stencil routes and the two kept free routes, and keeps `classical-layla-ar.txt` and `origami-ribbon-muhammad-ar.txt` as evidence only.

## Reader findings

The name reader cannot be the spelling gate for origami-ribbon Arabic: it read محمد on two stills a person reads as لحمد and الحد.
The piece reader is right on true breaks but refuses about 1 in 4 good free stills (5 of 18), which costs a retry each time rather than a wrong pendant.
A live staging studio (run `440f6323`, rose gold origami-ribbon Asma, stencil route) was refused `identity_not_one_piece`, and the same still passes 3 of 3 when read again, so the piece reader is also noisy on the stencil route.
Both findings are open for the lead: the piece reader's false refusal rate, and a spelling check that does not depend on the name reader for print constructions.
