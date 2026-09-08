# Backups (P7-7)

The Supabase project `jggalwuvpcqoenhirmnl` is on the Free plan.
Free has no backups at all: `pitr_enabled: false`, no daily snapshot, no restore point.
A dropped table or a bad migration today is unrecoverable.

This directory is the stopgap: a nightly logical dump taken from `home-mini` over the session pooler, plus a restore drill that proves the file can be turned back into a database the app can read.

## Files

| File | What it is |
| --- | --- |
| `dump.sh` | Nightly `pg_dump` of the `public` schema to `~/backups/jewelo/jewelo-public-<stamp>.dump`, with a SHA-256 sidecar and a 14-day prune. |
| `restore-drill.sh` | Restores the newest dump into a throwaway database and runs `readback.sql`. Drops the scratch database afterwards unless `JEWELO_DRILL_KEEP=1`. |
| `readback.sql` | The proof query: row counts, the columns `/api/state` reads, and the same ten-table design-scoped read that route performs. |
| `com.jewelo.backup.plist` | The launchd agent, 03:30 local time on `home-mini` (which runs IST). |
| `lib.sh` | Reads the connection string from `.env` by variable name and turns it into `PG*` environment variables. |

## The connection string never appears on a command line

`lib.sh` reads `SUPABASE_DB_POOLER_URL` out of `.env` by name, parses it in a subprocess that receives it on stdin, and exports `PGHOST` / `PGPORT` / `PGUSER` / `PGPASSWORD` / `PGDATABASE` / `PGSSLMODE`.
`pg_dump` is then invoked with no connection arguments.
Nothing in these scripts puts a password into `ps`, into a log, or into a shell transcript.
Override the variable name with `JEWELO_BACKUP_URL_VAR` and the file with `JEWELO_BACKUP_ENV_FILE`.

## What is backed up

- The whole `public` schema: schema and data, custom format, `--no-owner --no-privileges`.
  That is every table the product owns - `designs`, `design_drafts`, `design_revisions`, `generation_runs`, `generation_tasks`, `assets`, `identity_artifacts`, `preview_requests`, `price_snapshots`, `quotes`, `orders`, `audit_events`, the prompt registry, the runtime policy and usage tables - with their constraints, indexes, RLS policies, triggers and functions.
- `dump.sh` refuses to keep a file whose table of contents is missing any of the six core tables, so a dump that silently captured nothing is never left behind looking valid.

## What is not backed up, and what that costs

- **`auth`.** Deliberate. `auth.users` holds password hashes, refresh tokens and the operator identity; a copy of it sitting on a Mac is a larger risk than its recovery value, because 94 of the 94 principals are disposable anonymous sign-ins. Cost on restore: the `owner_principal_id` foreign keys have nothing to point at. `restore-drill.sh` handles this by synthesising the referenced ids into a stub `auth.users` before it creates the constraints; a real restore into a new project would do the same, or re-issue anonymous principals.
- **`storage` (schema and objects).** The stencils, stills and motion previews are files in Supabase Storage, not rows. The dump keeps `assets.bucket_id` and `assets.object_path`, so a restored database points at objects that must still exist in the bucket. If the bucket is lost too: the stencil for a name is deterministic and regenerates for free from the design row; the four stills and the preview do not, and would have to be re-photographed by re-running the pipeline for that design, which is a paid provider call per view. The six style anchors are outside the database entirely (`~/hq/projects/devonel/caleums-private/style-anchors-v1/` on the laptop, `~/.codex/state/jewelo/caleums-style-anchors/v1/` on `home-mini`).
- **Supabase platform configuration**: auth providers, rate limits, bucket policies, edge settings. These live in the dashboard and in `docs/DIGITALOCEAN-DEPLOYMENT.md`, not in a dump.
- **The `inngest` schema** used by the queue. In-flight work is not a thing a nightly dump can save; P7-6 covers restart recovery.

## Retention and where the files live

`~/backups/jewelo/` on `home-mini`, mode 700, dumps mode 600.
Files older than 14 days are removed on every run (`JEWELO_BACKUP_RETENTION_DAYS`).
A dump is roughly 470 KB today, so 14 days is about 7 MB.

