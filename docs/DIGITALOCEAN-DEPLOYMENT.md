# DigitalOcean deployment

This is the operating runbook for Jewelo's Next.js web unit. DigitalOcean App
Platform hosts the web process; Supabase remains the system of record and
Trigger.dev continues to run OpenAI and fal jobs. Do not move long-running AI
work into App Platform request handlers.

## Current state

| Concern | Current value |
| --- | --- |
| DigitalOcean project | `Jewelo` (`8478845c-9f7b-4b68-89e6-3762b43a1119`) |
| Region | Bangalore (`blr`) |
| Live staging app | `jewelo-staging` (`ec09c9fd-84e4-45c5-b60a-fd62277af322`) |
| Live staging URL | <https://jewelo-staging-gqumd.ondigitalocean.app> |
| Staging source during preview | `codex/digitalocean-staging-preview` |
| Production app | `jewelo-production` (created only at approved cutover) |
| Production deployment configuration | Draft PR [#9](https://github.com/Sanchay-T/jewelo/pull/9) |
| Runtime | Node.js 24, pnpm 11.23.0, DigitalOcean Node buildpack |
| Compute | One fixed shared 1-vCPU/1-GiB instance per app |

The staging URL and `/api/health` have returned HTTP 200 for deployed commit
`a842443`. This is staging evidence, not production acceptance. A production URL
does not exist until the manual promotion succeeds.

Inactivity sleep is unavailable for this DigitalOcean account, so staging is a
fixed instance rather than scale-to-zero. The predictable base compute price is
approximately $12/month per running app. Do not enable autoscaling without load
evidence and approval for the higher possible spend.

## What happens from push to URL

```text
checkout codex/digitalocean-staging-preview
  -> commit and push the branch
  -> pnpm do:publish -- staging
  -> local install, verification, and production web build
  -> matching immutable jewelo-staging-<full SHA> Git tag and release branch
  -> App Platform builds the release branch with Node 24 + pnpm
  -> existing encrypted app environment is retained
  -> /api/health smoke test
  -> command reports URL + deployment ID + SHA

tested staging SHA + deployment ID + explicit production command
  -> immutable jewelo-production-<full SHA> Git tag
  -> production deploy + /api/health smoke test
  -> command reports production URL and rollback deployment
```

GitHub Actions is not part of the active deployment path. The direct publisher
requires a clean, pushed `codex/digitalocean-staging-preview` checkout, creates
a matching immutable tag and release branch, rolls the allowlisted values back
through encrypted App Platform configuration, and smoke-tests the result.

Production never follows a branch automatically. It must use the exact commit
and immutable source tag proven by an ACTIVE staging deployment.

## Secret and environment model

Environment input is layered in command order. The normal local order is the
ignored shared `.env` followed by the ignored `.env.local`, so the latter wins:

```bash
pnpm do:check-env -- staging /absolute/path/to/.env /absolute/path/to/.env.local
pnpm do:bootstrap -- staging /absolute/path/to/.env /absolute/path/to/.env.local
```

Both local files must stay ignored and mode `0600`. The checker reports names
and feature status only. The bootstrap process builds the app spec in memory and
sends allowlisted web values directly to App Platform as encrypted `SECRET`
environment variables; it does not write a plaintext spec to disk.

Required web values are:

```text
NEXT_PUBLIC_JEWELO_DATA_MODE
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Optional values cover PostHog and Sentry. Shopify and temporary
operator/session configuration are complete groups, so partial groups fail
validation; a PostHog key also requires its host. `NEXT_PUBLIC_APP_URL` is the
`${APP_URL}` App Platform binding.
`NEXT_PUBLIC_*` values are encrypted at rest but intentionally become public in
the Next.js browser bundle; never place privileged credentials under that
prefix.

The upload allowlist excludes Trigger.dev, OpenAI, fal, database passwords, and
other job-only credentials. Keep those in the job platform that executes the
work. The scoped DigitalOcean token stays in the ignored local `.env`; do not
put application configuration or credentials in Git.

Environment changes are configuration deployments, not ordinary code pushes:

```bash
pnpm do:check-env -- production /absolute/path/to/.env /absolute/path/to/.env.local
JEWELO_ALLOW_PRODUCTION_BOOTSTRAP=yes \
  pnpm do:bootstrap -- production /absolute/path/to/.env /absolute/path/to/.env.local
```

Re-running bootstrap updates the encrypted environment and creates a new
deployment. Record the previous deployment ID first so the change is
reversible. Never print, diff, or capture the resulting app spec because it may
contain secret material.

## First-time workstation check

Use the repository wrapper so `doctl` reads only the ignored token rather than
sourcing every environment line:

```bash
pnpm doctl -- account get
pnpm doctl -- apps list
```

The token has create/read/update access for the relevant DigitalOcean resources
but no delete scope. Rotate it before its current 25 November 2026 expiry.

## Staging operation

Before final cutover, staging intentionally follows
`codex/digitalocean-staging-preview`. Verify and smoke it with:

```bash
pnpm install --frozen-lockfile
pnpm verify
pnpm do:build
pnpm do:publish -- staging
```

The Node buildpack does not always expose the same version behavior as a local
shell. Bootstrap injects `JEWELO_CLOUD_BUILD=1` at build time, and foundation
verification uses that compatibility marker to require Node 24 without
misclassifying unrelated local negative-proof checks.

The publisher refuses the wrong branch, dirty worktrees, and unpushed commits.
It records the source tag/release branch, deployment ID, commit, health result,
and URL in its terminal output. Run it only when the user has authorized a
staging update.

## Production cutover

Production cutover is a controlled transition, not another preview push:

1. Complete and review the main web application on
   `rebuild/v2-first-principles`.
2. Review and merge deployment PR #9 into that integration branch. Do not merge
   it automatically.
3. Change the temporary App Platform source contract from
   `codex/digitalocean-staging-preview` to `rebuild/v2-first-principles` as part
   of the reviewed integration, then update staging with `pnpm do:bootstrap`.
4. Confirm the staging app still has the expected encrypted configuration; run
   `pnpm verify`, `pnpm do:build`, health smoke, browser smoke, and the app's
   customer/operator acceptance flow.
5. Change the direct publisher and App Platform source contract from the
   temporary preview branch to the integration branch.
6. Record the full tested commit SHA and its ACTIVE staging deployment ID.
7. With explicit production approval, bootstrap `jewelo-production` using the
   production environment files.
8. Deploy the exact tested immutable tag with the direct production command.
9. Verify the published production URL, `/api/health`, browser flows,
   monitoring, and the recorded rollback deployment before any DNS change.

Custom domain attachment and DNS cutover remain separate human-approved launch
actions.

## Smoke test and rollback

The automated smoke test requires HTTPS, retries transient connection failures,
requires HTTP 200 from `/api/health`, and checks that the response is JSON:

```bash
pnpm do:smoke -- https://APP.ondigitalocean.app
```

The smoke test is liveness evidence only. Release acceptance must also exercise
the relevant browser, Supabase authorization/RLS/Storage/Realtime, Trigger
dispatch, and provider flows.

Rollback restores the complete spec and immutable source ref from a known-good
historical deployment:

```bash
pnpm do:rollback -- staging PREVIOUS_DEPLOYMENT_ID
pnpm do:rollback -- production PREVIOUS_DEPLOYMENT_ID
```

Rollback is externally mutating. Confirm the environment, deployment ID, and
reason with the user immediately before running it, then smoke-test the restored
URL. A rollback also restores that deployment's environment configuration, so
follow it with a deliberate secret rotation if the rollback was caused by a
credential incident.

## Known failures and diagnosis

| Symptom | Cause seen in this setup | Resolution |
| --- | --- | --- |
| Spec validation rejects staging sleep | Inactivity sleep is not enabled for this account | Keep one fixed `apps-s-1vcpu-1gb` instance; do not claim scale-to-zero |
| Cloud build reports the wrong Node version | Buildpack version behavior differed from local verification | Preserve the Node 24 pins and `JEWELO_CLOUD_BUILD=1` compatibility marker; inspect deployment build logs |
| Bootstrap exits after creating/updating an app | The deployment did not become ACTIVE | Inspect the latest App Platform build/deploy logs; do not keep retrying blindly or report a URL as healthy |
| `do:publish` refuses staging | The checkout is dirty, unpushed, or on the wrong branch | Commit and push `codex/digitalocean-staging-preview`, then rerun the direct publisher |
| Production source is rejected | The tag does not match the exact ACTIVE staging commit | Use the immutable tag and deployment ID reported by the successful staging publish |
| App starts but health smoke fails | Build/start command, `PORT`, health route, or required environment is wrong | Inspect runtime logs, verify `pnpm start` honors injected `PORT`, validate environment names, then redeploy |
| `doctl` wrapper cannot authenticate | Token is missing, expired, or absent from the current worktree's ignored `.env` | Restore or rotate the scoped local token without printing it |

Stop after one failed externally mutating retry unless the failure is clearly
transient and the next action is safe. Preserve deployment IDs and logs as
evidence; never solve deployment failures by weakening verification or exposing
credentials.
