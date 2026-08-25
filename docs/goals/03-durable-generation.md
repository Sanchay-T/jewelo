# Goal 03 — durable generation with contract providers

## Objective

Implement the complete Trigger.dev orchestration and recovery model using deterministic provider mocks.

## Completion condition

A real Supabase run can fan out four product tasks, unlock four matching worn tasks, preserve partial success, retry/cancel correctly, and create selected-first video work using mock providers under production-shaped contracts.

## Required work

- Implement typed Trigger tasks and provider queues/concurrency keys.
- Dispatch through the outbox with idempotency and reconciliation.
- Implement product -> verification -> worn dependencies.
- Implement selected/on-demand motion dispatch.
- Persist task/provider-call/usage/asset state at every durable milestone.
- Implement cancellation, timeout, transient/permanent error classes, retry budgets, and orphan cleanup.
- Add a failure-control test provider.
- Expose customer progress through Supabase Realtime and operator traces through Trigger.

## Failure matrix

429, 5xx, timeout, malformed asset, identity rejection, duplicate dispatch, duplicate callback, worker redeploy, cancellation, partial sibling failure, database write retry, and lost initial dispatch.

## Verification

Execute every matrix case; prove no duplicate charges/assets, successful siblings survive, state reconstructs after reload, max concurrency is respected, and active runs survive a deployment. Security/adversarial review.

## Stop condition

Draft PR. No paid model activation.
