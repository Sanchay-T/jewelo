# Agent workflow

The product manager has already chosen the architecture. Agents implement one durable goal at a time and verify it from the outside.

```text
Orient
  read locked stack + active goal
Plan
  file-level plan + assumptions + rollback
Review plan
  fresh plan-reviewer
Implement
  smallest coherent vertical slices
Verify
  static -> unit -> integration -> browser/API/provider -> failure
Review result
  UX/security as applicable + fresh adversarial reviewer
Package
  proof packet -> commit -> push -> draft PR
Stop
  no merge, no next goal
```

## Branch/worktree

Use `./scripts/new-goal.sh <00-08>` when practical. Goal branches target `rebuild/v2-first-principles`.

Parallel subagents may work only on independent files/acceptance checks. Do not parallel-edit migrations, lockfiles, shared contracts, or core orchestration.

## Managed control plane

- GitHub: `git` and `gh`.
- DigitalOcean: `doctl` plus official App Platform/Registry MCP.
- Supabase: remote MCP/CLI, project/preview branches.
- Trigger.dev: CLI/MCP, dev/staging/preview/production environments.
- OpenAI/Runway: SDKs and bounded development keys.
- Sentry/PostHog: supported APIs/MCP/CLI when connected.

Do not add a local Docker infrastructure path as a fallback.

## Human checkpoints

The human authorizes accounts, credentials, billing/legal terms, irreversible production actions, merge, and launch. Once authorized, routine engineering and diagnostics remain agent-operated.
