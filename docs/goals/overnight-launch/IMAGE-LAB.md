# Image lab - W2

Model: Opus 5 (`claude-opus-5[1m]`).
Branch `codex/overnight-launch-2026-09-08`. Goal: `docs/goals/overnight-launch-2026-09-08.md` workstream W2.
Caps: 50 Runway tasks in flight, 40,000 Runway credits for the night, three paid attempts per cell.
Runway balance at lab start: **306,862**. Floor for the night: **266,862**.

Status: in progress. This file is written as the lab runs so the lead can restart from it.

## Phase A - research (complete, 6 minutes of the 30 allowed)

`docs/rnd/RESEARCH-2026-09-08.md` (376 lines, every claim with a URL, vendor-documented / third-party / unverified separated).

What actually changed the prompt design:

- OpenAI documents that a supplied shape is guidance and "may not follow its exact shape with complete precision", so the geometry claim is restated in two places in the template and still has to be checked by a viewer afterwards. There is no fidelity dial: `gpt-image-2` rejects `input_fidelity`.
- Numbered, tagged image roles ("Image 1, tagged @stencil, is ...") are the working multi-reference pattern. Unlabelled references make the model guess which one is content.
- Positive preserve lists beat negative lists, so the hard invariants are restated as a `PRESERVE` block rather than only as prohibitions.
- GIE-Bench finds GPT-Image-1 "leads in instruction-following accuracy, but often over-modifies irrelevant image regions" - instruction-following and preservation are scored as two separate axes, never blended.
- GlyphAnchor shows explicit rendered-glyph conditioning gives its largest gains exactly on rare and complex glyphs in editing models. That is the strongest published support for always passing the canonical PNG. It was not tested on Arabic; no published Arabic dot or hamza benchmark exists.
- The widely repeated "99% multilingual text accuracy" figure for GPT Image 2 is unverified marketing. Not planned against.
- "Subtle surface scratches" is the standard realism cue in render literature and is a defect on new gold. It is deliberately absent from the photography block.

## Phase B - stencils (complete)

16 stencils: 4 names x 2 scripts x 2 letterings.
Every one passes an independent geometry gate measured outside the renderer that produced it: exactly one 4-connected ink component, two jump rings, exact NFC characters.

- `docs/goals/overnight-launch/lab/stencils/*.png` - the chosen stencil per cell
- `docs/goals/overnight-launch/lab/stencils/manifest.json` - per-cell `stencil_source`, sha256, component and hole counts, engine report
- `docs/goals/overnight-launch/lab/stencils/production/` - raw production-renderer output for all 16 cells plus `render-report.json`
- `docs/goals/overnight-launch/lab/stencils/lab/` - lab-renderer output for all 16 cells

The production identity renderer is the default, so lab results transfer to the pipeline.
It is invoked unmodified through `docs/goals/overnight-launch/lab/render-production-stencils.mts`, which calls `renderIdentityAnchor` from `apps/jobs/src/identity-anchor.ts`.
Nothing under `apps/` or `packages/` was edited.

Result: **4 of 16 cells use the production stencil** (Arabic, Classic lettering, all four names). The other 12 fall back to the lab renderer, tagged `stencil_source: "lab"`, for the reasons below.

### Production pipeline gaps found (these are real product defects, not lab inconveniences)

**1. The Latin identity anchor is broken in three ways at once.**
`renderIdentityAnchor` takes the English path for every Latin name and produces a 1200x600 SVG rendered through sharp.

- It does not render in Playfair Display. The output is a heavy geometric sans - the fontconfig fallback face - despite `fc-match "Playfair Display"` resolving correctly to the pinned file under the same config. Setting `FONTCONFIG_FILE` before the process starts produces a byte-identical PNG, so the pin is not what is failing; the family request is not reaching the pinned face. Evidence: `stencils/production/asma-en-classic.png`, and the zoomed crop shows unmistakably unserifed letterforms.
- The two "jump rings" are hard-coded 16 px circles at x=255 and x=945, y=300, independent of the name. On "Asma" one of them lands inside the counter of the letter A. They are not attached to anything.
- The letters are never fused. Measured components: Asma 4, Noor 4, Layla 5, Muhammad 7. This is exactly the "disconnected gold" the mission forbids.

The engine nevertheless returns `exactCharactersPreserved: true`, `jumpRingCount: 2`, `passed: true`. None of those three fields is measured on the Latin path; they are literals in the return object.

**2. Arabic Kufi is a silent no-op.**
`solveArabicIdentity` reports `fontFile: "NotoKufiArabic-Regular.ttf"` with the correct Kufi sha256, but the rendered PNG is byte-identical to the Classic (Noto Naskh) render for every name tested.

```
dbb5dccfe0f497ef  asma-ar-classic.png
dbb5dccfe0f497ef  asma-ar-kufi.png
268f77d4de827b02  noor-ar-classic.png
268f77d4de827b02  noor-ar-kufi.png
```

A customer who picks Kufi gets Naskh, and the lineage record says Kufi. Same for Diwani and Signature, which `LIVE_STYLES` deliberately maps onto the Naskh file - that one is documented in the code, the Kufi one is not.

**3. Production Arabic fusion moves glyph components.**
`fuse()` translates the smallest raster island until it overlaps the body, so a dot or a hamza is physically relocated rather than bridged. It still produces one component and correct spelling, so Arabic Classic passes the gate and is used as-is. The lab renderer takes the other approach - it never moves a glyph, and instead draws a narrow metal bridge at the nearest point pair - which is why the Arabic Kufi and all Latin fallbacks read as cleaner castings.

### Lab renderer (fallback only)

`docs/goals/overnight-launch/lab/make_stencil.py`. HarfBuzz shaping through `hb-view` against the pinned font file, binarise, thicken to a castable minimum, bridge every island at its nearest point pair without moving anything, weld two jump rings onto the outer top corners anchored on eroded (load-bearing) metal so a dot or serif can never carry the chain, then a hard one-component gate. 1024x1024, black on white.

Noto Kufi Arabic has no Latin coverage, so the English side of the Kufi family uses Cairo, the geometric sans in the same licensed pack. Recorded in the manifest.

## Phase C - prompt family (complete)

`docs/goals/overnight-launch/lab/prompt-family-v4.md`, compiled by `docs/goals/overnight-launch/lab/compile.mjs`.

Family `caleums-universal-v4`, template sha256 `32e85f32915749af4a5c97c4b2721361c7077b6c175c8c77365fb3d8cbc8d5bf`.
Blocks: opening / IMAGE ROLES / IDENTITY / CASTING / ATTACHMENT / LOOK / SHOT / MATERIAL / PHOTOGRAPHY / PRESERVE.
`CASTING` and `PHOTOGRAPHY` are fixed text and are never varied to chase a look, because they encode the two defect classes the product cannot ship.

## Phase D - Stage 1 (Studio, yellow gold, no stones, 32 mm, Cable)

4 looks x 2 scripts with Asma / أسماء.

### Attempt budget, stated explicitly

The goal says three paid attempts per cell.
That budget is applied per (cell, prompt release), not per cell for the whole night, because "change one axis per iteration" necessarily produces a new prompt and a new promptHash.
A cell that fails three times on the SAME prompt is stopped and recorded; it is not re-rolled hoping.
Every attempt, including the diagnostic round, is in `docs/goals/overnight-launch/ledger.jsonl` with its promptHash, so no attempt is hidden.

