#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
source "$repo_root/scripts/digitalocean/common.sh"
load_digitalocean_token
export DIGITALOCEAN_API_TOKEN="${DIGITALOCEAN_API_TOKEN:-$DIGITALOCEAN_ACCESS_TOKEN}"

exec npx -y @digitalocean/mcp "$@"
