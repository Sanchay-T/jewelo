#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
source "$repo_root/scripts/gcp/common.sh"

environment="${1:-}"
revision="${2:-}"
require_environment "$environment"

if [[ -z "$revision" || "$revision" != "jewelo-$environment-"* ]]; then
  echo "usage: pnpm gcp:rollback -- staging|production EXACT_REVISION" >&2
  exit 2
fi

gcloud run services update-traffic "jewelo-$environment" \
  --project="$JEWELO_GCP_PROJECT_ID" \
  --region="$JEWELO_GCP_REGION" \
  --to-revisions="$revision=100" \
  --quiet

echo "jewelo-$environment now serves revision $revision"
