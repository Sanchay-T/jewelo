# Jewelo v2 architecture

> **Superseded in part on 3 September 2026 (D-017).** Video/motion generation
> was removed; Jewelo generates still images only. Every fal.ai, Seedance and
> motion statement below is retained as historical rationale and is no longer
> in effect. See `docs/DECISION-REGISTER.md`.


The final Caleums parent/child asset graph and provider split are frozen in
`docs/CALEUMS-FINAL-E2E-CONTRACT.md`. That contract overrides older pipeline
examples below where they differ.

## System

```text
Browser
  |
  | HTTPS / Supabase Realtime
  v
Next.js on DigitalOcean App Platform
  |-- authenticated command routes
  |-- server-rendered reads
  |-- signed media access
  |
  +--------------------+
  |                    |
  v                    v
Supabase Mumbai        Trigger.dev Cloud
Postgres/Auth/         durable queues, retries,
Realtime/Storage       fan-out, waits, observability
  ^                    |
  |                    |
  | task/asset updates |
  +--------------------+
                       |
                       |
                       v
                  OpenAI API
                  GPT Image 2
                  GPT-5.6 Luna
```

The application is a modular monolith with two deployable units—web and jobs—not a microservice fleet.

## Responsibility boundaries

### Web

- render customer and operator experiences;
- authenticate/authorize commands;
- validate input and create revisions/runs transactionally;
- issue signed media access;
- subscribe to durable run/task/asset state;
- never perform long model calls or poll providers from the browser.

### Supabase

- source of truth for identity, organizations, designs, immutable revisions, runs, tasks, assets, quotes, orders, audit, cost, quota reservations, and outbox;
- row-level authorization;
- private input/output media;
- realtime milestone delivery;
- branch-isolated preview data.

### Trigger.dev

- consume outbox-dispatched run IDs;
- enforce global provider, per-organization and per-profile queues;
- batch fan out four independent variation pipelines;
- retry classified transient failures with stable idempotency keys;
- wait/poll external providers without tying up web requests;
- checkpoint metadata and write durable results to Supabase;
- cancel queued/dependent work and reconcile lost dispatches;
- never become the only source of customer-visible truth.

### OpenAI

- generate product and worn still images through the direct GPT Image 2 API;
- perform configured structured visual verification after deterministic checks;
- return temporary provider output that jobs immediately copy into Jewelo storage.

Provider adapters accept typed contracts and return typed results. Domain code never imports the OpenAI SDK.

## Core data model

```text
auth.users
profiles
organizations
organization_members

designs
design_revisions
generation_runs
generation_tasks
variations
assets

prompt_releases
provider_calls
usage_ledger
quota_reservations

price_snapshots
quote_requests
quotes
orders

audit_events
outbox_events
```

Important separations:

- `design` != `design_revision`
- `design_revision` != `generation_run`
- `generation_run` != `generation_task`
- `variation` != `asset`
- estimate != quote != order
- asset metadata != file bytes

Use UUID primary keys, `timestamptz`, immutable creation timestamps, explicit owner/organization columns, status constraints, unique idempotency keys, and row-level security.

## Creation transaction and outbox

Creating a run is one database transaction:

1. insert/freeze the design revision;
2. reserve the configured model-spend ceiling;
3. insert the generation run;
4. insert four variation records and expected task slots;
5. insert one unsent outbox event;
6. commit.

A dispatcher sends the event to Trigger.dev with the outbox ID as idempotency key. A scheduled reconciliation task retries unsent/stale events. This removes the “database committed but workflow never started” failure.

## Low-latency generation workflow

```text
normalize customer text
        |
        v
canonical SVG + PNG identity
        |
        v
parent uses Trigger batch fan-out for variations 1..4
        |
        +-- V1 product -- QA -- worn V1 -- QA -- persist
        +-- V2 product -- QA -- worn V2 -- QA -- persist
        +-- V3 product -- QA -- worn V3 -- QA -- persist
        +-- V4 product -- QA -- worn V4 -- QA -- persist
```

The pipeline is **streaming by variation**, not staged behind global barriers:

- all four product stills start together;
- each product persists and appears as soon as it passes QA;
- that variation immediately starts its worn still;
- a slow/failing sibling cannot block a successful variation.

Do not wrap waitable Trigger child calls in arbitrary `Promise.all()`. Use Trigger batch fan-out APIs and named queues so child execution, retries and metadata remain visible.

