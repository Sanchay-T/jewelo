# Accepted dense pavé, material and chain proof

The final production renderer completed **306 actual Studio PNG captures**, with no runtime or capture failures.

48 single-name identities (2 scripts × 6 lettering styles × 4 constructions) were each rendered in six states: no stones, accent lab diamond, partial pavé lab diamond, full pavé lab diamond, full pavé ruby, and full pavé emerald. Another 12 cases exercised every metal × chain pairing; the final six cases compare all gemstone options.

All assertions passed:

- 48/48 groups have nonzero accent settings, strictly increasing accent < partial < full counts, and nested coverage tiers.
- 48/48 groups produce six distinct PNG pixel hashes.
- Dense full-pavé counts range from 28 to 149 seats. Larger forms carry more seats; narrow strokes retain clearance.
- 12/12 metal/chain pairings produce distinct images.
- Lab and natural diamond captures are pixel-identical intentionally. Diamonds and the four coloured gems produce five distinct appearances.

Packing uses the actual filled word contours and their holes, with a minimum 0.025 model-unit gold margin and 0.115 seat radius before final pendant scaling. Broad-stroke fixture tests verify density, nonoverlap and counter clearance. Stones and bezels use instanced meshes; normalized seat maps are cached per fixed outline. Partial coverage occupies a contiguous portion of the name rather than scattered flecks.

The English Ruby and Arabic Emerald density/colour pilots were independently visually approved before this sweep. Their captures remain in `../stone-density-pilot`. The original logically passing but visually sparse implementation is explicitly rejected and preserved in `../material-sweep-initial-sparse`.

The final six gemstone rows were refreshed after deepening Pink sapphire; `report.json` contains the refreshed PNG hashes. The other 300 cases remain unchanged. The earlier pale Pink capture is retained as `305-pink-initial-pale.png`.

`summary.json` contains aggregate outcomes; `stone-checks.json` records counts and pixel distinctions; `gem-checks.json` records gemstone comparisons; `report.json` maps all specifications to captures. Four contact PNG/HTML sheets compare coverage and colour. `gem-options.png` and `metal-chain-options.png` show the remaining option comparisons.

This proof does not assert manufacturing feasibility or human inspection of every pixel. Base geometry/camera and lifecycle evidence remains in `../renderer-sweep`.

Reproduce from repository root:

```sh
SWEEP_MODE=materials node scripts/atelier/render-sweep.mjs
node scripts/atelier/render-contact-sheets.mjs
# Optional bounded six-gem rerun against the existing report:
node scripts/atelier/gem-color-proof.mjs
```
