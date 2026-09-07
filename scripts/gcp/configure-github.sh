#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
source "$repo_root/scripts/gcp/common.sh"

terraform_dir="$repo_root/infra/gcp"
repository="Sanchay-T/jewelo"

provider="$(terraform -chdir="$terraform_dir" output -raw workload_identity_provider)"
staging_deployer="$(terraform -chdir="$terraform_dir" output -raw staging_deployer_service_account)"
production_deployer="$(terraform -chdir="$terraform_dir" output -raw production_deployer_service_account)"
build_service_account="$(terraform -chdir="$terraform_dir" output -raw build_service_account)"

for environment in Preview Production; do
  hq-gh variable set GCP_PROJECT_ID --repo "$repository" --env "$environment" --body "$JEWELO_GCP_PROJECT_ID"
  hq-gh variable set GCP_REGION --repo "$repository" --env "$environment" --body "$JEWELO_GCP_REGION"
  hq-gh variable set GCP_WORKLOAD_IDENTITY_PROVIDER --repo "$repository" --env "$environment" --body "$provider"
  hq-gh variable set GCP_BUILD_SERVICE_ACCOUNT --repo "$repository" --env "$environment" --body "$build_service_account"
done

hq-gh variable set GCP_DEPLOYER_SERVICE_ACCOUNT --repo "$repository" --env Preview --body "$staging_deployer"
hq-gh variable set GCP_DEPLOYER_SERVICE_ACCOUNT --repo "$repository" --env Production --body "$production_deployer"

echo "Configured keyless GCP identifiers for GitHub Preview and Production environments"
