# Managed development runbook

Goal 00 uses managed development and preview services. Docker, `supabase start`, local Postgres, and local object-storage emulators are not part of the supported path.

## Environment correlation

| Git                   | Vercel                   | Supabase                                                                | Trigger.dev     | Production access |
| --------------------- | ------------------------ | ----------------------------------------------------------------------- | --------------- | ----------------- |
| `goal/*` pull request | preview deployment       | preview branch when available, otherwise persistent development project | preview branch  | forbidden         |
| local goal worktree   | local Next.js or preview | persistent development project                                          | DEV environment | forbidden         |

Set `JEWELO_CLOUD_TARGET=development` or `preview` before any database or workflow command. The Supabase guard verifies the authenticated remote project exists in Mumbai and that its remote name contains an explicit `dev`/`development` or `preview`/`branch`/`pr` marker matching the selected target.

## Local deterministic path

```bash
mise install
corepack enable
corepack prepare pnpm@11.23.0 --activate
pnpm install --frozen-lockfile
pnpm verify
pnpm dev
```

`pnpm dev` starts only the web runtime. Trigger.dev has a separate guarded command because it requires cloud authorization.

## Vercel preview

The CLI is authenticated independently of repository secrets:

```bash
vercel whoami
vercel link --yes --project jewelo-v2
vercel deploy --yes
```

Never pass `--prod` during Goal 00. The preview must serve `/api/health` and `/api/readiness` without service-role or provider credentials.

## Supabase development/preview

One-time authorization when not already configured:

1. Create or select a non-production Jewelo Supabase project in Mumbai (`ap-south-1`). Its remote name must include `dev`/`development` for the development target or `preview`/`branch`/`pr` for the preview target.
2. Run `pnpm exec supabase login`, or create a personal access token in Supabase Account → Access Tokens and export `SUPABASE_ACCESS_TOKEN`.
3. Export `SUPABASE_PROJECT_REF` and `JEWELO_CLOUD_TARGET=development` (or `preview`).
4. If linking requires it, export `SUPABASE_DB_PASSWORD` only in the local shell; never commit it.

Then:

```bash
pnpm db:push
pnpm db:types
```

These commands use the remote project/branch. The Goal 00 migration is deliberately schema-free; product tables and RLS begin in Goal 02.

## Trigger.dev development/preview

One-time authorization when not already configured:

```bash
pnpm --filter @jewelo/jobs exec trigger login
```

Create/select a non-production Jewelo Trigger project, then export `TRIGGER_ACCESS_TOKEN`, `TRIGGER_PROJECT_REF`, and `JEWELO_CLOUD_TARGET=development`. Run:

```bash
pnpm jobs:dev
```

For preview deployment, also set `JEWELO_CLOUD_TARGET=preview` and `TRIGGER_PREVIEW_BRANCH=goal/00-production-foundation`, then run:

```bash
pnpm jobs:deploy:preview
```

No OpenAI or Runway credential is needed or permitted for Goal 00; provider mode remains `mock`.

## Environment boundary

- Browser code receives only `NEXT_PUBLIC_*` values.
- Trusted web code may receive Supabase server credentials.
- Jobs may receive Trigger, Supabase, and later provider credentials.
- CI/test uses deterministic mock mode and does not require cloud credentials.
- Readiness reports whether dependencies are configured, never that connectivity succeeded unless a connection was actually checked.

## Rollback

- Delete the Vercel preview deployment/project link if it is no longer needed.
- Remove the schema-free Goal 00 migration record only by abandoning the disposable Supabase preview branch; do not mutate shared migration history.
- Archive the Trigger preview deployment/environment.
- Revert the Goal 00 commit. No customer data, production schema, or provider assets exist in this goal.
