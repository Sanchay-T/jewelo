# Claude Code entry prompt

Run `./scripts/start-phase.sh 00`, then paste this inside the Claude Code session opened in the Phase 00 worktree:

```text
You are taking over Jewelo v2 as a staff-level product engineer and systems architect.

First, read CLAUDE.md and every file it imports. Then read README.md, docs/CLAUDE-CODE-SETUP.md, docs/PHASE-ROADMAP.md, and docs/goals/00-research-architecture.md.

Do not implement the full product. Work only on Phase 00.

Before editing:
1. run ./scripts/doctor.sh and ./scripts/verify-foundation.sh;
2. inspect the current branch, diff, and open PR state;
3. produce a concrete research/decision plan with sources, deliverables, verification, and stopping condition;
4. ask the plan-reviewer subagent to challenge the plan and revise it.

Then execute /phase-00. Use current primary sources, date every external fact, create the required ADRs and decision artifacts, run deterministic verification, ask the adversarial-reviewer to try to falsify the conclusions, and prepare a draft PR into rebuild/v2-first-principles.

Do not activate paid APIs, create billable infrastructure, merge, or begin Phase 01. Stop with a proof packet, PR URL, unresolved decisions, and the exact recommendation for the next human approval.
```
