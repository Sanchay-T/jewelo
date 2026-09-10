# Identity package review 1 (reviewer, on `dde9058`, 2026-09-08)

Rookie-mistake pass over `packages/identity`, run against the real rasteriser: 96-cell sweep (6 styles x 16 names), 50-solve memory probe, timing.

| # | Severity | Finding | Owner |
| --- | --- | --- | --- |
| 1 | high | `IDENTITY_RING_MAX_LIFT = IDENTITY_RING_BAND` (110) bounds a lift measured from the load-bearing anchor pixel, not the letter top. `Zoë` fails in all six styles (`identity_ring_welded_to_glyph:pixels=2` or `40`); needs lift 123. Sweep: cap 110 gives ok 90 fail 6 (all Zoë); cap 400 gives 96/0. | D-020 redesign brief (regression row) |
| 2 | medium | `countGlyphPixelsUnderRingMetal:1433-1435` exempts two capsules; the ring-centre-to-anchor one is not drawn metal and re-blinds 0.9% to 7.2% of the annulus. Removing it: zero new failures in the sweep. | D-020 redesign brief (same as adversarial-3 finding 2) |
| 3 | medium | `engines/caleums-arabic-v3/manifest.json` and README drift: `cairo.ttf` marked unapproved while live for Kufi en; `liveStyles` two while six ship; README describes the Pango stack D-019 removed. Nothing reads the manifest. | D-020 redesign brief: docs only |
| 4 | medium | `classic`, `diwani`, `signature` pin the same faces, so their stencils are byte-identical and the verifier cannot detect a Naskh photo delivered for a diwani click. | accepted risk recorded below; DS-4 (sell only what phase 3 proves) is the compensating decision |
| 5 | low | The weld fillet starts at `cy + INNER + 4` with radius 19.5 and reaches into the hole; measured holes are 1186 to 1424 px against an ideal 1810; `measureRingHoles` never gates the area. | D-020 redesign brief: gate `size` against a fraction of the ideal, start the fillet outside the hole |
| 6 | low | `round3` on the SVG scale is lossless only because every pinned face is upem 1000; fit slack is 0.1 px on classic Asma. | redesign brief |
| 7 | low | `bridgeAll` throws at exactly 64 bars even when converged. | redesign brief |
| 8 | low | `regionAt` returns `undefined` typed as `number` for non-integer coordinates. | redesign brief |
| 9 | low | `label4` does not validate array length; `undefined` counts as ink. | redesign brief |
| 10 | low | `recentre` reports the unrounded scale while the raster used the truncated width. | redesign brief |
| 11 | low | `identity_stencil_empty_outline` and `identity_fit_overflow` are bare `Error`, outside the solver taxonomy the caller classifies on. | redesign brief |

Asides: `presentation.ts:744` branches on `rendered.svg`, never set (pipeline fix 1); `identity-anchor.test.ts` imports a removed symbol (tests stay untouched by instruction).

Clean: code-point iteration and cluster alignment, NFC before trim, `setClusterLevel(2)`, tatweel, ZWNJ, RLM and vowels shape and gate, emoji fails closed; HarfBuzz direction, script, language, upem scale; wasm loaded once; `FinalizationRegistry` on hb objects; no memory growth over 50 solves (RSS 316.8 to 316.3 MB); no O(n²) over the canvas, exact EDT, separable erosion with scipy border semantics, bounded label stack; 612 to 2036 ms per solve on the laptop; exact Bezier extremes; SVG nonzero fill under the y-flip; no `Date`, `Math.random`, locale calls; no env, no sharp, no vendor SDK, no customer text in errors; `harfbuzzjs` pinned; static `import.meta.url` map; tracing covers wasm and ttf.

## Accepted risk (finding 4)

Three styles share one stencil by design because the Naskh and Playfair faces carry the geometry while the style word reaches the model through the prompt. Until a style has its own pinned face, the verifier cannot tell a delivered Naskh from a delivered diwani. DS-4 limits what the shop sells to what phase 3 proves; if diwani or signature are ever sold, each needs its own face or a style-specific reader check first.
