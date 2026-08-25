# Jewelo v2 agent contract

You are implementing a first-principles production rebuild. The architecture is already decided by the product manager. Preserve the approved customer outcome and follow the locked stack; do not inherit assumptions from the old backend.

@docs/START-HERE.md
@docs/PRODUCT-CONTRACT.md
@docs/FROZEN-UX.md
@docs/UX-AUDIT.md
@docs/FINAL-STACK.md
@docs/ARCHITECTURE.md
@docs/GOAL-ROADMAP.md
@docs/VERIFICATION.md
@docs/DECISION-REGISTER.md

## Binding decisions

- Web: Next.js 16.2, React 19, strict TypeScript, Vercel.
- Repository: pnpm workspace + Turborepo.
- Data platform: Supabase Mumbai — Postgres, Auth, Realtime, private Storage.
- Workflow: Trigger.dev Cloud.
- Still images: direct OpenAI GPT Image 2 snapshot.
- Motion: Runway API, pinned `gemini_omni_flash`; `seedance2` fallback.
- Observability: Sentry, PostHog, provider-native traces.
- Development: managed remote environments; no required Docker/local database/local storage.

These may change only after an explicit user instruction or a proved blocking incompatibility. An agent must not substitute Convex, Neon, Clerk, Firebase, R2, another workflow engine, or another model because it prefers that vendor.

## Non-negotiable engineering rules

1. Work on exactly one `docs/goals/*.md` objective at a time.
2. Read the active goal and its stopping condition before editing.
3. Use a goal branch/worktree and target PRs to `rebuild/v2-first-principles`; never push directly to `main`.
4. Inspect first, state the concrete plan, then use the `plan-reviewer` to challenge it before material implementation.
5. Keep business/domain code independent of vendor SDKs. Vendors live behind narrow adapters.
6. Supabase SQL migrations and generated database types are the schema source of truth. Do not create a competing ORM migration source.
7. Keep the browser on publishable Supabase credentials only. Service-role and provider credentials are server/job only.
8. The canonical name-pendant identity is deterministic. Generative models render it; they do not decide spelling or geometry.
9. Generation is durable, idempotent, individually retryable, concurrency-controlled, observable, and able to finish partially.
10. Use an outbox/reconciliation boundary so a committed design run cannot be lost if Trigger dispatch fails.
11. Preserve old successful assets when refining or regenerating. New work creates a new run/revision.
12. Generate four product and four worn stills in bounded parallelism. Generate video only for the selected or explicitly requested variation.
13. Do not make paid provider calls outside a goal that permits them and a documented development budget.
14. Never commit secrets, production data, customer media, or raw provider payloads containing PII.
15. Prove behavior by running it. Do not weaken tests or redefine the goal to declare success.
16. After verification, use applicable UX/security reviewers and a fresh adversarial reviewer.
17. Do not merge or start the next goal automatically.

## Human API boundary

Ask the user only for a smallest-possible external action: authenticate a named MCP/CLI, create/authorize an account, supply a specific secret, accept billing/legal terms, approve an irreversible production action, or approve merge/launch.

Once an environment is authorized, routine migrations, preview deploys, job runs, logs, cleanup, and debugging are agent work.

## Required completion packet

Every goal PR must include:

- objective completed and deliberately excluded scope;
- exact commands and pass/fail results;
- browser/API/provider evidence appropriate to the goal;
- injected failure and recovery evidence;
- security, privacy, migration, cost, and rollback impact;
- fresh-context review findings and resolutions;
- unresolved risk with owner;
- exact next goal, without starting it.
