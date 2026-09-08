# Style anchor publication

`publish.mjs` puts the six approved Caleums style anchors into the private
`style-anchors` bucket and moves each profile pointer in `style_anchor_publications`
onto a real, checksummed release.

The PNGs are private brand reference and are never committed.
They live outside git together with the `manifest.json` that carries their sha256:
`~/hq/projects/devonel/caleums-private/style-anchors-v1/` on the laptop and
`~/.codex/state/jewelo/caleums-style-anchors/v1/` on `home-mini`.
The script only ever reads them from the directory it is given.

```bash
export PATH=$HOME/.local/share/mise/installs/node/24.18.1/bin:$PATH
STYLE_ANCHORS_DIR=~/hq/projects/devonel/caleums-private/style-anchors-v1 \
  node scripts/style-anchors/publish.mjs
```

`--verify-only` runs every check and the signed re-download and writes nothing.
`--json` prints the same result as a machine-readable summary.
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are read from the repository `.env`;
no value is printed.

Per anchor the script refuses before any write unless the sha256 on disk equals
the manifest and the manifest `sourceTaskId` equals `STYLE_ANCHOR_SOURCE_TASK_IDS`
in `packages/ai/src/prompt-registry.ts`, which is the id the run-creation SQL pins
a task to.
It then uploads to `style-anchors/<profile>/v1/<sourceTaskId>.png`, calls
`create_style_anchor_release` with `p_bucket_id='style-anchors'`, calls
`publish_style_anchor_release` with a compare-and-set against the current pointer,
and finally downloads the object again through a signed URL and re-hashes it,
which is the same two-step read `SupabasePresentationRepository.signedStyleAnchorUrl`
performs in `apps/jobs/src/presentation.ts`.

It is idempotent.
A rerun finds the published release whose checksum and object path already match
the manifest, re-verifies the stored bytes, and stops: no third version and no
second publication event.
A run that died between the create and the publish is repaired on the next run by
reusing the orphaned release rather than minting another version.

Readback:

```sql
select p.profile, r.version, r.status, r.bucket_id, r.object_path
from public.style_anchor_publications p
join public.style_anchor_releases r on r.id = p.release_id
order by p.profile;
```

The pooler role has an empty `search_path`, so schema-qualify the tables.