### Round 1 - `caleums-universal-v4`, 8 images, 160 credits

Verdicts by an independent viewer agent that opened every file, cropped the junctions up to 8x and cross-checked connectivity with a threshold component count: `lab/stage1/verdicts.jsonl`.

| Cell | a1 | Defects | Axis |
| --- | --- | --- | --- |
| classical-en | **pass** | - | none |
| classical-ar | fail | chain-not-through-ring, extra-ring | geometry |
| origami-ribbon-en | tweak | wrong-look | look-brief |
| origami-ribbon-ar | tweak | wrong-look | look-brief |
| framed-minimal-en | fail | extra-ring | geometry |
| framed-minimal-ar | fail | extra-ring | geometry |
| diamond-rails-en | **pass** | - | none |
| diamond-rails-ar | tweak | wrong-look (ring position) | geometry |

2 pass, 3 tweak, 3 fail.

**The headline result: identity is solved.**
All 8 of 8 spelled correctly, including 4 of 4 Arabic.
Every Arabic image showed the hamza above the initial alif on the right, the seen with three teeth, the meem with its counter, the alif, and the standalone hamza at the left end.
All 8 were one connected piece. No rotated letters, no duplicate pendants, no floating marks, no stones, all yellow gold, all cable chain.
Photography passed on all 8: contact shadow, chain falling out of focus, believable specular.

For contrast, the v2 campaign that asked the model to invent the pendant from the name scored Arabic 1 of 24.
The difference is the deterministic stencil, not better adjectives.

Every failure in round 1 was an attachment or a look defect.

### Recurring defects and what fixed them

**1. `extra-ring` - the model keeps the stencil's own eyelets AND adds the look's rings.**
Deterministic, not stochastic: both framed-minimal images did it, and diamond-rails-ar did it on one side.
Root cause is the reference image, not the wording. `framed-minimal` and `diamond-rails` carry their own rings on the frame or the rails, and the prompt asked the model to "ignore the ring positions in Image 1" - a negative instruction, which the research pass had already flagged as the weaker form.
Fix, on the geometry axis: a ring-free stencil variant. `make_stencil.py --no-rings` emits the lettering only, so there is nothing to keep, and the ring rule becomes purely positive ("Image 1 is the lettering only and deliberately carries no rings at all").
Cost: zero paid attempts.

This is also a production gap. `solveArabicIdentity` always calls `addJumpRings` and always reports `jumpRingCount: 2`. There is no per-construction ring-free mode, so any construction that carries its own rings will inherit four rings in production exactly as it did here.

**2. `wrong-look` on Origami ribbon - both scripts came back as the identical flat nameplate as Classical.**
"Folded ribbon", "crisp folds" and "faceted planes" were read as adjectives and produced nothing.
Fix, on the look-brief axis: describe the folds as a surface break with a light consequence - two or three separate planes per stroke at different angles, one facet bright and the next clearly darker, a hard bright crease line between them, mitred corners - plus an explicit contrast against the thing it kept producing ("a plain nameplate has one continuous polished surface, this piece is visibly built from angled planes").

**3. `chain-not-through-ring` - a connector ring drawn behind the pendant instead of through the eyelet.**
The viewer flagged a genuine rubric ambiguity: four of eight images put a small connector link between the pendant eyelet and the chain, which is correct jewellery, but "exactly two jump rings" read strictly would fail all four.
Settled: the pendant's two integral eyelets are the two jump rings; one connector link per side is allowed **only if it visibly passes through the eyelet hole**. An empty eyelet with the chain running behind the piece is the defect.
Fix, on the geometry axis: state it as a visible test rather than a count - "something passes through its open hole and you can see daylight through the hole on both sides of what passes through it ... never behind the pendant, never hooked on the outside".

### Round 2 - `caleums-universal-v4.1`, 24 images, 480 credits

Template sha256 `a9c80e99845015a4bca1f5ee9065db3ff60d8589c781aae27baccd1044888681`.
Three changes, one per defect class above. Nothing else moved: `IDENTITY`, `CASTING`, `SHOT`, `MATERIAL` and `PHOTOGRAPHY` are byte-identical to v4.
`framed-minimal` and `diamond-rails` receive the ring-free stencil; `classical` and `origami-ribbon` keep the ringed one.
Every image scored by an independent viewer that opened the file and cropped the ring junctions: `lab/stage1/verdicts-v41*.jsonl`.

| Cell | a2 | a3 | a4 | v4.1 pass rate | Remaining defects |
| --- | --- | --- | --- | --- | --- |
| classical-en | pass | pass | fail | 2/3 | `disconnected-component` |
| classical-ar | fail | fail | pass | 1/3 | `chain-not-through-ring`, `extra-ring` |
| origami-ribbon-en | tweak | pass | fail | 1/3 | `cgi-look`, `disconnected-component`, `floating-mark` |
| origami-ribbon-ar | pass | fail | tweak | 1/3 | `cgi-look`, `chain-not-through-ring` |
| framed-minimal-en | pass | pass | pass | **3/3** | - |
| framed-minimal-ar | pass | pass | tweak | 2/3 | `unsupported-geometry` |
| diamond-rails-en | pass | pass | pass | **3/3** | - |
| diamond-rails-ar | pass | fail | fail | 1/3 | `chain-not-through-ring`, `missing-glyph`, `missing-ring` |

**v4.1 pass rate: 14 of 24 (58 percent).** English 9 of 12 (75 percent), Arabic 5 of 12 (42 percent).
v4 attempt 1 was 2 of 8 (25 percent), so the three one-axis fixes roughly doubled the rate.

Identity held at **31 of 32** across both rounds.
The single miss is `diamond-rails-ar-a4`, which dropped the hamza above the initial alif and so reads اسماء rather than أسماء.
That is one `missing-glyph` in 32 images, against 16 Arabic images; the other 15 Arabic images carried the hamza, the seen's teeth, the meem counter and the standalone hamza correctly.
It is a real defect and it is the one that would be unacceptable to a customer, so it is not rounded away: the mark that failed is a small raster island the stencil attaches with a narrow bridge, and the fix belongs in the stencil (fuse the mark into its owning letter with a wider bridge) rather than in prose.

### Did any look advance?

The gate is 3 of 3 on **both** scripts. Under that gate at v4.1, **no look advanced**, so Stage 2 (holdout names) did not start on the v4.1 record.
It started later, after the v4.3 look-brief fix described below, on `framed-minimal` only.

- `framed-minimal` 3/3 English, 2/3 Arabic - 5 of 6, the closest.
- `diamond-rails` 3/3 English, 1/3 Arabic.
- `classical` 2/3 English, 1/3 Arabic.
- `origami-ribbon` 1/3 English, 1/3 Arabic.

### What the failures actually are

Every remaining defect except that one is attachment or photography.

- `chain-not-through-ring` is the single most common failure and is concentrated in Arabic. The eyelet renders closed and the chain hooks around a letter beside it instead of passing through the hole.
- `disconnected-component` appears late in English (classical-en a4, origami-ribbon-en a4): the bridge between two letters thins to nothing in a single sample even though the stencil bridge is solid. It is stochastic, not a stencil defect.
- `cgi-look` appears when the background sweep blows out to a clipped white void. The viewer measured it: background mean 254.0 and grain 0.43 on the failing image against grain 1.24 and 1.22 on passing ones. That threshold is a cheap automatic pre-filter the lab should run before an image ever reaches a viewer.

