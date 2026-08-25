# Goal 03 — domain, persistence, auth boundary, and realtime

## Completion condition

The prototype is backed by the approved relational domain, migrations, organization/identity authorization boundary, durable asset metadata, idempotent APIs, and reconnectable progress events.

## Required work

- Implement organizations/principals, designs/revisions, canonical assets, runs/tasks/directions/representations, generation events, estimates, quotes, orders, prompt releases, audit, and outbox.
- Enforce immutable revisions, tenant isolation, state transitions, idempotency keys, unique guards, optimistic concurrency, and commercial snapshots.
- Implement signed-upload and asset metadata APIs without placing binary media in the database.
- Implement SSE/read models with reconnect, cursor/replay, authorization, and authoritative refetch.
- Add provider-neutral auth adapter and local test identity.

## Verification

Migration up/down/up, transaction/outbox tests, tenant-leak tests, API contracts, idempotency under concurrent requests, reconnect/replay tests, and database restore rehearsal. Security reviewer inspects authorization and PII boundaries.

## Stop condition

Draft PR into integration. No real generation provider and no production credentials.
