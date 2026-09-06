# Fixed renderer visual review — 6 September 2026

Bounded visual scope: actual localhost:3001 app at 1440×1000, isolated agent-browser session `atelier-geometry-review`. Captured English/Arabic Classic single names, all five two-name layouts for both scripts, and all four English constructions (16 states, Classical duplicated intentionally). Captured refreshed On skin and Dark after background/CSS changes. Script: `scripts/atelier/review-renderer.py`; direct pendant crops and contact sheet accompany this report. This is representative visual QA, not exhaustive permutation certification.

## Confirmed and fixed during review

- Yellow gold lettering initially rendered grey with a gold support bar apparently covering the front face. Renderer agent identified reversed winding after SVG y reflection; corrected winding/normals. Fresh captures show gold front faces and rear supports.
- Arabic chain initially attached to elevated hamza. Renderer agent constrained anchors to body height; fresh Arabic single capture shows chain joined to the body-height support rail.
- Diamond rails button was covered at the click point by the persistent bottom action. Root added scroll padding/margins; review script centers targets before clicking so all 16 states can be exercised.

## Targeted scene refinements — independently rechecked, resolved

- Arabic Stacked: full measured word heights now create clear vertical separation; upper/lower glyph bodies and dots no longer intersect. All glyphs fit; the tall piece nearly fills the canvas, so extra bottom margin would improve presentation.
- Arabic Interlocked: words now remain separate and are joined with interlocking connector rings; both names and all marks are readable.
- On skin: arc-length chain sampling with overlapping pitch removes the separated upper ovals. Settled refreshed capture shows a continuous chain along both sides of the neck.
- Full-width support scaffolding was replaced with short rear component-to-component bridges. Repeated all 16 representative Studio states after this change and directly inspected the contact sheet and focused crops: no observed floating component or name collision.

## Visual passes and limits

English single, heart, infinity, side-by-side and stacked remain readable. Arabic single/side-by-side/heart/infinity retain the exemplar spelling and marks without obvious body collisions. Classical, Origami ribbon, Framed minimal and Diamond rails visibly differ; Origami has actual faceted faces. Counters remain open. Refreshed main images contain the whole pendant; chain naturally exits the frame. Dark settled image has strong gold/black contrast. Short gold bridges remain deliberately visible between separated typographic bodies.

Some first captures were taken during the photo fade and looked washed out. The review script now waits 600 ms before screenshots; low contrast in those early frames is not treated as a material defect. The final scene also uses warmer gold, shallower extrusion and lighter shadows. Material realism remains an aesthetic refinement, separate from geometry verification.

Evidence naming: `english-classic.png` and `arabic-classic.png` retain the original failed winding/scaffold evidence. `*-piece.png`, `states-contact-sheet.png`, `on-skin-refreshed.png`, and `dark-refreshed.png` show the final rechecked scene.

## Short desktop viewport extension

At 1440×800 and 1265×712, Arabic Stacked and Interlocked are severely clipped by the short hero's `object-fit: cover`: upper marks and much of the lower name fall outside the image box. These four captures are named `{width}x{height}-arabic-{stacked|interlocked}-piece.png`. The previous no-clipping observation was limited to 1440×1000. Reported to root; recommended `object-fit: contain` for deterministic renderer images so every assembly remains fully visible independently of panel aspect ratio. Recheck complete: root applies `data-fit="full"` with `object-fit: contain` specifically to Stacked and Interlocked. Repeated all four cases using `python3 scripts/atelier/review-renderer.py --short`: every name, dot, and connector is now fully visible at both short viewport sizes. Updated four evidence images show the fixed result. Normal horizontal layouts retain their prominent scale; tall layouts use side letterboxing.
