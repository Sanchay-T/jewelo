# Caleums final E2E integration review

**Review date:** 27 August 2026

**Branch:** `codex/caleums-final-e2e`

**Seed SHA:** `efde7fb070fa05348f93e6ecee573c59d9c5b774`

**Scope:** branch consolidation and final-v5 contract correction only

This proof packet does not claim completion of Goal 02 or of the attached
pipeline brief's real-provider E2E stopping condition. It records the required
prior-branch review, prevents duplicate or stale cherry-picks, and freezes the
newest verbal final-v5 topology for the later media and final-UI coordinators.

## Branch and patch disposition

No candidate commit was cherry-picked. Current HEAD already contains the
accepted behavior through exact or conflict-adapted equivalents, except for the
reference-UI finishing patch deliberately reserved for the final-UI pass.

| Source branch and tip                                                                                                  | Candidate             | Disposition                                                                                                                 | Evidence                                                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `codex/caleums-reference-ui` at `c6ac724635df6775f44a2e535e3deaa91a7f414e`                                             | `473bce8`             | Accepted through contained reference-UI commit `8607923`; `git cherry` marks the source patch equivalent                    | Current UI seed contains the reference implementation                                                                                                                                    |
| `codex/caleums-reference-ui` at `c6ac724635df6775f44a2e535e3deaa91a7f414e`                                             | `c6ac724`             | Rejected from this consolidation pass; defer to the final-UI coordinator                                                    | Correctly scoped visual polish, but the user reserved final UI for later integration                                                                                                     |
| `codex/caleums-production-backend` and `codex/shopify-integration-ready` at `68438a94dbf4b0aaa4e55ad21a3b052784486164` | `9edb774`             | Rejected as a duplicate cherry-pick; accepted behavior is contained in conflict-adapted `3c73527`                           | Single-commit range comparison differs only in `OperatorExperience.tsx`; `loginOperator` and remote behavior remain in the UI-adapted version                                            |
| `codex/shopify-integration-ready` at `68438a94dbf4b0aaa4e55ad21a3b052784486164`                                        | later Shopify commits | Accepted through contained equivalents `5ad0af5`, `76c2eb0`, `6d962c0`, and `c1f3136`                                       | `git cherry` marks the source patches equivalent                                                                                                                                         |
| `codex/caleums-prompt-registry` at `c5530f82a9e48231b48f04209f2d134845005a96`                                          | `c5530f8`             | Rejected as a duplicate cherry-pick; exactly patch-equivalent `4a9f995` is contained                                        | Stable patch ID for both is `eac46140da228f5b052fae21ebdab5558ee1dca7`                                                                                                                   |
| `codex/digitalocean-production-deployment` at `798b32dcba0594339f256c9ac445f7e8833ed697`                               | `994678f`, `798b32d`  | Rejected as duplicate cherry-picks; functionally superseded by conflict-adapted `9837866`, `bebef00`, and later corrections | Range-diff maps both commits; current HEAD retains both workflows, the spec contract, environment allowlist/checker, bootstrap/deploy/smoke/rollback scripts, and the deployment runbook |
| `codex/caleums-final-ui` at `efde7fb070fa05348f93e6ecee573c59d9c5b774`                                                 | none after seed       | Protected for later coordination; untouched                                                                                 | Branch tip equals the integration seed                                                                                                                                                   |
| `codex/caleums-final-media` at `efde7fb070fa05348f93e6ecee573c59d9c5b774`                                              | none after seed       | Protected for later coordination; worktree untouched                                                                        | Branch tip equals the integration seed                                                                                                                                                   |

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

## Final-v5 correction and deliberately deferred work

The newest attached text brief supersedes the seed contract's chained-edit
topology. The corrected contract now requires one immutable deterministic
canonical pendant PNG before provider calls and independent direct-OpenAI still
tasks for `packshot` (1:1), `worn` (4:5), `macroGift` (1:1), `darkEditorial`
(9:16), `studioHero` (9:16), and `billboard` (16:9). Each uses the same identity
silhouette plus its own versioned private shot anchor; aspect is an API
parameter. fal remains video-only and may start only from a verified still.

The current implementation still contains pre-v5 media debt, including the
`fal-image` queue, `FalStudioAdapter`, and `still.fal` provider profile. This
review accepts none of those as final architecture and intentionally leaves
their implementation to `codex/caleums-final-media`.

Only the text brief is present in the attachment store. The referenced
`caleums_pipeline_final.zip`, bundled fonts, regression masks, and deployable
style-anchor files are absent. Therefore this pass cannot verify solver parity,
font licensing/certification, regression output, anchor recovery, paid provider
behavior, browser acceptance, or the real configure-to-motion E2E path.
`<REHOST:...>` placeholders are not acceptable production anchors. Missing ZIP
and anchor assets remain explicit dependencies for the media owner.

## Verification

| Command or proof                                                                                                                                | Result                                                                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm exec prettier --check docs/CALEUMS-FINAL-E2E-CONTRACT.md docs/CALEUMS-FINAL-E2E-INTEGRATION-REVIEW.md`                                    | Passed                                                                                                                                                     |
| Contract assertions for canonical PNG, direct OpenAI, no chained edits, all six shot/aspect mappings, anchors, retry limit, and operator review | Passed                                                                                                                                                     |
| Changed-file allowlist plus `git diff --check`                                                                                                  | Passed; only this contract and proof packet changed                                                                                                        |
| `pnpm --filter @jewelo/ai test`                                                                                                                 | Passed: 2 files, 11 tests                                                                                                                                  |
| `pnpm --filter @jewelo/data test`                                                                                                               | Passed: 3 files, 20 tests                                                                                                                                  |
| `pnpm --filter @jewelo/jobs test`                                                                                                               | Passed: 4 files, 11 tests                                                                                                                                  |
| `pnpm --filter @jewelo/web test`                                                                                                                | Passed: 11 files, 44 tests; existing Vite future-config warning only                                                                                       |
| `pnpm verify`                                                                                                                                   | Passed: environment guards, formatting, 13-package lint/typecheck/build, 14 test tasks, boundaries, secret scan, client-bundle scan, and HTTP health proof |
| `pnpm do:build`                                                                                                                                 | Passed: DigitalOcean web dependency build and Next.js production build, 23 pages                                                                           |

The final handoff separately records the pushed commit SHA and verifies that
only `origin/codex/caleums-final-e2e` moved.

No paid provider call, cloud deployment, environment change, merge, production
action, media-worktree change, or final-UI-worktree change is authorized or
performed by this review.
