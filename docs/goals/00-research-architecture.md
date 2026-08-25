# Goal 00 — research and finalize architecture

## Completion condition

Produce an evidence-backed, dated architecture decision package that a senior team can approve before scaffolding. Do not implement the production application.

## Required work

- Convert the product contract into workload assumptions: users, generations, fan-out, media sizes, latency targets, retention, regions, privacy, spend, and operator needs. Use ranges where business inputs are unknown.
- Research current primary sources for the web framework, monorepo tooling, database (including Convex comparison), workflow engine, object storage/CDN, auth, realtime, observability, deployment, still-image models, and video models.
- Verify exact versions/model IDs, GA/preview/deprecation status, pricing, quotas, duration/timeout constraints, regions, data handling, and exit path.
- Create ADR-001 through ADR-010 with weighted alternatives and consequences.
- Create a cost/latency/concurrency model for launch, 10x, and 100x demand.
- Create a threat model, privacy/data-flow diagram, and failure-mode table.
- Define the jewelry-specific image/video evaluation corpus and activation thresholds.
- Decide whether the branch should remain in this repository or move to a new repository, with migration steps.

## Verification

- Every material external claim is primary-source cited and access-dated.
- `./scripts/verify-foundation.sh` passes.
- `plan-reviewer` challenges the research plan before execution.
- `adversarial-reviewer` attempts to falsify the recommended stack and checks cost/operability assumptions.
- No P0 decision is left as “TBD”; unresolved business inputs have explicit owner, default, and decision deadline.

## Stop condition

Open a draft PR from `phase/00-research-architecture` into `rebuild/v2-first-principles` containing the decision package and proof packet. Do not scaffold Phase 01, activate paid APIs, or merge.
