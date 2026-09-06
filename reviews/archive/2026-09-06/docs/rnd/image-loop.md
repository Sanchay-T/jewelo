# Image loop for subagents

Generate, view the actual pixels, judge, fix, repeat.
Stop only when a still reads as a real iPhone, camera, or DSLR jewelry photograph and the name matches the stencil.

This is a closed loop on stills.
It does not redesign the web app.

## Roles

Split work across subagents.
Do not have the same pass both generate and declare success.

| Role | Job | Reads | Writes |
| --- | --- | --- | --- |
| Planner | picks next look × display from `image-pack.md` | catalog, pack, board | queue note |
| Identity | builds / checks stencil | name, lettering | stencil asset + pass/fail |
| Generator | runs one still from slots + stencil | prompt-slots, stencil | candidate image + task id |
| Viewer | opens the image and scores it | pixels, stencil, spec bar | verdict + defects |
| Iterator | changes one axis and requeues | viewer defects | next prompt / geometry fix |

A single subagent may play Identity → Generator → Viewer → Iterator in that order.
It must still write a viewer verdict before generating the next attempt.
It must not mark pass without reading the image.

## Hard gates

1. Stencil exists and passed.
2. Generator receives the stencil as identity, not text-only.
3. Viewer inspects the file, not the prompt.
4. Fail closed on identity errors even if the photo is pretty.
5. Fail closed on fake-CGI look even if the letters are right.
6. Stack stays GPT Image 2 + locked identity rules.
7. No video.
8. No inventing the launch six.
9. No UI/UX edits in this loop.

## Viewer scorecard

Score the actual image.

### Identity (any fail = reject)

- Exact name, no extra or missing glyph
- Same letter shapes as the stencil
- One connected piece
- Exactly two jump rings
- Chain through the rings, not a second hang on letters plus frame
- No floating hamza, disconnected mark, or invented charm

### Construction

- Thickness and joins look makeable
- Stones sit in metal, not hovering
- Frame / rails / origami match the look id
- Display matches the requested sit (bar / drop / frame)

### Photography (the bar)

Must look like a photo taken with an iPhone or a camera/DSLR on a jewelry set.

Pass signals:

- real metal response, not plastic gold
- believable shadow under the piece
- finite depth of field or natural sharpness, not smeared diffusion
- paper / stone / skin texture that could exist in a studio
- quiet lighting, no beauty-filter glow

Fail signals:

- illustration or 3D viewport
- perfect symmetry with no micro-variation
- neon speculars, bloom, watermark, logo
- melted letters, extra chains, duplicate pendants
- worn shot with doll skin or extra glyphs

### Verdict

`pass` · `tweak` · `fail`

`tweak` means one named defect and a next action.
`fail` means do not reuse this beauty recipe.
Pretty-but-wrong is `fail`.

## Iterate

Change one thing:

- identity / hang / rings → geometry or stencil, not adjectives
- fake photo → lighting/camera language and references, not a new look
- wrong look → `{{pendant_style}}` / look brief, not gemstone
- wrong display → `{{layout}}` only

Cap automatic retries at three paid attempts per look×display, matching the product attempt budget.
After three, stop and report.
Do not burn budget hoping a fourth random try saves it.

## View surface

Publish every candidate onto `/sample-images` with:

- look id
- display
- name
- note
- verdict
- task id

The viewer must load the image file.
A thumbnail glance is not enough.
Compare against the stencil and, when relevant, spec sheet `38`–`43`.

## Planner queue protocol

One live look at a time unless isolation is explicit.
Default order is `image-pack.md` suggested queue.
When a look passes packshot identity + photography, planner may open its three displays.
Name-length variants only after medium passes.

## Done for one still

```text
stencil pass
  AND identity pass on the beauty still
  AND photography pass (iPhone/DSLR read)
  AND construction hang makes sense
  AND board row updated
```

Done for the track is not “all 54 stills.”
Done for a work session is the queued look×display list plus a written leftover.

## Handoff template

```text
Look:
Display:
Name / lettering:
Stencil:
Candidate:
Verdict:
Identity defects:
Photo defects:
Next one-axis change:
Attempts used:
```
