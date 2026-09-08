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
For each end of the name the solver takes the outermost base glyph on the canvas and the largest contour of its outline; a glyph the font's GDEF table classes as a mark (a dot, a tittle, a hamza, a tanwin, a shadda) is never a carrier, and neither is a contour too small or too short against its own glyph and against the run.
When no clean seat exists above any carrier at either end, the piece gets a thin top rail with a ring at each of its ends and reports `ringPlacement: "bar"`; a customer's name is never refused because a ring would not seat.

## What is live

All six styles ship: `classic`, `minimal`, `diwani`, `signature`, `kufi` and `thuluth-inspired`, in both scripts.
`LIVE_IDENTITY_STYLES` in `packages/identity/src/caleums-arabic-v3.ts` is the source of truth and `manifest.json` mirrors it.
`classic`, `diwani` and `signature` pin the same Naskh face by design, so their stencils are byte-identical and the verifier cannot tell a delivered Naskh from a delivered diwani (identity package review 1, finding 4, accepted risk); DS-4 limits what the shop sells to what phase 3 proves.
Kufi has no Latin coverage at all, so the English side of that family renders on Cairo.
Two-name Arabic layouts still enter explicit operator review before spend.

`manifest.json` records exact source checksums, licensing identifiers, approval status and the runtime shaping contract.
The approved characters, final PNG, validation report and fingerprint are immutable task inputs.
