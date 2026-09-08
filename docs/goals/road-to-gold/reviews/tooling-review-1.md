# Tooling, config and infra review 1 (reviewer, on `dde9058`, 2026-09-08)

Scope: `packages/config`, `apps/jobs/scripts`, the lab Python and mjs tools, `scripts/digitalocean`, `infra/digitalocean`, `next.config.ts`, turbo.

| # | Severity | Finding | Owner |
| --- | --- | --- | --- |
| 1 | major | `turbo.json` build task has no env inputs and `outputs: []`: `.env` is not hashed so a `NEXT_PUBLIC_*` change can hit the cache and ship a stale inlined bundle, and a cache hit after `rm -rf .next` prints FULL TURBO and leaves no build. The only mechanical gate can pass without compiling. Fonts are hashed correctly. | tooling fix 1 |
| 2 | major | `OPENAI_STILL_CONCURRENCY_LIMIT` validated in `packages/config` (default 2, max 32) is never read; `apps/web/src/inngest/client.ts:70-78` uses `integerFromEnv(..., 4)`, unvalidated, absent from `env-contract.mjs`. Real mode runs 4 paid generations at once, not 2, and the deploy tooling cannot lower it. | tooling fix 1 |
| 3 | major | `bootstrap-app.mjs:89-95,116-117` on an existing app is a full-spec replace: deletes the `inngest` service, repoints the branch to the integration branch, wipes every env outside `knownWebConfig`. Only production has a one-variable guard. | tooling fix 1: refuse when the app exists |
| 4 | major | `measure-stencils.mts:232` casts `claimed` unchecked; a missing recentre field makes every comparison `NaN`, no failure is pushed, `CLAIM 16/16` with exit 0. | fix pass 4 owns the file; folded into its brief follow-up |
| 5 | major | `replay-lab.mts` never sets a nonzero exit code (`referenceShaMismatches`, `stillsMissing` only printed); `parseCell` defaults an unknown name to `asma` and passes `approvedText ?? ""`, so P2-3 would verify a stranger's name or the empty string and record an accept. | tooling fix 1 |
| 6 | major | `deploy.sh:52-62`: the node writer emits no trailing newline, `read -r` returns 1 at EOF under `set -e`, so the script exits 1 after a successful deploy and never writes the outputs. | tooling fix 1 |
| m1 | minor | `packages/config` defaulted fields (`OPENAI_STILL_CONCURRENCY_LIMIT`, `OPENAI_STILL_ESTIMATED_COST_CENTS`, `OPENAI_IMAGE_MODEL`, `PROVIDER_MODE`, `NEXT_PUBLIC_APP_URL`) throw on a blank string despite the header comment; `VIDEO_ENABLED=true` throws; cost cents have no `.max()` and are written into the spend ledger. | tooling fix 2 (after P2-2 releases the file) |
| m2 | minor | `readiness` route checks env presence only; a schema-rejected value deploys green and fails per shopper in the handler. | tooling fix 1 |
| m3 | minor | `check-env.mjs` validates `environment` then ignores it. | tooling fix 1 |
| m4 | minor | `merge_verdicts.py` keeps stale verdicts on a miss, last-write-wins on duplicate keys without warning, truncates the ledger before writing. | tooling fix 1 |
| m5 | minor | `finalise.py` deletes the budget paragraph when `FINAL_BALANCE` is unset. | tooling fix 1 |
| m6 | minor | `replay-report.json` carries `generatedAt`, so every rerun diffs. | tooling fix 1 |
| m7 | minor | `docs/goals/overnight-launch/lab/__pycache__/make_stencil.cpython-314.pyc` tracked against `.gitignore`, publishes a home path in a public repo. | tooling fix 1 |
| m8 | minor | `ingest_results.mjs` skips a duplicate key silently even when `file` differs; sha computed at ingest, not generation. | recorded |
| m9 | minor | `common.sh:35-39` does not strip quotes around the DO token. | tooling fix 1 |
| m10 | minor | `measure-stencils.mts:256,278` absolute manifest path mishandled; first missing PNG aborts the loop. | fix pass 4 follow-up |
| m11 | minor | `next.config.ts:44-47` wasm glob hardcodes the pnpm virtual-store layout; matches today. | recorded |

Clean: `outputFileTracingIncludes` verified against the real build (wasm and all ttf traced for the inngest and diagnostics routes); turbo invalidates on a font swap; config refinements behave as commented (ringless, real-mode keys, video); browser env boundary holds; no secret in any scoped file; `render-stencils.mts` gates set the exit code and the report is deterministic; `verify_stencil.py` independent; `smoke.sh`, `rollback.sh`, `deploy.sh` otherwise sound.
