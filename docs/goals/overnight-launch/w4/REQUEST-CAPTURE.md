# W4 honest degrade - request capture (backend)

Written 7 September 2026 for `docs/goals/overnight-launch-2026-09-08.md`, workstream W4 step 5 and definition-of-done item 3.

This is the production failure state, so it exists whether or not real generation works.
When the personalized preview cannot be delivered, the review stage keeps the clearly labelled illustrated sample on screen, the shopper leaves a way to be contacted, and the request becomes durable operator work.
No provider call, price, promise or borrowed photograph is implied by a captured request.

The UI half of step 5 is not in this slice; this is the schema, the API and the operator surface it needs.

## API contract

All bodies follow the repository error contract `{"error": string, "code": string}` with `cache-control: no-store`.

### `POST /api/preview-requests`

Owner-authenticated exactly like `POST /api/designs/drafts`: an anonymous Supabase session bearer in `authorization: Bearer <access_token>`.
The row is written with the caller's own bearer, so the insert passes through RLS as the owner; the service-role key is never used on this path.

Request body, validated by `previewRequestInputSchema` in `packages/contracts/src/preview-request.ts` (strict: unknown fields are rejected):

```jsonc
{
  "locale": "ar",                       // "en" | "ar", required
  "specification": {                    // required, the atelier customer vocabulary
    "script": "Arabic",                 // "English" | "Arabic"
    "names": ["ليلى"],                  // 1-2 entries, 1-30 characters each
    "layout": "Stacked",                // required when there are two names
    "construction": "Diamond rails",
    "lettering": "Kufi",
    "gold": { "karat": "18K", "color": "Rose gold" },
    "stones": { "coverage": "Accent", "gemstone": "Lab diamond" },
    "pendantWidthMm": 32,
    "chainStyle": "Rolo",
    "engraving": "…",                   // optional, <= 80 characters
    "specialRequests": "…"              // optional, <= 1000 characters
  },
  "contact": {                          // required
    "channel": "whatsapp",              // "whatsapp" | "phone" | "email"
    "value": "+971 50 123 4567",        // normalized before storage
    "name": "Layla"                     // optional, <= 80 characters
  },
  "sampleReference": {                  // optional, the labelled sample on screen
    "manifestId": "sample-assets-v9",
    "sampleId": "akr-white-none-Studio-v9",
    "view": "Studio",                   // "Studio" | "On skin" | "Close-up" | "Dark"
    "assetPath": "/atelier/arabic-kufi-rails-white-none-studio.png",
    "checksum": "<sha256 hex>"          // optional; the manifests carry none today
  },
  "designId": "<uuid>",                 // optional links, all owner-checked
  "designRevisionId": "<uuid>",
  "generationRunId": "<uuid>",
  "requestKey": "<uuid>"                // optional idempotency key
}
```

Validation rules that matter:

- `stones.coverage: "No stones"` must have no `gemstone`; any other coverage must have one.
- Two names require a `layout`.
- `whatsapp` / `phone` values are stripped of spaces, hyphens, dots and parentheses, then must match `^\+?[1-9]\d{6,14}$` (E.164-ish). The stored value is the normalized one.
- `email` is trimmed, lower-cased and must parse as an email address.
- `sampleReference.assetPath` must be a local `/atelier/...` catalogue path with no `..` segment, mirroring `previewHandoff.ts`.
- `status`, `operatorNote` and `principalId` are not accepted from a client; status is the database default and the owner comes from the verified session.

Responses:

| Status | When |
| --- | --- |
| `201` | Created. Body is the customer record. |
| `200` | Idempotent replay: a row already exists for this principal and `requestKey`. Same body. |
| `401 unauthenticated` | Missing or rejected bearer. The body is never read first. |
| `422 invalid_input` | Malformed JSON or a schema failure. The message names the failing path, never the submitted value. |
| `429 spend_guard` / `409 state_conflict` / `500 internal` | Inherited from the shared Supabase error mapping. |

Customer record (`PreviewRequestRecord`), deliberately without `contact` and `operatorNote`:

```jsonc
{
  "id": "<uuid>", "status": "new", "locale": "ar",
  "specification": { … }, "sampleReference": { … },
  "designId": null, "designRevisionId": null, "generationRunId": null,
  "createdAt": "…", "updatedAt": "…", "contactedAt": null
}
```

