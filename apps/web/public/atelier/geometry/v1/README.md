# Fixed exemplar outline geometry v1

24 immutable SVG outlines: two scripts × six catalogue styles × Asma/Fatima. These are actual filled paths, not SVG text. English inputs are `Asma`/`Fatima`; Arabic inputs are exactly `أسماء`/`فاطمة`. HarfBuzz applies script direction, contextual joining, ligatures, kerning, and mark positioning before fontTools extracts the contours. No geometry is generated from customer text at runtime.

## Integration contract

- Filename: `{english|arabic}-{classic|minimal|diwani|kufi|signature|thuluth}-{asma|fatima}.svg`.
- Tight ink viewBox starts at `(0,0)`, is 1000 units wide, and retains proportional height. SVG coordinates point right/down; Three geometry must flip y.
- Filled nonzero contours preserve holes. Use SVGLoader's shape extraction and hole handling. Do not turn contours into an open stroke or fill the counters.
- `manifest.json` supplies viewBox, baseline, source font, shaped glyph count, exact name, variable-font axes, and SHA256 for every asset.
- **These typographic outlines contain disconnected components by design.** The scene must assemble them into a connected pendant with a rear support baseline and narrow uprights reaching every isolated body/diacritic. Arabic hamza/dots and Latin i-dots must be retained. Attaching only the left/right word extrema leaves components floating.
- Neither the raw outline nor its renderer support is a manufacturing drawing or metal-thickness calculation.

## Typeface lineage

Every category uses a distinct face; no duplicated style geometry. Latin: Playball (Classic), Montserrat 600 (Minimal), Great Vibes (Diwani-inspired), Cinzel 600 (Kufi-inspired), Allura (Signature), Italianno (Thuluth-inspired). Arabic: Amiri (Classic), Noto Sans Arabic 600 (Minimal), Aref Ruqaa (Diwani-inspired), Reem Kufi 600 (Kufi), Lateef (Signature), Scheherazade New (Thuluth-inspired). Diwani/Thuluth IDs preserve the catalogue vocabulary; the source faces are disclosed and are not claimed as authentic historic calligraphy.

`font-sources.json` pins the Google Fonts repository commit, font URLs, and font file SHA256 values. `licenses/` retains each font's SIL Open Font License 1.1 and copyright attribution. Font binaries are build inputs cached outside the repository; the delivered outline artwork needs no web-font download.

## Rebuild

Use a build-only Python environment with `fonttools==4.59.0` and `uharfbuzz==0.51.0`, then run `python scripts/atelier/build-geometry.py`. Missing source fonts download into `/tmp/atelier-fonts` and must pass the recorded checksum. Optional `--contact-sheet` also requires `cairosvg==2.8.2` and Pillow. On macOS with Homebrew Cairo, use `DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib` for the optional render.

## Visual and structural review — 6 September 2026

Directly inspected `contact-sheet.png` after rendering all 24 delivered SVGs. Both names remain readable across all categories, RTL order and Arabic contextual joins are present, dots/hamza are retained, counters remain open, and style silhouettes are distinct. Structural verification passed: 24 unique path geometries, no text nodes, closed paths, positive normalized viewBoxes, and all asset checksums match. This verifies the fixed outline catalogue; the assembled scene requires its own visual review to verify bridges, chain attachments, stones and extrusion.
