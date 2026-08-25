# Verification doctrine

Verification is part of implementation, not a final checkbox. “The code looks correct” is not evidence.

## Evidence ladder

1. **Repository:** clean status, expected branch/base, no secrets, scoped diff.
2. **Static:** format, lint, typecheck, dependency and generated-file checks.
3. **Unit:** domain rules, prompt builders, state transitions, pricing, identity normalization.
4. **Integration:** database migrations, transactions/outbox, storage, workflow adapters, auth boundaries.
5. **Contract:** provider fixtures, webhook/poll recovery, idempotency and rate-limit behavior.
6. **Browser/API:** real flows, console/network errors, keyboard/touch, responsive screenshots, accessibility.
7. **Failure:** timeout, partial success, retry exhaustion, duplicate delivery, cancellation, provider outage, reconnect.
8. **Operational:** logs/traces/metrics, cost attribution, alerts, backup/restore, rollback and deployment smoke.
9. **Fresh review:** a separate context searches for incorrect assumptions and attempts to falsify “done.”

## Required phase proof packet

```text
Baseline
- commands and initial result

Acceptance criteria
- criterion → evidence mapping

Verification
- exact command
- exit status
- important output or artifact

Manual/product evidence
- route/scenario/device
- screenshots or recordings
- console/network/accessibility result

Failure evidence
- injected fault
- expected behavior
- observed behavior

Review
- reviewer findings
- fixes or documented risk

Remaining risk
- owner and next phase
```

## Rules

- Never weaken or delete a failing test merely to pass a gate.
- Do not mock the behavior being claimed in an end-to-end test.
- Record known flaky checks separately and fix or quarantine with an owner/date.
- Use official `/verify` after the project has a recorded launch recipe.
- CI must reproduce the same root commands used locally.
- Phase completion requires all acceptance checks or an explicit, approved exception.