## Task state

```text
pending -> queued -> running -> verifying -> succeeded
                         |          |-> retry_wait -> running
                         |          |-> failed
                         |-> cancelled
```

Run status is derived from task state and may be `partial_success`. Successful assets are never discarded because a sibling failed.

## Queue and concurrency defaults

```text
openai-image
  concurrency: 4 initially
  quota: verified against the OpenAI project IPM before real launch

visual-verifier
  separately bounded so verification cannot starve generation

organization
  concurrency key: organization ID
  default maximum: 4 active variation pipelines
```

Provider concurrency and requests-per-minute values are environment policy, not domain constants. If a provider quota is below the desired parallelism, Trigger queues excess work and the customer sees `queued`; the system never claims false parallelism.

Stable idempotency key:

```text
run:{runId}:variation:{index}:{kind}:release:{releaseId}
```

## Model profiles

```text
still.production  = gpt-image-2-2026-04-21 (direct OpenAI)
still.verifier    = gpt-5.6-luna
```

## Canonical pendant identity

Before generative work, Jewelo produces deterministic identity assets from:

- Unicode-normalized customer text;
- language/script and approved licensed font;
- shaping/ligature output;
- metal/karat/style/gemstone configuration;
- dimensions and chain-attachment rules.

Outputs:

```text
canonical.svg
canonical-mask.png
canonical-preview.png
identity.json
identity_fingerprint
```

GPT Image 2 receives the canonical identity as a high-fidelity input. Product output becomes an additional reference for the matching worn output.

The verifier checks:

- exact normalized text and glyph order;
- major contour, connection and attachment consistency;
- metal and stone consistency;
- duplicate/missing elements;
- crop/resolution/background requirements;

A model may fail the quality gate; it may not silently redefine the customer’s pendant.

## Realtime and UX delivery

Workers persist coarse milestones and asset rows. The browser subscribes to the current run/task/asset records filtered by IDs and RLS.

Do not stream provider secrets, raw prompts, base64, or provider URLs through Realtime. On reconnect, the database reconstructs the complete state.

Customer-visible behavior:

```text
slot queued -> shimmer/skeleton
slot generating -> subtle active treatment
slot verifying -> identity-check state
slot ready -> crossfade asset into the same layout box
slot retrying/failed -> explicit status and bounded action
```

The first useful product must be visible without waiting for the full set. The Motion library, Embla Carousel and `react-zoom-pan-pinch` provide the interaction layer; Supabase state remains the source of truth.

## Media security

Private buckets:

```text
references
canonical
generated-images
exports
```

Immutable key shape:

```text
org/{orgId}/design/{designId}/revision/{revisionId}/run/{runId}/
  variation/{index}/{kind}/{assetId}.{ext}
```

Store MIME type, dimensions, duration, checksum, byte size, provider lineage, and lifecycle status in `assets`. Never store durable provider URLs.

Provider output URLs are temporary transport only. Trigger jobs download successful output immediately, verify bytes/checksum, upload to private Supabase Storage, then persist the Jewelo asset.

## Authentication and authorization

- Create an anonymous authenticated user at the start of a design journey.
- Link email/phone/OAuth when the customer saves across devices, requests a quote, or orders.
- Model business staff through organizations and memberships.
- Every customer/business table has RLS.
- Service-role access exists only in trusted web/job runtimes.
- Provider callbacks/webhooks are signature-verified and idempotent where supported.
- Uploads validate content type, byte size, dimensions and ownership.

## Environments

```text
development  -> persistent Supabase dev + Trigger DEV + local Next.js + dev provider keys
preview      -> Supabase PR branch + Trigger preview branch + DigitalOcean staging + contract providers
staging      -> persistent Supabase staging + Trigger STAGING + bounded OpenAI validation
production   -> Supabase Mumbai prod + Trigger PROD + DigitalOcean production + approved provider quotas
```

Production data is never copied into previews. Seed only synthetic fixtures.

## Scaling path

Scale in this order:

1. OpenAI quotas, queue policy and model spend;
2. Trigger environment concurrency and fairness;
3. Supabase compute/connection pool;
4. Realtime transport if measured;
5. storage/CDN economics;
6. split deployables only when tracing proves an independent boundary.

Do not introduce Kafka, Kubernetes, Temporal, Redis, autonomous media agents, or a second database preemptively.

See `docs/MEDIA-CONCURRENCY.md` for the complete fast-result contract.
