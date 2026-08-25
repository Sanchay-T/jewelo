# Goal 04 — durable generation workflow with mock providers

## Completion condition

A generation run fans out four directions in parallel through a durable workflow, reports granular progress, survives retries/restarts, supports cancellation and partial success, and uses deterministic mock providers only.

## Required work

- Implement run orchestration, per-direction product tasks, chained worn tasks, and selected/on-demand motion task seams.
- Configure idempotency, concurrency queues, retry classification/budgets, timeouts, cancellation, dead-letter state, and outbox dispatch.
- Persist provider job IDs/attempts, task events, latency, cost placeholders, and asset lineage.
- Add failure-injection controls for timeout, rate limit, malformed output, duplicate delivery, worker restart, and partial success.
- Connect real UI progress and per-unit retry behavior.

## Verification

Deterministic workflow tests prove no duplicate logical assets, recovery after interruption, independent retry, cancellation, partial usability, and event ordering/replay. Include a load simulation and trace evidence.

## Stop condition

Draft PR into integration. No paid provider calls or production activation.
