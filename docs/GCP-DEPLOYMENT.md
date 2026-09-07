# Google Cloud deployment

## Target

| Concern | Value |
| --- | --- |
| Organization | `localhosthq.com` |
| Project | `jewelo-cloud-lhq-20260827` (`Jewelo Cloud`) |
| Region | Mumbai, `asia-south1` |
| Staging service | `jewelo-staging` |
| Production service | `jewelo-production` |
| Image repository | `asia-south1-docker.pkg.dev/jewelo-cloud-lhq-20260827/jewelo/web` |
| Web configuration | Google Secret Manager |
| CI authentication | GitHub OIDC Workload Identity Federation |

Cloud Run hosts only the stateless Next.js web unit. Supabase remains the
system of record, private media store, Auth, and Realtime service. Trigger.dev
remains the durable job runner. OpenAI and fal credentials remain in the job
environment and are not copied into Cloud Run.

## Current provisioning status

The organization-owned project exists. On 27 August 2026, linking the approved
billing account returned `Cloud billing quota exceeded`. Until that account is
allowed another linked project (or an administrator deliberately frees a slot),
Google prevents API activation, Artifact Registry, Secret Manager, builds, and
Cloud Run deployment. No other project was detached automatically.

A paid-project quota increase requesting five additional slots was submitted
from the verified Localhost HQ Google account on 27 August 2026. Google stated
that it typically responds within two business days.

After the billing quota is resolved, resume with:

```bash
pnpm gcp:bootstrap -- BILLING_ACCOUNT_ID
pnpm gcp:github
```

The first command links billing, creates the versioned Terraform-state bucket,
enables the minimum APIs, and applies `infra/gcp`. The second writes only
non-secret OIDC identifiers to the existing GitHub `Preview` and `Production`
environments. It does not create a service-account key or GitHub secret.

## Environment values

Terraform creates empty secret containers; it never receives secret values.
Populate versions from an ignored local environment file:

```bash
pnpm gcp:secrets -- staging /absolute/path/to/staging.env
pnpm gcp:secrets -- production /absolute/path/to/production.env
```

Required web values:

```text
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_JEWELO_DATA_MODE
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Optional configured values are uploaded only when non-empty. The sync command
never prints values. `NEXT_PUBLIC_*` values are not confidential: Cloud Build
reads them from Secret Manager, but Next.js intentionally embeds them in the
browser bundle. Never put a service-role key or provider credential in a
`NEXT_PUBLIC_*` value.

Cloud Run references exact numeric secret versions. A rotation is a new secret
version plus a new immutable Cloud Run revision; the previous revision remains
available for rollback.

## GitHub delivery

`gcp-staging.yml` runs after a push to `rebuild/v2-first-principles` or a manual
dispatch. It verifies the fresh checkout, builds one image tagged with the full
commit SHA, deploys staging, checks `/api/health`, and records the immutable
digest and URL in the workflow summary.

`gcp-production.yml` is manual and accepts only an image from the Jewelo
Artifact Registry repository. It deploys without traffic, smoke-tests the tagged
candidate URL, promotes that exact revision, and smoke-tests the stable URL.

Rollback requires an explicit known-good revision:

```bash
pnpm gcp:rollback -- production jewelo-production-REVISION
```

This prevents an ambiguous “previous” selection during an incident.

## Initial runtime policy

| Environment | CPU | Memory | Minimum | Maximum | Concurrency | Timeout |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Staging | 2 vCPU | 2 GiB | 0 | 3 | 40 | 60 seconds |
| Production | 1 vCPU | 1 GiB | 1 | 20 | 40 | 60 seconds |

Startup CPU boost and request-based billing are enabled. Staging load evidence
must validate production sizing before customer launch. Long-running AI work is
never moved into the web request lifecycle.

## Deferred launch edge

The first verified endpoints use Cloud Run `run.app` URLs. A custom hostname,
global HTTPS load balancer, managed certificate, Cloud Armor, restricted ingress,
and DNS cutover are a later human-approved launch action.
