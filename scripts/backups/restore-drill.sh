#!/usr/bin/env bash
# Restore the newest Jewelo dump into a throwaway database and read it back.
#
# A backup nobody has restored is a rumour. This script proves the newest file
# in ~/backups/jewelo can be turned back into a database that answers the same
# query `/api/state` answers.
#
# Engine order: a local Homebrew Postgres if one is running, else a
# `postgres:17` Docker container. If neither exists the script says exactly
# what is missing and exits 2 without pretending the drill passed.
#
# Usage: bash scripts/backups/restore-drill.sh [dump-file] [design-id]
# Env:   JEWELO_BACKUP_DIR, JEWELO_DRILL_KEEP=1 (do not drop the scratch db)

set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

BACKUP_DIR="${JEWELO_BACKUP_DIR:-$HOME/backups/jewelo}"
DUMP="${1:-}"
DESIGN_ID="${2:-}"
KEEP="${JEWELO_DRILL_KEEP:-0}"

if [ -z "$DUMP" ]; then
  DUMP="$(find "$BACKUP_DIR" -maxdepth 1 -name 'jewelo-public-*.dump' -type f | sort | tail -1)"
fi
[ -n "$DUMP" ] && [ -f "$DUMP" ] || die "no dump found in $BACKUP_DIR"
log "dump: $DUMP ($(du -h "$DUMP" | cut -f1))"

# ---------------------------------------------------------------- engine ----
ENGINE=""
CONTAINER="jewelo-restore-drill"
# JEWELO_DRILL_ENGINE=local|docker forces one branch; unset picks the first
# that answers. Both branches are exercised, so neither rots unnoticed.
FORCED="${JEWELO_DRILL_ENGINE:-}"
if [ "$FORCED" = docker ]; then
  command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1 || die "JEWELO_DRILL_ENGINE=docker but no usable Docker daemon"
  ENGINE="docker"
elif [ "$FORCED" = local ]; then
  pg_isready -q 2>/dev/null || die "JEWELO_DRILL_ENGINE=local but no local Postgres answers pg_isready"
  ENGINE="local"
elif command -v pg_isready >/dev/null 2>&1 && pg_isready -q -h /tmp 2>/dev/null; then
  ENGINE="local"
elif command -v pg_isready >/dev/null 2>&1 && pg_isready -q -h 127.0.0.1 -p 5432 2>/dev/null; then
  ENGINE="local"
elif command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  ENGINE="docker"
else
  cat >&2 <<'MISSING'
NEEDS SANCHAY: no scratch Postgres available on this machine.
  - no local Postgres answering pg_isready (install: brew install postgresql@17 && brew services start postgresql@17), and
  - no usable Docker daemon (start Docker Desktop, or install it).
The dump itself was not touched. Drill not run.
MISSING
  exit 2
fi
log "engine: $ENGINE"

SCRATCH="jewelo_drill_$(date '+%Y%m%d_%H%M%S')"

# Every local client runs with the PG* variables stripped, so a drill can never
# reach the production pooler even if it inherits an environment from dump.sh.
local_pg() { env -u PGHOST -u PGPORT -u PGUSER -u PGPASSWORD -u PGDATABASE -u PGSSLMODE -u PGOPTIONS "$@"; }

# Admin psql / pg_restore wrappers. `local` uses the invoking Unix user, which
# on a Homebrew install is a superuser; `docker` uses the container's postgres.
psql_admin() { # psql_admin <db> [args...]
  local db="$1"; shift
  if [ "$ENGINE" = local ]; then
    local_pg psql -X -v ON_ERROR_STOP=1 -d "$db" "$@"
  else
    docker exec -i -e PGPASSWORD=drill "$CONTAINER" psql -X -v ON_ERROR_STOP=1 -U postgres -d "$db" "$@"
  fi
}
restore_section() { # restore_section <section>
  if [ "$ENGINE" = local ]; then
    local_pg pg_restore --no-owner --no-privileges --exit-on-error --section="$1" -d "$SCRATCH" "$DUMP"
  else
    docker exec -i -e PGPASSWORD=drill "$CONTAINER" pg_restore --no-owner --no-privileges --exit-on-error \
      --section="$1" -U postgres -d "$SCRATCH" < "$DUMP"
  fi
}

