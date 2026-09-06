> UI reset — 5 September 2026: customer UI and prior screen/flow proposals were discarded by the user. Read `docs/START-HERE.md` and `docs/OMRAN-BUSINESS-CONTEXT.md` first. Customer-journey prescriptions below are superseded for brainstorming; retained backend contracts do not approve a new UI.

# Frozen product contract

## Core promise

A customer can approve exactly what jewelry should say and broadly how it should be made, receive coherent visual directions that preserve that identity, understand what is ready or still processing, select a direction, and advance it commercially without losing prior work.

## End-to-end journey

```text
START
  ├─ choose inspiration / upload reference / start fresh
  ▼
APPROVE DESIGN INPUT
  ├─ name or text
  ├─ language and typography
  ├─ jewelry type
  ├─ metal, karat, finish, stones
  ├─ dimensions, complexity, style
  └─ reference and notes
  ▼
CREATE IMMUTABLE DESIGN REVISION
  ▼
CREATE GENERATION RUN
  ├─ direction 1: product → worn
  ├─ direction 2: product → worn
  ├─ direction 3: product → worn
  └─ direction 4: product → worn
  ▼
INSPECT / COMPARE
  ├─ zoom and identity check
  ├─ partial success and per-unit retry
  ├─ create a fresh run
  └─ refine a selected direction as a new revision
  ▼
SELECT ONE DIRECTION
  ├─ generate selected/on-demand motion
  ▼
ESTIMATE → QUOTE → ORDER → FULFILLMENT
```

## Business objects

```text
Organization / customer
  └─ Design
       └─ Design revision (immutable approved specification)
            ├─ Canonical identity asset
            └─ Generation run
                 ├─ Generation tasks
                 └─ Direction 1..4
                      ├─ Product representation
                      ├─ Worn representation
                      └─ Optional motion representation
            ├─ Price estimate
            ├─ Quote request / quote
            └─ Order / fulfillment state
```

## Invariants

1. A design revision exists before generation and never silently changes underneath a run.
2. The approved spelling/geometry is the identity authority; models do not invent or correct it.
3. Product, worn, and motion representations of a direction describe the same physical concept.
4. Every generated asset has lineage: revision, run, direction, task, provider, model, prompt release, input assets, attempt, and verification result.
5. A new generation creates a new run. Earlier runs remain available unless a retention policy explicitly removes them.
6. A refinement that changes customer intent creates a new design revision.
7. Each task has granular state and may retry independently.
8. Estimates are not final quotes. Quotes and orders preserve the commercial assumptions and gold-price snapshot used.
9. Long work survives browser closure and can be resumed.
10. The business can audit who changed state, what was shown, and what was commercially accepted.
11. Video is selected-first/on-demand and does not block still-image results.

## Media contract

```text
Reference / inspiration        variable, normalized derivatives
Canonical identity             SVG + transparent PNG/mask
Product representation         1:1 primary inspection asset
Worn representation            4:5 preferred editorial asset
Motion representation          9:16 primary, 6s selected preview
Final comparison               large inspection canvas; no forced crop
Thumbnails                      generated derivatives, never the master
```