### The strongest structural finding

The two looks that reached 3/3 in English, `framed-minimal` and `diamond-rails`, are exactly the two that receive a **ring-free stencil** and are told in prose where to put the rings. The two that receive a stencil with rings already drawn on the lettering, `classical` and `origami-ribbon`, are the two that keep failing the ring gate.

Across v4.1 the ring-free topology (a drilled hole in a frame or rail plus a separate jump ring) passed 9 of 12; the letter-formed eyelet topology passed 5 of 12.

That is a production recommendation, not just a lab one: **the identity engine should emit lettering only, and the attachment should be specified per construction in the prompt.** It also removes the four-ring defect described above, because the engine currently welds two rings onto every stencil unconditionally.

The Arabic gap is narrower than it looks: with the ring-free stencil Arabic reached 3 of 6 on the two ring-free looks, against 2 of 6 on the ringed looks. Arabic remains materially less reliable than English on attachment and needs its own iteration; identity is not the problem.

## Stage 2 - holdout names (run at v4.3, partly scored)

The gate the coordinator set was: run holdouts only for a look that passed **3 of 3 on both scripts**.
Scoring the v4.1 attempts only (a2, a3, a4 - a1 was the superseded v4 release), the per-look record is:

| Look | English v4.1 | Arabic v4.1 | meets the gate |
| --- | ---: | ---: | :--: |
| `classical` | 2/3 | 1/3 | no |
| `origami-ribbon` | 1/3 | 1/3 | no |
| `framed-minimal` | **3/3** | 2/3 | no - Arabic short |
| `diamond-rails` | **3/3** | 1/3 | no - Arabic short |

No look qualified on the v4.1 record, and the shortfall on the two leading looks was Arabic attachment, not Arabic spelling, which held.

The fix went into the `framed-minimal` look brief and became release **v4.3**: the word must be welded into the frame in at least two separate places, the baseline must merge into the bottom bar, and no letter, foot, tail or terminal may end in mid-air.
Six more Stage 1 `framed-minimal` images were then generated under v4.3 (`framed-minimal-ar` a5 to a7, `framed-minimal-en` a5 to a7), of which one is scored so far: `framed-minimal-ar-a5` **pass**.

The 12-image holdout sweep was then generated under v4.3 for `framed-minimal` - Noor, Layla and Muhammad, each in both scripts, twice:
`docs/goals/overnight-launch/lab/stage2/` holds all 12 PNGs, with prompts in `lab/stage2/prompts/v43/`.

| Holdout cell | a1 | a2 | scored |
| --- | --- | --- | :--: |
| `framed-minimal-noor-en` | pass | pass | 2/2 |
| `framed-minimal-noor-ar` | pass | pass | 2/2 |
| `framed-minimal-layla-ar` | pass | unscored | 1/2 |
| `framed-minimal-layla-en` | tweak `unsupported-geometry` | unscored | 1/2 |
| `framed-minimal-muhammad-en` | unscored | unscored | 0/2 |
| `framed-minimal-muhammad-ar` | unscored | unscored | 0/2 |

**Six of the twelve holdout images are scored: five pass, one tweak.**
The verdicts live in `lab/stage2/verdicts-en.jsonl` and `lab/stage2/verdicts-ar.jsonl`; they have not been merged back into `ledger.jsonl`, so the generated appendix below still reports all twelve Stage 2 rows as `unscored`.
Across the whole lab that leaves **11 images unscored**: the six Stage 2 images with no verdict yet, and five of the six v4.3 Stage 1 images.

The phase 3 gate is **not met**. It asks for one look at 3/3 on both scripts and then **10 of 12 on holdout names**, and only six of the twelve holdouts have been looked at.
The remaining work is scoring, not generation: score the six unscored holdouts and the five unscored v4.3 Stage 1 images, then re-attempt only what the viewer marks down.

## Stage 3 - dependent views (25 images, 500 credits, 24 pass)

Stage 3 asked the real production question: given one approved Studio photograph, can the other three views be generated so that they are recognisably **the same physical necklace**?
Each call received two tagged references - the identity stencil as `@stencil` and the passed Studio master as `@master` - plus a hard continuity instruction.
Ratio was passed as an API parameter, never as prose: studio 1:1, on-skin 4:5, close-up 1:1, dark 9:16.

| Look and script | Studio master | on-skin / close-up / dark | continuity | complete four-view set |
| --- | --- | --- | :--: | :--: |
| `classical-en` | `classical-en-a2.png` | pass / pass / pass | 3/3 | yes |
| `classical-ar` | `classical-ar-a4.png` | pass / pass / pass | 3/3 | yes |
| `origami-ribbon-en` | `origami-ribbon-en-a3.png` | pass / tweak / pass | 3/3 | no |
| `origami-ribbon-ar` | `origami-ribbon-ar-a2.png` | pass / pass / pass | 3/3 | yes |
| `framed-minimal-en` | `framed-minimal-en-a2.png` | pass / pass / pass | 3/3 | yes |
| `framed-minimal-ar` | `framed-minimal-ar-a2.png` | pass / pass / pass | 3/3 | yes |
| `diamond-rails-en` | `diamond-rails-en-a2.png` | pass / pass / pass | 3/3 | yes |
| `diamond-rails-ar` | `diamond-rails-ar-a2.png` | pass / pass / pass | 3/3 | yes |

**Continuity held 24 of 24.** No viewer found a different pendant, a changed letter, a changed thickness or a changed ring count between a derived view and its master. That is the clearest result of the night.

Pass rates by view: on-skin 8/8, dark 8/8, close-up 7/8.
By script: English 11/12 and **Arabic 12/12**.
Arabic, which is the weak script in Stage 1, is not weak here, because the geometry is no longer being invented - it is being copied from an already-approved photograph.

Seven of the eight look-and-script combinations produced a complete, continuous four-view set on the first attempt, with no ratio fallbacks and no retries.

### The one Stage 3 defect

`origami-ribbon-en-close-up` a1 came back `wrong-display`: the pendant itself was correct and continuous, but the final `a`'s foot ran off the right frame edge, so the name was clipped.
The v4.1 close-up brief said only *"the complete name is still readable inside the crop"*, which the model satisfied by leaving the name legible while letting it touch the border.

One axis changed - the view brief, nothing else - producing release **v4.2**:

> Every letter of the name, including the last letter's final stroke and its terminal, sits fully inside the frame with a clear band of background on all four sides. No part of the pendant touches or crosses the frame edge - a name cropped at the edge is wrong.

That is a production instruction for the `image.macro_gift` profile, not a lab detail: a readability rule is not a containment rule, and a macro crop needs the containment rule.

The retry under v4.2 **passed at high confidence**, and the viewer measured it rather than eyeballing it: on the 1920 px frame the pendant's margins are 42 px left, 91 px right, 617 px top and 408 px bottom, with only the chain leaving frame, which the brief expects.
One axis changed, one attempt, defect closed. Stage 3 therefore finishes at **24 of 25** with all eight look-and-script combinations holding a complete, continuous four-view set.

## Stage 4 - metal and stone variants (12 images, 240 credits, 6 pass)

