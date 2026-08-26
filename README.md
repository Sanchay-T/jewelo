# Jewelo v2

Jewelo v2 is a first-principles production rebuild. The architecture is locked: Next.js/Vercel, Supabase Mumbai, Trigger.dev Cloud, direct OpenAI still generation, and Runway motion behind narrow adapters.

This branch implements Goal 00 only: the production repository foundation and managed-service seams. It deliberately contains no customer studio, product database schema, or real provider call.

## Runtime

- Node.js `24.18.1`
- pnpm `11.23.0`
- Next.js `16.2.12` / React `19.2.8`
- Turborepo `2.10.12`

Use mise and Corepack so local execution matches CI:

```bash
mise install
corepack enable
corepack prepare pnpm@11.23.0 --activate
pnpm install --frozen-lockfile
pnpm verify
```

## Root commands

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm verify
pnpm verify:clean
pnpm db:types
pnpm db:push
pnpm jobs:dev
pnpm jobs:deploy:preview
```

Cloud commands fail early with an exact authorization instruction when a non-production environment is not configured. They never fall back to production.

## Repository layout

```text
apps/web       minimal Next.js health/readiness surface
apps/jobs      Trigger.dev task wrappers
packages/*     narrow domain, contract, adapter, config, and testing packages
supabase/      remote migration/configuration seam; no local service requirement
docs/runbooks  managed development and architecture-boundary operation
```

See [docs/START-HERE.md](docs/START-HERE.md), [docs/FINAL-STACK.md](docs/FINAL-STACK.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), and [docs/runbooks/managed-development.md](docs/runbooks/managed-development.md).