### `GET /api/preview-requests/{id}`

Same owner authentication, for reload. Returns the customer record, or `404 not_found` when RLS hides the row - which is what a second principal sees.

### `GET /api/operator/preview-requests`

Operator session required, the same `requireOperatorSession` cookie guard as `/api/operator/commands`. Reads with the service role.

Query: `status` (one of `new`, `contacted`, `fulfilled`, `cancelled`; anything else is `422 invalid_input`) and `limit` (default 50, clamped to 1-200).

```jsonc
{ "previewRequests": [ { …customer record…,
    "contact": { "channel": "whatsapp", "value": "+971501234567", "name": "Layla" },
    "summary": "ليلى · Arabic · Diamond rails · Kufi · 18K rose gold · accent lab diamond · 32 mm · rolo chain",
    "operatorNote": null } ] }
```

Ordered `created_at desc`. A row whose stored specification predates the contract still lists, with `summary: "Specification needs review"`.

### `POST /api/operator/commands` - `preview_request.mark_contacted`

```jsonc
{ "command": "preview_request.mark_contacted",
  "targetId": "<preview request id>",
  "idempotencyKey": "<uuid>",
  "payload": { "note": "Called on WhatsApp" } }   // optional, <= 2000 characters
```

`designId` is now required per command instead of for the whole envelope, because a degraded capture may have no design; every other command still answers `422 invalid_input` without one.
The update is filtered on `status=eq.new`, so a repeated click is a no-op that never rewrites `contacted_at`; the current row is returned either way.
The route writes its usual `operator.<command>` audit row.

## SQL

`supabase/migrations/20260907010000_preview_requests.sql` (not yet applied; the lead pushes it after W0).

```sql
create table public.preview_requests (
  id uuid primary key default gen_random_uuid(),
  principal_id uuid not null references auth.users(id) on delete cascade,
  design_id uuid references public.designs(id) on delete set null,
  design_revision_id uuid references public.design_revisions(id) on delete set null,
  generation_run_id uuid references public.generation_runs(id) on delete set null,
  locale text not null check (locale in ('en', 'ar')),
  specification jsonb not null,
  sample_reference jsonb,
  contact jsonb not null,
  request_key text,
  status text not null default 'new' check (status in ('new', 'contacted', 'fulfilled', 'cancelled')),
  operator_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  contacted_at timestamptz,
  -- jsonb object checks, request_key <= 200, operator_note <= 2000,
  -- and contacted_at only on a non-'new' status
);

create unique index preview_requests_principal_request_key
  on public.preview_requests(principal_id, request_key) where request_key is not null;
create index preview_requests_queue on public.preview_requests(status, created_at desc);
create index preview_requests_principal on public.preview_requests(principal_id, created_at desc);
```

Triggers, all `security definer set search_path = ''` and revoked from `public, anon, authenticated`:

- `preview_requests_touch` - the existing `public.touch_updated_at()`.
- `preview_requests_owner_consistency` (`before insert or update of design_id, design_revision_id, generation_run_id, principal_id`) - a linked design, revision or run must belong to the same principal, so a guessed identifier cannot attach a capture to another tenant. The links stay nullable with `on delete set null` so retention work on a design does not silently empty the operator queue.
- `preview_requests_audit` (`after insert`) - appends `preview_request.captured` to `audit_events` with `actor_type = 'customer'`. The detail carries the request id, locale, contact **channel**, whether a labelled sample was shown and its id; the contact **value** is PII and never enters the audit row.
- `preview_requests_operator_audit` (`after update`) - appends `preview_request.status_changed` with `actor_type = 'operator'`, `principal_id` null and the affected principal in the detail.

RLS and grants:

```sql
alter table public.preview_requests enable row level security;
create policy preview_requests_owner_read   on public.preview_requests for select using (principal_id = auth.uid());
create policy preview_requests_owner_insert on public.preview_requests for insert with check (principal_id = auth.uid());
-- no update or delete policy: a captured request is client-append-only
revoke all on table public.preview_requests from public, anon, authenticated;
grant select, insert on public.preview_requests to authenticated;
grant all privileges on table public.preview_requests to service_role;
```

## RLS proof plan, and the proof that was run

