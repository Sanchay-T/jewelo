# Caleums final E2E integration review

**Review date:** 27 August 2026

**Branch:** `codex/caleums-final-e2e`

**Seed SHA:** `efde7fb070fa05348f93e6ecee573c59d9c5b774`

**Scope:** final branch consolidation, contract reconciliation, and local proof

This proof packet distinguishes integrated code from remote migration, paid
provider, Shopify checkout, and browser acceptance. It records the reviewed
branch sources and the final-v5 topology used by the combined branch.

## Branch and patch disposition

Earlier duplicate/superseded patches were not replayed. The two final scoped
worker commits were reviewed and integrated on top of the frozen seed.

| Source branch and tip                                                                                                  | Candidate             | Disposition                                                                                                                 | Evidence                                                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `codex/caleums-reference-ui` at `c6ac724635df6775f44a2e535e3deaa91a7f414e`                                             | `473bce8`             | Accepted through contained reference-UI commit `8607923`; `git cherry` marks the source patch equivalent                    | Current UI seed contains the reference implementation                                                                                                                                    |
| `codex/caleums-reference-ui` at `c6ac724635df6775f44a2e535e3deaa91a7f414e`                                             | `c6ac724`             | Rejected from this consolidation pass; defer to the final-UI coordinator                                                    | Correctly scoped visual polish, but the user reserved final UI for later integration                                                                                                     |
| `codex/caleums-production-backend` and `codex/shopify-integration-ready` at `68438a94dbf4b0aaa4e55ad21a3b052784486164` | `9edb774`             | Rejected as a duplicate cherry-pick; accepted behavior is contained in conflict-adapted `3c73527`                           | Single-commit range comparison differs only in `OperatorExperience.tsx`; `loginOperator` and remote behavior remain in the UI-adapted version                                            |
| `codex/shopify-integration-ready` at `68438a94dbf4b0aaa4e55ad21a3b052784486164`                                        | later Shopify commits | Accepted through contained equivalents `5ad0af5`, `76c2eb0`, `6d962c0`, and `c1f3136`                                       | `git cherry` marks the source patches equivalent                                                                                                                                         |
| `codex/caleums-prompt-registry` at `c5530f82a9e48231b48f04209f2d134845005a96`                                          | `c5530f8`             | Rejected as a duplicate cherry-pick; exactly patch-equivalent `4a9f995` is contained                                        | Stable patch ID for both is `eac46140da228f5b052fae21ebdab5558ee1dca7`                                                                                                                   |
| `codex/digitalocean-production-deployment` at `798b32dcba0594339f256c9ac445f7e8833ed697`                               | `994678f`, `798b32d`  | Rejected as duplicate cherry-picks; functionally superseded by conflict-adapted `9837866`, `bebef00`, and later corrections | Range-diff maps both commits; current HEAD retains both workflows, the spec contract, environment allowlist/checker, bootstrap/deploy/smoke/rollback scripts, and the deployment runbook |
| `codex/caleums-final-ui`                                                                                               | `18e7d54`             | Reviewed and integrated as `ca2bf5d`                                                                                        | Complete Caleums six-step UI, responsive studio, commerce, operator, and browser interaction evidence                                                                                    |
| `codex/caleums-final-media`                                                                                            | `e8b3c00`             | Reviewed and conflict-adapted as `6541da4`                                                                                  | Deterministic identity, independent OpenAI stills, verification, style/prompt releases, private media, and fal motion                                                                    |

The DigitalOcean source evolved after the adapted pair: unsupported staging
sleep was removed, Node 24 buildpack behavior was isolated, encrypted config
preservation was hardened, and `infra/digitalocean/spec-contract.json` now
targets `rebuild/v2-first-principles`. Replaying the older patches would regress
those corrections.

## Structural and source evidence

Codebase Memory project `jewelo-3db9-final-e2e`, generation
`2026-08-26T21:31:57Z`, reported no recorded parse or skipped gaps for the cited
TypeScript/TSX files. Its call graph confirms:

```text
RootLayout -> JeweloProvider -> createJeweloClient
                               +-> MockJeweloClient
                               `-> SupabaseJeweloClient

outboxRecoveryTask.run -> dispatchPendingOutbox -> Trigger task dispatch
```

Docs, scripts, tests, and Supabase migrations are deliberately excluded from
that graph index, so their candidate and current sources were read directly.
The 26 non-UI files changed by `9edb774` have byte-identical blobs in
`3c73527`; only the operator component was conflict-adapted to the newer UI.

## Final-v5 implementation and remaining external proof

The newest attached text brief supersedes the seed contract's chained-edit
topology. The corrected contract now requires one immutable deterministic
canonical pendant PNG before provider calls and independent direct-OpenAI still
tasks for `packshot` (1:1), `worn` (4:5), `macroGift` (1:1), `darkEditorial`
(9:16), `studioHero` (9:16), and `billboard` (16:9). Each uses the same identity
silhouette plus its own versioned private shot anchor; aspect is an API
parameter. fal remains video-only and may start only from a verified still.

The direct-OpenAI still pipeline, independent four-view fanout, versioned prompt
and style registries, deterministic `caleums-arabic-v3` engine, and fal-only
motion path are now integrated. The customer-facing Contemporary option maps to
the certified Classic engine; unsupported Arabic styles and all Arabic two-name
layouts stop for operator review before provider spend.

The exact ZIP was recovered from
`/Users/sanchay/Downloads/caleums_pipeline_final.zip`. Its fonts and regression
sources are integrated, and the 17-name Classic/Minimal regression passes. Six
approved style anchors were recovered into private local state with recorded
SHA-256 lineage. They remain deliberately uncommitted and must be uploaded to
the private `style-anchors` bucket and published after the pending Supabase
migration. No expiring `<REHOST:...>` URL is used as a deployable asset.

## Verification

| Command or proof                                                                                                                                | Result                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm exec prettier --check docs/CALEUMS-FINAL-E2E-CONTRACT.md docs/CALEUMS-FINAL-E2E-INTEGRATION-REVIEW.md`                                    | Passed                                                                                                                                        |
| Contract assertions for canonical PNG, direct OpenAI, no chained edits, all six shot/aspect mappings, anchors, retry limit, and operator review | Passed                                                                                                                                        |
| Changed-file allowlist plus `git diff --check`                                                                                                  | Passed; only this contract and proof packet changed                                                                                           |
| `pnpm --filter @jewelo/ai test`                                                                                                                 | Passed: 2 files, 11 tests                                                                                                                     |
| `pnpm --filter @jewelo/data test`                                                                                                               | Passed: 3 files, 20 tests                                                                                                                     |
| `pnpm --filter @jewelo/jobs test`                                                                                                               | Passed: 4 files, 16 tests, including both certified Arabic styles                                                                             |
| `pnpm --filter @jewelo/web test`                                                                                                                | Passed: 12 files, 48 tests; existing Vite future-config warning only                                                                          |
| `pnpm verify`                                                                                                                                   | Passed after UI/media integration: guards, formatting, lint, types, tests, build, boundaries, secret and client-bundle scans, and HTTP health |
| `pnpm do:build`                                                                                                                                 | Passed: DigitalOcean web dependency build and Next.js production build, 23 pages                                                              |

The final handoff separately records the pushed commit SHA and verifies that
only `origin/codex/caleums-final-e2e` moved.

No paid provider call, cloud deployment, Shopify purchase, or merge into
`rebuild/v2-first-principles` is claimed here. Those are separate browser and
external-state acceptance gates.
