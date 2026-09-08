# Security review 1 (security-reviewer, on `dde9058`, 2026-09-08)

Lead confirmed on staging: `/api/sample-images` 200, `/sample-images` 200 unauthenticated; no CSP, frame, sniff or HSTS header on `/en`.

| # | Severity | Finding | Owner |
| --- | --- | --- | --- |
| 1 | critical | `api/sample-images/upload` has no auth and stores the client's MIME; `api/sample-images/file/[id]` serves it back verbatim: attacker HTML on the app origin, session tokens in `localStorage`, unbounded in-memory map. | security fix 1: delete the board (decision by default: it is the scrap `review/sample-images-board` surface) |
| 2 | critical | `/sample-images` publishes agent prose, stage names and task ids on the shopper's host. | security fix 1: deleted with 1 |
| 3 | high | `presentation.ts:887-912` interpolates unvalidated `referenceAsset.id` into a service-role signed storage path without encoding. | pipeline fix 1 (file in flight) |
| 4 | high | No runtime schema on `specification` in drafts, draft patch, approve: unbounded unnormalised name into HarfBuzz and into the paid prompt; carrier for 3. | security fix 1: Zod `jewelrySpecificationSchema` in `packages/contracts`, NFC, length, script, `referenceAsset.id` regex |
| 5 | high | Operator login has no rate limit; `mockMode()` opens auth to any `@` and four characters whenever `NODE_ENV` is not production. | security fix 1: per-IP backoff, explicit `OPERATOR_MOCK_AUTH=1` opt-in |
| 6 | medium-high | Transliteration limiter keys on the left-most `x-forwarded-for` and never evicts; paid path outside the spend cap. | security fix 1: last hop or `do-connecting-ip`, principal key, bounded maps |
| 7 | medium | No security headers. | security fix 1: `headers()` in `next.config.ts` |
| 8 | medium | Inngest endpoint fails open when `INNGEST_SIGNING_KEY` is absent. | tooling fix 1: verification on unless `INNGEST_DEV` truthy; throw when neither is set |
| 9 | medium | Anonymous principals mintable without limit. | security fix 1: rate-limit the proxy route; captcha under Needs Sanchay (Supabase dashboard) |
| 10 | medium | `request_quote` accepts a revision from another design. | security fix 1: `design_id=eq.` on the lookup |
| 11 | medium | Shopper contact PII retained forever, no erasure. | recorded: retention migration in Phase 7 (P7-3 neighbourhood) |
| 12 | medium | `pnpm audit --prod`: sharp 0.34.5 (libvips, patched 0.35), postcss, qs, otel core. | pipeline fix 1 (jobs package in flight): sharp bump and `pnpm.overrides` |
| 13 | medium | NFC seam: SQL fingerprints raw JSON, renderer normalises. | security fix 1 with 4 (normalise before storage) |
| 14 | low-medium | `/api/readiness` discloses topology unauthenticated. | security fix 1: bare status anonymously; `smoke.sh` probes with the operator cookie |
| 15 | low | `/api/references` trusts the declared MIME. | security fix 1: sniff magic bytes |
| 16 | low | `/api/operator/commands` lacks `assertSameOrigin`. | security fix 1 |
| 17 | low | Operator sessions cannot be revoked (8 h window). | recorded |

Clean: RLS on every table, owner policies, definer functions with empty `search_path` and tight grants, private buckets with owner-prefix read, 300 s signed URLs, explicit projection in `/api/state`, Shopify webhook HMAC and replay handling, outbox idempotency, fail-closed spend caps, no secret or private artwork anywhere in 250 commits of history, server-only key boundary, error vocabulary, prompt template validation, preview-request schema, no `dangerouslySetInnerHTML`, deploy scripts.
