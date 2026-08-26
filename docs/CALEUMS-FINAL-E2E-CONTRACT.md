# Caleums final E2E contract

**Status:** frozen integration source of truth

**Pipeline brief:** final v5, 27 August 2026

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

The versioned deterministic solver and immutable canonical pendant PNG own
approved spelling, Unicode/script normalization, glyph order, pendant geometry,
attachments, dimensions, and identity fingerprint. The PNG must exist, pass
the deterministic validation report, and be stored privately before any model
call. Models render and verify that identity; they never decide or silently
alter it.

Every still presentation is an independent, idempotent direct-OpenAI task:

```text
deterministic specification + identity anchor
  -> immutable canonical pendant PNG
       +-> packshot       1:1  (OpenAI GPT Image 2)
       +-> worn           4:5  (OpenAI GPT Image 2)
       +-> macroGift      1:1  (OpenAI GPT Image 2)
       +-> darkEditorial  9:16 (OpenAI GPT Image 2)
       +-> studioHero     9:16 (OpenAI GPT Image 2)
       +-> billboard      16:9 (OpenAI GPT Image 2)
       `-> optional video from a verified still (fal Seedance)
```

There are no chained image edits. No generated still is the geometry authority
or a required input for another still. Each view receives the same immutable
pendant silhouette, its own immutable versioned shot-specific style anchor,
the customer configuration through a versioned prompt, and the aspect ratio as
an API parameter rather than prompt prose. Enabled views may run concurrently,
appear progressively, and fail independently.

All still generation calls OpenAI GPT Image 2 directly from a trusted server or
job runtime using `OPENAI_API_KEY`. fal is forbidden for stills. Verification
gates exact identity and spelling before a still can reach `ready` or be used
as a video input.

fal handles optional video only, using the existing server-side `FAL_KEY`
convention and a verified still as input. Seedance submissions use
`generate_audio:false`; video failure cannot block image inspection, quoting,
or ordering, and video cannot replace or redefine the canonical identity.

The live certified Arabic styles from the final-v5 brief are `classic` with
Amiri and `minimal` with Scheherazade New. Fonts or Arabic/two-name combinations
that are missing, held, excluded, or not regression-certified must route to
explicit operator review rather than being described as production-verified.
Existing certified Latin handling remains in force.

## Prompt, anchor, verification, and lineage contract

The versioned registries cover image prompts, video prompts, verification
prompts, and style-anchor releases. The six supported image shot identifiers
and aspect mappings are `packshot` (1:1), `worn` (4:5), `macroGift` (1:1),
`darkEditorial` (9:16), `studioHero` (9:16), and `billboard` (16:9). A release
may enable only the subset required by the current UI, but it cannot silently
rename a shot or change its aspect contract.

Prompt and anchor releases are immutable, have one atomically published
release, retain append-only publication history, and support authenticated
admin draft, validation, publish, rollback, and history operations.
Publication changes affect only newly created tasks. Approved style anchors
must be rehosted in durable private storage and pinned by release. Generated
outputs are never promoted automatically into style anchors, and placeholder
`<REHOST:...>` values are not deployable assets.

Every task freezes its complete snapshot before its first provider reservation:
design revision, approved spelling, canonical identity asset and fingerprint,
solver release and validation report, pipeline strategy/release, prompt release
and compiled checksum, style-anchor release, shot and API aspect ratio,
provider/model, and idempotency key. Every attempt and immutable output records
attempt number, input asset IDs, verification result, status and error class,
timing, cost, output checksum, and storage lineage. A retry reuses the task
snapshot; a new creative decision creates a new task/run rather than mutating
history.

Verification fails closed on spelling/script, silhouette identity, metal,
stone treatment, connected jump rings and chain attachment, duplicate or added
elements, and shot composition. A task may make at most two automatic attempts;
continued failure routes to operator review. Cancellation, audit, cost, and
successful sibling state remain durable throughout.

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
