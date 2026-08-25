# Jewelo v2 — first-principles rebuild

This branch is the clean-room integration branch for Jewelo v2. It intentionally contains the product contract, architecture decision process, agent operating system, visual references, and phase goals before production implementation begins.

**Current status:** Phase 0 foundation only. There is no claim that the production application, database, AI providers, or deployment are complete.

## Start in Claude Code

```bash
git clone --branch rebuild/v2-first-principles --single-branch https://github.com/Sanchay-T/jewelo.git jewelo-v2
cd jewelo-v2
./scripts/doctor.sh
./scripts/verify-foundation.sh
./scripts/start-phase.sh 00
```

Inside the Claude Code session launched in the isolated Phase 00 worktree:

```text
/phase-00
```

For a non-interactive goal loop:

```bash
./scripts/run-goal.sh 00
```

Claude Code must be version `2.1.139` or newer for the built-in `/goal` workflow. Do not use permission bypass flags. Auto mode, when available, should be used only inside the phase worktree and after reviewing the repository instructions.

## Branch model

```text
main
  └── rebuild/v2-first-principles       long-lived v2 integration branch
        ├── phase/00-research-architecture
        ├── phase/01-repo-foundation
        ├── phase/02-ux-prototype
        ├── phase/03-domain-data-realtime
        ├── phase/04-workflows-mocks
        ├── phase/05-image-identity
        ├── phase/06-motion
        ├── phase/07-commerce
        └── phase/08-hardening-launch
```

Each phase is implemented in a separate branch/worktree and PRs into `rebuild/v2-first-principles`. The umbrella PR from the integration branch to `main` stays draft until launch gates pass.

## Repository map

- `CLAUDE.md` — always-loaded operating contract for coding agents.
- `AGENTS.md` — tool-agnostic agent rules.
- `docs/START-HERE.md` — product and workflow orientation.
- `docs/PRODUCT-CONTRACT.md` — frozen business journey and invariants.
- `docs/FROZEN-UX.md` — target interaction model, states, and aspect ratios.
- `docs/PROVISIONAL-STACK.md` — leading stack hypothesis, not yet a final decision.
- `docs/goals/` — measurable phase specifications.
- `.claude/skills/` — user-invoked slash skills for each phase.
- `.claude/agents/` — fresh-context reviewers.
- `scripts/` — doctor, worktree, goal, PR, and verification helpers.

Read `docs/CLAUDE-CODE-SETUP.md` before delegating a phase.
