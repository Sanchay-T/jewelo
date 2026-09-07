#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
source "$repo_root/scripts/gcp/common.sh"

environment="${1:-}"
image="${2:-}"
require_environment "$environment"

if [[ -z "$image" ]]; then
  echo "usage: pnpm gcp:deploy -- staging|production IMAGE_REFERENCE" >&2
  exit 2
fi

case "$image" in
  "$JEWELO_GCP_REGION-docker.pkg.dev/$JEWELO_GCP_PROJECT_ID/$JEWELO_GCP_REPOSITORY/web:"*|\
  "$JEWELO_GCP_REGION-docker.pkg.dev/$JEWELO_GCP_PROJECT_ID/$JEWELO_GCP_REPOSITORY/web@sha256:"*) ;;
  *)
    echo "image must come from the Jewelo Artifact Registry repository" >&2
    exit 2
    ;;
esac

service="jewelo-$environment"
runtime_service_account="jewelo-runtime-$environment@$JEWELO_GCP_PROJECT_ID.iam.gserviceaccount.com"

if [[ "$environment" == "staging" ]]; then
  cpu=2
  memory="2Gi"
  min_instances=0
  max_instances=3
else
  cpu=1
  memory="1Gi"
  min_instances=1
  max_instances=20
fi

secret_bindings=()
for env_name in "${web_config_names[@]}"; do
  id="$(secret_id "$environment" "$env_name")"
  version="$(latest_secret_version "$id")"
  if [[ -n "$version" ]]; then
    secret_bindings+=("$env_name=$id:$version")
  elif [[ " ${required_web_config_names[*]} " == *" $env_name "* ]]; then
    echo "required secret has no enabled version: $id" >&2
    exit 1
  fi
done

set_secrets="$(IFS=,; printf '%s' "${secret_bindings[*]}")"
deploy_args=(
  run deploy "$service"
  --project="$JEWELO_GCP_PROJECT_ID"
  --region="$JEWELO_GCP_REGION"
  --platform=managed
  --image="$image"
  --service-account="$runtime_service_account"
  --cpu="$cpu"
  --memory="$memory"
  --min="$min_instances"
  --max="$max_instances"
  --concurrency=40
  --timeout=60s
  --cpu-boost
  --allow-unauthenticated
  --set-secrets="$set_secrets"
  --quiet
)

if [[ "$environment" == "production" ]]; then
  tag="candidate-${GITHUB_SHA:-manual}"
  tag="${tag:0:24}"
  deploy_args+=(--no-traffic --tag="$tag")
fi

gcloud "${deploy_args[@]}"

service_json="$(gcloud run services describe "$service" \
  --project="$JEWELO_GCP_PROJECT_ID" \
  --region="$JEWELO_GCP_REGION" \
  --format=json)"

service_url="$(node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));process.stdout.write(d.status.url)' <<<"$service_json")"
revision="$(node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));process.stdout.write(d.status.latestCreatedRevisionName)' <<<"$service_json")"
candidate_url="$service_url"

if [[ "$environment" == "production" ]]; then
  candidate_url="$(TAG="$tag" node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));const row=d.status.traffic.find((x)=>x.tag===process.env.TAG);if(!row?.url)process.exit(1);process.stdout.write(row.url)' <<<"$service_json")"
fi

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "service_url=$service_url"
    echo "candidate_url=$candidate_url"
    echo "revision=$revision"
  } >>"$GITHUB_OUTPUT"
fi

echo "service_url=$service_url"
echo "candidate_url=$candidate_url"
echo "revision=$revision"
