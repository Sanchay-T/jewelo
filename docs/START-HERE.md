# Start here

## Product outcome

Jewelo helps a customer or jeweler turn an approved name and jewelry specification into trustworthy visual directions, inspect each direction as a product, worn on a person, and in motion, select one, then move into estimate, quote, order, and fulfillment workflows.

The MVP established the customer journey and visual ambition. This branch rebuilds the product so that identity, generation, commercial state, and operations are reliable enough for real business use.

## What is frozen

- The customer can begin from inspiration, an upload, or a fresh concept.
- The name/text and jewelry specification are explicitly approved before generation.
- A generation run creates four distinct directions.
- Each direction can have linked product, worn, and motion representations.
- The customer can inspect, compare, select, refine, leave, and resume.
- Partial success is usable; one failed representation does not erase successful work.
- A selected direction can progress to estimate, quote, order, and fulfillment.
- Product stills are primarily square, worn imagery is portrait-oriented, and motion is 9:16.

## What is not frozen

- The former backend, database, API routes, provider SDKs, job logic, and folder structure.
- Exact cloud vendors and managed-service choices until Phase 0 research is approved.
- Exact model IDs; they are configuration and must pass a Jewelo-specific evaluation.
- Manufacturing/CAD scope; photorealistic visualization must not be represented as fabrication-ready geometry.

## Current phase

This branch contains the Phase 0 agent foundation. The first implementation task is **research and architecture finalization**, not application coding.

Run:

```bash
./scripts/doctor.sh
./scripts/verify-foundation.sh
claude
```

Then invoke `/phase-00` or run `./scripts/run-goal.sh 00`.
