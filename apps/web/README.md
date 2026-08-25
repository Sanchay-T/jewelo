# Jewelo UI extraction spike

This directory is a disposable, frontend-only prototype on `spike/ui-extraction`. It is not a Phase 0 deliverable, production scaffold, or ratification of dependency choices. Do not merge it into `rebuild/v2-first-principles`.

The app uses only local, deterministic fixtures and browser storage. It contains no Convex client, provider SDK, production credential, payment, email, CRM, or cloud-storage integration. Customer and operator identities, estimates, quotes, orders, fulfillment, and audit events are explicitly mocked.

## Run and verify

Use the repository's Node 22 runtime:

```sh
mise exec node@22 -- pnpm install
NEXT_PUBLIC_JEWELO_SCENARIOS=1 mise exec node@22 -- pnpm dev --hostname 127.0.0.1 --port 3200
mise exec node@22 -- pnpm check
mise exec node@22 -- pnpm lint
mise exec node@22 -- pnpm test
mise exec node@22 -- pnpm build
mise exec node@22 -- pnpm test:e2e
```

Browser state is versioned under `jewelo-ui-spike:v1`; accepted mock-reference images are stored in IndexedDB. Clear those two stores to reset the spike.
