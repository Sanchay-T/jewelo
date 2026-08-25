# Final production stack

**Decision date:** 26 August 2026  
**Status:** locked for implementation

This is the production architecture Jewelo v2 will implement. It was selected against the actual product workload: realtime progressive results, long-running parallel AI generation, private media, exact pendant identity, quotes/orders, low operational burden, and strong coding-agent control.

## Stack

| Concern | Locked choice | Implementation rule |
| --- | --- | --- |
| Runtime | Node.js 24 LTS | Pin the current Node 24 patch in `.tool-versions`/`.nvmrc` and CI. |
| Repository | pnpm workspace + Turborepo | `apps/web`, `apps/jobs`, and narrow shared packages. |
| Web | Next.js 16.2 App Router, React 19, strict TypeScript | Server Components by default; client components only for interaction/realtime. |
| UI | Tailwind CSS 4, shadcn/Radix, Motion, React Hook Form, Zod, next-intl | WCAG AA, keyboard/touch, reduced motion, RTL-ready. |
| Hosting | Vercel | Git preview deployments; no long AI work in request handlers. |
| System of record | Supabase Postgres in Mumbai (`ap-south-1`) | SQL migrations + RLS + generated TypeScript DB types. |
| Identity | Supabase Auth | Anonymous guest first; link email, phone, or OAuth later. |
| Realtime | Supabase Realtime | Subscribe to run/task/asset milestones filtered by run or design. |
| Media | Supabase private Storage | RLS, signed URLs, resumable/S3 upload paths, immutable object keys. |
| Durable jobs | Trigger.dev Cloud | Queues, retries, waits, idempotency, preview branches, atomic versions. |
| Product/worn images | OpenAI `gpt-image-2-2026-04-21` | Direct OpenAI adapter; high-fidelity reference workflow. |
| Visual QA | OpenAI `gpt-5.6-luna` plus deterministic checks | Structured verifier; model is configurable, canonical geometry remains authoritative. |
| Motion | Runway API `gemini_omni_flash` | Selected-first, 9:16, 720p, 6 seconds, no audio by default. |
| Motion fallback | Runway API `seedance2` | Explicit fallback profile for stronger reference/keyframe needs. |
| Observability | Sentry + PostHog + Trigger traces | Correlate `request_id`, `run_id`, `task_id`, `provider_call_id`; redact PII. |
| Testing | Vitest, Playwright, MSW, axe, visual screenshots | Unit, contract, integration, browser, accessibility, failure injection. |
| CI/CD | GitHub Actions + Vercel/Supabase/Trigger preview integrations | Each PR receives isolated preview seams and a proof packet. |

## Repository layout

```text
apps/
  web/                  Next.js application and BFF routes
  jobs/                 Trigger.dev tasks and orchestration

packages/
  domain/               pure business types, policies, state machines
  contracts/            Zod command/event/provider schemas
  data/                 Supabase repositories and generated DB types
  identity/             Unicode normalization and canonical pendant geometry
  ai/                   prompt compiler, provider ports, OpenAI/Runway adapters
  media/                storage keys, signed access, transformations
  pricing/              deterministic estimate/quote rules
  ui/                   shared components and design tokens
  observability/        logging, tracing, analytics contracts
  config/               environment validation and model profiles
  testing/              fixtures, mocks, factories, failure tools

supabase/
  migrations/
  seed.sql
  config.toml

docs/
  ...
```

## Why Supabase, not Convex

Convex is excellent for realtime application state and agent-friendly TypeScript workflows. It was not rejected because it existed in the MVP.

Supabase wins for Jewelo because:

- quotes, orders, revisions, asset lineage, provider usage, auditing, and reporting are naturally relational;
- standard Postgres/SQL creates a clearer export and migration path;
- Mumbai is an available data region close to the likely users;
- Auth, anonymous accounts, RLS, Realtime, and private Storage are in the same authorization plane;
- branch environments contain isolated database, Auth, Storage, Realtime, and API credentials;
- Trigger.dev is a purpose-built durable execution layer for media-generation fan-out and long waits.

Convex would require separate production identity/private-media choices, offers fewer data-region choices, and creates more reporting/export lock-in. Its realtime advantage does not outweigh those tradeoffs for this commercial workflow.

## Why Trigger.dev, not database actions or request handlers

AI generation has different scaling and failure behavior from CRUD. It needs:

- provider-specific concurrency limits;
- task-level retries and idempotency;
- long polling/waits without request timeouts;
- parallel fan-out and partial completion;
- versioned deployments that do not break active runs;
- run inspection, cancellation, replay, and cost metadata;
- preview environments agents can operate.

Trigger.dev owns orchestration; Supabase owns durable business truth.

## Why Supabase Storage, not a separate R2 service at launch

Private customer media must share the same authorization model as designs and organizations. Supabase Storage provides RLS, signed access, CDN, resumable uploads, and S3 compatibility without introducing another account and policy system.

The `MediaStore` port must remain S3-like. Move high-volume public delivery to R2 or a media CDN only when measured egress or transformation cost justifies it.

## Model policy

Model IDs never appear in domain code. They are named deployment profiles:

```text
still.production       -> gpt-image-2-2026-04-21
still.verifier         -> gpt-5.6-luna
motion.production      -> gemini_omni_flash
motion.fallback        -> seedance2
```

Every provider call stores model ID, prompt release, input asset IDs, output asset ID, latency, usage/cost, status, and error classification.

## No hidden local infrastructure

The normal path is:

```text
Git branch
  -> Vercel preview
  -> Supabase preview/persistent dev branch
  -> Trigger.dev preview/dev environment
  -> development provider keys
```

Local Node/Next execution is optional. Docker, local Postgres, local Storage, and Kubernetes are not prerequisites.

## Exit paths

- Supabase: standard Postgres dumps/migrations; Storage supports S3-compatible access.
- Trigger.dev: business workflow contracts live in `packages/contracts`; replace the adapter/orchestrator without rewriting domain data.
- OpenAI/Runway: provider ports and model profiles isolate vendor APIs.
- Vercel: Next.js remains deployable to a Node-compatible host.
