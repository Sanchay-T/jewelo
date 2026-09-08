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
| Authoritative deployment source | `codex/overnight-launch-2026-09-08`, the branch on the live `web` service's `git.branch` |
| Production app | `jewelo-production` (created only at approved cutover) |
| Production deployment configuration | `scripts/digitalocean/*` and `infra/digitalocean/spec-contract.json`; no workflows, and not yet production-accepted |
| Runtime | Node.js 24, pnpm 11.23.0, DigitalOcean Node buildpack |
| Compute | One fixed shared 1-vCPU/1-GiB instance per component |
| Components | `web` (git `https://github.com/Sanchay-T/jewelo.git`, no `deploy_on_push`, Node buildpack, public `/`) and `inngest` (Docker Hub `inngest/inngest:v1.44.0-amd64`, `internal_ports: [8288]`, no public route) |
| Job engine | Self-hosted Inngest. `web` reaches it at `${inngest.PRIVATE_URL}`; it reaches `web` at `${web.PRIVATE_URL}/api/inngest` |

The active staging deployment is `77c680bb-b6ee-46db-bcf8-dc8d774711bf`, phase
`ACTIVE`, built from commit `594d378` of that branch.
This is staging evidence, not production acceptance. A production URL does not
exist until the manual promotion succeeds.

Inactivity sleep is unavailable for this DigitalOcean account, so staging is a
fixed instance rather than scale-to-zero. The predictable base compute price is
approximately $12/month per running app. Do not enable autoscaling without load
evidence and approval for the higher possible spend.

## What happens from push to URL

There is no CI workflow and no GitHub Actions in this repository.
`.github/workflows` does not exist, and nothing may be added there: tests and CI
are suspended by Sanchay's instruction of 7 September 2026.
Every deployment is a deliberate, operator-run command.
`deploy_on_push` is not set on the live app spec, so a push to the branch does
nothing on its own.

Deployment runs from `home-mini`, the only machine where `doctl` is
authenticated:

```bash
ssh home-mini
export PATH=/opt/homebrew/bin:$PATH
cd ~/hq/projects/devonel/jewelo
bash scripts/digitalocean/deploy.sh staging codex/overnight-launch-2026-09-08
bash scripts/digitalocean/smoke.sh https://jewelo-staging-gqumd.ondigitalocean.app
```

`deploy.sh <environment> <source ref>` does exactly this, per its source:

```text
validate the environment name and the source ref characters
  -> load the scoped DigitalOcean token from the ignored .env
  -> resolve the app id by app name (jewelo-staging / jewelo-production)
  -> doctl apps get, then select the service named "web", never services[0],
     because the image-based inngest component has no git source
  -> rewrite web.git.branch to the requested source ref
  -> merge appSecretEnvs from env-contract.mjs into that service's envs:
     add a key the app never had, overwrite a rotated one, keep every key the
     contract does not know, print the merged key names and no value
  -> doctl apps update --spec <mode 0600 temp file> --update-sources --wait
  -> print service_url and deployment_id
```

Because the script edits the live spec in place and changes only the branch and
the contract's own environment keys, the `inngest` component, the ingress rule,
the instance sizes and every environment key outside the contract are all
carried through untouched.
The temp spec file is created mode `0600` and deleted on exit; never print,
diff, or keep it, because it contains secret material.
The deployment id it prints is the evidence to record before any later change.

`smoke.sh <https URL>` is the acceptance check that follows a deploy.
It requires HTTP 200 and a JSON body from `/api/health`, then HTTP 200 from
`/api/readiness` with `"keyEnvironment":"prod"`, and it retries transient
connection failures on the health call only.

`rollback.sh <environment> <deployment id>` reverses a bad deploy: it reads the
complete spec back out of that historical deployment with
`doctl apps get-deployment` and applies it with `--update-sources --wait`.
That restores the source ref and the environment configuration of that
deployment, so a rollback caused by a credential incident must be followed by a
deliberate rotation.

Production is not automated either, and no `jewelo-production` app exists yet.
It is the same three scripts pointed at the production environment name, run
only under the cutover procedure below.

## Secret and environment model

The repository-root `.env` is the single source of local environment input, for
these scripts and for the app: `loadRootEnv()` in `packages/config` loads that
one file and no other.
Pass it and nothing else:

```bash
pnpm do:check-env -- staging /absolute/path/to/.env
pnpm do:bootstrap -- staging /absolute/path/to/.env
```

The scripts still accept several files and apply them in command order, with
later files winning. Do not use that. A second file such as `.env.local` is what
shipped the retired Supabase project ref and the dead `TRIGGER_*` keys into a
bootstrap: it overrode correct `.env` values while nothing in the app read it,
so the mistake was invisible locally and only visible in the deployed app. There
is no `.env.local` in this repository; if one appears, delete it rather than
correct it.

