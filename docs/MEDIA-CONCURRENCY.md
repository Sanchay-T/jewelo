# Media concurrency and fast-result contract

**Decision date:** 26 August 2026  
**Status:** locked for implementation

The final Caleums asset graph is defined by
`docs/CALEUMS-FINAL-E2E-CONTRACT.md`. Preserve the durable concurrency,
idempotency, quota, and truthful-progress rules below, but do not infer an older
four-variation media topology where the final contract differs.

## What owns what

- **Trigger.dev** is the durable workflow and concurrency layer.
- **OpenAI** is the primary still-image provider through the direct API.
- **fal.ai** is the managed inference gateway for Seedance video generation.
- **Supabase** is the durable source of truth for runs, tasks, assets, usage, and customer-visible progress.

fal.ai is not the Jewelo workflow engine. Its queue API and webhooks execute model jobs; Trigger.dev owns business orchestration, retries, dependencies, fairness, cancellation, and recovery.

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
        +-- variation 1: product -> QA -> [worn + fast motion] concurrently
        +-- variation 2: product -> QA -> [worn + fast motion] concurrently
        +-- variation 3: product -> QA -> [worn + fast motion] concurrently
        +-- variation 4: product -> QA -> [worn + fast motion] concurrently
```

There is no artificial barrier that waits for all four products before starting downstream work. The first verified product appears immediately; its worn image and motion preview start while other variations are still processing.

## Trigger.dev queues

```text
openai-image        concurrency 4 initially
visual-verifier     independently bounded
fal-seedance-fast   concurrency 4 launch target
fal-seedance-final  concurrency 1-2
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

### fal.ai

New fal accounts begin with two concurrent requests and increase with purchased credits. Four-video parallel preview mode remains disabled until the account has a verified concurrency limit of at least four. If the limit is lower, requests remain queued and the UI shows that real state.

## Locked model profiles

```text
still.production       gpt-image-2-2026-04-21 (direct OpenAI)
still.fallback         openai/gpt-image-2 on fal (disabled by default)
motion.preview         bytedance/seedance-2.0/fast/image-to-video
motion.final           bytedance/seedance-2.0/image-to-video
```

### Preview-all mode

For the observation/demo experience, each verified product direction receives a fast motion preview:

- 4 seconds;
- 9:16;
- 720p;
- audio disabled;
- generated from the approved product still;
- four jobs submitted as soon as their corresponding products pass QA.

The selected direction may receive a 6-second standard-quality final motion render, optionally based on its approved worn still.

## Cost and safety

Four 4-second Seedance Fast previews at the documented 720p rate are approximately $3.87 before retries. A 6-second standard final is approximately $1.81. Keep preview-all mode behind an explicit product profile and transactional spend reservation even though it is the intended showcase experience.

Provider output URLs are temporary transport only. fal URLs are public by default and retained for at least seven days by default, so jobs immediately download verified outputs into private Supabase Storage and persist checksums and lineage. Configure the strongest available fal ACL/lifecycle header as defense in depth, but do not rely on it as Jewelo storage.

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
- motion and worn assets fill progressively beneath the same variation identity.

## UI libraries

- Motion for layout transitions, presence, reduced-motion-aware reveals, and progress-state animation;
- Embla Carousel for the responsive direction filmstrip;
- `react-zoom-pan-pinch` for keyboard/pointer/touch inspection;
- `react-dropzone` for reference selection, with upload performed through signed Supabase paths;
- native `<video>` for short MP4 previews initially; add streaming infrastructure only when measured delivery requires it.

## Open-source framework decision

Genblaze was the strongest open-source media-pipeline candidate reviewed. It offers provider-agnostic Python pipelines and provenance, but it would add a Python runtime and duplicate Trigger.dev's workflow responsibilities. Jewelo borrows its provenance-manifest ideas, not its execution runtime.

Other media-agent/editor projects reviewed were not appropriate as the authoritative production workflow for customer orders.

## Primary references

Accessed 26 August 2026:

- OpenAI GPT Image 2: https://developers.openai.com/api/docs/models/gpt-image-2
- Trigger queues: https://trigger.dev/docs/queue-concurrency
- Trigger task fan-out: https://trigger.dev/docs/triggering
- Trigger idempotency: https://trigger.dev/docs/idempotency
- fal concurrency/retention: https://fal.ai/docs/documentation/model-apis/faq
- fal MCP: https://fal.ai/docs/documentation/setting-up/mcp
- Seedance 2.0: https://fal.ai/seedance-2.0
- Seedance image-to-video: https://fal.ai/models/bytedance/seedance-2.0/image-to-video
- Genblaze: https://github.com/backblaze-labs/genblaze
