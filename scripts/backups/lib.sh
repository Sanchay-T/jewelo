#!/usr/bin/env bash
# Shared helpers for the Jewelo backup scripts.
#
# The one rule this file exists to enforce: a Postgres connection string is a
# secret and must never reach `ps`, a log line, or a shell transcript. It is
# read from `.env` by variable name, parsed into PG* environment variables, and
# handed to `pg_dump` / `psql` through the environment only. No command line in
# these scripts ever carries a URL, a user, or a password.

set -euo pipefail

log() { printf '%s %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"; }
die() { log "ERROR: $*" >&2; exit 1; }

# Repo root, resolved from this file so cron and launchd do not need a cwd.
backup_repo_root() {
  cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd
}

# Read one variable out of an env file without sourcing the whole file and
# without printing it. Prints the value on stdout for capture only.
read_env_var() {
  local env_file="$1" name="$2" line value
  [ -r "$env_file" ] || die "env file not readable: $env_file"
  line="$(grep -E "^[[:space:]]*(export[[:space:]]+)?${name}=" "$env_file" | tail -1 || true)"
  [ -n "$line" ] || return 1
  value="${line#*=}"
  # strip one layer of matching quotes and any trailing CR
  value="${value%$'\r'}"
  case "$value" in
    \"*\") value="${value#\"}"; value="${value%\"}" ;;
    \'*\') value="${value#\'}"; value="${value%\'}" ;;
  esac
  printf '%s' "$value"
}

# Turn a postgres:// URL into exported PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE
# plus any query parameters Postgres understands (sslmode, options).
# The URL is passed to python on stdin, never as an argument.
export_pg_env_from_url() {
  local url="$1" tmp
  command -v python3 >/dev/null 2>&1 || die "python3 is required to parse the connection URL"
  tmp="$(mktemp)"
  chmod 600 "$tmp"
  # Security review 2 L-5: the file below holds PGPASSWORD in clear text. Under
  # `set -e` a failure inside the sourcing left it behind for the life of the
  # machine's temp directory; RETURN fires on every exit from this function,
  # including that one.
  # The trap clears itself: a RETURN trap set inside a function stays in the
  # shell's trap table and would otherwise fire again when the caller returns,
  # where `tmp` is out of scope and `set -u` turns that into an error.
  trap 'rm -f "${tmp:-}"; trap - RETURN' RETURN
  printf '%s' "$url" | python3 -c '
import sys, shlex
from urllib.parse import urlsplit, unquote, parse_qsl
u = urlsplit(sys.stdin.read().strip())
if u.scheme not in ("postgres", "postgresql"):
    sys.exit("connection URL is not a postgres URL")
out = []
def put(k, v):
    if v not in (None, ""):
        out.append("export %s=%s" % (k, shlex.quote(str(v))))
put("PGHOST", u.hostname)
put("PGPORT", u.port or 5432)
put("PGUSER", unquote(u.username or ""))
put("PGPASSWORD", unquote(u.password or ""))
put("PGDATABASE", unquote(u.path.lstrip("/")) or "postgres")
q = dict(parse_qsl(u.query))
put("PGSSLMODE", q.get("sslmode", "require"))
if q.get("options"):
    put("PGOPTIONS", q["options"])
sys.stdout.write("\n".join(out) + "\n")
' > "$tmp" || { rm -f "$tmp"; die "could not parse the connection URL"; }
  # shellcheck disable=SC1090
  . "$tmp"
  rm -f "$tmp"
}

# Load the Supabase session-pooler connection into the environment.
# JEWELO_BACKUP_URL_VAR names the variable in .env; nothing prints its value.
load_pooler_env() {
  local env_file="${JEWELO_BACKUP_ENV_FILE:-$(backup_repo_root)/.env}"
  local var="${JEWELO_BACKUP_URL_VAR:-SUPABASE_DB_POOLER_URL}"
  local url
  url="$(read_env_var "$env_file" "$var")" || die "$var not found in $env_file"
  [ -n "$url" ] || die "$var is empty in $env_file"
  export_pg_env_from_url "$url"
  unset url
  log "connection loaded from \$$var (host ${PGHOST%%.*}..., value not printed)"
}
