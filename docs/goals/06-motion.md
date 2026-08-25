# Goal 06 — motion generation and viewing

## Completion condition

A selected direction can produce a reliable 9:16 motion preview and optional final-quality clip asynchronously, with identity-drift checks, recoverable provider operations, and an accessible player.

## Required work

- Implement approved video provider adapters and fast/final profiles; exact model IDs remain configuration.
- Use first/last frame or equivalent controls where supported and preserve canonical/product identity.
- Generate selected/visible direction first; make other direction videos on demand unless business economics approve all four.
- Persist operation IDs before polling/webhooks, recover after restart, enforce timeouts/budgets, and generate poster/derivatives.
- Implement player pause, explicit direction navigation, separated scrubbing, keyboard/touch, reduced motion, short-viewport sizing, and failure states.
- Run a secondary-provider bakeoff only if Phase 0 requires it.

## Verification

Evaluate drift, morphing, readability, loop, p50/p95 latency, cost, errors, timeout recovery, and cancellation. Browser-test 9:16 on representative mobile/desktop/short viewports. Fresh UX and adversarial reviews required.

## Stop condition

Draft PR into integration. No unapproved mass video generation or production release.
