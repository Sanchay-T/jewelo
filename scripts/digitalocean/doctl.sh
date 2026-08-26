#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
source "$repo_root/scripts/digitalocean/common.sh"
load_digitalocean_token
[[ "${1:-}" == "--" ]] && shift
exec doctl "$@"
