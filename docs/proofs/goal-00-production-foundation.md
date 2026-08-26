# Goal 00 proof packet

**Branch:** `goal/00-production-foundation`  
**Base:** `rebuild/v2-first-principles`  
**Objective:** reproducible production monorepo foundation and managed-cloud seams.  
**Excluded:** customer studio, product schema/RLS, real generation orchestration, identity geometry, pricing/commerce, paid provider calls, production resources.

## Acceptance evidence

| Criterion                                           | Evidence                                                                                                                         |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Exact Node/pnpm and frozen dependencies             | `.nvmrc`/`.tool-versions`: Node 24.18.1; `packageManager`: pnpm 11.23.0; frozen clean-checkout install and Vercel install passed |
| Root lint/typecheck/test/build/verify orchestration | `pnpm verify` passed across 13 workspaces (14 Turbo test/build tasks where applicable; 16 tests)                                 |
| Minimal HTTP health/readiness                       | Local production HTTP proof passed; Vercel returned health `200/ok` and readiness `503/not_ready` until dependencies are checked |
| Typed Trigger contract task                         | `apps/jobs/src/trigger/foundation.ts`; build/typecheck/runtime-env/contract tests passed; remote authorization pending           |
| Remote-only Supabase seam                           | CLI 2.115.0 installed; schema-free migration; target/authorization guards and atomic type generation implemented; login pending  |
| Environment and browser-secret separation           | Context schemas, real Next partial-env build rejection, and `.next/static` forbidden-key scan passed                             |
| Package/import boundaries                           | 31 source files passed; static/dynamic provider and relative cross-package invalid fixtures were rejected                        |
| Mock data/media/provider contracts                  | Success plus injected one-shot failure→successful recovery passed                                                                |
| CI parity                                           | Workflow installs pnpm before setup-node caching, installs the frozen lockfile on Node 24.18.1, and runs `pnpm verify`           |
| Managed preview seams                               | Vercel preview `dpl_A1W9hzVyafq6mtESNxT4UtPXBDe3` is `READY`; Supabase/Trigger exact authorization actions documented            |

## Commands and results

```text
corepack prepare pnpm@11.23.0 --activate → PASS
pnpm install --frozen-lockfile → PASS
pnpm lint → PASS (13 workspaces)
pnpm typecheck → PASS (13 workspaces)
pnpm test → PASS (14 Turbo tasks; 16 tests)
pnpm build → PASS (13 workspaces; Next routes /, /api/health, /api/readiness)
pnpm verify → PASS
pnpm boundaries → PASS + static provider, dynamic Supabase, and relative cross-package fixtures rejected
pnpm secret:scan → PASS
pnpm verify:bundle → PASS
pnpm verify:health → PASS (HTTP, port 3210)
pnpm dev -- --port 3213 + GET /api/health → PASS/200
pnpm db:types/db:push/jobs:dev/jobs:deploy:preview without target/auth → expected actionable failure
JEWELO_CLOUD_TARGET=production db push guard → expected rejection
Supabase conflicting production+development/preview name fixtures → expected rejection
Trigger preview without branch guard → expected rejection
partial NEXT_PUBLIC_SUPABASE_* production build → expected pairing rejection
pnpm verify:clean → PASS from committed clean checkout with zero Turbo cache hits
```

## Runtime and cloud evidence

- Vercel project: `sanchay-ts-projects/jewelo-v2`.
- Preview: `https://jewelo-v2-nyzhaulsm-sanchay-ts-projects.vercel.app`.
- `vercel inspect`: target `preview`, status `Ready`; no production promotion.
- Protected remote `/api/health`: HTTP 200, `{"status":"ok","service":"jewelo-web","contractVersion":"foundation-v1"}`.
- Protected remote `/api/readiness`: HTTP 503, `status:not_ready`, dependencies `not-configured`, and `connectivityChecked:false`.
- In-app browser: remote preview reached Vercel deployment protection; the same production artifact rendered the `Production foundation` heading locally with zero warning/error console entries.
- Supabase: CLI reports missing login; run `pnpm exec supabase login`, select/create a non-production Mumbai project, then provide the development/preview project ref.
- Trigger.dev: CLI 4.5.12 command surface verified; run `pnpm --filter @jewelo/jobs exec trigger login`, then provide the non-production project ref.

## Failure and recovery evidence

- Data, media, and provider mocks each fail exactly once when injected and then recover successfully on retry.
- Invalid environment combinations fail through Zod schemas.
- Deployable web and Trigger configuration entrypoints validate their own environment contexts; a partial public Supabase pair stops a real Next production build.
- Missing cloud targets fail before any remote mutation.
- Supabase commands verify authenticated remote metadata, exact Mumbai region, and an explicit non-production name marker before mutation; generated types replace the checked-in file only after valid output is complete.
- Trigger preview deployment without an explicit preview branch is rejected.
- Deliberately invalid static provider, dynamic Supabase, and relative cross-package imports are rejected by the TypeScript-AST architecture checker.

## Review

- Plan review: conditional no-go resolved before implementation by adding explicit boundaries, negative fixtures, cloud guards, context-specific environment validation, browser-bundle inspection, and criterion-mapped proof.
- Initial adversarial review: no-go findings were addressed with deployable-entrypoint environment validation, authenticated Supabase metadata guards, AST import analysis, atomic type generation, truthful readiness, clean-checkout proof, and corrected CI setup ordering.
- Fresh adversarial re-review at `d2dc943`: no-go identified conflicting production+development project names, a cross-filesystem temporary type file, stale proof text, and the absent draft PR.
- The conflicting-name guard now rejects production markers before accepting target markers, with positive and negative fixtures. Type generation now creates its validated candidate beside the destination before rename. Proof text is current; final re-review follows the draft PR.

## Impact

- **Security/privacy:** no customer data; browser/server/job environment schemas are separate; no credentials committed.
- **Migration/data:** one schema-free baseline migration is committed but not remotely applied; no product tables, RLS, buckets, or seed records.
- **Provider/cost:** deterministic mocks only; no OpenAI/Runway SDK or paid call.
- **Rollback:** revert the goal commit and remove disposable previews; no production migration or customer asset exists.

## Remaining risk and owner

- Owner: implementation lead. Supabase and Trigger remote connection evidence requires the two documented one-time CLI authorizations/project selections; no code blocker remains.

## Next goal

Goal 01 — product studio, only after human review/merge. It has not started.