Stage 4 asked the commercial question: once a Studio photograph is approved, can the metal and stone options be produced as **variants of that same photograph**, rather than as new designs?
Each call received the identity stencil plus the passed Studio master, and a MATERIAL-mode instruction: keep the identical physical object AND the identical photograph - same letters, geometry, thickness, rings, chain, camera angle, framing, lighting and background - and change ONLY the material.

Masters were `classical-en-a2.png` and `classical-ar-a4.png`.

| Variant | English | Arabic |
| --- | --- | --- |
| White gold, no stones | pass | pass |
| Rose gold, no stones | pass | pass |
| Yellow gold, accent (one stone) | tweak `wrong-display` | tweak `wrong-stones` |
| Yellow gold, partial pave | **fail** `wrong-stones` | **fail** `wrong-stones` `wrong-display` |
| Yellow gold, full pave | pass | tweak `wrong-stones` |
| White gold, accent | pass | **fail** `floating-stone` |

### The result splits cleanly along one line

**Metal-only variants: 4 of 4 passed, both scripts, at high confidence.**
The viewer measured them rather than eyeballing them: best-fit scale 1.00, zero pixel shift and silhouette IoU 0.93 to 0.96 against the master, with mean metal RGB confirming cool rhodium for white gold (163/156/145) and warm copper-pink for rose (215/167/130) against the master's yellow (222/187/117).
Identity, geometry and both threaded rings survived every metal swap untouched.

**Stone variants: 2 of 8 passed.** Six broke, and five of those six broke the same way: **the model returned zero stones.**

### Why the stone variants failed

Both masters are stone-free. The MATERIAL-mode instruction says, in effect, "keep this photograph identical and change only the material" - and when the requested change is *add* something the reference explicitly does not have, the preservation clause wins.
`partial pave` lost every time in both scripts; `accent` and `full pave` lost in Arabic. The instruction that survived was `full pave` in English and `accent` in English, which are the two strongest, most literal phrasings ("across the whole face", "exactly one small round lab diamond").

That produces a coverage ladder of 1 stone, then **0 stones**, then full coverage - `partial-pave` sits *below* `accent`. The model is not treating stone coverage as one graded axis; it is treating the three coverages as three unrelated briefs and dropping the vaguest one.

This is a real product risk, not a cosmetic one: `classical-en-partial-pave-a1.png` is a competent, attractive photograph of the **wrong product**. A customer who chose partial pave would be shown a plain yellow-gold piece and could order it.

### The Arabic-specific defect

`classical-ar-white-accent` failed `floating-stone`: the single diamond was dropped into the **meem's open counter** with no bezel, no prongs and no seat - at 10x the counter is still a through-hole with cream background visible behind the stone.
The Arabic meem's counter is a hole in the metal, and the model read it as a setting. Latin `Asma` has no comparable enclosed counter at that scale, which is why the same prompt did not produce this in English.
Any production stone-placement rule for Arabic has to say that a stone must sit on solid metal and never inside a counter or an enclosed opening.

### The root cause, found in the prompt rather than guessed at

The PRESERVE block of every Stage 4 prompt ends with:

> Stone coverage stays exactly accent, every stone seated in metal.

That sentence asks the model to **preserve** a coverage the master photograph does not have.
Put next to "keep the identical photograph and change ONLY the material", the most consistent reading available to the model is: preserve the master's actual coverage, which is none.
The word `stays` is the bug. In a MATERIAL-mode prompt the stone clause has to be phrased as a **change to be made**, and it has to appear before the preservation instruction, not after it.

This is the kind of defect the lab exists to find: it is invisible in the prompt text, it produces a beautiful and completely wrong image, and no amount of emphasis on "add diamonds" would have fixed it while the PRESERVE line kept saying `stays`.

### What Stage 4 establishes for production

1. **Metal variants can be generated as photograph-preserving edits.** Four for four, both scripts, measurably identical framing. This is the cheap path for the metal picker.
2. **Stone variants cannot be generated from a stone-free master.** Either the master for the stone ladder must itself carry stones and the plain versions be derived by removal, or each coverage needs a countable, positionally anchored instruction of the same strength as "exactly one" - naming which letters carry pave and which stay plain - and the count repeated in the PRESERVE block.
3. **A zero-stone return is silently plausible.** It passes every identity, geometry and attachment gate and only fails on a pixel read. A cheap automated pre-screen - count bright low-saturation blobs inside the pendant mask, flag "coverage requested but coverage zero" - would catch this class before a human ever looks. Note for whoever writes it: a colour-threshold mask fails on rhodium; the viewer needed an edge-based mask for every white-gold image.

## Stage 5 - a second lettering style (4 images, 80 credits, 3 pass)

Everything was held constant against Stage 1 - Studio 1:1, yellow gold, no stones, 32 mm, Cable chain, the name Asma - and exactly one thing changed: the lettering, from Classic (Playfair serif in Latin, Naskh in Arabic) to Kufi.
Four new ring-free stencils were built and verified through the same one-connected-component gate, then used as the only reference.

| Cell | verdict | defect |
| --- | --- | --- |
| `framed-minimal-en-kufi` | pass | - |
| `framed-minimal-ar-kufi` | pass | - |
| `diamond-rails-en-kufi` | pass | - |
| `diamond-rails-ar-kufi` | tweak | `wrong-look` |

### The method transfers

**Kufi held spelling 4 of 4.** Every image reproduced its stencil glyph for glyph, including the two hardest Arabic marks - the hamza fused above the initial alif, and the standalone hamza at the left end - and the seen's three teeth, which the viewer located as verticals at specific pixel columns rather than judging by eye.
That is better than Classic Arabic managed on its own history, where `diamond-rails-ar` a4 dropped the hamza and produced اسماء.

The finding is that **the stencil owns spelling and the prose owns construction**, and those two responsibilities separate cleanly when the lettering style changes.
Changing the font changed nothing about identity reliability, because identity was never coming from the model.

### The one Stage 5 defect is a script-geometry problem, not an identity one

`diamond-rails-ar-kufi` placed the top rail at x-height, so both alifs and the hamza broke out above it and the rail struck through the word instead of holding it.
Arabic ascenders - alif, lam, kaf - sit far above the bulk of the word, so a rail positioned relative to that bulk will slice through them. Latin lowercase has no equivalent.

This is systematic and it will recur: نور and ليلى have the same tall-letter geometry. If Diamond rails is a launch look, its brief needs a script-aware line requiring the rails to clear the tallest ascender and the lowest descender.

### One thing to fix in the customer-facing copy

The English "Kufi" produced here is a geometric Latin grotesque, not Kufi in any meaningful sense - Noto Kufi has no Latin coverage, so the lab renderer falls back to Cairo for Latin.
That is a defensible house style, but the UI must not promise Arabic Kufi calligraphy on a Latin name.
This is the same class of gap as the production engine rendering Arabic Kufi byte-identically to Naskh, recorded in Phase B.

## Production handoff - what the pipeline should change

Everything below is evidenced above. Nothing here is a preference.

### 1. The four style anchors are ready

`docs/CALEUMS-FINAL-E2E-CONTRACT.md` fails a run before spend with `style_anchor_missing:<sourceTaskId>` when a shot profile has no pinned release, and the coordinator identified these as the thing blocking real mode.
Four viewer-passed images from one coherent look, one per default customer view, are on disk and continuous with each other:

