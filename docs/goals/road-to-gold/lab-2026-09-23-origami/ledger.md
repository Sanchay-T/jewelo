# Image lab ledger - 2026-09-23, refined folded origami

Omran's 23 Sep reply: he showed a ChatGPT render whose letters are built from triangular folded gold panels, folds changing direction along the stroke, round counters turned into polygons, stroke ends cut at angles, clearly 3D.
Sanchay's brief: "the same in a more decent manner" - refined fine jewelry, elegant and restrained, clearly origami-folded, not chunky or toy-like, not a paper sculpture.

Model: `gpt-image-2.5-sunburst`, ratio 1:1, default imageSize, via the Runway MCP.
Reference order and tags, every generation: `referenceImages[0]` = stencil, tag `stencil`, called "Image 1 (stencil)" in the prompt; `referenceImages[1]` = look, tag `look`, called "Image 2 (look)".
The look reference is Omran's own ChatGPT render, letters crop, which lives only in `~/hq/projects/devonel/caleums-private/look-references-v2/` and is never committed.

## What changed against the production origami prompt

Baseline: `docs/goals/road-to-gold/lab-2026-09-22/final/origami-ribbon-plain-asma.txt`.
Chain, Name and Photo paragraphs are verbatim from it. Three deliberate changes, and nothing else:

- The look line now asks for the folded triangular construction, not just "large flat folded planes".
- The Style paragraph is replaced with the refined folded-origami description; `No small facets` is gone.
- Depth is 2.5 mm instead of 1.2 mm.

The two variants differ in one line only, the stencil line:

- V1 "prompt only" keeps the production wording: the stencil is the exact silhouette, add, remove or move nothing.
- V2 "freer outline" keeps every letter, its order, its position and both rings, and allows origami geometry inside that footprint: stroke ends may be cut at an angle, round counters may become polygons.

## Stencils

All three printed `passed:true` from the production v5 engine.

| key | name | source |
|---|---|---|
| `stencils/love-stencil-origami-v5.png` | LOVE | production v5 origami-ribbon stencil, copied from `caleums-private/` |
| `stencils/asma-stencil-origami-v5.png` | ASMA | production v5 origami-ribbon stencil, copied from `caleums-private/` |
| `stencils/asma-ar-stencil-origami-v5.png` | أسماء | rendered in this session with `renderIdentityAnchor` (construction `origami-ribbon`, `arabicStyle`/`lettering` `kufi`, 32 x 12 x 1.6 mm); `passed:true`, png sha256 prefix `8e519d9d217f`, drawnText `أسماء` |

## Generations

Credits before the run: 208682. Each generation costs 18 credits.

| id | variant | name | metal | stencil | look | prompt bytes | Runway task id | verdict |
|---|---|---|---|---|---|---|---|---|
| v1-love | V1 prompt only | LOVE | 18K rose | love-v5 | omran-folded | 1798 | `dfe60e54-8cf3-4e36-b459-d345d65a9aa6` | tweak - chunky strokes |
| v1-asma | V1 prompt only | ASMA | 18K yellow | asma-v5 | omran-folded | 1800 | `ad94d50b-db90-4f52-948e-b5f5ff6d9609` | tweak - facet count too high, soft creases |
| v1-asmaar | V1 prompt only | أسماء | 18K yellow | asma-ar-v5 | omran-folded | 1805 | `ac79b2a4-48d0-47c8-aca7-f9a24bc99efa` | tweak - strokes a shade heavy |
| v2-love | V2 freer outline | LOVE | 18K rose | love-v5 | omran-folded | 1988 | `8f0b1357-da39-4ffc-b7b3-e9c958e48bf9` | tweak - marginal heaviness |
| v2-asma | V2 freer outline | ASMA | 18K yellow | asma-v5 | omran-folded | 1990 | `44ca6a8a-696b-4a91-9dc8-83a400727be1` | tweak - chunky Latin stems; round 2 also found its A counters filled, so round 1's spelling pass here was too generous |
| v2-asmaar | V2 freer outline | أسماء | 18K yellow | asma-ar-v5 | omran-folded | 1995 | `e3542c9d-bc82-4d24-a71b-91f82d383149` | **pass** - round 1 winner |
| v3-love | V3 refinement of V2, slimmer strokes | LOVE | 18K rose | love-v5 | omran-folded | 2117 | `9d01f2b9-4b82-4f48-8403-5b5040eace11` | tweak - stem width unchanged (0.151 -> 0.154) |
| v3-asma | V3 refinement of V2, slimmer strokes | ASMA | 18K yellow | asma-v5 | omran-folded | 2119 | `7f6c622a-32a0-487f-9786-bd1fca248655` | tweak - both A counters filled solid, facets pillowed |
| v3-asmaar | V3 refinement of V2, slimmer strokes | أسماء | 18K yellow | asma-ar-v5 | omran-folded | 2124 | `d89e8faa-eb1b-411b-8e90-7d9a03434792` | **pass** - lab winner, all four axes clean |
| opt-bail-love | Option, one centre bail | LOVE | 18K rose | love-v5 | omran-folded | 2170 | `89525296-ee5f-4247-96ee-db82d642a0e5` | tweak - bail plus a stray jump ring with no hole |
| opt-bail-asma | Option, one centre bail | ASMA | 18K yellow | asma-v5 | omran-folded | 2172 | `e148a091-3efd-4312-91c8-07f0efdb4038` | tweak - same stray jump ring, A counters filled |

