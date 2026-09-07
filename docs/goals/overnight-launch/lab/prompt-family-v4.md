# CALEUMS universal still prompt family v4

Family id: `caleums-universal-v4`.
Compiler: `docs/goals/overnight-launch/lab/compile.mjs` (deterministic, no model writes or rewrites this prompt).
Template sha256: `32e85f32915749af4a5c97c4b2721361c7077b6c175c8c77365fb3d8cbc8d5bf`.

One template, filled from the customer's frozen configuration by ordinary code.
There is no per-look essay and no model in the prompt-writing path.

## Why this shape

The v2 campaign asked the model to invent a pendant from a name and scored 17 of 48, with Arabic at 1 of 24 (`reviews/2026-09-06-creative-name-v2/report.md`).
v4 does not ask the model to invent identity at all.
A deterministic renderer produces the exact silhouette first, and the model's job is reduced to turning a known shape into a photograph.

Two findings from `docs/rnd/RESEARCH-2026-09-08.md` shape the wording.
OpenAI documents that a supplied shape is guidance rather than a trace, so the geometry claim has to be restated in more than one place and still checked afterwards by a viewer.
Numbered, tagged image roles are the working multi-reference pattern, so the template names `Image 1, tagged @stencil` explicitly rather than assuming the model infers which reference is content.

## Blocks, in submission order

| Block | Purpose | Changes with |
| --- | --- | --- |
| Opening line | what the picture is, and which shot | view |
| `IMAGE ROLES` | what each reference image means | dependent-view flag |
| `IDENTITY` | the exact name, script and lettering, and the do-not-alter rule | name, script, lettering |
| `CASTING` | one mould, fused letters, no islands, bridges are metal | never |
| `ATTACHMENT` | exactly two rings, integral, chain through both | look (ring placement only) |
| `LOOK` | the construction brief | look |
| `SHOT` | the view brief | view |
| `MATERIAL` | metal, stones, size | metal, coverage, gem, size |
| `PHOTOGRAPHY` | the real-camera bar | never |
| `PRESERVE` | a short restatement of the hard invariants, last | coverage |

`CASTING` and `PHOTOGRAPHY` are fixed text.
They are the two blocks that encode the defects the product cannot ship, so they are never varied to chase a look.

`PRESERVE` exists because the research left one question open: fal's guidance puts constraints last, our instinct puts identity first.
v4 does both - identity early, a three-line restatement at the end - so the family does not depend on which is true.

## Slots

| Slot | Values |
| --- | --- |
| `name` | the exact approved NFC characters |
| `script` | `en`, `ar` |
| `lettering` | `Classic`, `Kufi` (product also exposes Minimal, Diwani, Signature, Thuluth inspired) |
| `look` | `classical`, `origami-ribbon`, `framed-minimal`, `diamond-rails` |
| `view` | `studio` (1:1), `on-skin` (4:5), `close-up` (1:1), `dark` (9:16) |
| `metal` | `Yellow gold`, `White gold`, `Rose gold` |
| `coverage` | `No stones`, `Accent`, `Partial pavé`, `Full pavé` |
| `gem` | the product gem list; suppressed entirely when coverage is `No stones` |
| `size` | 22 or 32 (mm across) |
| `chain` | `Cable`, `Rolo`, `Box`, `Curb` |
| `dependent` | false for the Studio master, true for a view generated from the passed master |

Slot values are enumerations validated by the compiler.
An unknown value throws before anything is spent.

## The identity instruction

The stencil is the exact silhouette and the exact spelling.
It is rendered as cast metal.
No glyph, mark or ring is ever added, removed, reordered or rotated.

Two looks legitimately add geometry the stencil does not contain.
`framed-minimal` adds a frame and `diamond-rails` adds two rails, and in both the two jump rings move onto that added structure.
The look brief says so explicitly and still binds the letters to the stencil, so "follow the stencil" never conflicts with "add the frame".

## Reference images

- `referenceImages[0]`, tag `stencil`: the deterministic identity PNG. Always present. Never text-only.
- `referenceImages[1]`, tag `master`: only for dependent views. The passed Studio image of the same pendant, so On skin, Close up and Dark show the same physical object rather than a new design.

## Stencil provenance

Stencils come from the production identity renderer wherever it passes the geometry gate, so lab results transfer to the pipeline.
See `stencils/manifest.json` for the per-cell `stencil_source` and the recorded production gaps.

## One axis per iteration

- identity or attachment defect: change the geometry or the stencil, never the adjectives;
- fake-photo defect: change the lighting and camera language only;
- wrong look: change the look brief only;
- wrong display: change the view brief only.

Three paid attempts per cell, then stop and record.
