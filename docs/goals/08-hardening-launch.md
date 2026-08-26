# Goal 08 — hardening and launch readiness

## Objective

Prove the full system is secure, observable, recoverable, cost-controlled, deployable, and ready for an explicit human launch decision.

## Completion condition

Production/staging environments, CI/CD, monitoring, budgets, backup/restore, retention/deletion, failure runbooks, load evidence, rollback, and a release candidate are complete with no unresolved P0/P1 launch blocker.

## Required work

- Production Supabase Mumbai, Trigger, Vercel, OpenAI, Runway, Sentry, and PostHog configuration through least-privilege secrets.
- Branch protection, required checks, dependency/secret/security scanning.
- SLOs, traces, dashboards, alerts, and provider-cost reconciliation.
- Load/fan-out/concurrency/realtime/media-delivery tests.
- Backup/PITR and restore drill; asset/database reconciliation.
- Customer deletion/export and anonymous cleanup/retention.
- Abuse controls, CAPTCHA/rate limits, quotas, webhook/SSRF/upload hardening.
- Incident, provider outage, stuck run, budget spike, and rollback runbooks.
- Production smoke/canary and explicit go/no-go packet.

## Constraints

No production launch or DNS switch without human approval. No agent self-merge.

## Verification

All automated checks, real staging E2E, restore drill, failure/game-day evidence, cost alarm test, security review, accessibility review, performance budgets, final adversarial review.

## Stop condition

Present the launch packet and draft/ready PR. Stop for human merge and launch approval.
