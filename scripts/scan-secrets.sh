#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

pattern='(sk-[A-Za-z0-9_-]{20,}|sb_(secret|publishable)_[A-Za-z0-9_-]{20,}|eyJ[A-Za-z0-9_-]{40,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----)'
if git ls-files --cached --others --exclude-standard -z | xargs -0 rg "$pattern"; then
  echo "Potential committed credential material detected." >&2
  exit 1
fi

if git ls-files --cached --others --exclude-standard | grep -E '(^|/)(\.env($|\.)|[^/]+\.(pem|key)$)' | grep -vE '(^|/)\.env\.example$' >/dev/null; then
  echo "Secret-bearing file is tracked or eligible to be committed." >&2
  exit 1
fi

echo "Secret scan passed."
