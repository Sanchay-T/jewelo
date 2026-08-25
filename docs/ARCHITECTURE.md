# Jewelo v2 architecture

## System

```text
Browser
  |
  | HTTPS / Supabase Realtime
  v
Next.js on Vercel
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
              +--------+---------+
              |                  |
              v                  v
        OpenAI API          Runway API
        GPT Image 2         Gemini Omni Flash
        GPT-5.6 Luna        Seedance fallback
```

The application is a modular monolith. There are two deployable units—web and jobs—not microservices.

## Responsibility boundaries

### Web

- render the customer and operator experiences;
- authenticate/authorize commands;
- validate input;
- create revisions/runs transactionally;
- issue signed media access;
- subscribe to durable run/task/asset state;
- never perform long model calls.

### Supabase

- source of truth for identity, organizations, designs, revisions, runs, tasks, assets, quotes, orders, audit, cost, and outbox;
- row-level authorization;
- private input/output media;
- realtime milestone delivery;
- branch-isolated preview data.

### Trigger.dev

- consume outbox-dispatched run IDs;
- enforce per-provider and per-organization queues;
- fan out independent work;
- retry classified transient failures;
- wait/poll external providers;
- checkpoint metadata and write durable results back to Supabase;
- never become the only source of customer-visible truth.

### Providers

Provider adapters accept typed contracts and return typed results. Domain code never imports OpenAI or Runway SDKs.

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
- `estimate` != `quote`
- `quote` != `order`
- asset metadata != file bytes

Use UUID primary keys, `timestamptz`, immutable creation timestamps, explicit organization/owner columns, text statuses with check constraints, and unique idempotency keys.

## Creation transaction and outbox

Creating a run is one database transaction:

1. insert/freeze the design revision;
2. insert the generation run;
3. insert expected task slots;
4. insert one unsent outbox event;
5. commit.

A dispatcher sends the event to Trigger.dev with the outbox ID as idempotency key. A scheduled reconciliation task retries unsent/stale events. This removes the “database committed but workflow never started” failure.

## Generation workflow

```text
normalize customer text
        |
        v
canonical SVG + PNG identity
        |
        v
four product tasks in parallel (bounded queue)
        |
        +--> verify identity/quality --> persist product asset
        |
        v
four worn tasks, each unlocked by its matching product pass
        |
        +--> verify same pendant --> persist worn asset
        |
        v
customer compares and selects
        |
        v
one selected 9:16 motion task
        |
        +--> drift/loop/format QA --> persist video
```

### Task state

```text
pending -> queued -> running -> succeeded
                         |-> retry_wait -> running
                         |-> failed
                         |-> cancelled
```

Run status is derived from task state and may be `partial_success`. Successful assets are never discarded because a sibling failed.

### Concurrency defaults

- product stills: four variation tasks, provider queue limit initially 4;
- worn stills: four tasks, unlocked progressively, queue limit initially 4;
- verifier: bounded separately to avoid blocking generation;
- video: one selected task per design by default;
- per-organization concurrency and daily spend caps;
- global provider concurrency configured outside business code.

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

GPT Image 2 receives the canonical identity as a high-fidelity input. Product output becomes an additional reference for the matching worn output. Video receives the approved selected still as its first frame.

The verifier checks:

- exact normalized text;
- letter/glyph order;
- major contour/attachment consistency;
- metal and stone consistency;
- duplicate/missing elements;
- crop/resolution/background requirements.

A model may fail the quality gate; it may not silently redefine the customer’s pendant.

## Realtime

Workers persist coarse milestones and asset rows. The browser subscribes to the current run/task/asset records filtered by IDs and RLS.

Do not stream provider secrets, raw prompts, or large payloads through Realtime. On reconnect, the database reconstructs the complete state.

If Postgres Changes later becomes a measured bottleneck, switch the progress transport to Supabase Broadcast or Trigger Realtime without changing the database model.

## Media

Private buckets:

```text
references
canonical
generated-images
generated-video
exports
```

Immutable key shape:

```text
org/{orgId}/design/{designId}/revision/{revisionId}/run/{runId}/
  variation/{index}/{kind}/{assetId}.{ext}
```

Store MIME type, dimensions, duration, checksum, byte size, provider lineage, and lifecycle status in `assets`. Never store durable provider URLs; download provider output immediately into Jewelo storage.

Use signed URLs with a reuse/cache policy. Originals stay private; explicitly published gallery derivatives may move to a public bucket.

## Authentication and authorization

- Create an anonymous authenticated user at the start of a design journey.
- Link email/phone/OAuth when the customer saves across devices, requests a quote, or orders.
- Model business staff through organizations and memberships.
- Every customer/business table has RLS.
- Service-role access exists only in trusted web/job runtimes.
- Provider webhooks are signature-verified and idempotent.
- Uploads validate content type, byte size, dimensions, and ownership.

## Environments

```text
development  -> persistent Supabase dev + Trigger DEV + Vercel local/preview
preview      -> Supabase PR branch + Trigger preview branch + Vercel preview
staging      -> persistent Supabase staging + Trigger STAGING + Vercel staging
production   -> Supabase Mumbai prod + Trigger PROD + Vercel prod
```

Production data is never copied into preview branches. Seed only synthetic fixtures.

## Scaling path

Scale in this order:

1. provider quotas/concurrency and model spend;
2. Trigger worker/concurrency plan;
3. Supabase compute/connection pool;
4. Realtime transport if measured;
5. storage/CDN economics;
6. split deployables only when tracing proves an independent boundary.

Do not introduce Kafka, Kubernetes, Temporal, Redis, or a second database preemptively.
