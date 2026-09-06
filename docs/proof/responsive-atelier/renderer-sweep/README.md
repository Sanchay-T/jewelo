# Deterministic renderer proof

The production `renderer/scene.ts` module was executed in isolated Chromium/WebGL via a local Vite harness. No provider, pricing, checkout, authentication or customer state is involved.

- 288 base assemblies: 2 scripts × 6 lettering styles × 4 constructions × (one name or 5 two-name arrangements).
- Each assembly captured Studio, On skin, Close-up and Dark: **1,152 PNG captures**, all successful. `report.json` records each specification, capture file, byte size and duration.
- `contact-1.png` through `contact-4.png` show representative script/style/layout combinations across all four cameras. Each construction has 12 representative rows; the 1,152 captures remain individually available.
- `lifecycle.json` verifies the same assembly reuses its mesh; later edits win; superseded asynchronous builds reject; capture produces PNG; disposal rejects an in-flight build.
- The base sweep uses yellow gold, no stones, 32 mm and cable chain. Material/stone/chain coverage is reported separately in `../material-sweep`.

Logical assembly tests enumerate all 131,328 configuration keys. Enumeration does not establish visual correctness. Browser capture completion also does not equal human inspection of every image: the separate `../fixed-renderer/visual-review.md` records representative visual inspection and defects corrected.

Reproduce from repository root:

```sh
node scripts/atelier/render-sweep.mjs
SWEEP_MODE=materials node scripts/atelier/render-sweep.mjs
node scripts/atelier/renderer-lifecycle-proof.mjs
node scripts/atelier/render-contact-sheets.mjs
```

The renderer intentionally uses fixed Asma/Fatima exemplars. The On-skin view uses calibrated placement and a curved shadow receiver over a local photograph; it is not an anatomical fitting simulator or a manufacturing file.
