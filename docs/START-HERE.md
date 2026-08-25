# Start here

Jewelo lets a customer configure a personalized piece, receive four coherent design directions, inspect the same direction as a product image and a worn image, optionally view selected motion, and turn the chosen direction into a quote or order.

## Product truth

Read in order:

1. `docs/PRODUCT-CONTRACT.md`
2. `docs/FROZEN-UX.md`
3. `docs/UX-AUDIT.md`
4. `docs/FINAL-STACK.md`
5. `docs/ARCHITECTURE.md`
6. the active file in `docs/goals/`

The old implementation is not a source of architectural truth.

## First implementation action

The stack is decided. Do not run an architecture-research goal.

- Claude Code: `/goal 00`
- Codex: paste `docs/GOLD-PROMPT.md`

Goal 00 creates the production repository foundation and managed-cloud seams. It does not build the customer product yet.

## Core invariants

- A design is the customer's intent.
- A revision is a frozen configuration snapshot.
- A generation run is one attempt to realize a revision.
- A variation is one coherent jewelry direction.
- Product, worn, and motion assets are representations of that same variation.
- A new refinement/regeneration never destroys an earlier successful run.
- Partial success remains usable.
- Quotes and orders preserve the exact design, price inputs, and asset snapshot used.
- Video is selected-first/on-demand; it does not block still-image results.
- The exact customer name and canonical pendant geometry must remain stable across every representation.

## Managed-service policy

Development uses Vercel previews, Supabase branches/persistent dev projects, Trigger.dev environments/preview branches, and provider development keys. There is no required Docker or local infrastructure stack.
