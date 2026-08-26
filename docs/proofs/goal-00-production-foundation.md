# Goal 00 proof packet

**Branch:** `goal/00-production-foundation`  
**Base:** `rebuild/v2-first-principles`  
**Objective:** reproducible production monorepo foundation and managed-cloud seams.  
**Excluded:** customer studio, product schema/RLS, real generation orchestration, identity geometry, pricing/commerce, paid provider calls, production resources.

## Acceptance evidence

| Criterion                                           | Evidence                                                                                                                           |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Exact Node/pnpm and frozen dependencies             | `.nvmrc`/`.tool-versions`: Node 24.18.1; `packageManager`: pnpm 11.23.0; frozen install passed locally and on Vercel               |
| Root lint/typecheck/test/build/verify orchestration | `pnpm verify` passed across 13 workspaces (14 Turbo test/build tasks where applicable)                                             |
| Minimal HTTP health/readiness                       | Local production HTTP proof passed; Vercel endpoints returned the `ok`/`ready` contracts                                           |
| Typed Trigger contract task                         | `apps/jobs/src/trigger/foundation.ts`; build/typecheck/contract tests passed; remote authorization pending                         |
| Remote-only Supabase seam                           | CLI 2.115.0 installed; valid config + schema-free migration; missing/production-target guards passed; remote authorization pending |
| Environment and browser-secret separation           | Config negative tests and `.next/static` forbidden-key scan passed                                                                 |
| Package/import boundaries                           | 31 source files passed; invalid domain→OpenAI fixture was rejected                                                                 |
| Mock data/media/provider contracts                  | Success plus injected one-shot failure→successful recovery passed                                                                  |
| CI parity                                           | Workflow installs frozen lockfile on Node 24.18.1 and runs `pnpm verify`                                                           |
| Managed preview seams                               | Vercel preview `dpl_9XRTmVFHwVFDJDpibq7rXeWMGwKa` is `READY`; Supabase/Trigger exact authorization actions documented              |

## Commands and results

```text
corepack prepare pnpm@11.23.0 --activate → PASS
pnpm install --frozen-lockfile → PASS
pnpm lint → PASS (13 workspaces)
pnpm typecheck → PASS (13 workspaces)
pnpm test → PASS (14 Turbo tasks; 14 tests)
pnpm build → PASS (13 workspaces; Next routes /, /api/health, /api/readiness)
pnpm verify → PASS
pnpm boundaries → PASS + invalid fixture rejected
pnpm secret:scan → PASS
pnpm verify:bundle → PASS
pnpm verify:health → PASS (HTTP, port 3210)
pnpm dev -- --port 3213 + GET /api/health → PASS/200
pnpm db:types/db:push/jobs:dev/jobs:deploy:preview without target/auth → expected actionable failure
JEWELO_CLOUD_TARGET=production db push guard → expected rejection
Trigger preview without branch guard → expected rejection
pnpm verify:clean → pending committed clean-checkout run
```

## Runtime and cloud evidence

- Vercel project: `sanchay-ts-projects/jewelo-v2`.
- Preview: `https://jewelo-v2-iwrsb0g6v-sanchay-ts-projects.vercel.app`.
- `vercel inspect`: target `preview`, status `Ready`; no production promotion.
- Protected remote `/api/health`: `{"status":"ok","service":"jewelo-web","contractVersion":"foundation-v1"}`.
- Protected remote `/api/readiness`: dependency configuration is `not-configured` and `connectivityChecked:false`.
- In-app browser: local built page rendered the `Production foundation` heading with zero page warning/error logs.
- Supabase: CLI reports missing login; run `pnpm exec supabase login`, select/create a non-production Mumbai project, then provide the development/preview project ref.
- Trigger.dev: CLI 4.5.12 command surface verified; run `pnpm --filter @jewelo/jobs exec trigger login`, then provide the non-production project ref.

## Failure and recovery evidence

- Data, media, and provider mocks each fail exactly once when injected and then recover successfully on retry.
- Invalid environment combinations fail through Zod schemas.
- Missing cloud targets fail before any remote mutation.
- Production-default Supabase invocation is rejected.
- Trigger preview deployment without an explicit preview branch is rejected.
- A deliberately invalid provider import in `packages/domain` is rejected by the architecture checker.

## Review

- Plan review: conditional no-go resolved before implementation by adding explicit boundaries, negative fixtures, cloud guards, context-specific environment validation, browser-bundle inspection, and criterion-mapped proof.
- Adversarial review: pending fresh-context review after clean-checkout proof.

## Impact

- **Security/privacy:** no customer data; browser/server/job environment schemas are separate; no credentials committed.
- **Migration/data:** one schema-free remote baseline migration; no product tables, RLS, buckets, or seed records.
- **Provider/cost:** deterministic mocks only; no OpenAI/Runway SDK or paid call.
- **Rollback:** revert the goal commit and remove disposable previews; no production migration or customer asset exists.

## Remaining risk and owner

- Owner: implementation lead. Supabase and Trigger remote connection evidence requires the two documented one-time CLI authorizations/project selections; no code blocker remains.

## Next goal

Goal 01 — product studio, only after human review/merge. It has not started.
