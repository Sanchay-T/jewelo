# Goal 07 — estimates, quotes, orders, and operator workflow

## Completion condition

A selected direction can move through a server-authoritative estimate, quote request/review, accepted quote, and immutable order snapshot with auditable operator state changes.

## Required work

- Implement estimate ranges with assumptions, modeled weight, confidence, gold-price timestamp/source, labor/stone rules, and expiry.
- Separate estimate, quote request, quote, accepted terms, order, payment, and fulfillment states.
- Build customer and operator workflows, role checks, notifications/adapters, audit log, and retryable external integration seams.
- Preserve the selected revision/direction/assets and commercial inputs in quote/order snapshots.
- Add CRM/payment/manufacturing adapters only when approved; mocks must remain available.

## Verification

Test authorization, concurrent updates, expired rates, quote revision/acceptance, duplicate submits/webhooks, cancellation/refund seams, audit completeness, and accessibility. Business owner reviews terms and status model.

## Stop condition

Draft PR into integration. Do not activate real payments or production customer communication without approval.