That file must stay ignored and mode `0600`. The checker reports names
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
(`INNGEST_POSTGRES_URI`) is set on that component, never on `web`.
The scoped `DIGITALOCEAN_ACCESS_TOKEN` lives only in the ignored `.env` on
`home-mini`; there is no workflow and no GitHub environment in the deploy path
that could hold it.

Environment changes are configuration deployments, not ordinary code pushes:

```bash
pnpm do:check-env -- production /absolute/path/to/.env
JEWELO_ALLOW_PRODUCTION_BOOTSTRAP=yes \
  pnpm do:bootstrap -- production /absolute/path/to/.env
```

Bootstrap creates an app and never updates one. Re-running it against an app
that already exists prints the app id and exits 1, because `bootstrap-app.mjs`
builds `services: [web]` from the contract alone: applying that spec to a live
app is a full replace that would drop the `inngest` component, repoint the
branch, and wipe every environment variable outside the web contract. Deploy a
new revision with `pnpm do:deploy` (`scripts/digitalocean/deploy.sh`), which
edits the existing spec, and restore with `rollback.sh` if a deployment goes
wrong. Never print, diff, or capture the resulting app spec because it may
contain secret material.

`deploy.sh` is therefore also the way to add or rotate an app environment
variable. Write the value into the ignored `.env` on `home-mini`, add its name
to `env-contract.mjs` if it is new, then deploy: the script merges the contract
into the live spec, so the variable ships with the next revision. Prove the
merge first without touching DigitalOcean:

```bash
DEPLOY_DRY_RUN=1 bash scripts/digitalocean/deploy.sh staging <branch>
```

That prints the merged key names and their scopes, never a value, calls no
DigitalOcean API and exits 0. A key the contract does not name is never removed
from the live app, and a key absent from `.env` is left exactly as the platform
holds it, so a partial local environment cannot wipe a deployed secret.

`TRUSTED_CLIENT_IP_HEADER` is one of those optional keys: it names the header
the request guards believe as the client address, defaulting to
`do-connecting-ip`, which App Platform sets and overwrites, and set to the empty
string on any host that does not, where the last `x-forwarded-for` hop is used
instead.

## First-time workstation check

Use the repository wrapper so `doctl` reads only the ignored token rather than
sourcing every environment line:

```bash
pnpm doctl -- account get
pnpm doctl -- apps list
```

The token has create/read/update access for the relevant DigitalOcean resources
but no delete scope. Rotate it before its current 25 November 2026 expiry.

`scripts/digitalocean/configure-github.sh` (`pnpm do:github`) is left over from
the retired workflow era.
It writes the token into GitHub `Preview` and `Production` environment secrets
that nothing now reads, so do not run it; rotate the token in `.env` on
`home-mini` instead, without printing the value.

## Staging operation

Staging tracks whatever branch the last `deploy.sh` run wrote to
`web.git.branch`, today `codex/overnight-launch-2026-09-08`.
Nothing follows a branch on its own, so staging is only as new as the last
deliberate deploy.
The local gate before deploying is `corepack pnpm build`; there is no test or
verify step. Then:

```bash
bash scripts/digitalocean/deploy.sh staging <branch>
bash scripts/digitalocean/smoke.sh https://jewelo-staging-gqumd.ondigitalocean.app
```

The Node buildpack does not always expose the same version behavior as a local
shell. Bootstrap injects `JEWELO_CLOUD_BUILD=1` at build time, and foundation
verification uses that compatibility marker to require Node 24 without
misclassifying unrelated local negative-proof checks.

A deploy is an external mutation.
Run it only when the current task authorizes a staging update, record the
printed deployment id as the rollback target, and stop after one failed retry
rather than redeploying blindly.

## Production cutover

Production cutover is a controlled transition, not another preview push:

1. Complete and review the final E2E application on its integration seed and
   feature branches; do not merge them automatically.
2. After human-approved integration, confirm
   `infra/digitalocean/spec-contract.json` names that exact integration branch,
   since it is the only place the branch is declared.
3. Update staging with `pnpm do:deploy`; `pnpm do:bootstrap` refuses to run
   against the existing app.
4. Confirm the staging app still has the expected encrypted configuration; run
   `corepack pnpm build`, health smoke, browser smoke, and the app's
   customer/operator acceptance flow.
5. Record the full tested commit SHA and its ACTIVE staging deployment ID.
6. With explicit production approval, bootstrap `jewelo-production` using the
   root `.env`.
7. Run `bash scripts/digitalocean/deploy.sh production <that ref>` and
   `bash scripts/digitalocean/smoke.sh <production URL>` from `home-mini`.
8. Verify the published production URL, `/api/health`, browser flows,
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
| Push does not deploy staging | Expected: no workflow and no `deploy_on_push` exist, so a push never deploys | Run `deploy.sh` from `home-mini` when a staging update is authorized |
| Staging serves an old commit | The last `deploy.sh` predates the pushed commit | Redeploy the branch; `--update-sources` re-resolves the ref to its current head |
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
