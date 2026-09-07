# DigitalOcean deployment

This is the operating runbook for Jewelo's Next.js web unit. DigitalOcean App
Platform hosts the web process and, since 7 September 2026, a second
self-hosted `inngest` service component that is the durable job engine.
Supabase remains the system of record. Long-running AI work still never runs in
a customer request handler: it runs in an Inngest function served at
`/api/inngest`, which Inngest calls over the app's private network.

## Current state

| Concern | Current value |
| --- | --- |
| DigitalOcean project | `Jewelo` (`8478845c-9f7b-4b68-89e6-3762b43a1119`) |
| Region | Bangalore (`blr`) |
| Live staging app | `jewelo-staging` (`ec09c9fd-84e4-45c5-b60a-fd62277af322`) |
| Live staging URL | <https://jewelo-staging-gqumd.ondigitalocean.app> |
| Authoritative deployment source | `rebuild/v2-first-principles` after reviewed integration |
| Production app | `jewelo-production` (created only at approved cutover) |
| Production deployment configuration | Repository workflows, scripts, and `infra/digitalocean/spec-contract.json`; not yet production-accepted |
| Runtime | Node.js 24, pnpm 11.23.0, DigitalOcean Node buildpack |
| Compute | One fixed shared 1-vCPU/1-GiB instance per component |
| Components | `web` (git, Node buildpack, public `/`) and `inngest` (Docker Hub `inngest/inngest:v1.44.0-amd64`, `internal_ports: [8288]`, no public route) |
| Job engine | Self-hosted Inngest. `web` reaches it at `${inngest.PRIVATE_URL}`; it reaches `web` at `${web.PRIVATE_URL}/api/inngest` |

The staging URL and `/api/health` have returned HTTP 200 for deployed commit
`a842443`. This is staging evidence, not production acceptance. A production URL
does not exist until the manual promotion succeeds.

Inactivity sleep is unavailable for this DigitalOcean account, so staging is a
fixed instance rather than scale-to-zero. The predictable base compute price is
approximately $12/month per running app. Do not enable autoscaling without load
evidence and approval for the higher possible spend.

## What happens from push to URL

```text
developer branch
  -> reviewed merge into rebuild/v2-first-principles
  -> GitHub staging workflow verifies a clean checkout
  -> immutable jewelo-staging-<full SHA> Git tag
  -> App Platform builds that tag with Node 24 + pnpm
  -> existing encrypted app environment is retained
  -> /api/health smoke test
  -> workflow summary publishes URL + deployment ID + SHA

tested staging SHA + deployment ID + human production dispatch
  -> GitHub verifies both refer to an ACTIVE staging deployment
  -> immutable jewelo-production-<full SHA> Git tag
  -> production deploy + /api/health smoke test
  -> workflow summary publishes production URL and rollback command
```

The staging workflow runs on pushes to `rebuild/v2-first-principles` only when
the GitHub `Preview` environment variable `DIGITALOCEAN_DEPLOY_ENABLED` is
`true`; it can also be dispatched manually. Code-only deployments change the
Git source ref and preserve the app's encrypted environment.

Production never follows a branch automatically. The production workflow
requires an exact 40-character commit SHA and the successful staging deployment
ID for that same SHA. It rejects commits outside the integration branch,
non-active staging deployments, and mismatched deployment evidence.

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

The upload allowlist covers the web component's own configuration, including
`INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY`, because the Inngest functions run
inside this component. `INNGEST_BASE_URL` and `INNGEST_CRON_ENABLED` are shipped
only when present. The Inngest server component's own configuration
(`INNGEST_POSTGRES_URI`) is set on that component, never on `web`. The GitHub `Preview` and `Production` environments contain the scoped
`DIGITALOCEAN_ACCESS_TOKEN`; do not put application configuration in workflow
YAML or GitHub output.

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

With explicit authorization to update the repository environments, run:

```bash
pnpm do:github
```

That command configures environment-scoped GitHub deployment secrets and
non-secret project/app variables. Token rotation must replace both GitHub
environment secrets without printing the value.

## Staging operation

Staging follows the reviewed `rebuild/v2-first-principles` integration branch
after its deployment gate is enabled. Verify and smoke it with:

```bash
pnpm install --frozen-lockfile
pnpm verify
pnpm do:build
pnpm do:smoke -- https://jewelo-staging-gqumd.ondigitalocean.app
```

The Node buildpack does not always expose the same version behavior as a local
shell. Bootstrap injects `JEWELO_CLOUD_BUILD=1` at build time, and foundation
verification uses that compatibility marker to require Node 24 without
misclassifying unrelated local negative-proof checks.

For a manual staging deployment, use GitHub Actions' `digitalocean-staging`
workflow. Prefer it over a local deploy because it proves a fresh checkout and
records the source tag, deployment ID, commit, health result, and URL together.
Dispatch it only when the user has authorized a staging update in the current
request.

## Production cutover

Production cutover is a controlled transition, not another preview push:

