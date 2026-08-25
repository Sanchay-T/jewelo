# Phase roadmap

| Phase | Outcome | Explicitly excluded |
| --- | --- | --- |
| 00 Research & architecture | dated, evidence-backed ADRs, workload/cost model, threat model, model evaluation plan | production scaffold and provider calls |
| 01 Repository foundation | reproducible monorepo, local infra, CI, commands, boundaries | customer features and paid AI |
| 02 UX prototype | responsive logged-in studio with all states and mock data | real persistence/orchestration/providers |
| 03 Domain/data/realtime | auth boundary, schema/migrations, APIs, SSE, idempotency/outbox | paid generation |
| 04 Durable workflow + mocks | parallel fan-out, retries, partial success, cancellation, failure injection | real model activation |
| 05 Image identity | canonical identity, image adapters, prompts, evaluation, controlled still generation | final video/commerce |
| 06 Motion | selected-first vertical motion, async status, player and drift evaluation | full commerce/launch |
| 07 Commerce | estimates, quotes, orders, snapshots, operator path | production launch |
| 08 Hardening & launch | security, load, observability, budgets, backup/rollback, deployment and launch review | post-launch roadmap |

A phase may refine the next goal but may not absorb it.
