# Claude Code setup and autonomy

## One-time workstation setup

Required:

- Git and GitHub CLI (`gh`) authenticated to the repository;
- Node.js 22 LTS and Corepack;
- pnpm 11;
- Docker for local PostgreSQL/object storage once Phase 1 lands;
- Claude Code 2.1.139 or newer.

Check:

```bash
./scripts/doctor.sh --strict
```

## Clone the integration branch

```bash
git clone --branch rebuild/v2-first-principles --single-branch \
  https://github.com/Sanchay-T/jewelo.git jewelo-v2
cd jewelo-v2
```

## Run a phase interactively

From the integration checkout:

```bash
./scripts/start-phase.sh 00
```

This creates or reuses an isolated `phase/00-research-architecture` worktree and launches Claude Code inside it. Then invoke:

```text
/phase-00
```

The skill must plan, use fresh reviewers, verify, and stop at a draft PR. It must not merge or start another phase.

## Run a measured goal loop

```bash
./scripts/run-goal.sh 00
```

This invokes Claude Code non-interactively with the built-in `/goal` loop and stream-json output. The phase file remains the thick specification; the command is intentionally thin.

Do not use `--dangerously-skip-permissions`. If Claude Code auto mode is available and trusted, use it only inside the isolated phase worktree. Review the repository and command allowlist first.

## GitHub automation

Use `gh` for deterministic branch/PR/CI operations. With repository-admin access, run `/install-github-app` in Claude Code to install the official Claude Code GitHub Action. Keep its permissions minimal and require review before merge.

The current ChatGPT GitHub connection can push but does not have repository-admin permission, so app installation, repository secrets, environments, and branch protection are a one-time owner/admin step.

## MCP policy

- Project MCP configuration may contain only non-secret shared endpoints.
- The repository includes the Vercel MCP endpoint in `.mcp.json`; Claude Code will ask for trust/authentication.
- Slack, Sentry, analytics, cloud, and organization-specific MCP servers should be added locally after the corresponding service is selected and authorized.
- Prefer a vendor CLI for reproducible create/deploy/log commands; use MCP for context discovery and bounded actions.
- Never commit OAuth tokens, API keys, account IDs that are sensitive, or personal Slack exports.

## Recommended control plane

| Need | Preferred interface |
| --- | --- |
| Git branches, PRs, checks | `git` + `gh` |
| Local services | Docker Compose |
| JS workspace | `pnpm` root scripts |
| DB schema/migrations | checked-in ORM/SQL CLI scripts |
| Durable jobs | workflow vendor CLI/SDK chosen in Phase 0 |
| Web deploy/logs | Vercel CLI + MCP |
| Error investigation | Sentry CLI/MCP after setup |
| Team context | Slack MCP after explicit workspace authorization |

## First-session paste prompt

Use `docs/ENTRY-PROMPT.md`. It tells the agent to orient and run only Phase 0, rather than attempting the entire rebuild.
