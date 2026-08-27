# Goal 05 — real GPT Image 2 product and worn generation

## Objective

Activate and validate the production still-image adapter using direct OpenAI GPT Image 2 while enforcing canonical identity, true four-way concurrency, progressive downstream release, cost, retries, and provider isolation.

## Completion condition

A bounded development run uses the real OpenAI API to create four independently verified product directions concurrently. Each ready product appears immediately and unlocks its matching worn generation without waiting for the other variations. The full set of four product and four matching worn assets persists with lineage/cost and passes the Jewelo evaluation threshold.

## Required work

- Implement the direct OpenAI adapter pinned to `gpt-image-2-2026-04-21`.
- Use canonical identity references and approved prompt releases.
- Keep the optional fal GPT Image 2 adapter disabled and outside the primary execution path.
- Use a named OpenAI queue with target concurrency 4 and a configured requests-per-minute limiter derived from the actual OpenAI project tier.
- Refuse real-provider launch when quota configuration is missing; never guess or busy-loop on 429s.
- Batch-dispatch four distinct variation prompts with stable task/call idempotency keys.
- Persist/reveal each product immediately after its own deterministic and structured QA passes.
- Start its worn generation immediately after product QA, independently of sibling state.
- Download provider output immediately into private Supabase Storage.
- Run deterministic QA, then the configured structured visual verifier where required.
- Retry individual identity/transient failures within the reserved budget.
- Implement provider timeout/429/5xx handling, usage attribution, safe logs, and cancellation.
- Produce a dated model evaluation and concurrency/cost/latency report.

## Launch capacity gate

OpenAI publishes tier-based GPT Image 2 image-per-minute limits. The development project must prove that its tier and practical API behavior support:

- four overlapping product requests;
- progressively unlocked worn requests;
- bounded retries without starvation.

The expected launch baseline is at least the capacity needed for the target four-way fan-out; if it is lower, Trigger must queue honestly and the product target remains unmet until quota is increased.

## Constraints

Requires explicit development OpenAI credential and budget authorization. No production key, customer traffic, or unbounded corpus run. Do not route the primary image path through fal merely to share one gateway.

## Verification

Real calls on the synthetic corpus subset must prove:

1. four product provider calls overlap when configured capacity is four;
2. each output uses a distinct variation brief while preserving the same canonical identity;
3. exact-name hard gate passes;
4. first product appears before the batch is complete;
5. product-to-worn consistency passes;
6. 429/backoff, partial failure, retry and cancellation behave correctly;
7. actual usage/cost and model snapshot are recorded;
8. no public/durable provider URL or secret leaks;
9. storage deletion/retention works;
10. UX, security and fresh adversarial review pass.

Include a timestamped task/provider timeline and observed p50/p95 for the bounded test sample.

## Stop condition

Open a draft PR. Do not activate real Seedance motion or begin Goal 06.