cleanup() {
  local rc=$?
  if [ "$KEEP" != "1" ]; then
    if [ "$ENGINE" = local ]; then
      psql_admin postgres -q -c "drop database if exists \"$SCRATCH\" with (force)" >/dev/null 2>&1 || true
    elif [ "$ENGINE" = docker ]; then
      docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
    fi
    log "scratch removed"
  else
    log "scratch kept: $SCRATCH"
  fi
  exit $rc
}

if [ "$ENGINE" = docker ]; then
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD=drill postgres:17 >/dev/null
  for _ in $(seq 1 60); do
    docker exec "$CONTAINER" pg_isready -q -U postgres && break
    sleep 1
  done
fi
trap cleanup EXIT

started=$(date +%s)
psql_admin postgres -q -c "create database \"$SCRATCH\"" >/dev/null
log "scratch database: $SCRATCH"

# ------------------------------------------------------- Supabase scaffold ---
# The dump carries only `public`. Supabase's platform objects that `public`
# depends on - the auth roles named in every policy, `auth.uid()`, the
# `extensions` schema pgcrypto lives in, and the `auth.users` table 17 foreign
# keys point at - are recreated here as the thinnest possible stubs so the
# restore is a real test of the dump rather than a test of the platform.
psql_admin "$SCRATCH" -q <<'SQL' >/dev/null
-- The dump creates `public` itself; a fresh database already has one.
drop schema if exists public cascade;
do $$
declare r text;
begin
  foreach r in array array['anon','authenticated','service_role','authenticator','supabase_admin','supabase_auth_admin','dashboard_user'] loop
    if not exists (select 1 from pg_roles where rolname = r) then
      execute format('create role %I nologin', r);
    end if;
  end loop;
end $$;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key,
  email text,
  is_anonymous boolean default true,
  created_at timestamptz default now()
);
create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
create or replace function auth.role() returns text language sql stable as $$ select null::text $$;
create or replace function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
create schema if not exists storage;
create table if not exists storage.buckets (id text primary key, name text);
create table if not exists storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
SQL
log "scaffold created (roles, auth stub, extensions, storage stub)"

# -------------------------------------------------------------- restore -----
# Three sections, because the foreign keys in post-data point at `auth.users`,
# which the dump does not contain. Between data and post-data the referenced
# principal ids are synthesised from the restored rows themselves, so the real
# constraints are created and validated instead of skipped.
restore_section pre-data
log "pre-data restored"
restore_section data
log "data restored"

post_sql="$(mktemp)"
if [ "$ENGINE" = local ]; then
  pg_restore --no-owner --no-privileges --section=post-data -f - "$DUMP" > "$post_sql"
else
  docker exec -i "$CONTAINER" pg_restore --no-owner --no-privileges --section=post-data -f - < "$DUMP" > "$post_sql"
fi
backfill="$(mktemp)"
# The foreign keys arrive as two-line ALTER TABLE statements, so this is a
# whole-file regex rather than a per-line one.
python3 - "$post_sql" > "$backfill" <<'PYBACKFILL'
import re, sys

sql = open(sys.argv[1]).read()
pattern = re.compile(
    r"ALTER TABLE ONLY (\S+)\s+ADD CONSTRAINT \S+ FOREIGN KEY \(([^)]+)\) REFERENCES auth\.users\(",
    re.MULTILINE,
)
seen = set()
for table, column in pattern.findall(sql):
    if (table, column) in seen:
        continue
    seen.add((table, column))
    print(
        "insert into auth.users (id) select distinct %s from %s "
        "where %s is not null on conflict do nothing;" % (column, table, column)
    )
PYBACKFILL
log "auth.users backfill statements: $(wc -l < "$backfill" | tr -d ' ')"
psql_admin "$SCRATCH" -q -f - < "$backfill" >/dev/null
psql_admin "$SCRATCH" -q -f - < "$post_sql" >/dev/null
log "post-data restored (constraints, indexes, policies, triggers)"
rm -f "$post_sql" "$backfill"
elapsed=$(( $(date +%s) - started ))
log "restore completed in ${elapsed}s"

# -------------------------------------------------------------- readback ----
readback="$(dirname "${BASH_SOURCE[0]}")/readback.sql"
[ -f "$readback" ] || die "readback.sql missing next to this script"
echo
psql_admin "$SCRATCH" -v design_id="$DESIGN_ID" -f - < "$readback"
echo
log "drill passed"