`docs/goals/overnight-launch/w4/rls-proof.sql` applies the migration, creates two principals plus a design owned by the second, exercises the boundary as `role authenticated` with a spoofed `request.jwt.claims`, and **rolls the whole transaction back**. It is re-runnable after the migration is pushed (drop the `\i` line then, or keep it against a database where the table does not yet exist).

Run on 7 September against the live development project through the Mumbai session pooler, in one rolled-back transaction (no `db push`, nothing persisted - `to_regclass('public.preview_requests') is null` and zero proof rows afterwards):

```text
PASS  A inserts own row
PASS  A cannot forge B's row (new row violates row-level security policy for table "preview_requests")
PASS  duplicate request_key rejected (23505)
PASS  cross-tenant design link rejected (design does not belong to this principal)
PASS  A reads own rows: 1
PASS  B reads no rows of A: 0
PASS  client update rejected (permission denied for table preview_requests)
PASS  client delete rejected (permission denied for table preview_requests)
PASS  audit row appended on insert: 1
PASS  audit detail carries no contact value
PASS  service role marks contacted: contacted <timestamp>
PASS  status change audited: 1
PASS  contacted_at/state check holds
```

Still to prove once the migration is applied: the same boundary end to end over HTTP, which is what the e2e block below does.

## e2e step names added to `scripts/e2e-backend.sh`

Section `14. Honest degrade: preview request capture (W4)`, appended after section 13 so it reuses principal A, principal B and the operator credentials already established. The whole block prints one SKIP (`47-53 preview-request capture`) when the service-role probe of `/rest/v1/preview_requests` does not answer `200`, so the driver stays green until the lead pushes the migration.

| Step | Assertion |
| --- | --- |
| `47 preview-request.create` | `201`, `status` is `new`, and the customer response carries neither `contact` nor `operatorNote` |
| `48 preview-request.owner is the anonymous principal` | the stored `principal_id` is principal A |
| `48 preview-request.contact normalized to E.164` | `+971 50 123 4567` was stored as `+971501234567` |
| `48 preview-request.labelled sample recorded` | `sample_reference.role` is `illustrative-reference-only` |
| `48 preview-request.audit row appended` | exactly one `preview_request.captured` audit row for this id |
| `49 preview-request.idempotent-replay` | the same body with the same `requestKey` answers `200` with the same id |
| `49 preview-request.replay creates no duplicate` | one row for `(principal, request_key)` |
| `50 preview-request.owner reload` | `GET /api/preview-requests/{id}` as A answers `200` |
| `51 neg.cross-tenant preview-request GET` | the same id as principal B answers `403`/`404` with a `code` |
| `52 neg.preview-request unusable contact` | `422 invalid_input` for `"12345"` |
| `52b neg.preview-request without bearer` | `401` |
| `53 operator.preview-requests list` | `200` and the capture is in `previewRequests`, with its summary |
| `53b operator.mark_contacted` | `200`, then the row is `contacted` with `contacted_at` set |
| `53c operator.session.delete` | `200` |

Steps 53, 53b and 53c print SKIP when `OPERATOR_EMAIL` / `OPERATOR_PASSPHRASE` are absent, matching the existing operator block.

## Files

- `supabase/migrations/20260907010000_preview_requests.sql`
- `packages/contracts/src/preview-request.ts`, `packages/contracts/src/preview-request.test.ts`, `packages/contracts/src/index.ts`
- `packages/data/src/database.types.ts` (hand-written `preview_requests` entry; regenerate after the push)
- `apps/web/src/lib/backend/preview-requests.ts`
- `apps/web/src/app/api/preview-requests/route.ts`, `apps/web/src/app/api/preview-requests/[id]/route.ts`, `apps/web/src/app/api/preview-requests/route.test.ts`
- `apps/web/src/app/api/operator/preview-requests/route.ts`, `apps/web/src/app/api/operator/preview-requests/route.test.ts`
- `apps/web/src/app/api/operator/commands/route.ts`
- `apps/web/src/lib/operator-preview-request-client.ts`, `apps/web/src/features/admin/PreviewRequestQueue.tsx`, `apps/web/src/features/admin/OperatorExperience.tsx`
- `scripts/e2e-backend.sh`
- `docs/goals/overnight-launch/w4/rls-proof.sql`
