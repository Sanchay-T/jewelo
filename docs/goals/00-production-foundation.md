# Goal 00 — production foundation

## Objective

Create a clean, reproducible production repository foundation for the locked Jewelo stack, with managed-cloud seams and no customer feature implementation.

## Completion condition

A fresh checkout can install, lint, typecheck, test, build, run a minimal health surface, and exercise contract mocks through documented root commands. Vercel, Supabase, and Trigger.dev development/preview setup is either verified with authorized credentials or reduced to one precisely documented external authorization.

## Required work

- Scaffold the locked pnpm/Turborepo layout from `docs/FINAL-STACK.md`.
- Pin the current stable packages within the locked Node 24, Next.js 16.2, React 19, Tailwind 4, Supabase, and Trigger.dev majors; commit the lockfile.
- Create `apps/web`, `apps/jobs`, and the approved shared packages with enforced import boundaries.
- Add environment validation separating browser, trusted web, jobs, CI, and provider secrets.
- Initialize Next.js with a health/readiness surface and no legacy UI/backend code.
- Initialize Supabase configuration/migration directories for remote/branch workflows. Do not require `supabase start`.
- Initialize Trigger.dev in `apps/jobs` with a typed no-op/contract task and preview/development configuration.
- Add Vercel, Supabase, and Trigger setup/runbooks and project commands.
- Add lint, formatting, typecheck, unit test, build, dependency boundary, secret scan, and CI workflows.
- Add test provider/media/data adapters; no paid model calls.
- Configure preview-environment integration files without creating production resources.
- Update the repository docs only where implementation reality requires it.

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
```

Commands requiring an authorized cloud environment must fail with a precise message when credentials are absent.

## Constraints

- No Docker, local Postgres, local Storage emulator, Kubernetes, self-hosting, Convex, Neon, Clerk, or replacement architecture.
- No customer flow beyond a minimal health/foundation surface.
- No production deploy and no paid AI call.
- Do not put provider SDKs in `domain`, `contracts`, `identity`, `pricing`, or `ui`.

## Verification

- Perform a clean-install proof using the committed lockfile.
- Run all root checks and CI-equivalent commands.
- Prove import-boundary violations fail.
- Prove missing/unsafe environment configuration fails clearly.
- Exercise the health route.
- Exercise mock data/media/provider contracts.
- With authorization, inspect or deploy a Vercel preview, Supabase development/preview branch, and Trigger development/preview task; otherwise name the exact missing authorization.
- Run plan and adversarial reviewers.

## Stop condition

Open a draft PR into `rebuild/v2-first-principles` with the proof packet. Do not build the product studio or begin Goal 01.
