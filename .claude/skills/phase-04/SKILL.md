---
name: phase-04
description: Implement only durable workflows with mock providers.
argument-hint: "[optional focus within the phase]"
disable-model-invocation: true
---

# Phase 04: workflows-mocks

1. Read `CLAUDE.md`, `docs/goals/04-workflows-mocks.md`, `docs/AGENT-WORKFLOW.md`, and `docs/VERIFICATION.md` completely.
2. Run `./scripts/doctor.sh`, `./scripts/verify-foundation.sh`, `git status --short --branch`, and inspect existing PRs/checks.
3. Confirm the work is on `phase/04-workflows-mocks` based on `rebuild/v2-first-principles`. Use `./scripts/new-phase.sh 04` from the integration checkout when a worktree does not exist.
4. Enter planning mode. Produce a file-level plan, assumptions, risks, verification matrix, rollback, and explicit out-of-scope list.
5. Invoke the `plan-reviewer` subagent. Revise the plan before editing.
6. Execute only this phase goal. Use primary current sources for external facts and date them.
7. Run every acceptance check and collect the proof packet described in `docs/VERIFICATION.md`.
8. Invoke applicable `ux-verifier`/`security-reviewer`, then `adversarial-reviewer` in a fresh context. Resolve findings or document approved risk.
9. Invoke `/ship-pr` to prepare a draft PR into `rebuild/v2-first-principles`.
10. Stop. Do not merge and do not begin Phase 05.
