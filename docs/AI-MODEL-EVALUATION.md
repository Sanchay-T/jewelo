# Jewelry model evaluation

Architecture defaults are locked, but every model release/profile change must pass a Jewelo-specific gate before promotion.

## Default profiles

```text
still.production   gpt-image-2-2026-04-21 (direct OpenAI)
still.verifier     gpt-5.6-luna
still.fallback     openai/gpt-image-2 on fal, disabled
motion.preview     bytedance/seedance-2.0/fast/image-to-video
motion.final       bytedance/seedance-2.0/image-to-video
```

Model promotion changes configuration and prompt releases, not domain code.

## Corpus

Minimum 120 canonical designs:

- English, Arabic, and Chinese scripts;
- short and long names;
- repeated and visually similar letters;
- ligatures and difficult joins;
- thin and thick strokes;
- yellow, rose, and white gold;
- no stones, diamonds, colored stones, and mixed settings;
- pendant, ring, bracelet, and other explicitly supported types;
- reference-based and from-scratch paths;
- varied skin tones, necklines, camera distance, and lighting.

No real customer PII is used in regression fixtures.

## Still-image gates

Per asset:

- exact normalized name/glyph sequence;
- no missing, repeated, mirrored, or substituted glyph;
- canonical contour/connection similarity;
- correct metal/karat/stone profile;
- physically plausible chain/bail;
- no duplicated/floating jewelry;
- product crop/resolution/background compliance;
- worn anatomy, scale, occlusion, and pendant identity;
- latency, queue time, attempt count, and provider cost captured.

A run is production-eligible only when all four product directions pass the hard identity gate. Each product is customer-visible as soon as it passes. Worn assets may complete progressively and failing siblings retry independently.

## Still concurrency gate

The real-provider evaluation must prove:

- four product calls overlap when `OPENAI_IMAGE_CONCURRENCY=4`;
- effective OpenAI project IPM supports the intended pipeline;
- a first result is persisted before the slowest sibling completes;
- worn calls unlock per variation rather than after a global batch barrier;
- rate limiting produces queued/backoff state without duplicate calls.

## Fast motion-preview gates

For each of four Seedance Fast previews:

- start frame matches its approved product still;
- no letter, stone, metal, bail, or chain mutation;
- no implausible stretching/topology change;
- subtle product-focused camera/light motion;
- 9:16 portrait, 720p, 4 seconds;
- audio absent in the default profile;
- output playable on target browsers/mobile networks;
- provider output copied to private Jewelo storage;
- actual queue time, generation time, cost, and seed/request ID captured.

The account/runtime gate must prove four overlapping fal jobs. If fal account capacity is below four, `preview_all` cannot be marked launch-ready.

## Selected final-motion gates

- Seedance Standard endpoint;
- approved product or worn start frame;
- 9:16, 720p or approved higher resolution, 6-second target;
- stronger cinematic quality without increased identity drift;
- loop/end composition acceptable;
- cost and latency fit the final-upgrade budget.

## Promotion process

1. verify exact endpoint/schema/pricing through official provider surfaces;
2. run the fixed corpus against production and candidate profiles;
3. blind-review media quality;
4. compute hard-gate pass rate, retry rate, queue/generation latency, and cost;
5. require no regression in exact identity;
6. run four-way concurrency and quota tests;
7. store report, prompt/model snapshots, provider request IDs, and representative timelines;
8. promote development -> staging -> production with rollback.

Generic public Elo and vendor examples are inputs, never the final Jewelo decision.

## Open-source framework note

Genblaze and other open-source media pipelines may be reviewed for provenance or adapter ideas. They are not a substitute for the locked Supabase + Trigger.dev execution architecture and are not included in model promotion tests.
