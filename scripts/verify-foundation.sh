#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

[[ "$(node --version)" == "v24.18.1" ]] || {
  echo "Node v24.18.1 is required; current: $(node --version)" >&2
  exit 1
}
[[ "$(pnpm --version)" == "11.23.0" ]] || {
  echo "pnpm 11.23.0 is required; current: $(pnpm --version)" >&2
  exit 1
}

required=(
  .nvmrc .tool-versions pnpm-lock.yaml turbo.json tsconfig.base.json eslint.config.mjs vercel.json
  apps/web/package.json apps/web/src/app/page.tsx apps/web/src/app/api/health/route.ts
  apps/jobs/package.json apps/jobs/trigger.config.ts apps/jobs/src/trigger/foundation.ts
  supabase/config.toml supabase/seed.sql
  scripts/check-boundaries.mjs scripts/verify-supabase-project.mjs scripts/check-client-bundle.sh scripts/scan-secrets.sh
  docs/DIGITALOCEAN-DEPLOYMENT.md infra/digitalocean/spec-contract.json
  .github/workflows/digitalocean-staging.yml .github/workflows/digitalocean-production.yml
  scripts/digitalocean/bootstrap-app.mjs scripts/digitalocean/check-env.mjs
  scripts/digitalocean/common.sh scripts/digitalocean/configure-github.sh
  scripts/digitalocean/deploy.sh scripts/digitalocean/doctl.sh
  scripts/digitalocean/env-contract.mjs scripts/digitalocean/rollback.sh
  scripts/digitalocean/smoke.sh
)
for file in "${required[@]}"; do
  [[ -s "$file" ]] || { echo "missing or empty foundation artifact: $file" >&2; exit 1; }
done

for package_name in domain contracts data identity ai media pricing ui observability config testing; do
  [[ -s "packages/${package_name}/package.json" && -s "packages/${package_name}/src/index.ts" ]] || {
    echo "missing approved package scaffold: packages/${package_name}" >&2
    exit 1
  }
done

for forbidden in docker-compose.yml Dockerfile convex neon minio kubernetes; do
  [[ ! -e "$forbidden" ]] || { echo "forbidden local/replacement infrastructure present: $forbidden" >&2; exit 1; }
done

for script in scripts/*.sh; do
  bash -n "$script"
done
for script in scripts/digitalocean/*.sh; do
  bash -n "$script"
done
node --check scripts/digitalocean/bootstrap-app.mjs
node --check scripts/digitalocean/check-env.mjs
node --check scripts/digitalocean/env-contract.mjs
echo "Shell syntax verification passed."

node - <<'NODE'
const manifest = require("./package.json");
const expected = ["dev", "lint", "typecheck", "test", "build", "verify", "db:types", "db:push", "jobs:dev", "jobs:deploy:preview", "format:check"];
for (const command of expected) {
  if (!manifest.scripts?.[command]) throw new Error(`missing root command: ${command}`);
}
if (manifest.packageManager !== "pnpm@11.23.0") throw new Error("pnpm pin drift");
if (manifest.engines?.node !== ">=24 <25") throw new Error("Node engine drift");
if (manifest.engines?.pnpm !== "11.23.0") throw new Error("pnpm engine drift");
for (const command of ["do:bootstrap", "do:build", "do:check-env", "do:deploy", "do:smoke", "do:rollback", "start"]) {
  if (!manifest.scripts?.[command]) throw new Error(`missing DigitalOcean command: ${command}`);
}
NODE

node - <<'NODE'
const contract = require("./infra/digitalocean/spec-contract.json");
if (contract.environments?.production?.instanceCount !== 1) {
  throw new Error("production must use one fixed managed instance");
}
NODE

assert_guard_fails() {
  local label="$1"
  local expected="$2"
  shift 2
  local output
  if output="$(env -u SUPABASE_ACCESS_TOKEN -u SUPABASE_PROJECT_REF -u TRIGGER_ACCESS_TOKEN -u TRIGGER_PROJECT_REF -u JEWELO_CLOUD_TARGET "$@" 2>&1)"; then
    echo "${label} unexpectedly succeeded without cloud authorization." >&2
    exit 1
  fi
  grep -q "$expected" <<<"$output" || {
    echo "${label} failed without the required actionable message:" >&2
    echo "$output" >&2
    exit 1
  }
  echo "${label} guard proof passed."
}

assert_guard_fails "db:types" "JEWELO_CLOUD_TARGET" bash scripts/supabase-remote.sh types
assert_guard_fails "db:push" "JEWELO_CLOUD_TARGET" bash scripts/supabase-remote.sh push
assert_guard_fails "jobs:dev" "JEWELO_CLOUD_TARGET" bash scripts/trigger-remote.sh dev
assert_guard_fails "jobs:deploy:preview" "JEWELO_CLOUD_TARGET" bash scripts/trigger-remote.sh deploy-preview

if output="$(JEWELO_CLOUD_TARGET=production bash scripts/supabase-remote.sh push 2>&1)"; then
  echo "Supabase production-default guard unexpectedly succeeded." >&2
  exit 1
fi
grep -q "production is never a Goal 00 default" <<<"$output"
echo "Supabase production-default rejection passed."

if output="$(env -u TRIGGER_ACCESS_TOKEN -u TRIGGER_PREVIEW_BRANCH JEWELO_CLOUD_TARGET=preview TRIGGER_PROJECT_REF=proj_nonproduction bash scripts/trigger-remote.sh deploy-preview 2>&1)"; then
  echo "Trigger preview-branch guard unexpectedly succeeded." >&2
  exit 1
fi
grep -q "TRIGGER_PREVIEW_BRANCH" <<<"$output"
echo "Trigger preview-branch guard proof passed."

node scripts/verify-supabase-project.mjs --prove-negative

if output="$(NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co pnpm --filter @jewelo/web build 2>&1)"; then
  echo "Web build unexpectedly accepted a partial public Supabase environment." >&2
  exit 1
fi
grep -q "must be set together" <<<"$output" || {
  echo "Web build rejected the partial environment without the required pairing message:" >&2
  echo "$output" >&2
  exit 1
}
echo "Deployable web environment negative proof passed."

git diff --check
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm boundaries
pnpm secret:scan
pnpm verify:bundle
pnpm verify:health

echo "Jewelo deterministic foundation verification passed."