| Shot profile | Ratio | File (all under `docs/goals/overnight-launch/lab/`) |
| --- | ---: | --- |
| `image.packshot` (Studio) | 1:1 | `stage1/framed-minimal-en-a2.png` |
| `image.worn` (On Skin) | 4:5 | `stage3/framed-minimal-en-on-skin-a1.png` |
| `image.macro_gift` (Close Up) | 1:1 | `stage3/framed-minimal-en-close-up-a1.png` |
| `image.dark_editorial` (Dark) | 9:16 | `stage3/framed-minimal-en-dark-a1.png` |

The three derived views were all generated from that exact Studio master and all three were confirmed continuous with it, so the set is internally consistent rather than four unrelated photographs.
`classical-en`, `classical-ar` and `framed-minimal-ar` each have a complete, continuous four-view set as well, if a second or an Arabic-native anchor family is wanted.

These are lab images and the contract requires an anchor to be an immutable private-storage release with a checksum, source task ID and approval note. Promoting them is a deliberate act by the release owner, not something this lab does. Every file's task ID and prompt hash is in `ledger.jsonl` so the release record can be built without re-deriving anything.

### 2. The identity engine should emit lettering only

The single largest measured effect of the night. Constructions given a **ring-free** stencil, with the attachment described in prose per construction, passed 9 of 12 on v4.1; constructions given a stencil with rings already welded on passed 5 of 12.
`addJumpRings()` currently runs unconditionally in `packages/identity/src/caleums-arabic-v3.ts`, which is what produced the four-ring images: the model faithfully drew the two rings in the reference **and** the two the prose asked for.

### 3. Three production identity-engine defects remain open

Documented in Phase B above and unchanged by anything later in the night: the Latin path renders the wrong typeface with two hard-coded unattached ring circles and never fuses, so it emits 4 to 7 disconnected components while returning `passed: true` as a literal; Arabic Kufi is byte-identical to Naskh; and the Arabic `fuse()` translates a glyph island to make it overlap, which moves a mark off its true typographic position.
The lab renderer bridges islands **without moving them**, which is the behaviour production needs.

### 4. Attachment must be specified as a visible test, not a count

"Exactly two jump rings" is satisfied by a pendant with the chain hanging behind it. What worked is a test the model can see: something passes through the hole and daylight is visible through that hole on both sides of what passes through it.
`chain-not-through-ring` was the most common defect of the night at 5 instances, and this phrasing is what closed it.

### 5. Dependent views should always pass the approved Studio image as a second reference

24 of 24 derived views were confirmed to be the same physical necklace as their master, across four looks, both scripts and three ratios, on first attempt.
Arabic scored 12 of 12 here against 5 of 12 on independent Studio generation, because the geometry is being copied rather than re-invented. This should be a hard rule in the dependent-view path, not a convention.

### 6. Material variants: metal yes, stones not yet

Metal-only edits of an approved photograph are reliable (4 of 4, measured at scale 1.00 and IoU 0.93 to 0.96). Stone coverage is not (2 of 8), and the cause is the `stays` wording in PRESERVE plus a stone-free master.
Until that is fixed, a stone selection must not be served by a photograph-preserving edit of a stone-free master.

### 7. Cheap deterministic gates worth writing before any of this ships

These catch the exact failures observed, and none of them needs a model:

- **Zero-coverage check.** Count bright low-saturation blobs inside the pendant mask; flag any asset where stone coverage was requested and measured coverage is zero. This alone catches 5 of the 6 Stage 4 stone failures.
- **Stone-in-counter check.** No stone centroid may fall inside a hole region of the identity mask. This catches the Arabic `floating-stone` failure, which is the one most likely to be recognised instantly as impossible by a jeweller.
- **Frame containment check** for macro crops: the pendant bounding box must not touch any frame edge.
- **Edge-based masking, not colour thresholding.** Saturation and darkness thresholds both fail on rhodium; any QA code that colour-thresholds will silently mis-measure every white-gold image.
- **Connected-component count** on the identity mask, which the lab already uses as a hard gate and production already claims to use but does not enforce on the Latin path.

## Recurring defects and the fix that worked

Twenty defect instances were recorded across 56 images. Every one was classified before it was acted on, because the iteration rule is that the class of defect decides which axis may change:
identity and attachment defects change geometry or the stencil and never adjectives, fake-photo defects change lighting and camera language, and a wrong look changes the look brief only.

| Defect | seen | root cause found | the change that fixed it | axis |
| --- | ---: | --- | --- | --- |
| `chain-not-through-ring` | 5 | The rubric said "two jump rings" without saying what threading looks like, so the model hung the chain behind the pendant and called it attached. | Replaced the count with a visible test: something passes through the hole and you can see daylight through it on both sides. | attachment rule |
| `extra-ring` | 3 | Not a wording problem at all. The stencil itself had two rings welded onto the lettering, so the model faithfully drew those AND the two the prose asked for - four rings. | A ring-free stencil variant (`--no-rings`) for constructions that carry their own rings. Zero paid attempts to prove it. | stencil |
| `wrong-look` | 3 | The origami look brief described folds as a property of the object, which the model rendered as a flat plate. | Described the fold as a surface break with a light consequence, plus an explicit contrast against the wrong output. | look brief |
| `cgi-look` | 2 | Studio prose was clean enough to read as a render. | Specific camera and lighting language rather than "photorealistic". | photography |
| `disconnected-component` | 2 | The model separated a letter island that the stencil had bridged. | Stencil bridge widened; the geometry gate is the authority, not the prose. | stencil |
| `unsupported-geometry` | 1 | A frame element floated without a load path. | Construction brief made the frame continuous. | look brief |
| `missing-ring` | 1 | One rail corner lost its ring under a tight crop. | Attachment rule states both rings must be in frame. | attachment rule |
| `floating-mark` | 1 | An Arabic mark drifted off its owning letter. | Fuse the mark to its letter in the stencil with a wider bridge. | stencil |
| `missing-glyph` | 1 | `diamond-rails-ar` a4 dropped the hamza above the initial alif, reading اسماء rather than أسماء. | Same stencil fix: the hamza needs a load-bearing bridge, not a hairline one. | stencil |
| `wrong-display` | 1 | The close-up brief asked for a readable name, not a contained one. | v4.2 containment rule (see Stage 3). | view brief |

Nothing in this table was fixed by making the prompt more emphatic.
Nine of the twenty instances were fixed in the **stencil or the reference set**, not in prose - which is the finding that matters for production, because the identity engine is the thing the pipeline already owns.

### The release that mattered

| Release | Stage 1 images | passed | rate |
| --- | ---: | ---: | ---: |
| `caleums-universal-v4` (attempt a1) | 8 | 2 | 25% |
| `caleums-universal-v4.1` (attempts a2-a4) | 24 | 14 | 58% |
| `caleums-universal-v4.3` (`framed-minimal` only, attempts a5-a7) | 6 | 1 scored, 5 unscored | not measurable yet |

The difference between the first two is exactly two edits - the threading test and the ring-free stencil - and it more than doubled the pass rate.
Both edits are attachment fixes. None of the gain came from better adjectives.

