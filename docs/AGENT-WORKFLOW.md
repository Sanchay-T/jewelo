# Agent workflow

The goal is high autonomy without invisible risk. Agents should perform reversible engineering work independently and stop only at credential, billing, legal, product-approval, merge, or production boundaries.

## Standard loop

```text
1. Orient
   ├─ read CLAUDE.md and active goal
   ├─ run doctor / baseline verification
   └─ inspect current branch and open PRs
2. Plan
   ├─ produce a file-level implementation plan
   ├─ list assumptions, risks, tests, rollback
   └─ ask fresh plan-reviewer to challenge it
3. Implement
   ├─ smallest coherent vertical slice
   ├─ independent tasks may use subagents/worktrees
   └─ update docs/ADR alongside behavior
4. Verify
   ├─ deterministic scripts and tests
   ├─ browser/API/database/failure evidence
   ├─ UX/security reviewers when applicable
   └─ fresh adversarial review of the final diff
5. Package
   ├─ proof packet
   ├─ commit and push phase branch
   └─ draft PR into rebuild/v2-first-principles
6. Stop
   └─ do not merge or begin the next phase
```

## Worktrees and parallelism

Use `./scripts/new-phase.sh <phase>` to create an isolated worktree. Parallelize only tasks with independent files and acceptance checks. Never have multiple agents modify the same migration, shared contract, lockfile, or critical orchestration path concurrently.

## Slash skills and goal loop

- `/phase-00` through `/phase-08` load a phase specification.
- `./scripts/run-goal.sh 00` wraps the phase in Claude Code's built-in `/goal` evaluator loop.
- `/adversarial-review` reviews evidence and searches for counterexamples.
- `/ship-pr` prepares a draft PR proof packet; it never merges.

## Human checkpoints

A human is required for:

- final architecture/stack ADR approval;
- account creation, billing, credentials, domain/DNS, and legal terms;
- activating paid model calls or production infrastructure;
- accepting privacy/retention/manufacturing claims;
- merging into the integration branch or `main`;
- irreversible data migrations and production release.

Everything else should be encoded as repository scripts, repeatable tests, and reviewable PRs.