Credits, measured end to end with `whoami`: 208682 before the first generation, 207904 after the last. **778 credits for 17 generations.**

The per-call arithmetic does not add up to that and the gap is not explained here:

- Rounds 1 and 2, 11 generations, every call reported exactly 18 credits: 208682 -> 208484.
- Round 3, first call (`r3-love-w600`) reported 208484 -> 208316, a charge of 168 rather than 18. The other five reported 18 each, ending at 208226.
- A final `whoami` then read 207904, a further 322 below the last reported figure.

Every number above is what the API returned; the `creditsBefore`/`creditsAfter` pairs in `ledger.jsonl` are those reported values. Someone should check the Runway billing page before this lab's cost is quoted anywhere.

## The two rounds

Round 1 released V1 and V2 together, three names each: one axis apart, the stencil line.
The viewer took V2 and named one axis to tune, stroke slimness, so round 2 (V3) is V2 with exactly one sentence changed in the Style paragraph:

- V2: `Fine-jewelry proportions: slim even strokes, restrained and elegant, never chunky, heavy or toy-like.`
- V3: `Fine-jewelry proportions: the letter bars are noticeably slim, about one fifth thinner than a standard nameplate, an even 2.0 mm apparent stroke width across the whole name, restrained and elegant, never chunky, heavy or toy-like.`

Nothing else moved: panel wording, depth, chain, material, photo and the stencil line are byte-identical to V2.

`opt-bail-*` is the separate labelled option: V2 with the stencil's two side rings ignored and one round bail at the top centre instead. LOVE rose and ASMA yellow only, as briefed.

Every submission is also appended to `docs/goals/overnight-launch/ledger.jsonl` with its prompt sha256, references, task id and the credit balance before and after, so a restart never regenerates a cell.

## Files

- `prompts/<id>.txt` - the exact promptText sent, byte for byte.
- `img/<id>.webp` - the result, downscaled to 800 px and converted with `scripts/webp.py`.
- `sheets/origami-folded.webp` - contact sheet, one row per group: V1, V2, V3, then the centre-bail option.
- `verdicts-round1.md` and `verdicts-round2.md` - the viewer's scores. The lab never scores its own images.

## What the two viewer passes concluded

- Winner of the whole lab: **`v3-asmaar`** (أسماء, V3). The only one of the eleven that passes spelling, rings and threading, folded construction and "decent" with nothing qualified.
- The slimness axis worked on Arabic and not on Latin. Measured median stem width over letter height: LOVE 0.151 -> 0.154 (no change), ASMA 0.242 -> 0.229 (about 5 percent), أسماء 0.299 -> 0.225 (about 25 percent, the change asked for). Latin stem width comes from the stencil's typeface, so the next slimness attempt has to re-cut the Latin stencils at a lighter font weight; another prompt adjective will not move it.
- The centre bail is worth offering, with one correction: in both images the model drew a tube bail **and** a separate jump ring, and that jump ring meets the letter with no hole to pass through, which is unmakeable. The prompt must say one bail, no jump ring, the loop growing out of the letter top, and the verifier must check that join the way it checks the side rings.
- ASMA's A counters come out filled solid in `v2-asma`, `v3-asma` and `opt-bail-asma`. Round 1 scored `v2-asma` as a spelling pass; round 2 corrected that. Round 1's file was left as written.

## Round 3 - lighter Latin stencils and the bail fix

Round 2 measured that the Latin stem width comes from the stencil typeface, not from the prompt, and that both bail images carried an unmakeable stray jump ring.
Round 3 changes the stencil, not the prompt, and rewrites only the bail wording.

### Stencils re-cut at lighter Cairo weights

Rendered with the production solver. The weight is the one forced knob: `CONSTRUCTION_LETTERING` is frozen, so the lab overrides `wght` at the rasterizer port, which is the same seam the engine itself uses to pass `wght` into `shapeText`. Nothing in the repository was modified.
Proof the harness is the production path: re-running it at the table's own `wght=800` reproduces the committed v5 stencils byte for byte (`love` sha256 prefix `b98ba1be97be`, `asma` `722169679829`).

