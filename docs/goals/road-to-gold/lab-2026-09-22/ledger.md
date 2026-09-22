# Image lab ledger - 2026-09-22

Model: `gpt-image-2.5-sunburst`, ratio 1:1, default imageSize, via Runway.
Every result was downloaded to `img/<id>.png` and looked at before judging.
Every stencil printed `passed:true` from the lab copy of `renderIdentityAnchor` (lettering `kufi`, English caps use the Cairo caps face, Arabic uses NotoKufiArabic).
Omran reference crops live only in the session scratchpad; the repo holds only generated images and stencils.

Total generations: 49 of the 60 cap.

## Reference order and tags (all generations)

`referenceImages[0]` = stencil, tag `stencil`; in the prompt it is "Image 1 (stencil)".
`referenceImages[1]` = look crop, tag `look`; in the prompt it is "Image 2 (look)". Omitted where "look" is "-".

Look crops (scratchpad only, never committed):

| look | source image | crop box (x0,y0,x1,y1) |
|---|---|---|
| look36 | Omran image 36 (origami ASMA with four stones) | (200,560,915,803) |
| look33 | `33_20260829T125842Z_Omran.jpg` (framed) | (215,488,925,860) |
| look32 | `32_20260829T125842Z_Omran.jpg` (rails) | (170,535,955,790) |

## Stencils

| key | construction | LAB_WGHT | LAB_TRACK | used by |
|---|---|---|---|---|
| cls-w800 | classical (also origami-ribbon, same geometry) | 800 | 60 (Arabic 0) | origami, classical ASMA/NOOR/Arabic |
| cls-w600 | classical | 600 | 40 (Arabic 0) | round-1 c1/c3, long-template classical confirmation |
| cls-w800-t120 | classical | 800 | 120 | MUHAMMAD origami + classical (minimal round) |
| framed | framed-minimal | 800 | 60 (Arabic 0) | all framed |
| rails-w800 | diamond-rails | 800 | 60 | r1, r2 |
| rails-w500 | diamond-rails | 500 | 60 (Arabic 0) | r3 and all later rails |

Stencil PNGs for ASMA are in `stencils/`; `stencils/st-muhammad-classical-w800-t120.png` is the MUHAMMAD fix.

## Generations

Template L = long template (production-order, ~3.2-4.3 kB). Template M = minimal style-first template (`final/` files, ~1.4-1.8 kB). Length is bytes of `prompts/<id>.txt`.

