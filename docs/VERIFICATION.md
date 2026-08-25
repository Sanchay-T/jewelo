# Verification contract

Completion means observable proof, not plausible code.

## Every goal

- clean goal branch/diff;
- no secrets or production data;
- exact acceptance criteria mapped to evidence;
- deterministic commands with exit status;
- failure case and recovery;
- security/privacy/cost/rollback impact;
- fresh reviewer findings;
- draft PR into `rebuild/v2-first-principles`;
- no next goal started.

## Goal 00 foundation

Prove from a clean checkout:

```text
corepack enable
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm verify
```

Also prove:

- root commands orchestrate all workspaces;
- no Docker/local service prerequisite;
- env validation fails clearly;
- Next health/readiness route works;
- architecture boundary checks work;
- no provider SDK leaks into domain packages;
- preview/development service setup is documented;
- CI runs the same checks.

If credentials are authorized, prove Vercel/Supabase/Trigger development or preview connections. If a credential is the sole blocker, provide the exact one-time action without pretending the integration is verified.

## UI goals

Use real browser rendering at desktop, mobile, short viewport, keyboard, touch assumptions, reduced motion, and RTL. Capture screenshots and inspect console/network/accessibility.

## Data/security goals

Test RLS as anonymous customer, permanent customer, staff member, other organization, and service role. Test object ownership, signed URLs, upload validation, webhook signatures, idempotency, and audit behavior.

## Workflow goals

Inject provider 429/5xx, timeout, malformed output, identity rejection, duplicate webhook, dispatch failure, cancellation, partial success, and worker redeploy. Prove retry limits and no duplicate assets/cost charges.

## Provider goals

Use real bounded calls only with authorized development credentials and explicit budget. Record request/profile, output, latency, cost, QA result, and cleanup. Never commit generated customer media.

## Launch goal

Include load test, budget alarm, backup/restore drill, retention/deletion test, dependency/security scan, observability dashboards, runbook, rollback, and final human approval.
