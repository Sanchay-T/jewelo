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
8. `docs/MEDIA-CONCURRENCY.md`
9. `docs/COST-MODEL.md`
10. `docs/VERIFICATION.md`
11. the resolved goal

## Stack lock

The architecture and media-provider strategy are locked. This skill executes them; it does not research replacements.

Do not substitute Convex, Neon, Clerk, Firebase, R2, Runway, another workflow engine, another still model, another video gateway, or an autonomous media-agent framework unless the user explicitly changes the decision.

Locked provider roles:

```text
Supabase      durable data, auth, realtime, private media
Trigger.dev   durable orchestration, queues, retries, concurrency, recovery
OpenAI        direct GPT Image 2 still generation and configured verification
fal.ai        Seedance inference and agent-facing model MCP
```

Locked media behavior:

```text
4 concurrent product pipelines
  each product persists/reveals independently
    each passed product unlocks worn + fast motion concurrently
4 Seedance Fast previews when fal concurrency >= 4
optional selected Seedance Standard final
```

If an actual incompatibility prevents the goal, prove it with executable evidence and stop with the smallest decision request. Do not silently redesign the system.

## Start

Before material edits, restate:

- the single objective;
- the verifiable stopping condition;
- excluded work;
- evidence required.

Inspect the repository and active branch, create a concrete file-level plan, and invoke `plan-reviewer`. Revise before implementing.

## Execution

Work autonomously in checkpoints. Prefer official CLI/API/MCP operations. Ask the human only for a named credential, OAuth/billing/quota authorization, irreversible production action, or genuinely ambiguous product decision.

Use managed remote development. Do not introduce Docker, local database, local object storage, local GPUs, self-hosting, or Kubernetes.

Provider SDKs remain behind typed ports. Provider concurrency and rate limits are validated configuration. fal temporary URLs are downloaded immediately into private Supabase Storage.

## Verification

- execute the strongest deterministic checks;
- exercise rendered UI, APIs, database/RLS, workflows, concurrency and provider calls when the goal makes them applicable;
- verify task timelines rather than claiming parallelism from code inspection;
- inject quota, 429, timeout, partial-sibling, duplicate, cancellation and reload cases;
- verify desktop/mobile/short-viewport/keyboard/touch/reduced-motion/RTL states for UI goals;
- do not weaken tests or completion criteria;
- invoke applicable UX/security reviewers and a fresh adversarial reviewer;
- produce the proof packet;
- commit, push, and open a draft PR to `rebuild/v2-first-principles`.

## Stop

Stop only when the goal is objectively complete or the named external action is the only blocker. Do not merge or begin the next goal.
