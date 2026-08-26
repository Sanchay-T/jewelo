# Architecture decision matrix

**Scored:** 26 August 2026

Scores are directional product-management judgments, not vendor benchmarks. Weighting reflects Jewelo's actual risk: AI workflow reliability and commercial data correctness matter more than ordinary CRUD throughput.

## Application control plane

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

### Winner: Supabase + Trigger.dev

It is not the fewest possible services, but it is the smallest coherent system that gives Jewelo:

- standard relational business truth;
- guest-to-account identity;
- private media under the same RLS model;
- realtime asset/task updates;
- dedicated durable AI execution;
- remote preview branches;
- first-class CLI/MCP control;
- a credible migration path.

### Why Convex did not win

Convex wins on cohesive realtime TypeScript development. Jewelo, however, becomes a commercial system containing immutable revisions, provider-cost lineage, quotes, orders, audit trails, and operator reporting. Standard Postgres is easier to query, reconcile, export, and integrate with finance/operations tooling. A dedicated workflow layer better isolates long-running media execution.

### Why Neon did not win

Neon has excellent Postgres branching and agent tooling. Jewelo would still require separate mature choices for anonymous auth, private media, and customer realtime. Supabase delivers those in one authorization plane.

### Why GCP-native did not win

Cloud services can scale extremely well but introduce more IAM, deployment, networking, and operational surface than this startup should carry before measurement demands it.

## Media execution decision

| Criterion | Weight | Trigger + direct OpenAI + fal | fal Workflows as main orchestrator | Genblaze | Custom provider calls in web/serverless handlers |
| --- | ---: | ---: | ---: | ---: | ---: |
| durable business workflow/recovery | 25% | 9.5 | 6.5 | 6.5 | 3.0 |
| four-way concurrency control/fairness | 20% | 9.5 | 7.0 | 7.0 | 4.0 |
| provider/model access | 15% | 9.5 | 10.0 | 8.5 | 8.0 |
| TypeScript/repository fit | 15% | 9.5 | 8.5 | 4.5 | 9.0 |
| provenance/cost/observability | 10% | 9.0 | 7.5 | 9.0 | 4.5 |
| agent operability | 10% | 9.5 | 9.5 | 6.0 | 6.5 |
| source-of-truth separation | 5% | 9.5 | 5.5 | 6.0 | 4.0 |
| **Weighted score / 10** | **100%** | **9.45** | **7.65** | **6.65** | **5.05** |

### Winner: Trigger.dev + direct OpenAI + fal.ai

- Trigger.dev owns durable orchestration, idempotency, fan-out, queues, retries, dependencies, cancellation, preview environments, and traces.
- Direct OpenAI isolates GPT Image 2 quota and usage from video inference.
- fal.ai provides managed Seedance endpoints, asynchronous queue/status/webhook behavior, automatic inference infrastructure, and a model MCP.
- Supabase remains the only customer/business source of truth and durable asset catalog.

### Why fal Workflows are not the Jewelo workflow engine

fal Workflows are useful model pipelines, but Jewelo also needs commercial state, per-tenant fairness, database outbox reconciliation, partial sibling success, cancellation, replay, spend reservation, and one durable timeline across multiple providers. fal remains the Seedance inference gateway.

### Why Genblaze is not adopted

Genblaze is the strongest open-source media-pipeline candidate reviewed. It has useful provider abstraction and provenance concepts, but would add Python and duplicate Trigger.dev's orchestration and retry responsibilities. Its provenance ideas are incorporated into Jewelo's typed provider-call/asset records instead.

### Why provider calls do not live in request handlers

The pipeline exceeds normal web-request lifetimes and must survive browser closure, deploys, provider queues, callbacks, retries, and partial failure. Vercel request handlers create/authorize commands; Trigger jobs perform media work.

## Model/gateway decision

| Need | Locked decision | Reason |
| --- | --- | --- |
| product/worn stills | direct OpenAI `gpt-image-2-2026-04-21` | current high-quality image/edit path, exact snapshot, quota isolation, high-fidelity references |
| four fast motion previews | fal `bytedance/seedance-2.0/fast/image-to-video` | lower latency/cost Seedance tier, 4–15s, 9:16, 720p, queue API |
| selected final motion | fal `bytedance/seedance-2.0/image-to-video` | standard-quality Seedance profile and optional higher-resolution path |
| workflow | Trigger.dev | durable application orchestration rather than model inference only |
| durable media | Supabase private Storage | shared RLS/ownership plane; provider URLs remain temporary transport |

## Decision triggers

Revisit a choice only when a measured trigger occurs:

- Supabase Realtime throughput or authorization checks become a proven bottleneck.
- Storage/egress cost exceeds the cost of adding a dedicated media CDN.
- Trigger.dev cost or regional requirements exceed an agreed threshold.
- OpenAI or Seedance repeatedly misses the pendant-identity quality gate.
- fal cannot provide the required concurrency/reliability/economics.
- four motion previews do not improve customer inspection/conversion enough to justify cost.
- legal/data-residency requirements demand another region/provider.
