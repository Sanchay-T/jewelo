# Goal 03 — durable concurrent generation with contract providers

## Objective

Implement the complete production-shaped Trigger.dev orchestration and recovery model with deterministic provider contracts, including the exact four-way concurrency and progressive reveal behavior.

## Completion condition

A real Supabase run batch-dispatches four independent variation pipelines. All four product tasks can run concurrently; each successful product persists immediately and independently starts its matching worn task and fast motion-preview task concurrently. Partial success, retry, cancellation, reload/resume, duplicate delivery, quota backpressure, and deployment recovery all work through contract providers.

## Required work

- Implement typed Trigger parent/child tasks and provider-specific named queues.
- Use Trigger batch fan-out for the four variations; do not use `Promise.all()` around waitable child task APIs.
- Dispatch through the Supabase outbox with stable idempotency and scheduled reconciliation.
- Implement per-variation dependency graph:

```text
product -> identity/quality verification -> [worn + motion preview] in parallel
```

- Persist/reveal a successful product without waiting for its siblings.
- Persist task, provider-call, usage, asset, queue, attempt, and verification state at every durable milestone.
- Implement global provider limits and `organizationId` concurrency keys.
- Implement configuration-driven limits:
  - OpenAI image concurrency target 4;
  - fal Seedance preview concurrency target 4;
  - verifier separately bounded;
  - selected final video concurrency 1-2.
- Implement quota preflight. Real-provider mode must refuse `preview_all` when fal account concurrency has not been verified at >= 4.
- Implement cancellation, timeout, transient/permanent error classes, retry budgets, spend reservations, and orphan cleanup.
- Add failure-control test providers with programmable latency and outcomes.
- Expose progress through Supabase Realtime and operator traces through Trigger.

## Required task identity

Every provider-bearing task uses an idempotency key equivalent to:

```text
run:{runId}:variation:{index}:{kind}:release:{releaseId}
```

Duplicate outbox dispatch, retry, callback, or reconciliation must not duplicate provider charges or assets.

## Failure and concurrency matrix

- 429 and quota exhaustion;
- provider 5xx;
- timeout and stalled queue;
- malformed or missing asset;
- identity rejection;
- duplicate dispatch and duplicate completion;
- worker redeploy while tasks are active;
- customer cancellation;
- one or more sibling failures;
- database write retry after provider success;
- lost initial dispatch;
- fal effective concurrency 2 while the application requests 4;
- one product slow while other products/downstream tasks continue;
- per-organization fairness under multiple simultaneous runs;
- spend reservation exhausted mid-run.

## Verification

Prove with timestamped traces and database evidence:

1. four product tasks overlap in time when queue capacity is four;
2. the first verified product is visible before the slowest product finishes;
3. its worn and motion-preview tasks overlap after product QA;
4. maximum configured concurrency is never exceeded;
5. fal capacity below four produces honest queued states;
6. successful siblings survive a failed variation;
7. no duplicate provider calls/charges/assets occur;
8. state reconstructs after browser reload;
9. cancellation prevents queued/dependent work;
10. active runs survive a jobs deployment.

Run security and adversarial review. Include a Gantt/timeline artifact of at least one representative run.

## Stop condition

Open a draft PR into `rebuild/v2-first-principles`. No paid model activation; do not begin Goal 04.
