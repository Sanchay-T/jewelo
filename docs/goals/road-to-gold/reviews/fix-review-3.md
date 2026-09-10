# Fix review 3: security fix 3 (`ec45a3e`) and storyline fix 1 (`7789d31`)

Fresh-context `reviewer` on 2026-09-09, probing the local dev server on 3011 against the shared Supabase project.
Recorded by the lead from the agent's report; probes under the session scratchpad `fix-review-3/`.

## Verdict

One blocker, two majors, seven minors.
Seventeen of the twenty findings of security review 2 and storyline review 1 are closed with the probe re-run; three regressed or are not effective where deployed.

## Blocker

**BL-1** Migration `20260909021000` revoked table `select` from `authenticated` and re-granted eleven columns without `request_key`.
The capture route replays through `?request_key=eq.<uuid>` under the shopper's own bearer, and Postgres needs `select` on every column a `where` clause names, so every `POST /api/preview-requests` answered `403 permission denied for table preview_requests`, replay or not.
Live on the shared database from the moment the migration was pushed, not at the next deploy.
Fixed by the lead: `20260909022000_preview_requests_request_key_grant.sql` (`d358b81`), applied with `db:push`.
The staging proof (an anonymous session posting a request and getting 200/201) is still owed; the agent dispatched for it was stopped when the session process exited.

## Major

**MJ-1** `preview_request.note` writes no audit row: the route now relies on the trigger in `20260907010000_preview_requests.sql:96-118`, which fires only on a status change, and a note changes only `operator_note`.
Proven transactionally (update note, zero audit rows, rollback) against three historical `operator.preview_request.note` rows the route used to write.
Open.

**MJ-2** The two-minute sweeper of storyline fix 1 B3 registers only with `INNGEST_CRON_ENABLED=1` and sends only with `NOTIFICATION_TO`; staging has neither, and 13 rows remain unannounced.
The code and gates are right (id-only sweep query, batch 50, min age 60 s, event id byte-identical to the route's, `concurrency: 1`, `retries: 0`).
Because the sweep reuses the route's event id, Inngest's 24 h deduplication means a request whose send failed three times cannot be re-announced by the sweep for 24 hours; the sweep covers "the event never got in", not "the send kept failing".
Needs Sanchay for the values; the limitation is recorded here.

## Minor

1. `deviceState.ts:86-89` scope mismatch removes only the record key, not the submission or the idempotency keys `clearDeviceState` also sweeps.
2. `Atelier.tsx:583` still says the other language "hands over the kept pieces"; it drops them, silently, with no line to the shopper.
3. `fulfillment_transition` against an unknown order id answers `200 {}`; no from-status gate.
4. The 413 bound reads `content-length` only; a chunked body still buffers whole (as L-6 specified).
5. `POST /api/operator/session` has no `assertSameOrigin` (login CSRF only).
6. `packages/observability/src/client.ts:119-121` drops console breadcrumbs but keeps DOM breadcrumbs.
7. The first sweep after `NOTIFICATION_TO` is set announces all 13 old test rows unless someone runs the runbook SQL first; a `created_at` floor would be safer.

## Verified closed, with the probe

H-2 (`/api/state` operator branch 422 without `designId`, 10.9 KB with one, customer branch unaffected); M-1 leak itself (anonymous `select=id,contact,operator_note,notified_at` → 403); M-2; M-3 for status commands and the two RPCs; M-4 (`shipped` → 422 naming the four allowed statuses, `issue_quote` → 404); M-5 and H-1; L-1 (cross-site GET 403 on both operator reads); L-2 (13 live contacts parse, `unknown` builds no href); L-3 (two 30-character Arabic subjects fold inside RFC 2047 and round-trip); L-4; L-5 (`bash -n`, RETURN trap self-clears on bash 5.3, `umask 077` before `pg_dump`); L-6 as specified; storyline M1/D-022 (defaults reproduce today's eight marked tiles, `Bogus` fails the schema, empty string falls back, spacing normalises); M3 (`PRESENTABLE_PROVIDERS` is the single gate through `readPersonalizedRun`); M4 (five `observabilityConnectOrigins` cases, live CSP names no vendor); the three minors (AR title, `مم`, two-name advisory gated on Arabic and absent from both SSR defaults).
Secret boundary clean in `apps/web/.next/static`.
Build 13/13 in the working tree.
