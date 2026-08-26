# Goal 02 — Supabase domain, Auth, Storage, and Realtime

## Objective

Implement the durable business model and secure customer state on Supabase while preserving the Goal 01 UX.

## Completion condition

Anonymous and permanent customers plus organization staff can use the product shell against real branch-isolated Supabase data, private media, and realtime state with proven RLS isolation.

## Required work

- Implement SQL migrations for the core data model in `docs/ARCHITECTURE.md`.
- Generate and consume TypeScript database types.
- Implement anonymous sign-in and account linking seams.
- Implement organizations/memberships and role policies.
- Implement design/revision/run/task/variation/asset repositories.
- Implement private buckets, immutable paths, signed access, upload validation, and media metadata.
- Implement outbox/audit/usage tables and atomic run-creation SQL function.
- Implement Realtime subscriptions filtered to the active user/organization/run.
- Add synthetic seed fixtures and cleanup/retention jobs.
- Replace mock data gateway while keeping AI providers mocked.

## Constraints

No real Trigger orchestration and no real model call. No service-role secret in client code.

## Verification

Migration apply/replay; generated types; RLS matrix across anonymous/permanent/staff/foreign org; private-media access; signed URL expiry/reuse policy; upload abuse cases; realtime reconnect; transaction/outbox integrity; security/adversarial review.

## Stop condition

Draft PR. Do not begin durable generation.
