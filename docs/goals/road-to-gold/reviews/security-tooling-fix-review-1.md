# Review of the security and tooling fix commits (reviewer, on `61df414`, `07d92d6`, `58cff0f`, `b115707`, 2026-09-08)

No blocker. Probed staging with forged headers where a claim could only be settled empirically.

| # | Severity | Finding | Owner |
| --- | --- | --- | --- |
| 1 | major | `api/transliterate` keys its limiter on `ip|principal`; a new anonymous principal is a new key, so the paid route's per-IP ceiling is gone (widening, not a fix). | security fix 2: two limiters in conjunction |
| 2 | major | `jewelrySpecificationSchema` accepts letterless names (`'''`, `- - -`, Arabic-Indic digits, bare combining marks); the client blocks them, the server does not, and the engine shapes them into a paid still. | security fix 2: require `\p{L}`, an Arabic letter for Arabic |
| 3 | major | `LATIN_NAME` lacks `\p{M}`, `\p{Lm}` and non-breaking space; Yoruba `ẹ́mọ`, Hawaiian `Hoʻoku`, pasted NBSP are rejected with 422 while the UI accepts them. | security fix 2: widen and collapse whitespace |
| 4 | major | Security finding 9 is not closed: the site mints anonymous principals directly against Supabase (`previewPipeline.ts`, `supabase-jewelo-client.ts:175`); `/api/auth/anonymous` is only used by `scripts/e2e-backend.sh`. | Needs Sanchay: Supabase dashboard anonymous sign-in rate limit and CAPTCHA |
| 5 | minor | `clientIp` trusts `do-connecting-ip` unconditionally; DigitalOcean overwrites it (proven), another host would not. | security fix 2: `TRUSTED_CLIENT_IP_HEADER` config |
| 6 | minor | No script path installs or rotates an app env var now that bootstrap refuses existing apps and `deploy.sh` rewrites only the branch; a fresh production app fails `smoke.sh` without the token. | security fix 2: env sync step in `deploy.sh` from `appSecretEnvs`, runbook |
| 7 | minor | `/api/readiness` can 500 on a stale operator cookie when `OPERATOR_SESSION_SECRET` is missing. | security fix 2 |
| 8 | minor | `api/operator/prompts` keeps its own ungated `mockMode()`. | security fix 2 |
| 9 | minor | Commit messages of `61df414` and `07d92d6` claim deletions that landed in `8c2b2bb` and `09de943`. | recorded in the handover |
| 10 | minor | Dead export `integerFromEnv` in `inngest/client.ts`. | security fix 2 |

Clean: turbo hash moves on a root env change and DO builds without turbo; every field the atelier emits validates and nothing the jobs read is stripped; operator session compare, backoff order, readiness token compare, CSP coverage, exemption matchers, magic-byte sniff, quote scoping, `BoundedTtlMap`, deploy and common scripts, bootstrap refusal, lab scripts, `parseStencilFile`, Inngest fail-closed with the build-phase exemption, no secret in any diff.
