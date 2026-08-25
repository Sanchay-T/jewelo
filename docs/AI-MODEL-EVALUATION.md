# AI model evaluation policy

Generic image/video leaderboards are discovery signals, not Jewelo activation tests. The hard requirement is exact jewelry identity across multiple representations.

## Evaluation corpus

At least 150 approved cases spanning:

- short, long, repeated-letter, ambiguous-glyph, and mixed-case Latin names;
- Arabic/RTL and Chinese text cases defined with native-language review;
- yellow, rose, and white gold; multiple karats and finishes;
- no stones, diamonds, colored stones, and mixed settings;
- name pendants first, then bracelet, ring, earrings, and other supported types;
- reference-preservation and from-scratch flows;
- adversarial/unsafe/unsupported requests;
- square product, 4:5 worn, and 9:16 motion tasks.

## Metrics

- exact approved-text preservation;
- canonical silhouette/geometry similarity;
- cross-view identity consistency;
- material, stone, chain, clasp, and scale correctness;
- anatomical plausibility for worn views;
- motion drift, morphing, occlusion, loop quality;
- human luxury-quality score;
- usable-result rate, moderation/rejection rate;
- p50/p95 latency, provider errors and retries;
- cost per usable direction and completed customer journey.

## Activation gate

A provider/model/profile is enabled through configuration only after:

1. its exact model ID and availability are verified from primary docs;
2. policy, regional, data-retention, quota, and commercial terms are reviewed;
3. the frozen corpus is run with an immutable prompt release;
4. identity and usability thresholds are met against the incumbent;
5. rollback and spend limits are tested;
6. results and approval are recorded in an ADR.

Do not silently fail over between visually different models. A fallback policy must be explicit and traceable.
