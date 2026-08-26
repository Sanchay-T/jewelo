# Goal 06 — real four-preview Seedance motion

## Objective

Activate the production motion experience through fal.ai and Seedance while preserving pendant identity, proving four-way preview concurrency, and keeping the customer experience progressively usable.

## Completion condition

For a bounded real development run, each verified product variation independently produces and persists a 4-second, 9:16, 720p, silent Seedance 2.0 Fast preview. Up to four previews overlap when the fal account capacity is at least four. The selected variation can optionally generate a 6-second standard Seedance final. Provider failure, queueing, retry, cancellation, duplicate completion, reload/resume, and identity drift all recover correctly.

## Required work

- Implement the fal adapter with `@fal-ai/client` behind the motion provider port.
- Pin preview endpoint `bytedance/seedance-2.0/fast/image-to-video`.
- Pin final endpoint `bytedance/seedance-2.0/image-to-video`.
- Use fal asynchronous queue/status/webhook behavior; do not block Vercel request handlers.
- Use the approved product still as each fast preview’s start frame.
- Generate preview profile:
  - four variations;
  - 4 seconds;
  - 9:16;
  - 720p;
  - audio disabled;
  - standard bitrate unless evaluation approves high.
- Start each preview as soon as its product passes QA; do not wait for all four products or for worn media.
- Generate the optional selected final as a separate task/profile, using an approved product or worn still and 6-second standard Seedance.
- Enforce `fal-seedance-fast` queue concurrency 4 only after the account limit is verified at >= 4.
- If fal capacity is lower, preserve queued state and do not claim the four-preview target is met.
- Persist request ID, endpoint, seed, queue/start/completion timestamps, cost, result, checksum, storage asset and QA.
- Download provider output immediately into private Supabase Storage. Do not persist fal CDN URLs as product assets.
- Validate aspect ratio, resolution, duration, codec/playability, loop, first-frame consistency and pendant drift.
- Implement player/poster/scrub/navigation states with Motion, Embla and native video.
- Handle moderation, 422, 429/quota, 5xx, timeout, malformed result, duplicate callback, cancellation and spend exhaustion.

## fal capacity gate

fal documents an account-wide concurrency limit; new accounts begin at two. Before enabling `VIDEO_PREVIEW_MODE=all_variations`, record evidence that the active account allows at least four concurrent jobs. Purchasing credits or sales approval may be required.

The fal MCP may be used for model schema, pricing and bounded test execution after `FAL_KEY` is authorized, but application runtime calls use the typed JavaScript adapter.

## Verification

Real bounded calls must prove:

1. four preview requests overlap when account and Trigger limits are four;
2. a preview starts immediately after its own product QA;
3. a slow/failed sibling does not block the other previews;
4. fal queue depth and customer `queued` state agree;
5. actual concurrency never exceeds the lower of application and fal limits;
6. all provider output is copied into private Jewelo storage;
7. identity-drift hard gate and format/playability gates pass;
8. preview cost, final cost, latency and attempts are stored;
9. duplicate completion and cancellation are idempotent;
10. the player matrix passes on target desktop/mobile browsers, keyboard, touch, reduced motion and short viewports;
11. security, UX and fresh adversarial review pass.

Include a timestamped four-preview Gantt/timeline, fal quota evidence, and the actual cost/latency report.

## Stop condition

Open a draft PR. Do not implement commerce or begin Goal 07.
