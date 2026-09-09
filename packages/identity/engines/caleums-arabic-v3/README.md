# Caleums identity engine fonts and provenance

This directory is the immutable production extraction of the coordinator-approved
`caleums_pipeline_final.zip`.
The Python files are provenance and regression references only; nothing here runs at request time.

The directory name is historical.
The engine release is `caleums-identity-v4` (D-019): one solver serves Arabic and Latin, so the release identifier is no longer Arabic-only.
The folder keeps its old name so no font file has to move, and `CALEUMS_IDENTITY_FONT_DIRECTORY` in `packages/identity/src/shaping.ts` repeats it as a literal because a bundler cannot follow an interpolated asset path.

## What actually runs

`packages/identity/src/shaping.ts` opens one pinned font **file** by name, resolved from `import.meta.url`, hashes exactly those bytes into `fontSha256Measured`, and shapes with the HarfBuzz WASM build (`harfbuzzjs`).
D-019 removed Pango, FreeType, Fribidi and fontconfig from the path entirely: sharp's bundled Pango never consults fontconfig on macOS, so asking for a font *family name* silently returned the system sans for Latin and made Kufi and Naskh produce byte-identical stencils.
The outlines HarfBuzz returns are laid out as a path-only 1024x1024 SVG with no `<text>` element and no family name anywhere, and sharp only paints that SVG and encodes the PNG.

`packages/identity/src/caleums-arabic-v3.ts` then thickens, bridges and welds the two jump rings on that raster, and measures the encoded PNG back through the same ruler the independent harness uses.

D-020: the metal a jump ring hangs from is chosen from the outlines, before anything is painted.
For each end of the name the solver takes the outermost base glyph on the canvas and the largest contour of its outline; a glyph the font's GDEF table classes as a mark (a dot, a tittle, a hamza, a tanwin, a shadda) is never a carrier, and neither is a contour too small against its own glyph or too short against the tallest base glyph of the run.

GDEF is the font's own answer only where the face gives one, and three live faces do not.
Measured over the 48-name matrix: `NotoNaskhArabic` and `NotoKufiArabic` class 85 of 286 shaped glyphs as marks, so on `classic`, `diwani`, `signature` and Arabic `kufi` the table does the work.
`cairo`, the Latin face of `kufi`, returns class 0 for all 259 glyphs; `rakkas` returns class 3 for none of 196 and `ScheherazadeNew` for only 7 of 207, because both draw the nuqta inside the base contour; `PlayfairDisplay` shapes no separate mark at all in a Latin name.
On those faces the whole of the exclusion is geometry, and what does the work is the tie-break rather than a threshold: the carrier is the *largest contour by area* of the glyph, which a dot never is.
The two fractions only hold a glyph out when its largest contour is not letter-like, and the smallest height fraction a real letter body reached across all six faces was 0.435, so that floor moved from 0.4 to 0.3 in fix pass 5 while the tallest dot contour measured where a dot is its own contour is 0.129.

A weld fillet may only cover metal of the contour it is welding to.
Any other contour's pre-ring ink under the fillet is a piece of the name the ring would swallow, and it refuses the piece; before fix pass 5 the whole capsule was exempt and the madda of `آية`, the hamza of `أمير` and the damma of `مُحَمَّدٌ` disappeared into a fillet on a stencil every gate called clean.
The left ring is sought from the leftmost base glyph inward and the right ring from the rightmost inward, the two may never settle on the same glyph while another eligible base glyph exists, and the ring holes must sit at least a validated fraction of the finished ink width apart on the decoded PNG.

Each carrier offers a ladder of anchors - the outermost columns of its load-bearing metal that lie in the top `IDENTITY_RING_ANCHOR_MAX_DEPTH_FRACTION` of the contour's own height, so a ring is welded at the shoulder of a letter and never at its foot.
The two sides are chosen together: every allowed pair is scored on the shape it makes, gate violations first, then the tilt to the whole degree, then the balance counted in ring radii, then the length of the two suspension posts, then the exact angle, the distance from the top line of the name and the exact balance.
A jump ring is soldered onto a pendant, not stood off it: the post - the metal between the anchor and the centre of the hole - is capped at the smaller of `IDENTITY_RING_MAX_POST_FRACTION` of the name's ink height and `IDENTITY_RING_MAX_POST_PX`, the seat search cannot evaluate a seat outside that cap, and `identity_ring_post_too_long` says so again on the finished account (adversarial review 6, blocker 1: the pass-6 posts ran to 346 px and on Latin faces the rod read as a letter, so `Sara` in `classic` came out `iSarai`).
The preferred ring column is pulled back inside the name's own ink where there is room for it, so the rings cost the piece no width and the recentre stops shrinking the lettering to make room for them (major 4).
When no pair meets the post, level, overhang and span gates, the piece raises `identity_no_ring_seat` and the run is routed to operator review before any spend; `ringPlacement` is `welded`, `frame` or `none`, and `none` means a construction that carries its own suspension.
The top rail that used to catch this case is gone: measured, it touched `قق` along 11% of its span and the pendant hung from two nuqta (adversarial review 5, major 3).
That path is reached, not hypothetical: `آية` in `classic`, `diwani` and `signature` is built that way, because the madda covers the whole top of the alef at one end.

