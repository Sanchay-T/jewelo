#!/usr/bin/env bash
# Nightly logical backup of the Jewelo Supabase database.
#
# What it takes: the `public` schema, schema and data, custom format.
# What it deliberately does not take: `auth`, `storage`, and the storage bucket
# objects. See scripts/backups/README.md for why and for what that costs on a
# restore.
#
# Usage: bash scripts/backups/dump.sh
# Env:   JEWELO_BACKUP_DIR (default ~/backups/jewelo)
#        JEWELO_BACKUP_RETENTION_DAYS (default 14)
#        JEWELO_BACKUP_ENV_FILE, JEWELO_BACKUP_URL_VAR (see lib.sh)

set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

BACKUP_DIR="${JEWELO_BACKUP_DIR:-$HOME/backups/jewelo}"
RETENTION_DAYS="${JEWELO_BACKUP_RETENTION_DAYS:-14}"
SCHEMAS=(public)

command -v pg_dump >/dev/null 2>&1 || die "pg_dump not on PATH (brew install postgresql@17)"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

load_pooler_env

stamp="$(date '+%Y%m%d-%H%M%S')"
target="$BACKUP_DIR/jewelo-public-$stamp.dump"
partial="$target.partial"
started=$(date +%s)

log "pg_dump -> $target (schemas: ${SCHEMAS[*]})"
# Security review 2 L-5: pg_dump creates the partial file itself, under whatever
# umask the caller had, and the dump carries every shopper's contact detail. The
# chmod below only closes the window after the write; this closes it before.
umask 077
args=(--format=custom --compress=6 --no-owner --no-privileges --file="$partial")
for schema in "${SCHEMAS[@]}"; do args+=(--schema="$schema"); done
# No connection arguments: PG* env vars carry the credentials.
if ! pg_dump "${args[@]}"; then
  rm -f "$partial"
  die "pg_dump failed"
fi

mv "$partial" "$target"
chmod 600 "$target"
( cd "$BACKUP_DIR" && shasum -a 256 "$(basename "$target")" > "$(basename "$target").sha256" )
elapsed=$(( $(date +%s) - started ))
size="$(du -h "$target" | cut -f1)"

# A dump that restores nothing is worse than no dump: assert the TOC is readable
# and carries the tables the app cannot run without.
toc="$(pg_restore --list "$target" | grep -cE 'TABLE DATA public (designs|generation_runs|generation_tasks|preview_requests|identity_artifacts|assets) ' || true)"
[ "$toc" -ge 6 ] || die "dump is missing core table data ($toc of 6 found)"

log "ok: $size in ${elapsed}s, $toc core tables present"

if [ "$RETENTION_DAYS" -gt 0 ]; then
  pruned=0
  while IFS= read -r old; do
    rm -f "$old" "$old.sha256"
    pruned=$((pruned + 1))
    log "pruned $(basename "$old")"
  done < <(find "$BACKUP_DIR" -maxdepth 1 -name 'jewelo-public-*.dump' -type f -mtime "+$RETENTION_DAYS")
  log "retention: ${RETENTION_DAYS}d, pruned $pruned"
fi

log "done"
