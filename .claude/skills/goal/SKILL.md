---
name: goal
description: Execute one Jewelo implementation goal from docs/goals as a durable, verifiable outcome.
argument-hint: "00|01|02|03|04|05|06|07|08 or docs/goals/<file>.md"
disable-model-invocation: true
---

# Jewelo goal mode

Treat this skill as a persistent outcome contract, not a checklist runner.

## Resolve

`$ARGUMENTS` must resolve to exactly one file in `docs/goals/`.

- `00` resolves to `docs/goals/00-*.md`, likewise through `08`.
- A direct `docs/goals/*.md` path is valid.
- Ambiguity is a blocker.

Read, in order:

1. `CLAUDE.md`
2. `docs/START-HERE.md`
3. `docs/PRODUCT-CONTRACT.md`
4. `docs/FROZEN-UX.md`
5. `docs/UX-AUDIT.md`
6. `docs/FINAL-STACK.md`
7. `docs/ARCHITECTURE.md`
8. `docs/VERIFICATION.md`
9. the resolved goal

## Stack lock

The architecture is locked. This skill executes it; it does not research replacements.

Do not substitute Convex, Neon, Clerk, Firebase, R2, a different workflow engine, or another model/provider unless the user explicitly changes the decision. A current package patch/version may be selected within the locked major and recorded in the lockfile.

If an actual incompatibility prevents the goal, prove it with executable evidence and stop with the smallest decision request. Do not silently redesign the system.

## Start

Before material edits, restate:

- the single objective;
- the verifiable stopping condition;
- excluded work;
- evidence required.

Inspect the repository and active branch, create a concrete file-level plan, and invoke `plan-reviewer`. Revise before implementing.

## Execution

Work autonomously in checkpoints. Prefer official CLI/API/MCP operations. Ask the human only for a named credential, OAuth/billing authorization, irreversible production action, or genuinely ambiguous product decision.

Use managed remote development. Do not introduce Docker/local database/local object storage/Kubernetes.

## Verification

- execute the strongest deterministic checks;
- exercise rendered UI, APIs, database/RLS, workflows, and provider calls when the goal makes them applicable;
- inject the required failures;
- do not weaken tests or completion criteria;
- invoke applicable UX/security reviewers and a fresh adversarial reviewer;
- produce the proof packet;
- commit, push, and open a draft PR to `rebuild/v2-first-principles`.

## Stop

Stop only when the goal is objectively complete or the named external action is the only blocker. Do not merge or begin the next goal.