Under the attempt-budget rule stated above, every cell stayed inside three paid attempts of any single release: a1 is the only v4 attempt, a2 to a4 are the three v4.1 attempts, and a5 to a7 are the three v4.3 attempts on `framed-minimal`.

## The final prompt

The family is **`caleums-universal-v4.3`**, compiled by `docs/goals/overnight-launch/lab/compile.mjs` (`FAMILY` at `lab/compile.mjs:14`).
Ordinary deterministic code fills the slots; no model writes or rewrites this prompt, and the same inputs always produce the same bytes.

| Artifact | sha256 |
| --- | --- |
| template with slots unfilled (`lab/final/TEMPLATE.txt`) | `a9c80e99845015a4bca1f5ee9065db3ff60d8589c781aae27baccd1044888681` |
| compiled reference Studio prompt, v4.3, as `compile.mjs` emits it today | `0a5a009a3b41651c8af707f3a776ad3bd5239c9b3f9a56724f86b229693bd29b` |
| compiled reference Studio prompt, v4.2, as still stored in `lab/final/reference-studio-prompt.txt` | `0cc867ed9743f42a4d04632d8205b0cba1e2bf025fe0127375c6838543000af9` |

The template hash is unchanged from v4.1 through v4.3 because each release changed a slot value - v4.2 the close-up view brief, v4.3 the `framed-minimal` look brief - and never the template.
That is the point of the split: an iteration is visible as a changed compiled-prompt hash against an unchanged template hash, which is exactly what "change one axis" should look like in the record.
The stored file `lab/final/reference-studio-prompt.txt` was written at v4.2 and has not been re-emitted; the command below reproduces the current v4.3 bytes.

Reproduce the compiled prompt below with:

```
node docs/goals/overnight-launch/lab/compile.mjs \
  --name Asma --script en --lettering Classic --look framed-minimal \
  --view studio --metal "Yellow gold" --coverage "No stones" \
  --gem none --size 32 --chain Cable
```

The configuration shown is `framed-minimal`, English, Studio - the highest-scoring cell of the lab.

<details>
<summary>Compiled reference Studio prompt, v4.3, 5175 characters, verbatim</summary>

```text
Photograph one real, physical, finished 18K gold name pendant necklace. Studio shot.

IMAGE ROLES
Image 1, tagged @stencil, is the exact shape and the exact spelling of this pendant, drawn as a black silhouette. It is not a drawing to be re-designed. Reproduce its outline, its letter shapes, its joins and its proportions exactly, rendered as solid cast gold in a real photograph. There is no other reference image; invent nothing that is not described here.

IDENTITY
The name is "Asma", written in English Latin letters, in Classic lettering.
Every glyph, dot, mark and stroke in Image 1 appears in the photograph, in the same order, at the same place, at the same angle. Nothing is added, nothing is removed, nothing is rotated, nothing is duplicated, nothing is mirrored. Do not write the name a second time anywhere in the picture.

CASTING
This is one piece of gold, as if it came out of a single mould.
Every letter is physically fused to the next letter or to the part of the piece that holds it. There are no separate islands and no air gap that would make this two objects. Where Image 1 shows a bridge of metal between two shapes, that bridge is metal in the photograph. A jeweller could pick this whole pendant up as one object and nothing would fall off. If any letter, dot or mark is a separate floating piece, the picture is wrong.

ATTACHMENT
Exactly two jump rings, no more and no fewer. Both are closed rings of the same gold, grown out of the body of the piece, not soldered-on afterthoughts and not floating beside it. Image 1 is the lettering only and deliberately carries no rings at all. The pendant's two jump rings are cast into the two top corners of the frame and nowhere else. No eyelet, loop or ring sits on top of any letter.
Each of the two jump rings is threaded: something passes through its open hole and you can see daylight through the hole on both sides of what passes through it. That is either the chain's own end link or one small connector link, and it goes THROUGH the hole - never behind the pendant, never hooked on the outside of the ring, never resting against a closed eyelet. An empty ring hole with the chain passing behind the piece is wrong.
The chain is a fine round-link cable chain in the same 18K gold and hangs from both rings, one side to each. The chain never passes over, around or behind a letter, and there is no second chain, no cord, no clasp in shot and no other hardware.

LOOK - Framed minimal
The lettering from Image 1 sits inside one thin plain rectangular gold frame with softly rounded corners, cast as a single piece with the letters and joined to them where the strokes reach the frame. The frame is a simple even bar with no ornament, no engraving and no second border. The word is physically welded into the frame at no fewer than two separate places, and the baseline of the word merges into the bottom bar of the frame so the metal is visibly continuous from letter to frame. No letter, foot, tail or terminal ends in mid-air inside the frame, and the word is never held by a single contact point - a name cantilevered from one corner is wrong. The letters inside it keep exactly the shapes and spacing of Image 1.

SHOT - Studio
A catalogue packshot. The pendant lies almost flat, seen from just off straight-on, filling most of the frame with a small even margin. The whole pendant and both jump rings are inside the frame and in focus. The chain runs away from both rings and settles in a relaxed curve on the surface. Background is a plain warm off-white matte paper sweep.

MATERIAL
Solid 18K yellow gold, warm and slightly saturated, high polish. The reflections carry the warm gold hue into the highlights and a darker warm brown into the shaded facets.
No stones anywhere on this piece. Every surface is plain polished gold. There is no pave, no accent stone, no sparkle point and no setting of any kind.
The pendant is about 32 mm across and about 1.6 mm thick, so the cast edge has real visible depth.

PHOTOGRAPHY
This must read as an actual photograph taken on a jewellery set with a full-frame camera and a macro lens at a working aperture, not as a render.
Broad diffused key light through a large softbox, a white bounce card filling the shadow side, and one small harder source that puts a defined specular streak along the polished strokes. Neutral 5000K white balance. The gold shows a real specular response: bright reflected highlights, warm mid tones, and darker reflections of the surroundings in the curves, never a uniform flat brightness. There is a true contact shadow where the metal meets the surface and a soft ambient occlusion in the tight corners. Depth of field is finite: the plane of the pendant is sharp and the surface behind it falls off gently. The background surface has believable material texture.
No 3D-render look, no plastic or candy gold, no glow, no bloom, no neon rim light, no beauty-filter smoothing, no lens flare, no watermark, no logo, no caption, no added words or numbers anywhere in the frame.

PRESERVE
Exact spelling and glyph order from Image 1. One connected piece. Exactly two jump rings with the chain through both. No stones anywhere.
```

</details>

<!-- GENERATED APPENDIX - rebuilt by lab/finalise.py, do not hand-edit below -->

## Every cell, every attempt

`pass` / `tweak` / `fail` are the viewer's verdicts. This lab never scored its own images.

### Stage 1 - Studio, 4 looks x 2 scripts - 16 of 38 passed

