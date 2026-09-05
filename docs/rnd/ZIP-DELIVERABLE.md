# Zip deliverable

The finish line for this image track is one zip you can send.

Only audited stills go in.
Broken jewelry does not go in.
Empty matrix cells do not go in.

## What “filled matrix” means

`matrix-cells.json` is the board.

Wave 1 (the zip):

```text
29 looks × 3 displays × 3 name lengths
= 261 cells
at one default finish
18K yellow · accent diamond · 30 mm · curb 45 cm · packshot
```

That is the sendable catalog: every look he shared, three ways it can sit, short / medium / long names.

Wave 2 (maximize, only on Wave 1 passes):

- metal white / rose
- other gems
- 22 mm and 36 mm

Wave 2 is extra.
It does not block the zip.
We do not generate the 3,078 or 49,248 SKU explosion.

## Audit to enter the zip

A cell becomes `pass` only if all of these hold on the actual pixels:

- name matches the fonted stencil
- one piece, two rings, chain hang that makes sense
- look and display match the cell
- reads as iPhone / camera / DSLR jewelry photo
- no melted letters, extra charms, floating stones, plastic gold

`fail` stays out of the zip and is retried until a connected pass exists.
Disconnected / janky / sideways-drop failures do not stop at 3 and do not go blank.
The customer slot always shows jewelry: retry, or show a legal sibling of the same name while retrying.
`tweak` is not zip-ready.
See `docs/rnd/sit-and-size.md`.

## Loops

1. Font loop writes the stencil for that name × script.
2. Runway loop fills empty cells, max 50 live tasks.
3. Viewer audits pixels and writes `status` on the cell.
4. Iterator retries fails with one-axis changes.
5. When a cell passes, the file is copied into the zip staging folder.

## Zip layout

```text
jewelo-rnd-stills/
  manifest.json
  S03-framed-minimal/
    in-frame_medium_أسماء.png
    ...
  S18-floating-diamond-rails/
    ...
```

`manifest.json` lists only pass cells: look, display, name, finish, audit notes.

## Stopping condition

A zip exists whose manifest cell count equals the number of `pass` cells, and every Wave 1 look has been attempted.
Looks that cannot pass after 3 attempts are listed as `unfilled` in the manifest, not faked.

## Caps

- 50 Runway tasks in flight
- 3 paid attempts per cell
- no video
- production app stills remain GPT Image 2; this zip is the R&D send pack