The dumps contain customer names (`designs.name`) and request contact details (`preview_requests`).
They are personal data: keep the directory local, never commit one, never copy one into the repository or a ticket.
`backup.log` is appended to by launchd and is not pruned; truncate it if it ever matters.

## Schedule

```sh
cp scripts/backups/com.jewelo.backup.plist ~/Library/LaunchAgents/
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.jewelo.backup.plist
launchctl enable gui/$(id -u)/com.jewelo.backup
launchctl list | grep jewelo          # verify
launchctl kickstart -k gui/$(id -u)/com.jewelo.backup   # run once now
launchctl bootout gui/$(id -u)/com.jewelo.backup        # remove
```

Installed and loaded on `home-mini` on 2026-09-09.
`home-mini` sleeps; launchd runs a missed 03:30 as soon as the machine is awake again, so a night with the Mac shut down produces a late dump rather than no dump.

## Restore

### Drill (weekly, and after any schema change)

```sh
export PATH=/opt/homebrew/bin:$PATH
cd ~/hq/projects/devonel/jewelo
bash scripts/backups/restore-drill.sh                 # newest dump, newest design
bash scripts/backups/restore-drill.sh "" <design-id>  # a specific design
```

The drill uses the local Homebrew Postgres if one answers `pg_isready`, otherwise a `postgres:17` Docker container, and says exactly what is missing and exits 2 if neither exists.
It restores in three sections - pre-data, data, post-data - because the foreign keys in post-data point at `auth.users`, which the dump does not carry; between data and post-data it synthesises the referenced principal ids so the real constraints are created and validated rather than skipped.

`readback.sql` then runs the same read `apps/web/src/app/api/state/route.ts` performs for `GET /api/state?designId=<id>`: the same ten tables, the same design scoping, `generation_tasks` scoped through its runs, and the asset projection the route signs.
Note what this does and does not prove: it proves the restored database answers that query with the right rows and columns.
It does not run the HTTP route - that would need a second Next.js app pointed at the scratch database, which this drill does not stand up.

### The scratch database holds real customer data

The dump is production data, so the restored scratch database is production data too: shopper names on `designs`, and on `preview_requests` the phone number or email a customer left in the shop.
As soon as the restore completes the drill overwrites `preview_requests.contact` with `{"channel":"masked","value":""}`, before the readback reads anything; the row counts the readback checks are unaffected.
`JEWELO_DRILL_UNMASKED=1` keeps the real values, for the one case that needs them - pulling a customer's request back out of a backup.
By default the whole database is dropped at the end of the run.
`JEWELO_DRILL_KEEP=1` leaves it on the machine with no expiry, so drop it yourself when you are done:

```sh
dropdb jewelo_drill_<stamp>                 # local Postgres
docker rm -f jewelo-restore-drill           # Docker engine
psql -l | grep jewelo_drill                 # what is still lying around
```

### Real recovery into a new Supabase project

1. Create the project, set `SUPABASE_DB_POOLER_URL` in `.env` to the new pooler string.
2. `corepack pnpm db:push` to apply `supabase/migrations/` - the migrations, not the dump, are the schema source of truth.
3. Load the data only, letting the new schema stand:
   `pg_restore --data-only --disable-triggers --no-owner --no-privileges -d "<new db>" <dump>`
   (run it with `PG*` env vars as `lib.sh` does, not with the URL on the command line).
4. Re-create principals, or accept that `owner_principal_id` values point at users that no longer exist; anonymous sign-in issues new ones.
5. Re-upload or re-generate the bucket objects; see "what is not backed up" above.
6. `corepack pnpm db:types`, then redeploy.

## The alternative: Supabase Pro (DS-1, Sanchay's call)

Pro on this project would give daily backups with 7-day retention and point-in-time recovery as an add-on, taken by Supabase, off this machine, without a Mac that has to be awake.
That is strictly better than this directory and it is a billing decision, not an engineering one.
Two things push the same way: the Devonel organisation is over the Free egress allowance, and every project in it returns 402 after 29 September 2026 unless the plan changes or the project moves.
Until that is decided, these scripts are the only backup that exists, so keep the drill honest: run it weekly and read the row counts.
