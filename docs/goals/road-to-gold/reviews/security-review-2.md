# Security review 2: session 2 surfaces (`dbb73fb..d3dbd25`)

Fresh-context `security-reviewer`, 2026-09-09, read-only, probes against the local dev server with a locally minted operator cookie.
Recorded by the lead from the agent's report. Fix dispatched as security fix 3.

## High

- **H-1 The log notification transport writes every shopper's contact and free text to the runtime log.** `packages/ai/src/notification.ts:92` logs `{transport, to, subject, text}` and `text` carries the WhatsApp number, the name given and the free-text request; `NOTIFICATION_TRANSPORT` defaults to `log`. DigitalOcean runtime logs have no retention bound or deletion path. Compounding: Sentry's console breadcrumbs (server `beforeSend` scrubs request fields only) would ship that line to sentry.io the day `SENTRY_DSN` is set. Fix: log the request id only; add `beforeBreadcrumb` dropping console breadcrumbs on the server init.
- **H-2 `GET /api/state` with an operator cookie and no `designId` exports the whole database.** `apps/web/src/app/api/state/route.ts:181-240`; probe returned 200, 815 KB, 61 designs, 994 audit events, 222 freshly signed asset URLs. Predates the range; P7-1's `loadOperatorDesignState` made it live. Fix: require `designId` on the operator branch or clamp with `MAX_LIMIT` as `review-runs` does.

## Medium

- **M-1 `preview_requests` RLS grants the owner every column**, so the shop tablet's anonymous JWT can read `operator_note`, `notified_at` and `contact` straight from PostgREST (`20260907010000_preview_requests.sql:121-128`). Fix: revoke `select` from `authenticated` and grant the `CUSTOMER_COLUMNS` list only.
- **M-2 A locale switch carries the previous shopper's bag across the scope boundary** (`deviceState.ts:82`), including `draft.name`, `secondName`, `engraving`, `requests` and `personalized` ids. Fix: a scope mismatch clears the record like an unreadable one.
- **M-3 Operator commands audit intent, not effect** (`commands/route.ts:173-186`): the `audit_events` insert runs whether or not a row matched, even for a missing `targetId`; `idempotencyKey` is stored but never deduped for `issue_quote` and `fulfillment_transition`. Fix: audit inside the branch, gated on a returned row, with before and after status; or rely on the trigger for preview-request commands.
- **M-4 `fulfillment_transition` and `issue_quote` accept unvalidated payload and ignore `designId`** (`commands/route.ts:54-70,112-119`); `issue_quote` has no caller since P7-2. Fix: zod envelopes with enums and bounds plus `design_id` in the filter, or delete `issue_quote`.
- **M-5 Browser Sentry has no `beforeSend`** (`observability/src/client.ts:84-92`): `event.request.url`, DOM and console breadcrumbs ship unscrubbed while PostHog on the same page is sanitised. Fix: mirror the server `scrub` with `pathOnly` and drop console breadcrumbs.

## Low

- **L-1** `review-runs` and `preview-requests` operator GETs skip `assertSameOrigin`; `prompts` has it. Lift the helper into `operator-session.ts`, call it in both.
- **L-2** `operatorPreviewRequest` casts `contact` without parsing and the queue builds `mailto:`/`tel:` hrefs from it (`preview-requests.ts:135`, `PreviewRequestQueue.tsx:116-124`); React 19 is the only guard. Fix: `previewRequestContactSchema.safeParse` with a degrade record.
- **L-3** SMTP subject: RFC 2047 encoded word unbounded and unfolded (`notification.ts:448-455`); two 30-character Arabic names give a 170-character header line some hosts reject. Fix: fold at 63 base64 characters or bound the subject.
- **L-4** STARTTLS upgrade leaves the plain socket's `data`/`close`/`error` listeners and idle timeout attached (`notification.ts:400-415`). Fix: remove them before `tls.connect`.
- **L-5** Backups: `pg_dump --file` partial is created under the default umask before `chmod 600`; the parsed `PGPASSWORD` temp file survives if sourcing fails under `set -e`; `JEWELO_DRILL_KEEP=1` leaves real contact data in a scratch database with no README warning. Fixes: `umask 077`, `trap 'rm -f "$tmp"' RETURN`, README note plus mask `preview_requests.contact` after restore. No retention or deletion policy exists for contact rows anywhere.
- **L-6** `readJson` (`supabase-rest.ts:172-183`) reads the whole body before any zod bound; add a `content-length` bound from `packages/config`.

## Cleared with evidence

CSP widens only through parsed origins, byte-identical with empty keys; `assertSameOrigin` on mutations refuses cross-site and missing `Origin` (403 probes); operator authn HMAC with constant-time compare, unauthenticated probes 401; preview-request tenant isolation through RLS and `enforce_preview_request_ownership`, idempotent replay; column allowlists correct at the route layer; notification claim is a database conditional PATCH with release on failure and an engine-level event id; `studio_only` does not weaken the spend guard (`security definer`, empty `search_path`, dependents inserted terminal at 0 cents, studio still guarded at creation); `notified_at` migration additive; anchor publisher keeps the service role off argv, rejects dot segments, 120 s signed URLs, compare-and-set publish; env contract marks every non-empty value SECRET; `@sentry/cli` and `core-js` postinstalls blocked, versions pinned exactly; no shopper free text reaches a provider prompt; no new outbound destination derives from request input; `deviceState` `restore()` validates structurally; `global-error.tsx` clean; no secret in the diff.
