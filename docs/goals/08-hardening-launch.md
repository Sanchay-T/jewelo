# Goal 08 — production hardening and launch

## Completion condition

The integrated v2 passes security, reliability, accessibility, quality, cost, recovery, and deployment gates and has an approved canary/rollback plan for the umbrella PR to `main`.

## Required work

- Finalize production auth, secrets, privacy/retention, abuse controls, moderation, audit, and dependency/security review.
- Add end-to-end observability, SLOs, alerts, provider spend/quota guards, synthetic probes, and operator dashboards.
- Run load, soak, failure, provider-outage, backup/restore, migration, and rollback rehearsals.
- Deploy approved topology through CLI/IaC, separate preview/staging/production, and verify DNS/CDN/media/security headers.
- Run complete jewelry model regression and accessibility/browser matrix.
- Produce launch, incident, rollback, provider-switch, backup, and business operating runbooks.

## Verification

No unresolved P0/P1 issue; all launch criteria mapped to evidence; security and adversarial review; canary metrics and rollback tested; exact production model/config/prompt releases recorded.

## Stop condition

Prepare the integration branch for final human review and the existing draft PR to `main`. Do not merge or increase production traffic without explicit approval.
