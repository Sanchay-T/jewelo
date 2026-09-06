# Independent photographic option audit — 6 September 2026

Scope: all 82 currently integrated v1–v3 photographs, individually visible in seven labeled contact sheets `masters-1.png` through `masters-7.png`. This review inspected the actual images; prior manifest acceptance was not taken as proof. It did not inspect newly generated v4/v5 assets and does not certify millimetre scale, manufacture or exact customer spelling.

## Findings

- English Classic, Minimal, Signature, Kufi, Diwani and Thuluth inspired examples all visibly spell Latin Asma; Minimal is upright thin sans, Signature thin cursive, Kufi angular block, Diwani ornate looping cursive, and Thuluth inspired has a tall sweeping A. These are visually distinct interpretation examples, not certification of historical script styles. No English/Arabic asset swap found.
- Infinity's Studio, On skin, Close-up and Dark all show round Rolo-like chain links, while the catalogue default declared Cable. Corrected those four metadata patches to Rolo and recorded `auditCorrection` in v2 lineage. No image bytes altered. This is a real categorical mismatch discovered independently of previous accepted-concept flags.
- Origami intentionally changes the whole letterform to folded angular metal. Its default lettering label Classic describes the base within that construction; it must not imply the same cursive outline as Classical. The UI's example framing is necessary.
- Diamond rails shows plain gold rails when No stones is selected; this is coherent with the selected stone setting, despite the construction name.
- The repaired Arabic Kufi, Signature, Minimal and Thuluth images are the actual client-selected sources. Previously rejected/replaced originals remain outside the integrated catalogue. Arabic Classic views preserve the visible spelling and general silhouette; repaired markings are supported in the inspected examples.
- All complete families retain the same observable broad construction/layout/metal category across their four images. This does not imply identical model geometry across generated camera views. Heart and interlocked connectors remain visible in the repaired images. Macro shots sometimes crop an outer chain, but retain the pendant identity.
- White gold/diamond accent can be subtle in Studio, but visible in Close-up. Gem examples are distinguishable red, green, blue and pink. Full pavé visibly follows the name strokes; partial is concentrated on the A.

No further blocking visual category mismatch found among these 82 examples after the Infinity correction. Production accuracy and cumulative option coverage are not claimed.

## Coverage

Run `node scripts/atelier/option-coverage.mjs docs/proof/responsive-atelier/option-catalogue/coverage.json` to refresh. The script imports the live catalogue and canonical sample key, checks all 37 original families / 82 original images, adds the eight agreed Arabic construction/layout families, and tracks the target 45 families / 180 views. It distinguishes integrated, accepted-but-not-integrated, missing and rejected/unreviewed assets. v4/v5 manifests are read dynamically; accepted files must exist on disk. Coverage counts reflect metadata availability, not this independent visual acceptance. The JSON records its timestamp because generation/integration continues in parallel.

## Resolver regression audit

`option-catalogue.test.ts`: seven tests passed after the metadata correction and dynamic asset integration. Exhaustive audit covers 131,328 categorical configurations and 1,415,808 resolutions (no focus plus every active visual field). Zero violations of exact-match reporting, supported changed-option matching, active gem/layout applicability, complete coherent-family membership, or reported differences. Focused tests independently narrow candidates lexicographically, so new Arabic layout families can outrank earlier lettering-only examples without weakening priority checks. Hidden gem/layout focus remains independently tested. Scoped ESLint and TypeScript checks passed. This is resolver metadata proof, not 1.4 million visual inspections.

## Independent v5 review

All32 v5 photographs inspected in three labeled contact sheets `v5-1.png`–`v5-3.png`. The eight four-view families preserve visible Arabic name identity and their defining construction/layout: folded facets, rectangle frame, paired rails, side-by-side, heart, stacked, infinity and interlocked rings. Both names are visible in the five double-name families. Stacked lettering remains separated; interlocked connector rings remain visible. No blocking category/scene drift observed. This is visual example acceptance, not manufacturing or measured dimensional certification.

## v6 generation and producer review

Built-in imagegen produced 15 accepted Arabic lettering camera additions for Kufi, Signature, Minimal, Diwani and Thuluth inspired. Every image used the actual accepted v2 Studio as an identity reference; no runtime provider calls or procedural overlays were introduced. Exact prompts, parent paths, generated paths, SHA256 and unknown cost metadata are in `public/atelier/v6/manifest.json`. The client list excludes the rejected initial Kufi On-skin: its square mim counter was missing. A single targeted edit restored that hole; both originals are preserved, and the corrected version is selected. All15 accepted outputs were viewed directly at generation. Distinct calligraphic silhouettes, supports, counters and requested scenes are retained. Independent review is requested separately; producer review does not substitute for it. QA contact sheets `v6-1.png` and `v6-2.png` also retain the rejected original for transparency.
