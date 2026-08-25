# Agent operating rules

This file applies to Claude Code, Codex, and other coding agents.

- Read `CLAUDE.md` and the active phase goal before changing files.
- Treat `docs/PRODUCT-CONTRACT.md` as product truth and `docs/DECISION-REGISTER.md` as decision status.
- Use a phase branch and isolated worktree. Never mix two phases in one diff.
- Plan first; have a separate context review the plan; then implement.
- Verify from the outside in: static checks, unit tests, integration tests, browser/API behavior, failure cases, then adversarial review.
- Prefer scripts checked into the repository over undocumented manual steps.
- Add repeatable commands to root scripts so the next agent can reproduce the result.
- Do not hide failures, weaken tests, remove checks, replace production behavior with hard-coded fixtures, or mark incomplete work done.
- Do not use `--dangerously-skip-permissions` or equivalent permission bypasses.
- Request human intervention only for credentials, billing, legal/business approvals, irreversible production actions, or genuinely ambiguous product decisions.
