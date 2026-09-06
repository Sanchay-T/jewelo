> Archived, visually rejected: these initial captures passed logical/pixel checks but full pavé appeared too sparse. The accepted replacement is in `../material-sweep`.

# Material, stone and chain renderer proof

The production renderer completed **300 actual Studio PNG captures**, with no runtime or capture failures.

48 single-name identities (2 scripts × 6 lettering styles × 4 constructions) were each rendered in six states: no stones, accent lab diamond, partial pavé lab diamond, full pavé lab diamond, full pavé ruby, and full pavé emerald. An additional 12 cases exercised every metal × chain pairing.

All assertions passed:

- 48/48 groups have a nonzero accent setting, strictly increasing accent < partial < full stone counts, and nested coverage tiers.
- 48/48 groups produce six distinct PNG pixel hashes, including the gemstone colours.
- Full-pavé counts range from 21 to 42 valid stone seats; no style has an empty stone set.
- 12/12 metal/chain pairings produce distinct images.

`summary.json` contains aggregate outcomes; `stone-checks.json` records per-identity counts and pixel distinctions; `report.json` maps specifications to all 300 captured files. Four contact PNG/HTML sheets provide readable six-column comparisons for both scripts and every lettering style, grouped by construction.

This is an actual rendered-state comparison, supplemented by geometry seat counts. It does not establish manufacturing feasibility or constitute a human review of every pixel. Lab and natural diamonds intentionally share their visual material; that pair is excluded from the colour-distinction assertion.

Run from repository root:

```sh
SWEEP_MODE=materials node scripts/atelier/render-sweep.mjs
node scripts/atelier/render-contact-sheets.mjs
```