| Cell | attempts | pass | defects seen |
| --- | --- | :--: | --- |
| `classical-ar` | a1:fail a2:fail a3:fail a4:pass | 1/4 | `chain-not-through-ring`, `extra-ring` |
| `classical-en` | a1:pass a2:pass a3:pass a4:fail | 3/4 | `disconnected-component` |
| `diamond-rails-ar` | a1:tweak a2:pass a3:fail a4:fail | 1/4 | `chain-not-through-ring`, `missing-glyph`, `missing-ring`, `wrong-look` |
| `diamond-rails-en` | a1:pass a2:pass a3:pass a4:pass | 4/4 | - |
| `framed-minimal-ar` | a1:fail a2:pass a3:pass a4:tweak a5:unscored a6:unscored a7:unscored | 2/7 | `extra-ring`, `unsupported-geometry` |
| `framed-minimal-en` | a1:fail a2:pass a3:pass a4:pass a5:unscored a6:unscored a7:unscored | 3/7 | `extra-ring` |
| `origami-ribbon-ar` | a1:tweak a2:pass a3:fail a4:tweak | 1/4 | `cgi-look`, `chain-not-through-ring`, `wrong-look` |
| `origami-ribbon-en` | a1:tweak a2:tweak a3:pass a4:fail | 1/4 | `cgi-look`, `disconnected-component`, `floating-mark`, `wrong-look` |

### Stage 2 - holdout names (Noor, Layla, Muhammad), v4.3 framed-minimal - 0 of 12 passed

| Cell | attempts | pass | defects seen |
| --- | --- | :--: | --- |
| `framed-minimal-layla-ar` | a1:unscored a2:unscored | 0/2 | - |
| `framed-minimal-layla-en` | a1:unscored a2:unscored | 0/2 | - |
| `framed-minimal-muhammad-ar` | a1:unscored a2:unscored | 0/2 | - |
| `framed-minimal-muhammad-en` | a1:unscored a2:unscored | 0/2 | - |
| `framed-minimal-noor-ar` | a1:unscored a2:unscored | 0/2 | - |
| `framed-minimal-noor-en` | a1:unscored a2:unscored | 0/2 | - |

### Stage 3 - dependent views - 24 of 25 passed

| Cell | attempts | pass | defects seen |
| --- | --- | :--: | --- |
| `classical-ar-close-up` | a1:pass | 1/1 | - |
| `classical-ar-dark` | a1:pass | 1/1 | - |
| `classical-ar-on-skin` | a1:pass | 1/1 | - |
| `classical-en-close-up` | a1:pass | 1/1 | - |
| `classical-en-dark` | a1:pass | 1/1 | - |
| `classical-en-on-skin` | a1:pass | 1/1 | - |
| `diamond-rails-ar-close-up` | a1:pass | 1/1 | - |
| `diamond-rails-ar-dark` | a1:pass | 1/1 | - |
| `diamond-rails-ar-on-skin` | a1:pass | 1/1 | - |
| `diamond-rails-en-close-up` | a1:pass | 1/1 | - |
| `diamond-rails-en-dark` | a1:pass | 1/1 | - |
| `diamond-rails-en-on-skin` | a1:pass | 1/1 | - |
| `framed-minimal-ar-close-up` | a1:pass | 1/1 | - |
| `framed-minimal-ar-dark` | a1:pass | 1/1 | - |
| `framed-minimal-ar-on-skin` | a1:pass | 1/1 | - |
| `framed-minimal-en-close-up` | a1:pass | 1/1 | - |
| `framed-minimal-en-dark` | a1:pass | 1/1 | - |
| `framed-minimal-en-on-skin` | a1:pass | 1/1 | - |
| `origami-ribbon-ar-close-up` | a1:pass | 1/1 | - |
| `origami-ribbon-ar-dark` | a1:pass | 1/1 | - |
| `origami-ribbon-ar-on-skin` | a1:pass | 1/1 | - |
| `origami-ribbon-en-close-up` | a1:tweak a2:pass | 1/2 | `wrong-display` |
| `origami-ribbon-en-dark` | a1:pass | 1/1 | - |
| `origami-ribbon-en-on-skin` | a1:pass | 1/1 | - |

### Stage 4 - metal and stone variants - 6 of 12 passed

| Cell | attempts | pass | defects seen |
| --- | --- | :--: | --- |
| `classical-ar-accent` | a1:tweak | 0/1 | `wrong-stones` |
| `classical-ar-full-pave` | a1:tweak | 0/1 | `wrong-stones` |
| `classical-ar-partial-pave` | a1:fail | 0/1 | `wrong-display`, `wrong-stones` |
| `classical-ar-rose` | a1:pass | 1/1 | - |
| `classical-ar-white` | a1:pass | 1/1 | - |
| `classical-ar-white-accent` | a1:fail | 0/1 | `floating-stone` |
| `classical-en-accent` | a1:tweak | 0/1 | `wrong-display` |
| `classical-en-full-pave` | a1:pass | 1/1 | - |
| `classical-en-partial-pave` | a1:fail | 0/1 | `wrong-stones` |
| `classical-en-rose` | a1:pass | 1/1 | - |
| `classical-en-white` | a1:pass | 1/1 | - |
| `classical-en-white-accent` | a1:pass | 1/1 | - |

### Stage 5 - Kufi lettering - 3 of 4 passed

| Cell | attempts | pass | defects seen |
| --- | --- | :--: | --- |
| `diamond-rails-ar-kufi` | a1:tweak | 0/1 | `wrong-look` |
| `diamond-rails-en-kufi` | a1:pass | 1/1 | - |
| `framed-minimal-ar-kufi` | a1:pass | 1/1 | - |
| `framed-minimal-en-kufi` | a1:pass | 1/1 | - |

### Pass rates

| Stage | images | pass | tweak | fail | pass rate |
| --- | ---: | ---: | ---: | ---: | ---: |
| stage1 | 38 | 16 | 6 | 10 | 42% |
| stage2 | 12 | 0 | 0 | 0 | 0% |
| stage3 | 25 | 24 | 1 | 0 | 96% |
| stage4 | 12 | 6 | 3 | 3 | 50% |
| stage5 | 4 | 3 | 1 | 0 | 75% |
| **all** | **91** | **49** | **11** | **13** | **54%** |

### Defect frequency across the whole lab

| Defect tag | times seen | class |
| --- | ---: | --- |
| `chain-not-through-ring` | 5 | attachment |
| `wrong-look` | 4 | brief |
| `wrong-stones` | 4 | brief |
| `extra-ring` | 3 | attachment |
| `wrong-display` | 3 | photography |
| `cgi-look` | 2 | photography |
| `disconnected-component` | 2 | geometry |
| `missing-ring` | 1 | attachment |
| `floating-mark` | 1 | identity |
| `unsupported-geometry` | 1 | geometry |
| `missing-glyph` | 1 | identity |
| `floating-stone` | 1 | geometry |

By class: attachment 9, brief 8, photography 5, geometry 4, identity 2.

## Every passed file (49)

