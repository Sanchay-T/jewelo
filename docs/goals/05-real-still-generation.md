# Goal 05 — real GPT Image 2 product and worn generation

## Objective

Activate and validate the production still-image adapter using direct OpenAI GPT Image 2 while enforcing canonical identity, cost, retries, and provider isolation.

## Completion condition

A bounded development run creates four verified product directions and four matching worn views through the real API, persists lineage/cost, streams progressive state, and passes the Jewelo evaluation threshold.

## Required work

- Implement the direct OpenAI adapter pinned to `gpt-image-2-2026-04-21`.
- Use canonical identity references and approved prompt releases.
- Use bounded product/worn queues and idempotency keys.
- Download provider outputs immediately into private Supabase Storage.
- Run deterministic QA then `gpt-5.6-luna` structured verifier where required.
- Retry individual identity/transient failures within budget.
- Implement provider timeout/429/5xx handling and safe logs.
- Produce a dated model evaluation and cost/latency report.
- Keep alternate still providers behind the port but do not add one without evidence.

## Constraints

Requires explicit development OpenAI credential and budget authorization. No production key or broad customer traffic.

## Verification

Real calls on the synthetic corpus subset; exact-name hard gate; product-to-worn consistency; partial/retry behavior; actual usage/cost; deletion/retention; no provider URL leakage; UX/security/adversarial review.

## Stop condition

Draft PR. Do not activate real motion.
