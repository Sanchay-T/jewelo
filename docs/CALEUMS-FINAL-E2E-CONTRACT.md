# Caleums final E2E contract

**Status:** frozen integration source of truth
**Applies to:** final Caleums implementation, verification, and release work

This document is the authoritative final E2E contract. When an older goal,
architecture example, provider adapter, prompt profile, or deployment note
conflicts with it, this document wins. Historical goal documents remain useful
as implementation evidence, but they do not redefine this topology.

## Customer and UI contract

The Caleums reference UI is authoritative. Its form state is deterministic and
serializable, and the approved name is rendered in the Arabic preview before
generation. Reloading or reconnecting reconstructs the current run from
backend state; the UI never substitutes hard-coded provider progress.

The browser renders persisted run, task, and asset milestones progressively:

```text
queued -> generating -> verifying -> ready
                     -> retrying
                     -> failed
                     -> cancelled
```

No provider key, Supabase service-role key, raw provider payload, private
prompt, or durable provider URL may reach browser code or browser-delivered
state.

## Identity and media graph

The versioned deterministic solver and immutable identity anchor own approved
spelling, Unicode/script normalization, glyph order, pendant geometry,
attachments, dimensions, and identity fingerprint. Models render and verify
that identity; they never decide or silently alter it.

One OpenAI-verified `image.studio` asset is the required parent for every
derived presentation:

```text
deterministic specification + identity anchor
  -> image.studio (OpenAI GPT Image 2)
       -> image.on_skin (OpenAI GPT Image 2 edit)
       -> image.close_up (OpenAI GPT Image 2 edit)
       -> image.dark (OpenAI GPT Image 2 edit)
       -> video.preview (fal Seedance, generate_audio:false)
       -> video.final (fal Seedance, generate_audio:false)
```

All still generation and still editing call OpenAI GPT Image 2 directly from a
trusted server or job runtime using `OPENAI_API_KEY`. fal is forbidden for
stills. OpenAI verification gates exact identity and spelling before a still
can become a parent or reach `ready`.

fal handles video only, using `FAL_KEY`. Both Seedance profiles must submit
`generate_audio:false`; video cannot replace or redefine the verified Studio
identity.

## Prompt and lineage contract

The immutable prompt registry covers exactly these profiles:

- `image.studio`
- `image.on_skin`
- `image.close_up`
- `image.dark`
- `video.preview`
- `video.final`

Each profile has immutable releases, one atomically published release, an
append-only publication history, and authenticated admin create, publish, and
rollback operations. Publication changes affect only newly created tasks.

Every task freezes a prompt snapshot before its first provider reservation.
The snapshot records the release, compiler version, complete variable snapshot,
compiled prompt, and checksum. Every provider attempt and immutable output
asset records the run, task, parent/input asset IDs, prompt release and snapshot,
identity fingerprint, provider/model, idempotency key, attempt, status, timing,
cost, checksum, and error classification. A retry reuses the task snapshot; a
new creative decision creates a new task/run rather than mutating history.

## Durable system boundaries

- Supabase is the system of record for identity, revisions, runs, tasks,
  immutable assets, prompt lineage, usage, commerce, audit, and outbox state.
- Trigger.dev owns durable dispatch, dependency release, queues, retries,
  idempotency, cancellation, and outbox reconciliation.
- Shopify owns Draft Orders, hosted checkout, payment, and order webhooks.
  Jewelo uses deterministic reconciliation and atomically records signed,
  idempotent webhook outcomes in Supabase.
- DigitalOcean App Platform hosts only the Next.js web unit. Long-running model
  work stays in Trigger.dev jobs.

Provider calls are server-side adapter concerns. Domain contracts contain no
provider SDK types, browser routes do not poll providers, and service-role or
provider credentials are never exposed through `NEXT_PUBLIC_*` configuration.

## Seed gate

This contract freezes the target; it does not claim every item is implemented
at the integration seed. Feature work may fill missing profiles, adapters, task
dependencies, and acceptance evidence, but it must not change this graph
without an explicit product decision. Mock mode remains a first-class,
zero-cost path and must exercise the same task, lineage, security, and UI-state
contracts without paid provider calls.