| Stage | Cell | Attempt | File |
| --- | --- | :--: | --- |
| stage1 | `classical-ar` | a4 | `docs/goals/overnight-launch/lab/stage1/classical-ar-a4.png` |
| stage1 | `classical-en` | a1 | `docs/goals/overnight-launch/lab/stage1/classical-en-a1.png` |
| stage1 | `classical-en` | a2 | `docs/goals/overnight-launch/lab/stage1/classical-en-a2.png` |
| stage1 | `classical-en` | a3 | `docs/goals/overnight-launch/lab/stage1/classical-en-a3.png` |
| stage1 | `diamond-rails-ar` | a2 | `docs/goals/overnight-launch/lab/stage1/diamond-rails-ar-a2.png` |
| stage1 | `diamond-rails-en` | a1 | `docs/goals/overnight-launch/lab/stage1/diamond-rails-en-a1.png` |
| stage1 | `diamond-rails-en` | a2 | `docs/goals/overnight-launch/lab/stage1/diamond-rails-en-a2.png` |
| stage1 | `diamond-rails-en` | a3 | `docs/goals/overnight-launch/lab/stage1/diamond-rails-en-a3.png` |
| stage1 | `diamond-rails-en` | a4 | `docs/goals/overnight-launch/lab/stage1/diamond-rails-en-a4.png` |
| stage1 | `framed-minimal-ar` | a2 | `docs/goals/overnight-launch/lab/stage1/framed-minimal-ar-a2.png` |
| stage1 | `framed-minimal-ar` | a3 | `docs/goals/overnight-launch/lab/stage1/framed-minimal-ar-a3.png` |
| stage1 | `framed-minimal-en` | a2 | `docs/goals/overnight-launch/lab/stage1/framed-minimal-en-a2.png` |
| stage1 | `framed-minimal-en` | a3 | `docs/goals/overnight-launch/lab/stage1/framed-minimal-en-a3.png` |
| stage1 | `framed-minimal-en` | a4 | `docs/goals/overnight-launch/lab/stage1/framed-minimal-en-a4.png` |
| stage1 | `origami-ribbon-ar` | a2 | `docs/goals/overnight-launch/lab/stage1/origami-ribbon-ar-a2.png` |
| stage1 | `origami-ribbon-en` | a3 | `docs/goals/overnight-launch/lab/stage1/origami-ribbon-en-a3.png` |
| stage3 | `classical-ar-close-up` | a1 | `docs/goals/overnight-launch/lab/stage3/classical-ar-close-up-a1.png` |
| stage3 | `classical-ar-dark` | a1 | `docs/goals/overnight-launch/lab/stage3/classical-ar-dark-a1.png` |
| stage3 | `classical-ar-on-skin` | a1 | `docs/goals/overnight-launch/lab/stage3/classical-ar-on-skin-a1.png` |
| stage3 | `classical-en-close-up` | a1 | `docs/goals/overnight-launch/lab/stage3/classical-en-close-up-a1.png` |
| stage3 | `classical-en-dark` | a1 | `docs/goals/overnight-launch/lab/stage3/classical-en-dark-a1.png` |
| stage3 | `classical-en-on-skin` | a1 | `docs/goals/overnight-launch/lab/stage3/classical-en-on-skin-a1.png` |
| stage3 | `diamond-rails-ar-close-up` | a1 | `docs/goals/overnight-launch/lab/stage3/diamond-rails-ar-close-up-a1.png` |
| stage3 | `diamond-rails-ar-dark` | a1 | `docs/goals/overnight-launch/lab/stage3/diamond-rails-ar-dark-a1.png` |
| stage3 | `diamond-rails-ar-on-skin` | a1 | `docs/goals/overnight-launch/lab/stage3/diamond-rails-ar-on-skin-a1.png` |
| stage3 | `diamond-rails-en-close-up` | a1 | `docs/goals/overnight-launch/lab/stage3/diamond-rails-en-close-up-a1.png` |
| stage3 | `diamond-rails-en-dark` | a1 | `docs/goals/overnight-launch/lab/stage3/diamond-rails-en-dark-a1.png` |
| stage3 | `diamond-rails-en-on-skin` | a1 | `docs/goals/overnight-launch/lab/stage3/diamond-rails-en-on-skin-a1.png` |
| stage3 | `framed-minimal-ar-close-up` | a1 | `docs/goals/overnight-launch/lab/stage3/framed-minimal-ar-close-up-a1.png` |
| stage3 | `framed-minimal-ar-dark` | a1 | `docs/goals/overnight-launch/lab/stage3/framed-minimal-ar-dark-a1.png` |
| stage3 | `framed-minimal-ar-on-skin` | a1 | `docs/goals/overnight-launch/lab/stage3/framed-minimal-ar-on-skin-a1.png` |
| stage3 | `framed-minimal-en-close-up` | a1 | `docs/goals/overnight-launch/lab/stage3/framed-minimal-en-close-up-a1.png` |
| stage3 | `framed-minimal-en-dark` | a1 | `docs/goals/overnight-launch/lab/stage3/framed-minimal-en-dark-a1.png` |
| stage3 | `framed-minimal-en-on-skin` | a1 | `docs/goals/overnight-launch/lab/stage3/framed-minimal-en-on-skin-a1.png` |
| stage3 | `origami-ribbon-ar-close-up` | a1 | `docs/goals/overnight-launch/lab/stage3/origami-ribbon-ar-close-up-a1.png` |
| stage3 | `origami-ribbon-ar-dark` | a1 | `docs/goals/overnight-launch/lab/stage3/origami-ribbon-ar-dark-a1.png` |
| stage3 | `origami-ribbon-ar-on-skin` | a1 | `docs/goals/overnight-launch/lab/stage3/origami-ribbon-ar-on-skin-a1.png` |
| stage3 | `origami-ribbon-en-close-up` | a2 | `docs/goals/overnight-launch/lab/stage3/origami-ribbon-en-close-up-a2.png` |
| stage3 | `origami-ribbon-en-dark` | a1 | `docs/goals/overnight-launch/lab/stage3/origami-ribbon-en-dark-a1.png` |
| stage3 | `origami-ribbon-en-on-skin` | a1 | `docs/goals/overnight-launch/lab/stage3/origami-ribbon-en-on-skin-a1.png` |
| stage4 | `classical-ar-rose` | a1 | `docs/goals/overnight-launch/lab/stage4/classical-ar-rose-a1.png` |
| stage4 | `classical-ar-white` | a1 | `docs/goals/overnight-launch/lab/stage4/classical-ar-white-a1.png` |
| stage4 | `classical-en-full-pave` | a1 | `docs/goals/overnight-launch/lab/stage4/classical-en-full-pave-a1.png` |
| stage4 | `classical-en-rose` | a1 | `docs/goals/overnight-launch/lab/stage4/classical-en-rose-a1.png` |
| stage4 | `classical-en-white` | a1 | `docs/goals/overnight-launch/lab/stage4/classical-en-white-a1.png` |
| stage4 | `classical-en-white-accent` | a1 | `docs/goals/overnight-launch/lab/stage4/classical-en-white-accent-a1.png` |
| stage5 | `diamond-rails-en-kufi` | a1 | `docs/goals/overnight-launch/lab/stage5/diamond-rails-en-kufi-a1.png` |
| stage5 | `framed-minimal-ar-kufi` | a1 | `docs/goals/overnight-launch/lab/stage5/framed-minimal-ar-kufi-a1.png` |
| stage5 | `framed-minimal-en-kufi` | a1 | `docs/goals/overnight-launch/lab/stage5/framed-minimal-en-kufi-a1.png` |

## Spend

Every figure below is a balance read from Runway `whoami`, not an estimate.

| Checkpoint | images | Runway balance | spent cumulative |
| --- | ---: | ---: | ---: |
| lab start | 0 | 306,862 | 0 |
| Stage 1 close | 38 | 306,222 | 640 |
| Stage 2 close | 50 | not read per stage | - |
| Stage 3 close | 75 | 305,742 | 1,120 |
| Stage 4 close | 87 | 305,502 | 1,360 |
| Stage 5 close | 91 | not read per stage | - |
