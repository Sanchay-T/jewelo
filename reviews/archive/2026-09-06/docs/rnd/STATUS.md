# Stills R&D status

Updated 2026-09-04 (Umayr sent drop-compare HTML).
Branch `review/sample-images-board`.
This is the stills workstream, not the customer app.


## Now (drop retries)

Upright stacked drop stencils exist. Do not use the old horizontal-in-a-tall-frame drop stencils.

Old vs new compare (prompt + stencil + still): `.tmp/rnd-stills/CALEUMS-drop-compare/index.html`.
Rebuild with `python3 docs/rnd/make-drop-compare.py`.
Local: http://127.0.0.1:8766/ .

- Builder: `docs/rnd/build_drop_stack.py`
- Shared stacks: `.tmp/rnd-stills/_stencils/drop/stack_{noor,asma,muhammad}.png`
- S01 framed drops: `.tmp/rnd-stills/S01/stencils/drop_stack_{noor,asma,muhammad}.png`
- Rule: letters stay upright and stack top to bottom. Never rotate 90 degrees. One component. Two rings on the frame only.

S01 drop cells are retrying, not pass. Grok image-edit proofs showed the 90-degree rotate is gone, but they are watermarked and not gpt-image-2, so they stay in `candidates/`. Do not zip them.

Runway MCP `generate_image` / `init_upload` was blocked in this session. There is no OpenAI key in the process env. Next paid stills need Runway MCP connected (or an OpenAI key) and the new stacked stencils as `@stencil`.

Sanchay sent Umayr the drop-compare HTML plus context (sit correction, not catalog). Waiting on his marks. Do not resend. Do not start Wave 2. Do not lock six looks.

## What a new run should read first

1. This file.
2. `docs/rnd/README.md`
3. `docs/rnd/style-catalog.md`
4. `docs/rnd/ZIP-DELIVERABLE.md`
5. `docs/rnd/prompt-slots.md`
6. `docs/rnd/sit-and-size.md`

Do not treat `matrix-cells.json` as filled.
Agents were forbidden from writing it.
Per-look truth is `.tmp/rnd-stills/Sxx/status.json`.

## Decisions

- Wave 1 already shot at 30 mm. New work defaults to 32 mm. Customer wire sizes are 22 mm and 32 mm.
- Only pixel-audited stills may be shown or zipped.
- A pass means the photo itself is good enough to show Omran: exact name, one piece, two rings, correct sit, real-metal photography.
- A gray slot in the old grid meant rejected or not yet retried. The flow must not stay blank: retry until a connected still exists, or show a legal sibling.
- Failed tries live in `.tmp/rnd-stills/Sxx/candidates/` (sometimes `fail/`).
- Connectivity and spelling retries do not stop at 3. Do not go blank.
- Exact six launch looks are still open.
- Video is out of this track.
- Production stills remain GPT Image 2.
- Runway was used for this R&D wave (`gpt-image-2`), max 2 in flight per style agent.
- Do not copy stencil jump rings onto letters.
- Do not implement the live configurator from the UX wire.
- Janky means disconnected gold. Every prompt carries a CASTING block: one mould, fused letters, no islands.
- Drop is upright stack, never 90 rotate.
- Metal follows name length. New packshots 32 mm. Wire sizes 22 / 32.
- The flow never goes blank: fail retries until a showable still exists, or a legal sibling stays on screen.

## Where the files are

| What | Path |
| --- | --- |
| Sit / size / one-piece | `docs/rnd/sit-and-size.md` |
| Matrix tracker (still empty) | `docs/rnd/matrix-cells.json` |
| Look catalog | `docs/rnd/style-catalog.md` |
| Pass stills | `.tmp/rnd-stills/Sxx/pass/` |
| Rejected stills | `.tmp/rnd-stills/Sxx/candidates/` |
| Identity stencils | `.tmp/rnd-stills/_stencils/` and `Sxx/stencils/` |
| Contact sheets | `.tmp/rnd-stills/_grids/` |
| Click-through gallery | `.tmp/rnd-stills/CALEUMS-stills-review/` |
| Sendable zip | `.tmp/rnd-stills/CALEUMS-stills-review.zip` |
| Rebuild grids | `docs/rnd/make-stills-grids.py` |
| Rebuild gallery | `docs/rnd/make-stills-gallery.py` |

## Pass counts on disk (145)

Full 9/9: S03, S04, S09, S13, S16, S17, S25, S26, S27, S28, S29.

Partial: S01 4, S05 7, S11 7, S14 7, S15 3, S18 5, S20 8, S24 5.

No folder yet (mostly exploration): S02, S06, S07, S08, S10, S12, S19, S21, S22, S23.

## Why some slots have no pass

Typical reject reasons, from `status.json`:

- stencil rings copied as holes or extra charms on letters
- solid plaque instead of openwork
- Arabic rotated 90° on the drop sit
- wrong sit (bar generated when drop was asked)
- name drifted (English ASMA on an Arabic cell, missing dots, extra letters)
- double hang (rings on letters and on the frame)

S01 Rectangular is the example in the review UI: bar Noor / bar Asma / the drop sits failed that bar.

## Gallery for humans

Portable pack: unzip `CALEUMS-stills-review.zip` and open `index.html`.
No server.
One photo at a time.
Next / arrow keys.
Groups: Wanted / Must be better / Spec, and Bar / Drop / Window.

Prompt box above each photo is the compiled R&D family for that cell (look, sit, name, metal, stencil lock, look recipe).
Raw provider payloads were not stored on every job.
Do not claim the overlay is a dumped API log.

Rebuild:

```bash
/tmp/jewelo-rnd-venv/bin/python3 docs/rnd/make-stills-gallery.py
```

## Umayr stills marks (2026-09-04, WhatsApp)

He opened the gallery and sent back screenshots:

- FINE (two stills)
- janky (one)
- janky, relative sizing of the box is also off (one)
- flipped 90 degrees; he expected vertically stacked letters, not RTL rotated on its side (one)
- noice but disconnected (one)

He also said, on the wire, Omran only needs 22 mm and 32 mm (not 22 / 30 / 36).
That is his memory of Omran, not a locked SKU yet.

Media files were not downloaded: wacli store lock held by pid 49184 (`sync` since 2026-09-02).

## Sent to Umayr (WhatsApp, account personal, 2026-09-04)

- Journey wire PDF (`docs/ux-share/CALEUMS-JOURNEY-WIREFRAME.pdf`), asking for his notes and Omran's.
- Stills zip v1 (contact sheets).
- Stills zip v2 (click-through gallery with prompts above photos).
- Drop old-vs-new compare HTML (`CALEUMS-drop-compare.zip` / `index.html`) plus context: this is the sit correction, not a catalog pass.
- Agent resent the same zip to Umayr on personal WhatsApp (msg `3EB0D319EF29D253573D78`, sent true).

## Do not

- Do not zip failed candidates into the Omran pack.
- Do not lock six looks.
- Do not start Wave 2 metal/gem/size explosion.
- Do not touch untracked private WhatsApp media or `test-content-img-1.png`.
- Do not merge PRs or start the next numbered goal automatically.
