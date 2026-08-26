# Goal 00 — production foundation

## Objective

Create a clean, reproducible production repository foundation for the locked Jewelo stack, concurrency policy, and provider boundaries, with managed-cloud seams and no customer feature implementation.

## Completion condition

A fresh checkout can install, lint, typecheck, test, build, run a minimal health surface, and exercise typed data/media/provider/workflow contracts through documented root commands. Vercel, Supabase, Trigger.dev, OpenAI, and fal development seams are configured without paid media calls. Authorized Vercel/Supabase/Trigger setup is verified or reduced to one precise external authorization.

## Required work

- Scaffold the locked pnpm/Turborepo layout from `docs/FINAL-STACK.md`.
- Pin current stable packages within the locked Node 24, Next.js 16.2, React 19, Tailwind 4, Supabase, Trigger.dev, OpenAI, and fal client majors; commit the lockfile.
- Create `apps/web`, `apps/jobs`, and the approved shared packages with enforced import boundaries.
- Add environment validation separating browser, trusted web, jobs, CI, provider credentials, quotas, and spend policy.
- Initialize Next.js with a health/readiness surface and no legacy UI/backend code.
- Initialize Supabase configuration/migration directories for remote/branch workflows. Do not require `supabase start`.
- Initialize Trigger.dev in `apps/jobs` with typed no-op/contract tasks, named queue configuration, and preview/development setup.
- Define provider ports and contract mocks for:
  - direct OpenAI GPT Image 2 still generation;
  - structured visual verification;
  - fal Seedance preview/final inference;
  - private media storage.
- Add typed policy/config for:
  - `OPENAI_IMAGE_CONCURRENCY` and actual IPM;
  - `FAL_VIDEO_PREVIEW_CONCURRENCY` and required account capacity;
  - `preview_all`, `selected_only`, and `final_upgrade` media profiles;
  - per-run and per-organization spend ceilings;
  - stable task/provider idempotency keys.
- Add Vercel, Supabase, Trigger, OpenAI, and fal setup/runbooks and project commands.
- Keep the fal MCP project definition environment-authenticated; document the exact local authorization step without committing a key.
- Add the approved UI dependency foundation: Motion, Embla Carousel, `react-zoom-pan-pinch`, and `react-dropzone` in the appropriate shared/web package boundaries.
- Add lint, formatting, typecheck, unit test, build, dependency boundary, secret scan, and CI workflows.
- Add test provider/media/data adapters and deterministic latency/failure controls; no paid model calls.
- Configure preview-environment integration files without creating production resources.
- Update repository docs only where implementation reality requires it.

## Root commands

At minimum:

```text
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm verify
pnpm db:types
pnpm db:push
pnpm jobs:dev
pnpm jobs:deploy:preview
pnpm providers:check
```

Commands requiring an authorized cloud/provider environment must fail with a precise message when credentials or quota policy are absent.

## Constraints

- No Docker, local Postgres, local Storage emulator, Kubernetes, self-hosting, Convex, Neon, Clerk, Firebase, Runway, or replacement architecture.
- No autonomous/open-source media-agent framework.
- No customer flow beyond a minimal health/foundation surface.
- No production deploy and no paid AI/video call.
- Do not put provider SDKs in `domain`, `contracts`, `identity`, `pricing`, or `ui`.
- Do not hard-code provider concurrency or model IDs in domain code.

## Verification

- Perform a clean-install proof using the committed lockfile.
- Run all root checks and CI-equivalent commands.
- Prove import-boundary violations fail.
- Prove missing/unsafe environment configuration fails clearly.
- Exercise the health route.
- Exercise mock data/media/provider contracts.
- Exercise deterministic four-variation fan-out contract fixtures without real providers.
- Prove quota/spend config refuses unsafe real-provider mode.
- Prove fal MCP configuration contains no committed credential.
- With authorization, inspect/deploy a Vercel preview, Supabase development/preview branch, and Trigger development/preview task; otherwise name the exact missing authorization.
- Run plan and adversarial reviewers.

## Stop condition

Open a draft PR into `rebuild/v2-first-principles` with the proof packet. Do not build the product studio, call paid providers, or begin Goal 01.
