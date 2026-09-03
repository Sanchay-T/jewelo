# Media concurrency and fast-result contract

**Decision date:** 26 August 2026  
**Status:** locked for implementation

> **Superseded in part on 3 September 2026 (D-017).** Video/motion generation
> was removed; Jewelo generates still images only. Every fal.ai, Seedance and
> motion statement below is retained as historical rationale and is no longer
> in effect. See `docs/DECISION-REGISTER.md`.

The final Caleums asset graph is defined by
`docs/CALEUMS-FINAL-E2E-CONTRACT.md`. Preserve the durable concurrency,
idempotency, quota, and truthful-progress rules below, but do not infer an older
four-variation media topology where the final contract differs.

## What owns what

- **Trigger.dev** is the durable workflow and concurrency layer.
- **OpenAI** is the primary still-image provider through the direct API.
- **Supabase** is the durable source of truth for runs, tasks, assets, usage, and customer-visible progress.

OpenAI is not the Jewelo workflow engine. Its API executes model inference; Trigger.dev owns business orchestration, retries, dependencies, fairness, cancellation, and recovery.

## Pipeline

```text
accept immutable revision
        |
        v
create run + four variation records + outbox
        |
        v
Trigger parent batch-dispatches variations 1..4
        |
        +-- variation 1: product -> QA -> worn
        +-- variation 2: product -> QA -> worn
        +-- variation 3: product -> QA -> worn
        +-- variation 4: product -> QA -> worn
```

There is no artificial barrier that waits for all four products before starting downstream work. The first verified product appears immediately; its worn image starts while other variations are still processing.

## Trigger.dev queues

```text
openai-image        concurrency 4 initially
visual-verifier     independently bounded
per-organization    concurrency key, default 4 active variation pipelines
```

Actual provider limits are configuration, not domain constants. Trigger tasks use idempotency keys shaped as:

```text
run:{runId}:variation:{index}:{kind}:release:{releaseId}
```

Use Trigger batch fan-out APIs rather than `Promise.all()` around waitable child tasks. Every child persists milestones independently so partial success is visible and recoverable.

## Provider quota gates

### OpenAI

Four product requests may start together. Worn calls unlock progressively. OpenAI publishes GPT Image 2 tier limits from 5 IPM at Tier 1 to 20 IPM at Tier 2 and higher thereafter. Before real traffic, the project must demonstrate enough effective capacity for the selected pipeline; otherwise Trigger queues excess work without lying to the UI.

## Locked model profiles

```text
still.production       gpt-image-2-2026-04-21 (direct OpenAI)
```

## Cost and safety

Every default sibling still is reserved transactionally against the run and the
principal's daily ceiling before any provider call.

Provider output URLs are temporary transport only, so jobs immediately download verified outputs into private Supabase Storage and persist checksums and lineage.

## UX delivery contract

The browser subscribes to Supabase state, never directly polls providers. Required visible states:

```text
queued -> generating -> verifying -> ready
                     -> retrying
                     -> failed
                     -> cancelled
```

- reveal each product as soon as it is ready;
- animate the filmstrip slot from skeleton to asset without reflow;
- never show fake percentage progress;
- keep successful siblings usable;
- preserve state across reload/leave/resume;
- worn assets fill progressively beneath the same variation identity.

## UI libraries

- Motion for layout transitions, presence, reduced-motion-aware reveals, and progress-state animation;
- Embla Carousel for the responsive direction filmstrip;
- `react-zoom-pan-pinch` for keyboard/pointer/touch inspection;
- `react-dropzone` for reference selection, with upload performed through signed Supabase paths.

## Open-source framework decision

Genblaze was the strongest open-source media-pipeline candidate reviewed. It offers provider-agnostic Python pipelines and provenance, but it would add a Python runtime and duplicate Trigger.dev's workflow responsibilities. Jewelo borrows its provenance-manifest ideas, not its execution runtime.

Other media-agent/editor projects reviewed were not appropriate as the authoritative production workflow for customer orders.

## Primary references

Accessed 26 August 2026:

- OpenAI GPT Image 2: https://developers.openai.com/api/docs/models/gpt-image-2
- Trigger queues: https://trigger.dev/docs/queue-concurrency
- Trigger task fan-out: https://trigger.dev/docs/triggering
- Trigger idempotency: https://trigger.dev/docs/idempotency
- Genblaze: https://github.com/backblaze-labs/genblaze
