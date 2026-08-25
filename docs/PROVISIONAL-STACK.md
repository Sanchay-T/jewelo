# Provisional stack — research must confirm

This is the leading hypothesis entering Phase 0. It is not a locked procurement decision.

| Concern | Leading candidate | Why it currently leads | Phase 0 must verify |
| --- | --- | --- | --- |
| Web/BFF | Next.js 16, React, strict TypeScript | strong deployment ecosystem, server/client composition, team familiarity | current stability, caching model, testability, portability |
| Monorepo | pnpm workspace + Turborepo | fast, agent-readable boundaries, shared typed packages | exact versions, CI/cache complexity |
| System of record | managed PostgreSQL + Drizzle | relational integrity, transactions, audit/reporting, portability | provider, pooling, branching, backups, RLS strategy |
| Durable work | Trigger.dev | long-running tasks, retries, queues, idempotency, concurrency, observability | pricing, limits, regional needs, self-host path, failure semantics |
| Media | S3-compatible object storage + CDN | immutable large assets and broad portability | R2 vs S3/GCS, egress, transformations, retention |
| Realtime | SSE first | simple progress stream while DB remains authoritative | fan-out needs, reconnect, hosting limits |
| Auth | managed OIDC provider behind our organization/role model | reduces security surface while preserving portability | B2C/B2B needs, UAE region/legal, pricing |
| Still image | OpenAI image adapter first | high-fidelity image/edit path and strong current quality | exact current model, text/shape fidelity, cost, latency, policy |
| Motion | Vertex AI Veo adapter first | first/last-frame control, vertical generation, production cloud path | exact current model IDs, GA status, quotas, regional availability |
| Observability | OpenTelemetry + Sentry + product analytics | traces across web/workflow/provider and usable product insight | cost, sampling, PII policy |
| Deploy | Vercel web + managed services | low operational burden at startup | limits, cost curves, vendor failure/exit path |

## Convex decision hypothesis

Convex remains a valid product platform, especially for realtime MVPs. The current recommendation is **not to use it as Jewelo v2's primary system of record** because the durable core is highly relational and commercial: organizations, immutable revisions, runs, tasks, assets, quotes, orders, audit events, cost lineage, and an outbox. Realtime should be evaluated as a transport concern rather than the database-selection criterion.

Phase 0 must compare Convex honestly against PostgreSQL alternatives using requirements, costs, operational burden, lock-in, audit/reporting, migrations, and workflow integration. The decision is not complete until the ADR is accepted.

## Architecture shape

Prefer a modular monolith plus durable workers. Do not introduce microservices or Kubernetes without a measured boundary that justifies them.
