# Atelier visual proof tools

Run from the repository root. These tools author or inspect local example assets; the customer app never calls them.

- `build-geometry.py` reproducibly builds 24 shaped SVG outlines using pinned OFL fonts and records lineage. Read its command help and the geometry manifest before rebuilding immutable v1 assets.
- `render-contact-sheets.mjs` assembles camera evidence for inspection.

Customer journey: `pnpm --filter @jewelo/web test:atelier:e2e` (localhost:3001 must be running).

Model/assembly/storage tests: `pnpm --filter @jewelo/web test:atelier`.

The procedural Three.js renderer and its sweep, lifecycle and review harnesses were removed on 8 September 2026: the customer preview is photographic only. `build-geometry.py` remains because the shaped SVG outlines are still the naming source for the assembly identity key.

Current evidence lives in `docs/RESPONSIVE-UI-PROOF.md` and its linked proof directories. File counts and successful capture alone do not certify every image's visual quality; inspect the contact sheets and read the bounded visual-review report.

## Full photographic inventory (offline)

`node scripts/atelier/catalogue-inventory.mjs` calculates all 131,328 fixed-example configurations and 525,312 camera keys. It validates integrated files and rejects duplicate/out-of-space keys. Default output is a compact summary with sample jobs; it does not generate images or contact providers.

`node scripts/atelier/catalogue-inventory.mjs --out /absolute/path/new-jobs.ndjson` streams missing jobs and publishes an accompanying `.summary.json`. Existing output/summary files are never overwritten. Choose a new filename per inventory snapshot; a full export is large and should not be committed to the repository.

Job IDs derive from the release and normalized complete configuration/view, so catalogue order does not affect identity. Structural Studio masters use yellow gold/no stones; metal/stone variations depend on that same structure, and alternate camera views depend on their exact configuration's Studio. References require acceptance before execution. Customer-entered names, engraving, requests, and chain length are outside this fixed-example inventory.

Generation/approval/resume execution is not implemented by this exporter. Planned records are not generated or approved assets. No paid requests are made.

Verify export safety: `node --test scripts/atelier/inventory-export.test.mjs`.
