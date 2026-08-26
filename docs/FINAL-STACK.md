# Final production stack

**Decision date:** 26 August 2026  
**Status:** locked for implementation

This is the production architecture Jewelo v2 will implement. It was selected against the actual product workload: four progressively revealed design directions, exact pendant identity, long-running parallel media generation, private customer media, quotes/orders, low operational burden, and strong coding-agent control.

## Stack

| Concern | Locked choice | Implementation rule |
| --- | --- | --- |
| Runtime | Node.js 24 LTS | Pin the current Node 24 patch in the repository and CI. |
| Repository | pnpm workspace + Turborepo | `apps/web`, `apps/jobs`, and narrow shared packages. |
| Web | Next.js 16.2 App Router, React 19, strict TypeScript | Server Components by default; client components only for interaction/realtime. |
| UI | Tailwind CSS 4, shadcn/Radix, Motion, React Hook Form, Zod, next-intl | WCAG AA, keyboard/touch, reduced motion, RTL-ready. |
| Media UI | Embla Carousel, `react-zoom-pan-pinch`, `react-dropzone`, native video | Direction filmstrip, real inspection, accessible upload, short MP4 previews. |
| Hosting | Vercel | Git preview deployments; no long AI work in request handlers. |
| System of record | Supabase Postgres in Mumbai (`ap-south-1`) | SQL migrations + RLS + generated TypeScript DB types. |
| Identity | Supabase Auth | Anonymous guest first; link email, phone, or OAuth later. |
| Realtime | Supabase Realtime | Subscribe to run/task/asset milestones filtered by run or design. |
| Media | Supabase private Storage | RLS, signed URLs, resumable/S3 upload paths, immutable object keys. |
| Durable jobs | Trigger.dev Cloud | Durable fan-out, queues, retries, waits, idempotency, cancellation, preview branches. |
| Product/worn images | OpenAI `gpt-image-2-2026-04-21` | Direct OpenAI adapter; four independent variation calls with canonical references. |
| Visual QA | OpenAI `gpt-5.6-luna` plus deterministic checks | Structured verifier; canonical geometry remains authoritative. |
| Motion gateway | fal.ai | Managed model inference/queue API, not the business workflow engine. |
| Fast motion preview | `bytedance/seedance-2.0/fast/image-to-video` | Four 4-second, 9:16, 720p, silent previews when fal concurrency >= 4. |
| Selected final motion | `bytedance/seedance-2.0/image-to-video` | Optional 6-second standard-quality render for the selected direction. |
| Observability | Sentry + PostHog + Trigger/provider traces | Correlate request, run, task, variation, provider-call and cost IDs; redact PII. |
| Testing | Vitest, Playwright, MSW, axe, visual screenshots | Unit, contract, integration, browser, accessibility, concurrency and failure injection. |
| CI/CD | GitHub Actions + Vercel/Supabase/Trigger preview integrations | Each goal PR receives isolated preview seams and a proof packet. |

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
  ai/                   prompt compiler, provider ports, OpenAI/fal adapters
  media/                storage keys, signed access, transformations
  pricing/              deterministic estimate/quote rules
  ui/                   shared components and design tokens
  observability/        logging, tracing, analytics contracts
  config/               environment validation, quotas and model profiles
  testing/              fixtures, mocks, factories, failure/concurrency tools

supabase/
  migrations/
  seed.sql
  config.toml

docs/
  ...
