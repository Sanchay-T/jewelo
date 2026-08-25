---
name: ship-pr
description: Prepare and open a draft phase PR with a complete verification packet; never merge it.
argument-hint: "[phase number]"
disable-model-invocation: true
---

1. Confirm the active branch is `phase/*` and the base is `rebuild/v2-first-principles`.
2. Confirm the tree is scoped, secrets are absent, required checks pass, and fresh reviews are complete.
3. Summarize product behavior, architecture decisions, excluded scope, migrations, provider/cost impact, security impact, verification commands, screenshots/artifacts, review findings, rollback, and remaining risk.
4. Commit with a descriptive message, push the phase branch, and run `./scripts/open-pr.sh` or equivalent `gh pr create --draft`.
5. Report the PR URL and failing/pending checks. Never merge, enable auto-merge, change branch protection, or begin another phase.
