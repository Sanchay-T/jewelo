# Dual loop: font reference + Runway stills

Two loops run together.
The UI/UX flow stays parked.

## Loop A — fonted identity (local, free)

Use the real licensed fonts in `packages/identity/engines/caleums-arabic-v3/fonts/`.
Render a stencil PNG of the approved name.
That PNG is the strong reference.
It is not a beauty photo.

Fonts:

| Lettering | File |
| --- | --- |
| classic / naskh | `NotoNaskhArabic-Regular.ttf` |
| minimal | `ScheherazadeNew-Regular.ttf` |
| kufi | `NotoKufiArabic-Regular.ttf` |
| thuluth-inspired | `rakkas.ttf` |
| English | `PlayfairDisplay-SemiBold.ttf` |

Pass the stencil only if:

- exact spelling
- one connected piece
- two jump rings
- no floating marks

Then upload it to Runway (`init_upload` → put → `complete_upload`) and keep the hosted URL as `referenceImages[{ tag: "stencil" }]`.

## Loop B — Runway prompt/flow hunt (background, paid)

Goal: find which prompt + which flow makes photoreal jewelry stills.
Iterate until a still reads as iPhone / camera / DSLR capture and matches the stencil.

Generator: Runway MCP `generate_image`.
Hard cap: **50 tasks in flight at once**. Never open a 51st until one completes or fails.
Do not treat 50 as a target. It is a ceiling.
Check credits with `show_plans_and_credits` before a batch.

Each task must include:

- the fonted stencil as `referenceImages[0]` tagged `stencil`
- look id (`{{pendant_style}}`)
- display (`{{layout}}`)
- finish slots
- photography bar (real metal, real shadow, no CGI)

`count` per call is 1–4.
Several calls may run in parallel as long as live tasks ≤ 50.

No video in this hunt.

Production stills in the locked app remain GPT Image 2.
This loop is R&D on Runway to learn what works.

## How they couple

```text
font loop
  → stencil PNG (identity)
  → upload to Runway
       ↓
Runway loop
  → generate_image(prompt family, stencil ref, look, display)
  → view actual pixels
  → score identity + photography
  → one-axis prompt/flow change
  → next task (still ≤ 50 live)
```

If the stencil is weak, stop Loop B for that name.
Do not try to prompt the letters into existence.

## Batching inside the 50 cap

Suggested first wave, not 50 blind shots:

1. One look (Framed Minimal) × one display × 2–4 prompt variants
2. Keep the winning prompt family
3. Fan out looks/displays under the 50 ceiling
4. Name-length variants only after a look passes

## Viewer still owns pass/fail

Pretty-but-wrong letters = fail.
Fake CGI = fail.
Double hang = tweak geometry, not gemstone.