```

## Why Supabase, not Convex

Convex is excellent for realtime application state and agent-friendly TypeScript development. It was not rejected because it existed in the MVP.

Supabase wins for Jewelo because:

- quotes, orders, revisions, asset lineage, provider usage, auditing, and reporting are naturally relational;
- standard Postgres/SQL creates a clearer export and migration path;
- Mumbai is available close to the likely customer base;
- Auth, anonymous accounts, RLS, Realtime, and private Storage share one authorization plane;
- branch environments isolate database, Auth, Storage, Realtime, and API credentials;
- Trigger.dev is a purpose-built durable execution layer for media fan-out and long waits.

## Why Trigger.dev remains the orchestration layer

Neither OpenAI nor fal.ai is the Jewelo workflow engine. AI generation needs:

- four-way fan-out with progressive downstream release;
- provider-specific and per-organization concurrency limits;
- task-level retries and stable idempotency keys;
- long queue/wait/poll behavior outside web-request timeouts;
- partial success, cancellation and replay;
- deployment-safe task versions;
- one inspectable timeline across OpenAI, fal and Supabase.

Trigger.dev owns orchestration. Supabase owns durable business truth. OpenAI and fal execute model inference.

## Why direct OpenAI for stills

GPT Image 2 is locked as the image model. The direct API keeps OpenAI quota, usage and error handling independent from the video gateway and avoids fal account-wide video jobs consuming the same concurrency pool. An optional fal GPT Image 2 adapter may exist as a disabled contingency, but it is not the primary path.

Four product calls start concurrently. Each successful product is verified and shown immediately; it does not wait for the other three.

## Why fal.ai for Seedance

fal provides the official JavaScript client, asynchronous queue/status/webhook APIs, automatic model infrastructure, and an MCP server that coding agents can use for model discovery, schemas, pricing and bounded test runs.

fal is deliberately treated as an inference gateway rather than a domain dependency. Its temporary output is downloaded immediately into private Supabase Storage because fal media URLs are public by default unless ACLs are configured and are not durable product storage.

New fal accounts start at two concurrent requests. Four-preview mode has a hard launch gate: verify a fal account concurrency limit of at least four. Below that limit the videos remain honestly queued; the UI never fakes parallel execution.

## Open-source media-agent decision

Genblaze was the strongest open-source media-pipeline framework reviewed. Its provider abstraction and provenance manifest are useful references, but adopting it would add Python and duplicate Trigger.dev's workflow, retry and state responsibilities. Jewelo will implement the useful provenance fields in its own typed contracts and will not introduce a media agent framework into the execution path.

Customer media generation is a deterministic product workflow, not an autonomous agent problem.

## Locked model profiles

Model IDs never appear in domain code. They are named deployment profiles:

```text
still.production       -> gpt-image-2-2026-04-21 (direct OpenAI)
still.verifier         -> gpt-5.6-luna
still.fallback         -> openai/gpt-image-2 on fal (disabled)
motion.preview         -> bytedance/seedance-2.0/fast/image-to-video
motion.final           -> bytedance/seedance-2.0/image-to-video
```

Every provider call stores provider, exact endpoint/model, prompt release, canonical identity fingerprint, input asset IDs, output asset ID, idempotency key, attempt, queue/run timestamps, latency, actual/estimated cost, status, and error classification.

## Concurrency contract

```text
4 product stills concurrently
  each passes QA independently
    each immediately unlocks:
      worn still + fast Seedance preview concurrently
```

Initial queue configuration:

```text
openai-image        4 active calls, adjusted to the verified OpenAI project quota
visual-verifier     independently bounded
fal-seedance-fast   4 active calls after quota verification
fal-seedance-final  1-2 active calls
organization        4 active variation pipelines by default
```

See `docs/MEDIA-CONCURRENCY.md` for idempotency, quota gates, costs and UI state delivery.

## No hidden local infrastructure

The normal path is:

```text
Git branch
  -> Vercel preview
  -> Supabase preview/persistent dev branch
  -> Trigger.dev preview/dev environment
  -> development OpenAI and fal credentials
```

Local Next.js execution is optional. Docker, local Postgres, local Storage, Kubernetes, self-hosting, and GPU management are not prerequisites.

## Exit paths

- Supabase: standard Postgres dumps/migrations; Storage supports S3-compatible access.
- Trigger.dev: business workflow contracts live in shared packages; replace orchestration without rewriting business data.
- OpenAI/fal: provider ports and model profiles isolate vendor APIs.
- Vercel: Next.js remains deployable to another Node-compatible host.

## Primary references

Accessed 26 August 2026:

- OpenAI GPT Image 2: https://developers.openai.com/api/docs/models/gpt-image-2
- Trigger concurrency: https://trigger.dev/docs/queue-concurrency
- Trigger fan-out: https://trigger.dev/docs/triggering
- fal concurrency and retention: https://fal.ai/docs/documentation/model-apis/faq
- fal MCP: https://fal.ai/docs/documentation/setting-up/mcp
- Seedance 2.0: https://fal.ai/seedance-2.0
- Seedance image-to-video: https://fal.ai/models/bytedance/seedance-2.0/image-to-video
- Genblaze: https://github.com/backblaze-labs/genblaze
