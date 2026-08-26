---
name: ship-pr
description: Prepare and open a draft Jewelo goal PR with a complete verification packet; never merge it.
argument-hint: "[goal number]"
disable-model-invocation: true
---

1. Confirm the active branch is `goal/*` and the base is `rebuild/v2-first-principles`.
2. Confirm the diff is scoped to one goal, the locked stack is preserved, secrets are absent, required checks pass, and fresh reviews are complete.
3. Summarize behavior, deliberately excluded scope, data/migrations, provider/cost, security, verification commands, screenshots/artifacts, failure evidence, review findings, rollback, and remaining risk.
4. Commit with a descriptive message, push the goal branch, and run `./scripts/open-pr.sh` or equivalent `gh pr create --draft`.
5. Report the PR URL and failing/pending checks. Never merge, enable auto-merge, change branch protection, or begin another goal.