1. Complete and review the final E2E application on its integration seed and
   feature branches; do not merge them automatically.
2. After human-approved integration into `rebuild/v2-first-principles`, confirm
   `infra/digitalocean/spec-contract.json` and both workflows target that exact
   integration branch.
3. Update staging with `pnpm do:bootstrap` only with explicit authorization.
4. Confirm the staging app still has the expected encrypted configuration; run
   `pnpm verify`, `pnpm do:build`, health smoke, browser smoke, and the app's
   customer/operator acceptance flow.
5. Set the GitHub `Preview` variable `DIGITALOCEAN_DEPLOY_ENABLED=true` only
   after the integrated branch is the authoritative deploy source.
6. Record the full tested commit SHA and its ACTIVE staging deployment ID.
7. With explicit production approval, bootstrap `jewelo-production` using the
   production environment files.
8. Dispatch `digitalocean-production` with that SHA and staging deployment ID.
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

It also requires HTTP 200 from `/api/readiness` with
`"keyEnvironment":"prod"`, which is true only when `INNGEST_SIGNING_KEY` is set
and `INNGEST_DEV` is not, so a deployment that would silently skip signature
verification fails the smoke test.

The smoke test is liveness evidence only. Release acceptance must also exercise
the relevant browser, Supabase authorization/RLS/Storage/Realtime, Inngest
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
| Push does not deploy staging | Deployment gate is off or push was not to the integration branch | Check `DIGITALOCEAN_DEPLOY_ENABLED` and branch routing; use manual dispatch only for an intentional test |
| Production dispatch rejects a SHA | SHA is not full length, is not in the integration branch, or does not match the ACTIVE staging deployment | Use the exact SHA and deployment ID from the successful staging workflow summary |
| App starts but health smoke fails | Build/start command, `PORT`, health route, or required environment is wrong | Inspect runtime logs, verify `pnpm start` honors injected `PORT`, validate environment names, then redeploy |
| `doctl` wrapper cannot authenticate | Token is missing, expired, or absent from the current worktree's ignored `.env` | Restore/rotate the scoped token without printing it; update Preview and Production GitHub secrets |

Stop after one failed externally mutating retry unless the failure is clearly
transient and the next action is safe. Preserve deployment IDs and logs as
evidence; never solve deployment failures by weakening verification or exposing
credentials.

## Inngest component (added 7 September 2026)

Trigger.dev was removed. The durable job engine is a self-hosted Inngest server
running as a second App Platform service component in the same app.

```text
inngest (image inngest/inngest:v1.44.0-amd64, run_command "inngest start")
  internal_ports: [8288]        no public ingress rule; the dashboard is private
  instance_count: 1             the queue lives in the process, never scale out
  health_check: TCP 8288
  INNGEST_EVENT_KEY             shared with web
  INNGEST_SIGNING_KEY           shared with web, BARE 64-char hex
  INNGEST_POSTGRES_URI          IPv4 session pooler, search_path=inngest
  INNGEST_SDK_URL               ${web.PRIVATE_URL}/api/inngest
  INNGEST_PORT / INNGEST_HOST   8288 / 0.0.0.0

web
  INNGEST_BASE_URL              ${inngest.PRIVATE_URL}
  INNGEST_CRON_ENABLED          1   (only this environment registers the crons)
```

Every `inngest start` flag is also an `INNGEST_<FLAG>` environment variable, so
the component needs no argument list beyond `inngest start`.

Two hard constraints discovered on 7 September:

- Supabase's direct database host (`db.<ref>.supabase.co`) resolves to IPv6
  only, and App Platform has no IPv6 egress. `INNGEST_POSTGRES_URI` must use the
  IPv4 **session** pooler on port 5432
  (`postgres.<ref>@aws-0-ap-south-1.pooler.supabase.com:5432`), not the
  transaction pooler on 6543 that the dashboard offers by default.
- A second service with `http_port` makes App Platform generate an ingress rule
  that collides with `web`'s `/` prefix. Use `internal_ports` instead: the
  component is then reachable only on the app's private network.
- `inngest start` rejects a prefixed signing key
  (`signing-key must be hex string with even number of chars`). Use bare hex
  from `openssl rand -hex 32`. The SDK accepts bare hex and also strips the
  `signkey-<env>-` prefix that Inngest Cloud issues, so one value serves both.

Inngest's own tables are kept out of the Supabase migration surface with
`?options=-c search_path=inngest` on the pooler URI and a pre-created `inngest`
schema, so `supabase db diff` stays clean.

`scripts/digitalocean/deploy.sh` selects the git-backed service by name (`web`),
never by index, because `services[0]` is no longer guaranteed to be the web app.

### Switching to Inngest Cloud

Cloud is a one-variable switch. Remove `INNGEST_BASE_URL` from `web`, replace
`INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` with the Cloud values, delete the
`inngest` component, and sync `https://APP.ondigitalocean.app/api/inngest` from
the Inngest dashboard. No application code changes.