| # | id | style | variant | name | stencil | look | tmpl | bytes | verdict | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | o1 | origami | plain | ASMA | cls-w800 | look36 | L | 4006 | pass | crisp large fold planes |
| 2 | o2 | origami | stones | ASMA | cls-w800 | look36 | L | 4343 | pass | stones at fold points like 36 |
| 3 | f1 | framed | plain | ASMA | framed | - | L | 3381 | pass | stencil weld jogs visible |
| 4 | f2 | framed | plain | ASMA | framed | look33 | L | 3697 | pass | |
| 5 | f3 | framed | stones | ASMA | framed | look33 | L | 3934 | pass | closest to 33 |
| 6 | r1 | rails | plain | ASMA | rails-w800 | look32 | L | 3599 | pass | |
| 7 | r2 | rails | stones | ASMA | rails-w800 | look32 | L | 3923 | pass | |
| 8 | r3 | rails | stones | ASMA | rails-w500 | look32 | L | 3923 | pass | closest to 32 |
| 9 | c1 | classical | plain | ASMA | cls-w600 | - | L | 3199 | pass | bridge bumps visible |
| 10 | c2 | classical | plain | ASMA | cls-w800 | look33 | L | 3479 | pass | cleanest |
| 11 | c3 | classical | stones | ASMA | cls-w600 | - | L | 3431 | pass | |
| 12 | o-noor | origami | plain | NOOR | cls-w800 | look36 | L | 4006 | pass | |
| 13 | o-muh | origami | plain | MUHAMMAD | cls-w800 | look36 | L | 4010 | fail | bridge knobs above U/M, hook on D ring |
| 14 | o-ar | origami | plain | أسماء | cls-w800 | look36 | L | 4012 | pass* | spelling right; engine ring stalk off ء reads as an extra stroke |
| 15 | os-muh | origami | stones | MUHAMMAD | cls-w800 | look36 | L | 4347 | fail | knobs, crowding |
| 16 | f-noor | framed | plain | NOOR | framed | look33 | L | 3697 | pass | |
| 17 | f-muh | framed | plain | MUHAMMAD | framed | look33 | L | 3701 | pass | small bridge knobs |
| 18 | f-ar | framed | plain | أسماء | framed | look33 | L | 3703 | pass | |
| 19 | fs-muh | framed | stones | MUHAMMAD | framed | look33 | L | 3938 | pass | |
| 20 | r-noor | rails | plain | NOOR | rails-w500 | look32 | L | 3599 | pass | |
| 21 | r-muh | rails | plain | MUHAMMAD | rails-w500 | look32 | L | 3603 | pass | stencil stubs visible |
| 22 | r-ar | rails | plain | أسماء | rails-w500 | look32 | L | 3605 | pass | large hollow connector from rail to alif (stencil) |
| 23 | rs-muh | rails | stones | MUHAMMAD | rails-w500 | look32 | L | 3927 | pass | |
| 24 | c-noor | classical | plain | NOOR | cls-w600 | - | L | 3199 | pass | |
| 25 | c-muh | classical | plain | MUHAMMAD | cls-w600 | - | L | 3203 | fail | bridge knobs, D ring hook |
| 26 | c-ar | classical | plain | أسماء | cls-w600 | - | L | 3205 | pass* | ring stalk defect |
| 27 | cs-muh | classical | stones | MUHAMMAD | cls-w600 | - | L | 3435 | pass | |
| 28 | m-o | origami | plain | ASMA | cls-w800 | look36 | M | 1560 | pass | as good as o1 at 39% of the length |
| 29 | m-f | framed | plain | ASMA | framed | look33 | M | 1573 | pass | |
| 30 | m-r | rails | plain | ASMA | rails-w500 | look32 | M | 1557 | pass | |
| 31 | m-c | classical | plain | ASMA | cls-w800 | look33 | M | 1425 | pass | no frame leaked from look33 |
| 32 | mo-noor | origami | plain | NOOR | cls-w800 | look36 | M | 1560 | pass | |
| 33 | mo-muh | origami | plain | MUHAMMAD | cls-w800-t120 | look36 | M | 1564 | pass (minor) | knobs gone; MM touch as in stencil; facets smaller than 36 |
| 34 | mo-ar | origami | plain | أسماء | cls-w800 | look36 | M | 1624 | pass* | ring stalk defect |
| 35 | mos-muh | origami | stones | MUHAMMAD | cls-w800-t120 | look36 | M | 1745 | fail | square seat outside M reads as an extra I |
| 36 | mf-noor | framed | plain | NOOR | framed | look33 | M | 1573 | pass | |
| 37 | mf-muh | framed | plain | MUHAMMAD | framed | look33 | M | 1577 | pass | |
| 38 | mf-ar | framed | plain | أسماء | framed | look33 | M | 1637 | pass | |
| 39 | mfs-muh | framed | stones | MUHAMMAD | framed | look33 | M | 1692 | pass | four corner bezels |
| 40 | mr-noor | rails | plain | NOOR | rails-w500 | look32 | M | 1557 | pass | |
| 41 | mr-muh | rails | plain | MUHAMMAD | rails-w500 | look32 | M | 1561 | pass | stencil stubs |
| 42 | mr-ar | rails | plain | أسماء | rails-w500 | look32 | M | 1621 | pass* | hollow rail connector (stencil) |
| 43 | mrs-muh | rails | stones | MUHAMMAD | rails-w500 | look32 | M | 1709 | pass | 2 top, 1 bottom-centre |
| 44 | mc-noor | classical | plain | NOOR | cls-w800 | look33 | M | 1425 | pass | |
| 45 | mc-muh | classical | plain | MUHAMMAD | cls-w800-t120 | look33 | M | 1429 | pass | clean, knobs gone |
| 46 | mc-ar | classical | plain | أسماء | cls-w800 | look33 | M | 1489 | pass* | ring stalk defect |
| 47 | mcs-muh | classical | stones | MUHAMMAD | cls-w800-t120 | look33 | M | 1550 | fail | stones set inside the ring holes |
| 48 | mos2-muh | origami | stones | MUHAMMAD | cls-w800-t120 | look36 | M | 1780 | pass (minor) | stones in M, A, D faces; facets busier than 36 |
| 49 | mcs2-muh | classical | stones | MUHAMMAD | cls-w800-t120 | look33 | M | 1583 | pass | stones on M and D faces, rings open and threaded |

`pass*` = the model reproduced the stencil faithfully; the defect is in the stencil engine, not the prompt.

## Winners

The exact promptText of each final passing generation is in `final/<style>-<variant>-<name>.txt` (byte-identical to what was sent).
Contact sheets of the final generations are in `sheets/<style>-final.png` (generated images only).

| lead-1 | classical | plain | Asma (Playfair classic, as typed) | pass-7 engine, classic lettering | production-compiled minimal prompt (name line without capitals) | look-framed-33 | PASS: calm polished nameplate, spelling exact, both rings threaded; right ring tab sits on the a like an accent (stencil) | task 41e6b8d9 |

## v5 engine proof (23 Sep, sunburst, production-compiled prompts)

10/10 generated (180 credits). Pass: rails MUHAMMAD/ASMA/NOOR/أسماء, framed MUHAMMAD/أسماء, origami MUHAMMAD, rails 3 stones (one of each). Minor: classical Asma right ring tab still reads like an accent (engine seat, lab decision). Fail: framed 3 stones doubled the ruby - corner wording sent to fix. Sheet: sheets/v5-engine-proof.png.
