# Start here

Jewelo lets a customer configure a personalized piece, receive four coherent design directions, inspect each direction as product, worn, and motion media, and turn the chosen direction into a quote or order.

## Product truth

Read in order:

1. `docs/CALEUMS-FINAL-E2E-CONTRACT.md`
2. `docs/PRODUCT-CONTRACT.md`
3. `docs/FROZEN-UX.md`
4. `docs/UX-AUDIT.md`
5. `docs/FINAL-STACK.md`
6. `docs/ARCHITECTURE.md`
7. `docs/MEDIA-CONCURRENCY.md`
8. the active file in `docs/goals/`

The old implementation is not a source of architectural truth.

## First implementation action

The stack and provider strategy are decided. Do not run an architecture-research goal.

- Claude Code: `/goal 00`
- Codex: paste `docs/GOLD-PROMPT.md`

Goal 00 creates the production repository foundation and managed-cloud/provider seams. It does not build the customer product yet or make paid media calls.

## Core invariants

- A design is the customer's intent.
- A revision is a frozen configuration snapshot.
- A generation run is one attempt to realize a revision.
- A variation is one coherent jewelry direction.
- Product, worn, and motion assets are representations of that same variation.
- A new refinement/regeneration never destroys an earlier successful run.
- Partial success remains usable.
- Quotes and orders preserve the exact design, price inputs, and asset snapshot used.
- The exact customer name and canonical pendant geometry remain stable across every representation.

## Fast-result invariant

```text
four product tasks start concurrently
  each ready product is revealed immediately
    each variation then starts:
      worn still + fast Seedance motion concurrently
```

There is no global batch barrier. Provider capacity may queue work, but the UI reports the real state.

The showcase product profile generates four fast Seedance previews. The selected direction may receive a standard-quality final motion upgrade.

## Provider roles

```text
Supabase      durable customer/business truth and private media
Trigger.dev   orchestration, fan-out, queues, retries, cancellation, recovery
OpenAI        GPT Image 2 product/worn inference and configured visual QA
fal.ai        Seedance model inference and agent-facing model MCP
```

fal.ai is not Jewelo’s workflow engine. No autonomous media-agent framework controls customer generation.

## Managed-service policy

Development uses local Next.js plus gated DigitalOcean staging, Supabase branches/persistent dev projects, Trigger.dev environments/preview branches, and development OpenAI/fal credentials. There is no required Docker or local infrastructure stack.

Real preview-all launch requires:

- validated OpenAI quota for four-way image fan-out;
- validated fal account concurrency of at least four;
- approved development/production spend ceilings.
