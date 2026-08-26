# DigitalOcean deployment

## Provisioned foundation

| Concern | Value |
| --- | --- |
| Team | `My Team` |
| Project | `Jewelo` (`8478845c-9f7b-4b68-89e6-3762b43a1119`) |
| Region | Bangalore, `blr` |
| Staging app | `jewelo-staging` |
| Production app | `jewelo-production` |
| Runtime | DigitalOcean App Platform Node.js buildpack |
| Configuration | Encrypted App Platform environment variables |
| CI | GitHub Actions with environment-scoped DigitalOcean token |

The project and scoped local API token exist. The token can create, read, and
update App Platform apps, projects, and the container registry, but cannot
delete them. The official App Platform, Container Registry, and documentation
MCP endpoints are configured. No paid Jewelo application or placeholder has
been created because the integration branch does not yet contain the web app.

## Why App Platform

App Platform runs the Next.js unit without a VM, Kubernetes, load balancer, or
Dockerfile. Its Node buildpack detects `pnpm-lock.yaml`, honors the exact pnpm
pin, builds the monorepo, injects `PORT`, manages TLS, stores encrypted
configuration, performs health checks, and retains deployment history.
Supabase, Trigger.dev, OpenAI, fal, Sentry, and PostHog remain unchanged.
The public `Sanchay-T/jewelo` clone URL avoids a broad DigitalOcean GitHub App
installation; GitHub Actions remains the only authenticated GitHub actor.

## Local authentication

The ignored root `.env` contains `DIGITALOCEAN_ACCESS_TOKEN` with file mode
`0600`. Use the wrapper so the token is read without sourcing every line in the
file:

```bash
pnpm doctl -- account get
pnpm doctl -- apps list
```

Never commit `.env`, print the token, or add it directly to an MCP URL. The
token expires after 90 days and must be rotated before 25 November 2026.

## First app creation and secret rollout

Prepare separate ignored staging and production environment files. The
bootstrap command sends values directly to App Platform as encrypted `SECRET`
variables and never writes a generated spec containing plaintext secrets.

```bash
pnpm do:check-env -- staging /absolute/path/to/.env /absolute/path/to/.env.local
pnpm do:bootstrap -- staging /absolute/path/to/.env /absolute/path/to/.env.local
pnpm do:check-env -- production /absolute/path/to/.env /absolute/path/to/.env.local
JEWELO_ALLOW_PRODUCTION_BOOTSTRAP=yes \
  pnpm do:bootstrap -- production /absolute/path/to/.env /absolute/path/to/.env.local
pnpm do:github
```

Required values are:

```text
NEXT_PUBLIC_JEWELO_DATA_MODE
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Optional configured values cover PostHog, Sentry, Shopify, and the temporary
operator/session settings. `NEXT_PUBLIC_APP_URL` uses App Platform's `${APP_URL}`
binding. Every other application value is encrypted by App Platform. As with
all Next.js applications, `NEXT_PUBLIC_*` values become visible in the browser
bundle even though their source copy is encrypted at rest.

Trigger.dev, OpenAI, fal, and job-only credentials remain in the job platform
and are not duplicated into the web app.

Files are layered in command order, so a final environment-specific file can
override shared values without creating a generated plaintext spec. The
environment checker validates required Supabase/web values, requires the
remote data client, rejects partial Shopify/operator groups, and reports only
configuration names and feature status. It never prints values. After the
initial bootstrap, ordinary source deploys update only the immutable Git source
tag; App Platform preserves the encrypted environment. Configuration changes
use the bootstrap command again and create a new deployment revision.

After the integrated application passes bootstrap and smoke testing, set the
GitHub `Preview` environment variable `DIGITALOCEAN_DEPLOY_ENABLED=true`. Until
then, integration-branch staging jobs are intentionally skipped instead of
deploying a fake app.

## Runtime policy

| Environment | Size | Scaling | Approximate base cost |
| --- | --- | --- | ---: |
| Staging | Shared 1 vCPU, 2 GiB | One instance; sleeps after 10 idle minutes | Up to $25/month |
| Production | Shared 1 vCPU, 1 GiB | One fixed managed instance | $12/month |

DigitalOcean does not allow scale-to-zero and request autoscaling on the same
service. The staging contract therefore favors the requested low idle cost and
2-GiB build/runtime headroom. Production uses one fixed managed instance so the
baseline compute bill is predictable. Enable autoscaling only after staging
load evidence proves it is needed and an explicit higher spend ceiling is
approved.

## Delivery and rollback

Staging verifies a fresh checkout, lockfile install, foundation, and web build,
creates an immutable `jewelo-staging-SHA` Git tag, and asks App Platform to
build that tag. Production is manual: it accepts an exact 40-character commit
SHA plus the successful staging deployment ID, proves the commit belongs to the
integration branch and that the staging deployment built that SHA, then creates
and deploys an immutable `jewelo-production-SHA` tag. Both workflows smoke-test
`/api/health` and publish the URL, commit, tag, and deployment ID.

Rollback restores the encrypted app spec and immutable source tag recorded in
a known-good historical deployment:

```bash
pnpm do:rollback -- production PREVIOUS_DEPLOYMENT_ID
```

Custom domains and DNS cutover remain explicit human-approved launch actions.
