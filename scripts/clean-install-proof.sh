#!/usr/bin/env bash
set -euo pipefail
root="$(git rev-parse --show-toplevel)"
proof_dir="$(mktemp -d -t jewelo-clean-proof.XXXXXX)"
cleanup() { rm -rf "$proof_dir"; }
trap cleanup EXIT

git clone --quiet --local --no-hardlinks "$root" "$proof_dir/repo"
cd "$proof_dir/repo"
git checkout --quiet "$(git -C "$root" branch --show-current)"
corepack enable
pnpm install --frozen-lockfile
pnpm verify

echo "Clean-checkout install and verification passed."
