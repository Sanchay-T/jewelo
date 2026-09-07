---
name: handover
description: Refresh the CALEUMS handover document, mirror it into the pull request description, push, and print the pull request link. Run at the end of every session and before stopping for any reason.
disable-model-invocation: false
---

# Handover

The pull request is the deliverable.
Sanchay reads the link and nothing else, so the description must be complete and current on its own.

1. Make sure every change is committed on the current branch and `corepack pnpm build` passed on the tree you are handing over.
   If the build is red, say so in the Status table; never hide it.
2. Rewrite `docs/goals/road-to-gold/HANDOVER.md` section by section from the real state:
   - Status: live URL, deployed commit (`doctl apps list-deployments` on `home-mini` or the last `deploy.sh` output), branch head, provider mode, phase closed, next task id, session count.
   - What a shopper gets today: what you actually saw in your browser this session, not what the code intends.
   - Done this session: the tasks closed by id, one line each, with the commit sha.
   - Evidence: the dogfood directory for this session and any new lab or review files.
   - Decisions taken by default: every `DS-*` default you relied on, with the task id.
   - Needs Sanchay: only what an agent cannot do. Remove items that are resolved.
   - Open findings: every reviewer or dogfood finding still open, ranked, with an owner.
   - Rollback and Spend: exact commands, exact numbers.
3. Update `docs/goals/road-to-gold/PROGRESS.md` with this session's entry if it is not already current.
4. Commit with a message starting `Handover:` and push the branch.
5. Mirror the file into the pull request and print the link:

   ```bash
   export GH_TOKEN=$(gh auth token -u Sanchay-T)
   gh pr edit 12 --title "CALEUMS: road to gold" --body-file docs/goals/road-to-gold/HANDOVER.md
   gh pr view 12 --json url --jq .url
   ```

   The `GH_TOKEN` line matters: the active `gh` account on this machine is a different user and gets 403 on this repository.

   The pull request is number 12, base `main`, draft. Never mark it ready, never merge, never change branch protection.
6. Your final message to Sanchay is the link, the Status table, and the Needs Sanchay list. Nothing else.
