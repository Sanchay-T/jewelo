# Universal goal prompt

Paste the block below into a fresh Claude Code or Codex session at the root of the `jewelo` checkout.

It is deliberately short.
It carries no product detail of its own.
Everything it needs to know lives in `docs/ROAD-TO-GOLD.md` and the contracts `CLAUDE.md` imports, so the prompt never goes stale when the plan moves.

Fill the two bracketed lines before pasting.
Leave everything else alone.

```text
You are the implementation lead for Jewelo / CALEUMS.

Read these before touching anything, in this order:

1. CLAUDE.md and every document it imports
2. docs/ROAD-TO-GOLD.md
3. docs/goals/overnight-launch/PROGRESS.md, IMAGE-LAB.md and reviews/adversarial-review-1.md

docs/ROAD-TO-GOLD.md is the mission. It names the promise, the chain of custody,
the seven phases, the gate that ends each phase, and the loop that closes them.
Execute it in order. Do not reorder phases, do not skip a gate, and do not start a
phase whose predecessor is still open.

YOUR SCOPE THIS RUN: [phase number(s) from ROAD-TO-GOLD, or "phases 1 through N"]
YOUR WALL CLOCK: [when you must stop and hand off]

The stack is locked by CLAUDE.md. You are executing it, not researching
replacements. The one clarification ROAD-TO-GOLD adds: Runway MCP serving
gpt-image-2 is the free bench for all prompt and image work, and OpenAI stays the
production still provider, wired fail-closed and flipped only at the phase 5 gate.
Iterating against the paid OpenAI endpoint is a mistake, not a shortcut.

Before any material edit: state the objective in one sentence, the verifiable
stopping condition, what you are deliberately excluding, and the evidence you will
produce. Inspect the repository, write a concrete file-level plan, and have
plan-reviewer challenge it. Revise before implementing.

Work in checkpoints. Commit each coherent completed slice; never commit broken
state to satisfy a clock. Push the working branch. Do not push to main and do not
merge.

CLOSE EVERY PHASE WITH THIS LOOP, NOT WITH AN ASSERTION THAT IT IS DONE:

  implement
    -> pnpm typecheck, pnpm lint, pnpm test  (all three, on the real tree)
    -> agent-browser dogfood of the real journey at every gated viewport
    -> /code-review on the diff
    -> a fresh adversarial-reviewer with no prior context
    -> fix every finding
    -> repeat from the top

  until two consecutive passes produce no new finding above "minor".

Loop rules, which are not negotiable:
- The dogfood pass drives the actual deployed URL and captures a screenshot after
  every step. A description of the UI is not evidence of the UI.
- The agent that fixes never reviews its own work, and a reviewer never fixes.
- A finding is closed by evidence, not by a claim that it was addressed.
- Gated viewports: 1440x900, 1280x720, 1024x768, 768x1024, 390x844, 390x600,
  320x568, plus RTL and reduced motion.
- Assert geometry where geometry is the defect. Screenshots do not fail a build.

Use subagents for anything that fans out: implementer, image-lab, viewer,
browser-qa, reviewer, platform. Generation and scoring are always different
agents. Report which model each agent ran as.

Ask the human only for: a named credential, an account or billing authorization, a
spend ceiling, an irreversible production action, or a genuinely ambiguous product
decision. docs/ROAD-TO-GOLD.md lists the product decisions that are already known
to be open; if your scope reaches one and it is still unanswered, do everything
that does not depend on it, then ask once, precisely.

Never: weaken a test or restate a gate to make it pass, present mock output as a
customer's piece, commit secrets or customer media, spend on a provider outside an
authorized ceiling, or declare a phase closed with a gate unrun.

Stop when your scope is objectively complete, or when a named external action is
the only remaining blocker, or at your wall clock. On stopping, write the proof
packet required by docs/VERIFICATION.md: what you completed, the exact commands and
their results, the evidence paths, the failures you injected, every finding still
open with an owner, and the exact next phase without starting it.
```

## Why it is shaped this way

The prompt does four things and nothing else.

**It points rather than repeats.**
Product detail lives in one file that the team edits.
A prompt that restated the plan would be wrong the first time the plan changed, and an agent given two versions of the truth will pick the wrong one.

**It fixes the order.**
The phases in `docs/ROAD-TO-GOLD.md` are dependency ordered, not preference ordered.
Prompts tuned before the stencil is fixed are tuned against a broken stencil.
A verifier written after the prompts is a verifier written to agree with them.

**It makes closure external.**
Left alone, an agent closes a task when it believes it is done.
The loop replaces belief with a second party: browser evidence, a diff review, and an adversarial pass with no memory of the work.
"Two consecutive clean passes" is what stops the loop, not the agent's own judgement.

**It names the escalation boundary.**
Credentials, money, irreversible actions and genuine product ambiguity go to the human.
Everything else the agent does itself.
Without that line an agent either stalls waiting for permission or spends money it should have asked about.

## Invoking a numbered goal instead

The repository skill still exists for the original Goal 00 to 08 ladder:

```text
/goal 04
```

That path reads `docs/goals/<n>-*.md`.
Use the prompt above for road-to-gold work, and `/goal` only when you are deliberately executing one of the numbered foundation goals.
