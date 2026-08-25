# Architecture decision matrix

**Scored:** 26 August 2026

Scores are directional product-management judgments, not vendor benchmarks. Weighting reflects Jewelo's actual risk: AI workflow reliability and commercial data correctness matter more than ordinary CRUD throughput.

| Criterion | Weight | Supabase + Trigger | Convex + Workflow/Workpool | Neon + Trigger + extra auth/media | GCP-native |
| --- | ---: | ---: | ---: | ---: | ---: |
| Relational commercial/data fit | 20% | 9.5 | 7.5 | 9.5 | 8.0 |
| Durable AI workflow fit | 20% | 9.5 | 7.5 | 9.5 | 9.0 |
| Realtime customer experience | 15% | 9.0 | 10.0 | 7.5 | 8.5 |
| Managed, low-ops development | 15% | 8.5 | 9.5 | 8.0 | 6.5 |
| Agent CLI/API/MCP operability | 15% | 9.5 | 9.5 | 10.0 | 7.5 |
| Reporting, portability, exit | 10% | 9.0 | 5.5 | 9.5 | 6.0 |
| Private media fit | 5% | 9.0 | 7.0 | 9.0 | 9.0 |
| **Weighted score / 10** | **100%** | **9.25** | **8.05** | **8.85** | **7.85** |

## Winner

**Supabase + Trigger.dev**

It is not the fewest possible services, but it is the smallest coherent system that gives Jewelo:

- standard relational business truth;
- guest-to-account identity;
- private media under the same RLS model;
- realtime asset/task updates;
- dedicated durable AI execution;
- remote preview branches;
- first-class CLI/MCP control;
- a credible migration path.

## Convex

### What it wins

- excellent realtime subscriptions;
- cohesive TypeScript developer experience;
- strong CLI/agent tooling;
- simple application transactions.

### Why it did not win

Jewelo is not only a realtime creation demo. It becomes a commercial system containing immutable revisions, provider-cost lineage, quotes, orders, audit trails, and operator reporting. Standard Postgres is materially easier to query, reconcile, export, and integrate with future finance/operations tooling.

Convex's region selection and export/media/auth tradeoffs would require more compromises or adjacent services. Its workflow component is useful but less specialized than Trigger.dev for long-running media pipelines.

## Neon

Neon has excellent Postgres branching and strong agent tooling. It scored close to the winner. It loses because Jewelo would still need separate mature choices for anonymous auth, private media, and customer realtime. Supabase delivers those in one authorization plane today.

## GCP-native

Cloud Run/Tasks/Workflows/Cloud SQL/GCS/Vertex can scale extremely well and remains a valid future consolidation path. It introduces more IAM, deployment, networking, and operational surface than this startup should carry before measurement demands it.

## Decision triggers

Revisit a choice only when a measured trigger occurs:

- Supabase Realtime throughput or authorization checks become a proven bottleneck.
- Storage/egress cost exceeds the cost of adding R2/media CDN complexity.
- Trigger.dev cost or regional requirements exceed an agreed threshold.
- A provider repeatedly misses the pendant-identity quality gate.
- Legal/data-residency requirements demand another region/provider.
