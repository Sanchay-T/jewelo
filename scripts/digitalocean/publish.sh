#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

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
remote_sha="$(git rev-parse "origin/$expected_branch")"
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

deployment_output="$(bash scripts/digitalocean/deploy.sh staging "$tag")"
service_url="$(awk -F= '$1 == "service_url" { print $2 }' <<<"$deployment_output")"
deployment_id="$(awk -F= '$1 == "deployment_id" { print $2 }' <<<"$deployment_output")"
[[ -n "$service_url" && -n "$deployment_id" ]] || {
  echo "DigitalOcean deployment did not return its URL and deployment ID." >&2
  exit 1
}

bash scripts/digitalocean/smoke.sh "$service_url"
echo "staging_url=$service_url"
echo "commit_sha=$sha"
echo "source_tag=$tag"
echo "deployment_id=$deployment_id"
