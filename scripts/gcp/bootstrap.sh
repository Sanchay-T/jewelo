#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
source "$repo_root/scripts/gcp/common.sh"

organization_id="${JEWELO_GCP_ORGANIZATION_ID:-683049235186}"
billing_account_id="${1:-${JEWELO_GCP_BILLING_ACCOUNT_ID:-}}"
state_bucket="${JEWELO_GCP_STATE_BUCKET:-${JEWELO_GCP_PROJECT_ID}-tfstate}"

if [[ -z "$billing_account_id" ]]; then
  echo "usage: pnpm gcp:bootstrap -- BILLING_ACCOUNT_ID" >&2
  exit 2
fi

if ! gcloud projects describe "$JEWELO_GCP_PROJECT_ID" >/dev/null 2>&1; then
  gcloud projects create "$JEWELO_GCP_PROJECT_ID" \
    --name="Jewelo Cloud" \
    --organization="$organization_id"
fi

if [[ "$(gcloud billing projects describe "$JEWELO_GCP_PROJECT_ID" --format='value(billingEnabled)' 2>/dev/null || true)" != "True" ]]; then
  gcloud billing projects link "$JEWELO_GCP_PROJECT_ID" \
    --billing-account="$billing_account_id"
fi

gcloud services enable \
  cloudresourcemanager.googleapis.com \
  serviceusage.googleapis.com \
  --project="$JEWELO_GCP_PROJECT_ID"

if ! gcloud storage buckets describe "gs://$state_bucket" --project="$JEWELO_GCP_PROJECT_ID" >/dev/null 2>&1; then
  gcloud storage buckets create "gs://$state_bucket" \
    --project="$JEWELO_GCP_PROJECT_ID" \
    --location="$JEWELO_GCP_REGION" \
    --uniform-bucket-level-access \
    --public-access-prevention
  gcloud storage buckets update "gs://$state_bucket" --versioning
fi

terraform -chdir="$repo_root/infra/gcp" init \
  -reconfigure \
  -backend-config="bucket=$state_bucket"

terraform -chdir="$repo_root/infra/gcp" apply \
  -var="project_id=$JEWELO_GCP_PROJECT_ID" \
  -var="region=$JEWELO_GCP_REGION" \
  -var="billing_account_id=$billing_account_id"

echo "GCP foundation applied to $JEWELO_GCP_PROJECT_ID"
