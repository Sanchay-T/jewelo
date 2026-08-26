#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
source "$repo_root/scripts/digitalocean/common.sh"
load_digitalocean_token

repository="Sanchay-T/jewelo"
for github_environment in Preview Production; do
  printf '%s' "$DIGITALOCEAN_ACCESS_TOKEN" |
    hq-gh secret set DIGITALOCEAN_ACCESS_TOKEN --repo "$repository" --env "$github_environment"
  hq-gh variable set DIGITALOCEAN_PROJECT_ID --repo "$repository" --env "$github_environment" --body "$JEWELO_DO_PROJECT_ID"
done

hq-gh variable set DIGITALOCEAN_APP_NAME --repo "$repository" --env Preview --body jewelo-staging
hq-gh variable set DIGITALOCEAN_APP_NAME --repo "$repository" --env Production --body jewelo-production
echo "Configured DigitalOcean deployment access for GitHub Preview and Production environments"
