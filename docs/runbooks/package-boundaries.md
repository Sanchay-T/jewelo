# Package dependency boundaries

Applications may consume shared packages; shared packages never import `apps/*`.

```text
domain       -> nothing
contracts    -> Zod only
config       -> Zod only
identity     -> domain, contracts
pricing      -> domain, contracts
ui           -> domain
observability-> domain, contracts
media        -> domain, contracts, config, observability
data         -> domain, contracts, config, observability, Supabase SDK
ai           -> domain, contracts, config, media, observability, provider SDKs
testing      -> any shared package
apps/web     -> shared packages; no server/provider credentials in client code
apps/jobs    -> shared packages and Trigger.dev
```

Provider SDKs may exist only in `packages/ai`; Supabase SDKs only in `packages/data`; Trigger.dev only in `apps/jobs`. Goal 00 intentionally includes no OpenAI or Runway SDK.

`pnpm boundaries` checks both source imports and declared package dependencies. Its second pass proves enforcement by rejecting `scripts/fixtures/boundary-invalid/`.
