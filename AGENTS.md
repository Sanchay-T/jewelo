> UI reset — 5 September 2026: customer UI and prior screen/flow proposals were discarded by the user. Read `docs/START-HERE.md` and `docs/OMRAN-BUSINESS-CONTEXT.md` first. Customer-journey prescriptions below are superseded for brainstorming; retained backend contracts do not approve a new UI.

# Agent operating rules

These rules apply to Claude Code, Codex, and other coding agents.

- Read `CLAUDE.md`, `docs/FINAL-STACK.md`, `docs/ARCHITECTURE.md`, `docs/OMRAN-BUSINESS-CONTEXT.md` (business feedback), and the active goal before changing files.
- The stack is locked. Do not turn implementation work back into vendor research.
- Use one goal, one branch, one measurable stopping condition, and one proof packet.
- Prefer project scripts and official CLI/MCP surfaces over undocumented dashboard clicking.
- Normal development is remote and managed. Do not add Docker, a local Postgres requirement, MinIO, Kubernetes, or self-hosting.
- Supabase migrations/RLS are authoritative; provider SDKs stay behind adapters.
- Never expose service-role or model-provider credentials to client code.
- Treat generated media as immutable, versioned assets with lineage and cost metadata.
- Treat name spelling and pendant geometry as deterministic identity, not model creativity.
- Verify outside-in: static checks, tests, browser/API behavior, failure injection, fresh review.
- Do not hide failures, delete checks, weaken assertions, or replace real completion with hard-coded demos.
- Ask the human only for credentials, billing/legal approval, irreversible production actions, or an actual ambiguous product decision.
- Never merge your own PR or start the next goal automatically.
