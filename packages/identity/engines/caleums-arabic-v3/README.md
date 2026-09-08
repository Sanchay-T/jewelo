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

Each carrier offers a ladder of anchors - the columns of its load-bearing metal, from the outer edge of the stroke inward - and the two sides are chosen together: every allowed pair is scored on the shape it makes, gate violations first, then the tilt of the line through the two holes, then the worse side's overhang, then the metal lifted off the letters.
When no pair meets the level, overhang and span gates, the piece raises `identity_no_ring_seat` and the run is routed to operator review before any spend; `ringPlacement` is `welded` or `none`, and `none` means a construction that carries its own suspension.
The top rail that used to catch this case is gone: measured, it touched `قق` along 11% of its span and the pendant hung from two nuqta (adversarial review 5, major 3).
That path is reached, not hypothetical: `آية` in `classic`, `diwani` and `signature` is built that way, because the madda covers the whole top of the alef at one end.

## What is live

All six styles ship: `classic`, `minimal`, `diwani`, `signature`, `kufi` and `thuluth-inspired`, in both scripts.
`LIVE_IDENTITY_STYLES` in `packages/identity/src/caleums-arabic-v3.ts` is the source of truth and `manifest.json` mirrors it.
`classic`, `diwani` and `signature` pin the same Naskh face by design, so their stencils are byte-identical and the verifier cannot tell a delivered Naskh from a delivered diwani (identity package review 1, finding 4, accepted risk); DS-4 limits what the shop sells to what phase 3 proves.
Kufi has no Latin coverage at all, so the English side of that family renders on Cairo.
Two-name Arabic layouts still enter explicit operator review before spend.

`manifest.json` records exact source checksums, licensing identifiers, approval status and the runtime shaping contract.
The approved characters, final PNG, validation report and fingerprint are immutable task inputs.
