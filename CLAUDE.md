# Jewelo v2 agent contract

You are implementing a first-principles production rebuild. The architecture is already decided by the product manager. Preserve the approved customer outcome and follow the locked stack; do not inherit assumptions from the old backend.

@docs/START-HERE.md
@docs/CALEUMS-CUSTOMER-JOURNEY.md
@docs/CALEUMS-FINAL-E2E-CONTRACT.md
@docs/PRODUCT-CONTRACT.md
@docs/FROZEN-UX.md
@docs/UX-AUDIT.md
@docs/FINAL-STACK.md
@docs/ARCHITECTURE.md
@docs/MEDIA-CONCURRENCY.md
@docs/GOAL-ROADMAP.md
@docs/VERIFICATION.md
@docs/DECISION-REGISTER.md

## Binding decisions

- Web: Next.js 16.2, React 19, strict TypeScript, DigitalOcean App Platform.
- Repository: pnpm workspace + Turborepo.
- Data platform: Supabase Mumbai — Postgres, Auth, Realtime, private Storage.
- Workflow: Trigger.dev Cloud.
- Still images: direct OpenAI GPT Image 2 snapshot.
- Motion: fal.ai with Seedance 2.0 Fast for four previews and Seedance 2.0 Standard for the selected final upgrade.
- Observability: Sentry, PostHog, Trigger/provider traces.
- Development: managed remote environments; no required Docker/local database/local storage.
- Media UI: Motion, Embla Carousel, `react-zoom-pan-pinch`, `react-dropzone`, native short-form video.

These may change only after an explicit user instruction or a proved blocking incompatibility. An agent must not substitute Convex, Neon, Clerk, Firebase, R2, Runway, another workflow engine, another image model, or another video gateway because it prefers that vendor.

For final Caleums integration, `docs/CALEUMS-FINAL-E2E-CONTRACT.md` overrides
older goal examples that describe a different media graph or provider split.

## Non-negotiable engineering rules

1. Work on exactly one `docs/goals/*.md` objective at a time.
2. Read the active goal and its stopping condition before editing.
3. Use a goal branch/worktree and target PRs to `rebuild/v2-first-principles`; never push directly to `main`.
4. Inspect first, state the concrete plan, then use `plan-reviewer` to challenge it before material implementation.
5. Keep business/domain code independent of vendor SDKs. Vendors live behind narrow adapters.
6. Supabase SQL migrations and generated database types are the schema source of truth. Do not create a competing ORM migration source.
7. Keep the browser on publishable Supabase credentials only. Service-role and provider credentials are server/job only.
8. Canonical name-pendant identity is deterministic. Generative models render it; they do not decide spelling or geometry.
9. Generation is durable, idempotent, individually retryable, concurrency-controlled, observable, cancellable, and able to finish partially.
10. Use an outbox/reconciliation boundary so a committed design run cannot be lost if Trigger dispatch fails.
11. Preserve old successful assets when refining or regenerating. New work creates a new run/revision.
12. Batch-dispatch four independent variation pipelines. Start all four product stills concurrently within verified OpenAI quota.
13. As soon as one product passes QA, persist/reveal it and start that variation’s worn still and fast Seedance preview concurrently. Never add a global “wait for all products” barrier.
14. Four Seedance previews require a verified fal account concurrency limit of at least four. Otherwise queue truthfully; do not fake parallel progress.
15. Showcase motion profile: four 4-second, 9:16, 720p, silent Seedance Fast previews. Optional selected final: 6-second Seedance Standard.
16. Provider concurrency, requests-per-minute, attempt limits, and spend ceilings are validated configuration—not hard-coded business rules.
17. Use Trigger batch fan-out and named queues; do not use ad hoc `Promise.all()` around waitable child tasks.
18. Idempotency keys include run, variation, asset kind, and prompt release. Duplicate dispatch/callback must not duplicate charges or assets.
19. fal.ai is an inference gateway, not Jewelo’s workflow engine or durable storage. Immediately copy successful provider media into private Supabase Storage.
20. Do not add Genblaze or another autonomous media-agent framework. Borrow provenance ideas only; keep execution deterministic and typed.
21. Do not make paid provider calls outside a goal that permits them and a documented development budget.
22. Never commit secrets, production data, customer media, raw provider payloads containing PII, or permanent public provider URLs.
23. Prove behavior by running it. Do not weaken tests or redefine the goal to declare success.
24. Verify rendered progress states at desktop, mobile, short viewport, keyboard, touch, reduced motion, and RTL.
25. After verification, use applicable UX/security reviewers and a fresh adversarial reviewer.
26. Do not merge or start the next goal automatically.

## Customer-visible progress contract

The browser subscribes to Supabase task/asset state, not provider polling.

```text
queued -> generating -> verifying -> ready
                     -> retrying
                     -> failed
                     -> cancelled
```

- reveal each product as soon as it is verified;
- preserve slot dimensions and crossfade assets without layout jumps;
- use skeleton/shimmer only for real pending state;
- never show fake percentages;
- successful siblings remain usable;
- product, worn, and motion stay linked to one variation identity;
- leaving/reloading reconstructs the complete run.

## Human API boundary

Ask the user only for the smallest external action: authenticate a named MCP/CLI, create/authorize an account, supply a specific secret, accept billing/legal terms, approve an irreversible production action, or approve merge/launch.

Specific launch authorizations include:

- OpenAI project with sufficient GPT Image 2 quota for four concurrent product calls and progressive worn calls;
- fal account/API key with a verified concurrency limit of at least four for preview-all mode;
- explicit development spend ceilings.

Once an environment is authorized, routine migrations, preview deploys, job runs, model schema/pricing checks, logs, cleanup, and debugging are agent work.

## Required completion packet

Every goal PR must include:

- objective completed and deliberately excluded scope;
- exact commands and pass/fail results;
- browser/API/provider evidence appropriate to the goal;
- measured queue parallelism and provider quota evidence when media applies;
- injected failure, duplicate, cancellation, and recovery evidence;
- security, privacy, migration, cost, and rollback impact;
- fresh-context review findings and resolutions;
- unresolved risk with owner;
- exact next goal, without starting it.
