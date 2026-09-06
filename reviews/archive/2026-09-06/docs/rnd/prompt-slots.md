# Prompt slots

Stills use one prompt family with swap slots.
Do not write a new essay per look.

Authoritative compiler today: `packages/ai/src/prompt-registry.ts`.
This file names what R&D needs on top of that compiler.

## Existing slots

| Slot | Meaning |
| --- | --- |
| `{{approved_name}}` | Exact approved name |
| `{{language}}` | en / ar |
| `{{arabic_style}}` | Lettering engine, not pendant architecture |
| `{{layout}}` | Display / how the name sits. `bar` = upright horizontal. `window` = upright name in a frame. `drop` = upright letters stacked top to bottom. Never 90° rotate. |
| `{{metal_karat}}` | 18K |
| `{{metal_color}}` | yellow / white / rose |
| `{{finish}}` | polished / matte / satin |
| `{{stone_coverage}}` | none / accent / partial-pave / full-pave |
| `{{gemstone}}` | diamond / ruby / emerald / sapphires / none |
| `{{size_profile}}` | delicate / classic / statement |
| `{{dimensions}}` | width × height × thickness mm |
| `{{chain_style}}` | cable / curb / rolo / box |
| `{{chain_length}}` | 40 / 45 / 50 / 55 cm |
| `{{presentation_view}}` | studio / worn / close-up / dark |
| `{{inspiration_rule}}` | optional reference handling |
| `{{piece_spec}}` | packed specification |
| `{{drape}}` | worn-view chain drape |

## Missing slot

`{{pendant_style}}` is not in the compiler.
It is the look from `style-catalog.md` (Framed Minimal, Rails, Origami, …).

Until the compiler grows that slot, R&D prompts may carry a look id in the template body.
Do not overload `{{arabic_style}}` or `{{layout}}` to mean the look.
Those mean lettering and display.

## Family shape

```text
Photograph {{approved_name}} as a real physical 18K {{metal_color}} name pendant.

Look: {{pendant_style}}
Display: {{layout}}
Lettering: {{language}} / {{arabic_style}}
Stones: {{stone_coverage}} {{gemstone}}
Scale: {{size_profile}} {{dimensions}}
Chain: {{chain_style}} {{chain_length}}
Shot: {{presentation_view}}

IDENTITY
Use the supplied stencil as immutable geometry.
Preserve exact spelling, glyph order, joins, and jump rings.
Do not invent, drop, float, or duplicate letters.

CASTING
This is one piece of 18K gold, as if it came from a single mould.
Every letter is physically fused to the next letter or to the frame.
No floating letters. No separate islands. No air gap that would make two pieces.
If the stencil shows bridges, those bridges are metal in the photo.
The two jump rings are attached to the body, not hovering.
A jeweler could pick the whole pendant up as one object.
If any letter is a separate piece, the image is wrong. Fuse it.

SIZE
The metal follows the name.
Short names sit in a compact piece. Long names sit in a wide piece.
Do not leave a short name in a long-name window.

DROP
If layout is drop: letters stay upright and stack.
Never rotate the writing 90 degrees.

PHOTOGRAPHY
Real camera capture.
iPhone or DSLR jewelry product photo.
True metal, true shadows, true depth.
No illustration, no CGI plastic, no glow, no logo, no extra charms.
```

## Swap rules

Change one axis per experiment when diagnosing a failure.
If identity breaks, fix identity before changing look, metal, or stones.
If photography is fake but letters are right, change lighting/camera language, not the stencil.
If hang/construction is wrong, change geometry instructions, not gemstone.
If the piece is janky or disconnected, retry the same stencil with a stronger CASTING block until it is one object.
Do not leave the cell blank. The flow retries until there is a showable still.
See `docs/rnd/sit-and-size.md`.

## Identity before beauty

No paid still without a stencil that already passed:

- exact name
- one connected piece
- two jump rings
- no floating hamza / extra glyph

Text-only beauty renders are rejects, even if they look expensive.

## What the model must not decide

Spelling.
Glyph order.
Ring count.
Whether a look is in the launch six.
Layout taxonomy.
Video.

## Video slots

`video.preview` and `video.final` exist in the compiler.
This track does not use them.
Omran said videos are not needed for the scoped flow.
The exact product boundary is still open and is not this folder’s job.
