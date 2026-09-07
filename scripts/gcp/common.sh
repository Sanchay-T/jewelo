#!/usr/bin/env bash
set -euo pipefail

JEWELO_GCP_PROJECT_ID="${JEWELO_GCP_PROJECT_ID:-jewelo-cloud-lhq-20260827}"
JEWELO_GCP_REGION="${JEWELO_GCP_REGION:-asia-south1}"
JEWELO_GCP_REPOSITORY="${JEWELO_GCP_REPOSITORY:-jewelo}"

readonly JEWELO_GCP_PROJECT_ID JEWELO_GCP_REGION JEWELO_GCP_REPOSITORY

web_config_names=(
  NEXT_PUBLIC_APP_URL
  NEXT_PUBLIC_JEWELO_DATA_MODE
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  NEXT_PUBLIC_POSTHOG_KEY
  NEXT_PUBLIC_POSTHOG_HOST
  NEXT_PUBLIC_SENTRY_DSN
  SUPABASE_URL
  SUPABASE_PUBLISHABLE_KEY
  SUPABASE_SERVICE_ROLE_KEY
  SHOPIFY_STORE_DOMAIN
  SHOPIFY_CLIENT_ID
  SHOPIFY_CLIENT_SECRET
  SHOPIFY_WEBHOOK_SECRET
  OPERATOR_EMAIL
  OPERATOR_PASSPHRASE
  OPERATOR_SESSION_SECRET
)

required_web_config_names=(
  NEXT_PUBLIC_APP_URL
  NEXT_PUBLIC_JEWELO_DATA_MODE
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
)

require_environment() {
  case "${1:-}" in
    staging|production) ;;
    *)
      echo "environment must be staging or production" >&2
      exit 2
      ;;
  esac
}

secret_id() {
  local environment="$1"
  local env_name="$2"
  printf '%s-%s\n' "$environment" "$(printf '%s' "$env_name" | tr '[:upper:]_' '[:lower:]-')"
}

latest_secret_version() {
  local secret="$1"
  gcloud secrets versions list "$secret" \
    --project="$JEWELO_GCP_PROJECT_ID" \
    --filter='state=ENABLED' \
    --sort-by='~createTime' \
    --limit=1 \
    --format='value(name)'
}
