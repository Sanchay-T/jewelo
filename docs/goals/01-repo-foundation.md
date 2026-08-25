# Goal 01 — production repository foundation

## Completion condition

A clean clone can install, start local dependencies, migrate, lint, typecheck, test, build, and run a minimal health surface through documented root commands and CI.

## Required work

- Implement the approved monorepo and exact pinned toolchain from Phase 00.
- Create `apps/web`, `apps/worker`, and approved packages for domain, database, AI ports, storage, UI, config, and observability.
- Add local PostgreSQL and object-storage services, migration tooling, seed/test databases, environment validation, and secret documentation.
- Add root `setup`, `doctor`, `dev`, `check`, `test`, `build`, `verify`, and clean/reset commands.
- Add CI caching, dependency review, test artifacts, and least-privilege workflows.
- Add architecture boundary checks and a minimal health/readiness endpoint.

## Verification

Test from a fresh clone or clean container. Prove install reproducibility, migration up/down/up, local service health, CI parity, and zero committed secrets. Ask a fresh reviewer to inspect dependency/tooling choices and bootstrap documentation.

## Stop condition

Draft PR into the integration branch. No customer workflow, auth product behavior, real AI call, or production cloud resource.