## The construction is part of the piece (P2-2b, D-021)

The stencil is the truth for the whole physical pendant, not only for the name.
`solveIdentity` takes the construction the shopper approved, and two of the four constructions are pendants with structure rather than lettering variants.

`framed-minimal` draws a thin rectangular frame with softly rounded corners around the name: rail thickness, the clear inset from the name's ink box and the corner radius are engine constants in `shaping.ts`, the corner is a quarter turn of the same capsules every bridge is drawn with, the name is welded into the bottom rail at two points near its two ends, and the two jump rings are welded onto the top rail near its corners.
`diamond-rails` draws one straight rail above the name and one below it, each running past the name by a constant overhang, welded to the name at two points each, with the two rings at the outer ends of the top rail.
Both come straight from the look briefs the image lab proved (`docs/goals/overnight-launch/lab/compile.mjs:57-84`): a frame "cast as a single piece with the letters", welded "at no fewer than two separate places" with "the baseline of the word merged into the bottom bar" and the rings "cast into the two top corners of the frame"; two rails with the letters "held between" them and the rings "cast into the two outer ends of the rails".

`classical` and `origami-ribbon` are unchanged and are the lettering alone.
The ribbon is a folded-facet *finish*, not geometry: the stencil says nothing about it, so no gate claims it.

Two welds are the whole of what the engine claims about how the name meets its frame.
The brief's further wish - that no letter, foot, tail or terminal ends in mid-air inside the frame - would need a bridge from every glyph to the rail, which is the machinery adversarial review 5 rejected for the deleted top rail, so it is left to the prompt and is not a gate.

The name is fitted to the canvas before the construction exists, so the frame takes its room from the name: the name is cropped, Lanczos-resampled and re-centred exactly the way `recentre` treats an overflowing piece, the applied scale is reported as `carrier.nameScale`, and a name that would have to go below `IDENTITY_CARRIER_MIN_NAME_SCALE` is refused with `identity_carrier_no_room`.
The structure may only add metal, and `identity_carrier_moved_ink` is that measurement rather than a comment.

Every ring gate stays exactly as it was, measured on the encoded bytes.
Rings on a rail are level by construction and the tilt is still measured; the plane the punch and swallow gates are taken against is the *name* before any rail was drawn, so "zero name pixels under ring metal" means what it always meant while the ring is free to grip the rail it is welded to.
`ringPlacement` is `welded`, `frame` or `none`, and `carrier.kind` (`frame` or `rails`) is the detail; a ring welded to a rail hangs from no glyph and carries `glyphIndex -1`, which `carrier.ringAnchors` states positively.
The report carries the construction id, the rail centrelines, the outer box, the name box, the welds and the ring anchors in pixels, and the construction id is a fingerprint input, so the same name in two constructions is two artifacts.

## What is live

All six styles ship: `classic`, `minimal`, `diwani`, `signature`, `kufi` and `thuluth-inspired`, in both scripts.
`LIVE_IDENTITY_STYLES` in `packages/identity/src/caleums-arabic-v3.ts` is the source of truth and `manifest.json` mirrors it.
`classic`, `diwani` and `signature` pin the same Naskh face by design, so their stencils are byte-identical and the verifier cannot tell a delivered Naskh from a delivered diwani (identity package review 1, finding 4, accepted risk); DS-4 limits what the shop sells to what phase 3 proves.
Kufi has no Latin coverage at all, so the English side of that family renders on Cairo.
Two-name Arabic layouts still enter explicit operator review before spend.

`manifest.json` records exact source checksums, licensing identifiers, approval status and the runtime shaping contract.
The approved characters, final PNG, validation report and fingerprint are immutable task inputs.
