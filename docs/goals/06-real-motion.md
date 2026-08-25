# Goal 06 — selected-first real motion

## Objective

Activate the selected/on-demand 9:16 motion experience through Runway without allowing pendant identity drift.

## Completion condition

A selected verified variation produces, persists, and plays a 6-second portrait motion asset using `gemini_omni_flash`; failure can retry/fallback to `seedance2`; customer and operator states recover correctly.

## Required work

- Implement the Runway adapter and asynchronous task polling/callback handling.
- Pin `gemini_omni_flash`; define explicit `seedance2` fallback policy.
- Use the approved still as the first frame and the motion prompt release.
- Enforce one default selected video, with additional variations only on demand.
- Persist provider task ID, model, cost, latency, result, and QA.
- Validate aspect ratio, resolution, duration, codec/playability, loop, and identity drift.
- Implement explicit controls, poster state, scrubbing, keyboard/touch, reduced motion.
- Handle provider moderation, timeout, failure, duplicate completion, cancellation, and fallback.

## Constraints

Development credential/budget required. No four-video upfront generation.

## Verification

Real bounded calls, drift evaluation, player matrix across target browsers/devices, actual cost/latency, failure/fallback evidence, security/UX/adversarial review.

## Stop condition

Draft PR. Do not implement full commerce.
