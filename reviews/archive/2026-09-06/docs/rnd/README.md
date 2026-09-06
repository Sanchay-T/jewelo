# Image R&D track

This folder is the stills workstream.
It is not the customer UI/UX flow.

Customer UI was reset on 5 September 2026. See `docs/OMRAN-BUSINESS-CONTEXT.md`. Jewelry R&D does not prescribe the new customer flow.
This folder still owns stills R&D, sit rules, and prompt slots.

## What this track produces

Realistic jewelry stills Omran can review.
Identity-locked name pendants.
Photography that reads as iPhone, camera, or DSLR capture, not AI plastic.

## File map

| File | Owns | Who uses it |
| --- | --- | --- |
| `style-catalog.md` | Every look he sent, with source and status | Catalog / selection |
| `design-matrix.md` | Axes, launch grid, SKU math, what must not multiply | Combinations |
| `prompt-slots.md` | `{{ }}` swap contract | Prompt compiler / generator |
| `sit-and-size.md` | Drop, box size, one-piece CASTING, never blank | Binding for stills |
| `image-pack.md` | Which stills to make, in what order | Pack planner |
| `image-loop.md` | Generate → view → judge → fix until photoreal | Subagents |
| `dual-loop.md` | Font stencil loop + Runway hunt, 50 in-flight cap | Background R&D |
| `ZIP-DELIVERABLE.md` | Finish line: audited zip you can send | Stopping condition |
| `matrix-cells.json` | 261 Wave-1 cells to fill (look × display × name length) | Tracker |

## Split from other work

```text
Human / later
  UI/UX flow, wireframe, form consolidation, six-style confirmation

This folder / subagents
  identity stencils
  photoreal stills
  prompt slots
  view + self-correct loop

Locked contracts (do not reopen)
  docs/CALEUMS-FINAL-E2E-CONTRACT.md
  docs/FINAL-STACK.md
  docs/ARCHITECTURE.md
```

## Evidence vs invention

Client language lives in `context/`.
This folder may classify and count combinations.
It must not invent the exact six launch looks, the 3-vs-4 layout labels, one-vs-two style selection, pricing, or 35 mm.

## Stack for stills

Direct OpenAI GPT Image 2.
Deterministic identity stencil before any beauty render.
Private storage / local board only.
No Gemini Flash as the production path.
No video in this track.

## Current board

Live status for this track: `docs/rnd/STATUS.md`.
Read that before generating more stills or sending a zip.

Internal review surface: `/sample-images`.
Code: `apps/web/src/lib/sample-images-board.ts`.
Working name on the board: `أسماء`.

Human gallery (portable): `.tmp/rnd-stills/CALEUMS-stills-review/index.html`.
`matrix-cells.json` is still empty on purpose.
Per-look audit lives in `.tmp/rnd-stills/Sxx/status.json`.
