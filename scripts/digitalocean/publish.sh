#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"
source "$repo_root/scripts/digitalocean/common.sh"

[[ "${1:-}" == "--" ]] && shift
environment="${1:-staging}"
if [[ "$environment" != "staging" ]]; then
  echo "Direct publish currently supports staging only; production remains an explicit bootstrap and promotion." >&2
  exit 2
fi

expected_branch="codex/digitalocean-staging-preview"
current_branch="$(git branch --show-current)"
[[ "$current_branch" == "$expected_branch" ]] || {
  echo "Checkout $expected_branch before publishing staging." >&2
  exit 2
}

[[ -z "$(git status --short)" ]] || {
  echo "Commit or stash local changes before publishing staging." >&2
  exit 2
}

git fetch origin "$expected_branch" --tags
sha="$(git rev-parse HEAD)"
remote_sha="$(git rev-parse FETCH_HEAD)"
[[ "$sha" == "$remote_sha" ]] || {
  echo "Push $expected_branch before publishing staging." >&2
  exit 2
}

pnpm install --frozen-lockfile
pnpm verify
pnpm do:build

tag="jewelo-staging-$sha"
if git rev-parse -q --verify "refs/tags/$tag" >/dev/null; then
  [[ "$(git rev-list -n 1 "$tag")" == "$sha" ]] || {
    echo "$tag points at a different commit." >&2
    exit 1
  }
else
  git tag "$tag" "$sha"
fi

if ! git ls-remote --exit-code --tags origin "refs/tags/$tag" >/dev/null 2>&1; then
  git push origin "refs/tags/$tag"
fi

if remote_release_sha="$(git ls-remote --heads origin "refs/heads/$tag" | awk '{print $1}')"; then
  if [[ -n "$remote_release_sha" && "$remote_release_sha" != "$sha" ]]; then
    echo "Release branch $tag points at a different commit." >&2
    exit 1
  fi
fi
if [[ -z "${remote_release_sha:-}" ]]; then
  git push origin "$sha:refs/heads/$tag"
fi

env_file="${JEWELO_ENV_FILE:-$repo_root/.env}"
env_files=("$env_file")
local_env_file="$(dirname "$env_file")/.env.local"
[[ -r "$local_env_file" ]] && env_files+=("$local_env_file")

load_digitalocean_token
JEWELO_SOURCE_REF="$tag" pnpm do:bootstrap -- staging "${env_files[@]}"

app_id="$(find_app_id jewelo-staging)"
read -r service_url deployment_id < <(
  doctl apps get "$app_id" --output json | node -e '
    let input = "";
    process.stdin.on("data", (chunk) => input += chunk);
    process.stdin.on("end", () => {
      const value = JSON.parse(input);
      const app = Array.isArray(value) ? value[0] : value;
      process.stdout.write(`${app.default_ingress} ${app.active_deployment?.id ?? "unknown"}`);
    });
  '
)

bash scripts/digitalocean/smoke.sh "$service_url"
echo "staging_url=$service_url"
echo "commit_sha=$sha"
echo "source_tag=$tag"
echo "deployment_id=$deployment_id"