| stencil | wght | effective tracking | passed | ink px | ASMA A-counter px |
|---|---|---|---|---|---|
| `love-stencil-origami-v5.png` (w800 baseline) | 800 | 90 | true | 173144 | - |
| `asma-stencil-origami-v5.png` (w800 baseline) | 800 | 90 | true | 168613 | 3879, 3878 |
| `love-stencil-origami-v5-w600.png` | 600 | 120 | true | 149501 | - |
| `asma-stencil-origami-v5-w600.png` | 600 | 120 | true | 136417 | 7678, 7677 |
| `love-stencil-origami-v5-w500.png` | 500 | 120 | true | 140885 | - |
| `asma-stencil-origami-v5-w500.png` | 500 | 120 | true | 128612 | 8163, 8162 |

Tracking is the engine's own value: the table's 60 units, tightened by the adaptive loop to 120 at both lighter weights (it stops at 90 at w800). The lab did not set it.
The ASMA A-counter roughly doubles at w600 and opens a further 6 percent at w500, which is the geometry behind the filled-counter defect round 2 found.

### Generations

| id | change | name | metal | stencil | prompt bytes | Runway task id | verdict |
|---|---|---|---|---|---|---|---|
| r3-love-w600 | lighter stencil only | LOVE | 18K rose | love-w600 | 2117 | `635d5384-fdea-4df5-86bb-ead31cf5287b` | pass - spelling exact, both rings threaded, crisp folds, 0.192 stem/height vs v3 0.267 (-28%) |
| r3-love-w500 | lighter stencil only | LOVE | 18K rose | love-w500 | 2117 | `50f7a3e3-45bd-4752-b057-5510bdd4425c` | pass - spelling exact, both rings threaded, crispest facets in the lab, 0.178 (-33%) |
| r3-asma-w600 | lighter stencil only | ASMA | 18K yellow | asma-w600 | 2119 | `25cd8823-3070-4dc5-88e5-e18268032257` | pass - A S M A exact, both A counters open holes for the first time, rings threaded, 0.220 vs v3 0.347 (-37%) |
| r3-asma-w500 | lighter stencil only | ASMA | 18K yellow | asma-w500 | 2119 | `ebef51d3-857b-4753-9a50-cb3043062678` | pass - exact, both counters open, rings threaded, 0.253 (-27%), no slimmer than w600 |
| r3-bail-love-w500 | bail fix | LOVE | 18K rose | love-w500 | 2515 | `8ad2641a-bc9c-4b45-a2a9-6016a54f05a5` | tweak (stroke slimness) - exactly one bail grown out of the V, no jump ring, chain level both sides; strokes came back chunky at 0.270 on a w500 stencil |
| r3-bail-asma-w500 | bail fix | ASMA | 18K yellow | asma-w500 | 2517 | `6f57aacb-517a-4c8f-9f53-a7c1a69e5975` | tweak (ligature fidelity) - one bail, continuous, no stray ring; M right stem merged into the A diagonal so the middle wobbles toward ASNA; 0.297 heavy legs |

`prompts/r3-<name>-w600.txt` and `prompts/r3-<name>-w500.txt` are byte-identical to `prompts/v3-<name>.txt` (sha256 prefix `c2f96e52d13b` for LOVE, `37e73d22b543` for ASMA). Only `referenceImages[0]` changed, so the weight is the only variable in those four cells.
The material line is unchanged: the engine renders the same 32 x 12 x 1.6 mm specification at every weight, so the prompt's 32 x 12 x 2.5 mm stays as it was.

The bail prompts change the stencil line and the chain line only, to demand exactly one bail, no jump ring and no connector, with the loop growing directly out of the letter top. Both bail cells ran at w500 because that stencil measured the slimmest ink and the widest counters; no aesthetic judgement was made by the lab. No retry was needed - all six returned first time.

### Lab-side ruler on the generated photographs

Gold is segmented by saturation, stem width is the median horizontal gold run inside the letter band over that band's height, and counters are enclosed background regions inside the letter mass. This is the lab's own measurement, offered as a cross-check; the viewer measures independently.

| image | stem over height | largest counter over area |
|---|---|---|
| v3-love (w800) | 0.080 | 0.0477 |
| r3-love-w600 | 0.056 | 0.0797 |
| r3-love-w500 | 0.046 | 0.0874 |
| v3-asma (w800) | 0.123 | 0.0188 |
| r3-asma-w600 | 0.081 | 0.0352 |
| r3-asma-w500 | 0.071 | 0.0216 |
| r3-bail-love-w500 | 0.075 | 0.0706 |
| r3-bail-asma-w500 | 0.124 | 0.0194 |

### Repository note

`docs/goals/overnight-launch/lab/render-production-stencils.mts` is stale and would throw if run: `renderIdentityAnchor` now takes a fourth argument, `pipelineRelease`, and that script still calls it with three. It was left untouched on instruction; the round-3 stencils were rendered from a scratchpad script instead.
