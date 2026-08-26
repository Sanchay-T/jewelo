# Goal 07 — estimates, quotes, orders, and operator workflow

## Objective

Turn a selected immutable design into auditable commercial objects and a usable business-operator workflow.

## Completion condition

Customers can receive an honest estimate, request a quote or place the supported order intent, and staff can review/advance it without mutating the underlying design or price snapshot.

## Required work

- Deterministic price estimate service with gold-price provider adapter and confidence/range.
- Immutable price snapshots and selected asset/revision references.
- Quote request, quote, acceptance/decline, order, and status history.
- Customer identity upgrade requirement at the appropriate commercial step.
- Operator queue, detail, notes, assignment, and audited status transitions.
- Notification adapters for email/WhatsApp-ready events without hard-coding a provider.
- Idempotency and authorization for every commercial command.
- Save/share/export policy and published-gallery consent.

## Constraints

No unsupported payment/manufacturing claim. Payment capture is separate unless explicitly approved.

## Verification

Price snapshot immutability; RLS/role matrix; duplicate commands; gold-price outage; quote/order state machine; audit trail; notification contract; UX/security/adversarial review.

## Stop condition

Draft PR. Do not launch production.
