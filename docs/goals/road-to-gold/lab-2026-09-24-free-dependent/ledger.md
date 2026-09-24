# Image lab ledger - 2026-09-24 - free dependent views (SP-2f2)

## Pass bar (fixed before any generation)

Every cell passes spelling, one piece, and "same piece as the master" on all three views (on_skin, close_up, dark) on both takes (`a` and `b`).
A cell that fails narrows the free route for that construction/script, or stops the free route.

## Run

Model: `gpt-image-2.5-sunburst` via Runway MCP, count 2, default size, ratio from `index.json` (on_skin 4:5, close_up 1:1, dark 9:16), compiler `caleums-still-compiler-v4`.
Prompts: the exact bytes in `prompts/*.txt`; each promptText was written to the scratchpad and its sha256 checked against `index.json` before the call.
References, in `index.json` order: Image 1 master (SP-2d take-a studio, `lab-2026-09-24-free-route/img/<cell>-a.png`), Image 2 look (the construction's production look crop), Image 3 style (the view's style anchor after production's low-pass).
No reference image, look crop or style anchor is in git; they are private-brand-reference.
Credits: 203329 before the run, 202417 after, so 912 credits for 48 stills (24 calls x 2 takes, 38 credits per call).
Evidence: `tasks.tsv` lists every Runway task id and prompt sha256; full-size PNGs stay local in `img/` (`<cell>-<view>-<a|b>.png`). No signed URL is recorded here.
Failures: none. All 48 tasks SUCCEEDED on the first attempt; no retry, no moderation refusal.

## References

| image | source | sha256 of the bytes sent |
| --- | --- | --- |
| master | `lab-2026-09-24-free-route/img/<cell>-a.png`, unchanged | per file in that directory |
| look, classical and framed-minimal | classical production look crop, uploaded earlier this session | not re-hashed here |
| look, diamond-rails | diamond-rails production look crop, uploaded earlier this session | not re-hashed here |
| style, on_skin | `image.worn` anchor (source sha256 `eef192cb...ec74a`) after production low-pass | `a7d47f6673f8872a73dc52b6ac46acc2d740ca1a5f7e450540937c854bf6c4ce` |
| style, close_up | `image.macro_gift` anchor (source sha256 `44ec17da...faadaa5`) after production low-pass | `98cf82a6baafda408f81b8ccf22fe6b434dea022b9c6c148875c1114e447fae6` |
| style, dark | `image.dark_editorial` anchor (source sha256 `fd70d5d7...ab309`) after production low-pass | `4555b7bd771282c529e96371ddb39d5f43a4e342186e1443b104a26ff0817ef0` |

Style bytes were produced by calling the real `SupabasePresentationRepository.signedStyleAnchorUrl` (`apps/jobs/src/presentation.ts`) from a scratch script with `fetch` stubbed to serve the private anchor PNG; the transform is production's own `sharp` chain (resize 256 wide, blur 20, resize 1024 wide, PNG), sharp 0.35.4 as pinned.
The three source sha256 values equal the `checksum_sha256` of the published `style_anchor_releases` rows read from Supabase, so the source objects are the ones production fetches.
Caveat: the transform ran on macOS; production runs the same sharp version on Linux, and PNG encoder output across platforms is expected but not proven to be byte-identical.

## Verdicts

Scored blind against the Pass bar above by a viewer that did not generate these stills.
Every one of the 48 candidates was opened and compared letter by letter against its master (`lab-2026-09-24-free-route/img/<cell>-a.png`); ambiguous joins were re-read at 2x crops.

### Per image

| cell | view | take | spelling | one_piece | same_piece | verdict | note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| classical-omar-en | on_skin | a | pass | pass | pass | pass | none |
| classical-omar-en | on_skin | b | pass | pass | pass | pass | none |
| classical-omar-en | close_up | a | pass | pass | pass | pass | right bail reads as a gap at first look; at 2x the r's upper arm runs into the jump ring |
| classical-omar-en | close_up | b | pass | pass | pass | pass | same right-bail check as take a; connected at 2x |
| classical-omar-en | dark | a | pass | pass | pass | pass | none |
| classical-omar-en | dark | b | pass | pass | pass | pass | none |
| classical-asma-en | on_skin | a | pass | pass | pass | pass | none |
| classical-asma-en | on_skin | b | pass | pass | pass | pass | none |
| classical-asma-en | close_up | a | pass | pass | pass | pass | none |
| classical-asma-en | close_up | b | pass | pass | pass | pass | none |
| classical-asma-en | dark | a | pass | pass | pass | pass | none |
| classical-asma-en | dark | b | pass | pass | pass | pass | none |
| classical-love-en | on_skin | a | pass | pass | pass | pass | rose reads warmer than the studio master under the worn-scene light; measured hue 29 vs 40 for the yellow-gold cells in the same scene, so the rose is kept |
| classical-love-en | on_skin | b | pass | pass | pass | pass | same warm rose cast as take a; measured hue 30 |
| classical-love-en | close_up | a | pass | pass | pass | pass | none |
| classical-love-en | close_up | b | pass | pass | pass | pass | none |
| classical-love-en | dark | a | pass | pass | pass | pass | none |
| classical-love-en | dark | b | pass | pass | pass | pass | none |
| classical-muhammad-en | on_skin | a | pass | pass | pass | pass | none |
| classical-muhammad-en | on_skin | b | pass | pass | pass | pass | none |
| classical-muhammad-en | close_up | a | pass | pass | pass | pass | d ascender into the ring is soft-focus; connected at 2x |
| classical-muhammad-en | close_up | b | pass | pass | pass | pass | none |
| classical-muhammad-en | dark | a | pass | pass | pass | pass | none |
| classical-muhammad-en | dark | b | pass | pass | pass | pass | none |
| classical-muhammad-ar | on_skin | a | pass | pass | pass | pass | none |
| classical-muhammad-ar | on_skin | b | pass | pass | pass | pass | none |
| classical-muhammad-ar | close_up | a | pass | pass | pass | pass | none |
| classical-muhammad-ar | close_up | b | pass | pass | pass | pass | none |
| classical-muhammad-ar | dark | a | pass | pass | pass | pass | none |
| classical-muhammad-ar | dark | b | pass | pass | pass | pass | none |
| diamond-rails-muhammad-ar | on_skin | a | pass | pass | pass | pass | one top strut and one bottom strut are hidden by the viewing angle; rails and letters unchanged |
| diamond-rails-muhammad-ar | on_skin | b | pass | pass | pass | pass | none |
| diamond-rails-muhammad-ar | close_up | a | pass | pass | pass | pass | none |
| diamond-rails-muhammad-ar | close_up | b | pass | pass | pass | pass | none |
| diamond-rails-muhammad-ar | dark | a | pass | pass | pass | pass | none |
| diamond-rails-muhammad-ar | dark | b | pass | pass | pass | pass | none |
| framed-minimal-muhammad-ar | on_skin | a | pass | pass | pass | pass | none |
| framed-minimal-muhammad-ar | on_skin | b | pass | pass | pass | pass | none |
| framed-minimal-muhammad-ar | close_up | a | pass | pass | pass | pass | none |
| framed-minimal-muhammad-ar | close_up | b | pass | pass | pass | pass | none |
| framed-minimal-muhammad-ar | dark | a | pass | pass | pass | pass | none |
| framed-minimal-muhammad-ar | dark | b | pass | pass | pass | pass | none |
| framed-minimal-salma-ar | on_skin | a | pass | pass | pass | pass | none |
| framed-minimal-salma-ar | on_skin | b | pass | pass | pass | pass | none |
| framed-minimal-salma-ar | close_up | a | pass | pass | pass | pass | none |
| framed-minimal-salma-ar | close_up | b | pass | pass | pass | pass | none |
| framed-minimal-salma-ar | dark | a | pass | pass | pass | pass | none |
| framed-minimal-salma-ar | dark | b | pass | pass | pass | pass | none |

### Per cell

| cell | text | verdict | failing check |
| --- | --- | --- | --- |
| classical-omar-en | `Omar` | pass | - |
| classical-asma-en | `Asma` | pass | - |
| classical-love-en | `Love` | pass | - |
| classical-muhammad-en | `Muhammad` | pass | - |
| classical-muhammad-ar | `محمد` | pass | - |
| diamond-rails-muhammad-ar | `محمد` | pass | - |
| framed-minimal-muhammad-ar | `محمد` | pass | - |
| framed-minimal-salma-ar | `سلمى` | pass | - |

**Result: 8 of 8 cells pass.** All 48 stills spell the intended text, read as one castable piece, and match their master's letterforms, frame or rails, two-bail placement and metal colour.

Presentation notes that did not fail anything: the two `classical-omar-en` close-ups and `classical-muhammad-en-close_up-a` put the right bail in soft focus, so the join only resolves at a 2x crop; `diamond-rails-muhammad-ar-on_skin-a` hides one strut top and bottom behind the viewing angle; the `classical-love-en` worn stills read as warm gold to the eye, and the rose is only obvious by measurement (pendant hue 29-31 against 38-40 for the yellow-gold cells shot in the same scene, matching the masters' 28.5 against 40.5).

## Reader replay (lead, after the viewer)

The production `OpenAIPieceReader` and `OpenAINameReader` (`gpt-5.6-luna`, detail high, as deployed at `2989ce0`) read each of the 48 stills once, piece and name concurrently; estimated cost USD 0.7025.
Name reader: 47 of 48 match. The one miss, `classical-asma-en-close_up-a`, was read as "Asmaa"; I looked at it and it plainly reads Asma, so it is a false refusal.
Piece reader: 40 of 48 one piece. All 8 refusals are framed-minimal (8 of its 12 stills; classical and diamond-rails 36 of 36):

| still | reader's reason, shortened |
| --- | --- |
| `framed-minimal-muhammad-ar-close_up-a` | However, the name is visibly separated from the frame: background gaps remain above it, below it, and along the sides, including between the tall left stroke and the top ... |
| `framed-minimal-muhammad-ar-dark-a` | However, the lettering is visibly separated from the surrounding frame, especially above the bottom rail and along the other sides, with dark background gaps showing thro... |
| `framed-minimal-muhammad-ar-dark-b` | However, the lettering is separated from the bottom frame rail by a visible dark gap/background, so the name is a separate floating piece rather than part of one continuo... |
| `framed-minimal-muhammad-ar-on_skin-a` | The rectangular frame, its top and bottom rails, side rails, and the two suspension rings appear continuously joined. The Arabic calligraphic name sits separately inside ... |
| `framed-minimal-salma-ar-close_up-b` | However, the lettering is visibly separated from the surrounding frame/bottom rail by a narrow dark/background gap, so the name is not continuous with the frame.... |
| `framed-minimal-salma-ar-dark-a` | However, a visible dark/background gap separates the bottom of the lettering from the lower rectangular rail, so the name is not connected to the frame. This makes the pe... |
| `framed-minimal-salma-ar-dark-b` | However, the Arabic name remains separated from the bottom frame by a visible dark/background gap, so the lettering and frame are not one continuous piece.... |
| `framed-minimal-salma-ar-on_skin-a` | However, the name sits separately inside the frame: background is visible as a gap between the lower edges/baseline of the lettering and the bottom horizontal rail. The l... |

I looked at `framed-minimal-muhammad-ar-close_up-a`, `-dark-b` and `framed-minimal-salma-ar-dark-a` against their masters: the محمد word rests on the inner rail that runs side to side, and the سلمى word is tied to the top rail by the lam strut, so each is one piece; the reader reads a shadow line along the bottom rail as a break and ignores the joint that holds the word.
Verdict: the stills pass the pass bar (viewer 8 of 8 cells); the production piece gate does not yet read a framed pendant correctly in dark, close-up and on-skin light. That is a reader defect, not a free-route defect, and it applies to framed-minimal dependent views on the stencil route too; it is task SP-2a3. The free route for framed-minimal waits for it.
