# Jewelry model evaluation

Architecture defaults are locked, but every model release must pass a Jewelo-specific gate before promotion.

## Default profiles

```text
still.production   gpt-image-2-2026-04-21
still.verifier     gpt-5.6-luna
motion.production  gemini_omni_flash
motion.fallback    seedance2
```

Model promotion changes configuration/prompt releases, not domain code.

## Corpus

Minimum 120 canonical designs:

- English, Arabic, and Chinese scripts;
- short/long names;
- repeated and visually similar letters;
- ligatures and difficult joins;
- thin/thick strokes;
- yellow/rose/white gold;
- no stones, diamonds, colored stones, mixed;
- pendant, ring/bracelet/other supported types;
- reference-based and from-scratch paths;
- varied skin tones, necklines, camera distance, and lighting.

No real customer PII is used in regression fixtures.

## Still-image gates

Per asset:

- exact normalized name/glyph sequence;
- no missing, repeated, or substituted glyph;
- canonical contour/connection similarity;
- correct metal/karat/stone profile;
- physically plausible chain/bail;
- no duplicated/floating jewelry;
- product crop/resolution/background compliance;
- worn anatomy, scale, occlusion, and pendant identity;
- latency and provider cost captured.

A run is production-eligible only when all four product directions pass the hard identity gate. Worn assets may complete progressively; failing siblings are retried individually.

## Motion gates

- first frame matches selected approved still;
- no letter/stone/metal/chain mutation;
- no implausible stretching or topology change;
- subtle jewelry/lighting/camera motion;
- 9:16 portrait, 720p minimum, 6s target;
- loop/end composition acceptable;
- no unexpected audio in default profile;
- playable on target browsers and mobile networks.

## Promotion process

1. run the fixed corpus against current production and candidate;
2. blind-review quality;
3. compute hard-gate pass rate, retry rate, latency, and cost;
4. require no regression in exact identity;
5. store report and prompt/model snapshots;
6. promote through development -> staging -> production with rollback.

Generic public Elo is an input, never the final Jewelo decision.
