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

The gate is 3 of 3 on **both** scripts. Under that gate, **no look advanced**, so Stage 2 (holdout names) was correctly not started.

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

## Spend

| Checkpoint | Runway balance | Spent cumulative |
| --- | ---: | ---: |
| lab start | 306,862 | 0 |
| stage 1 round 1 (8 images) | 306,702 | 160 |
