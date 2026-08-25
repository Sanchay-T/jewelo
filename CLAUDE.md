# Jewelo v2 agent contract

You are working on a first-principles production rebuild. The old backend and its abstractions are not architectural constraints. Preserve the frozen customer outcome, not legacy implementation choices.

@docs/START-HERE.md
@docs/PRODUCT-CONTRACT.md
@docs/FROZEN-UX.md
@docs/AGENT-WORKFLOW.md
@docs/VERIFICATION.md
@docs/DECISION-REGISTER.md

## Non-negotiable working rules

1. Work on exactly one phase and one measurable goal at a time.
2. Do not push directly to `main`. Phase PRs target `rebuild/v2-first-principles`.
3. Before implementation, inspect the repository, write a concrete plan, and ask the `plan-reviewer` subagent to challenge it.
4. Prefer primary, current documentation for architecture, APIs, model availability, pricing, limits, security, and deployment claims. Date-stamp research.
5. Keep business/domain code provider-agnostic. Model IDs, deployment IDs, vendor SDKs, and credentials belong behind adapters and configuration.
6. Treat the approved pendant/name geometry as canonical identity. Generative models may render it; they are not the spelling or geometry authority.
7. Long-running generation must be durable, idempotent, retryable by unit, cancellable, observable, and capable of partial success.
8. Do not make paid AI calls, create billable cloud resources, rotate secrets, modify production, or merge PRs without explicit authorization.
9. Never commit secrets, personal data, provider responses containing sensitive data, or production exports.
10. Do not declare success from code inspection alone. Run deterministic checks, exercise the product, collect evidence, and use a fresh-context reviewer.
11. Maintain a small diff. Do not implement later phases “while here.” Record follow-ups instead.
12. Update the relevant ADR, goal evidence, and runbook whenever a decision or operational behavior changes.

## Required completion packet

Every phase PR must include:

- scope completed and scope deliberately excluded;
- architecture/UX decisions and alternatives considered;
- commands executed with pass/fail results;
- browser or API evidence appropriate to the phase;
- migration, security, cost, and rollback impact;
- fresh-context review findings and resolutions;
- remaining risks and the exact next phase.

When uncertain, stop expanding scope and return to the current `docs/goals/*.md` acceptance criteria.
