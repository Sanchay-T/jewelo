#!/usr/bin/env node
// Publish the six approved Caleums style anchors into the private
// `style-anchors` bucket and the `style_anchor_*` registry.
//
// The PNGs are private brand reference and never enter this repository. They
// live outside git, together with the manifest that carries their sha256, and
// this script is pointed at that directory:
//
//   STYLE_ANCHORS_DIR=~/hq/projects/devonel/caleums-private/style-anchors-v1 \
//     node scripts/style-anchors/publish.mjs
//
// or `node scripts/style-anchors/publish.mjs <dir>`. Nothing is read from a
// committed copy, and no byte of an anchor is ever written back into the tree.
//
// Per anchor, in order, refusing before any write when a check fails:
//   1. sha256 of the file on disk equals the manifest entry;
//   2. the manifest's sourceTaskId equals STYLE_ANCHOR_SOURCE_TASK_IDS in
//      packages/ai/src/prompt-registry.ts, which is what the run creation SQL
//      pins a task to;
//   3. the bytes go to style-anchors/<profile>/v1/<sourceTaskId>.png with the
//      service role;
//   4. rpc/create_style_anchor_release with p_bucket_id='style-anchors' mints
//      version N+1 as `published`;
//   5. rpc/publish_style_anchor_release moves the profile pointer off the
//      seeded `missing` release (00000000-0000-0000-0000-00000000060N) with a
//      compare-and-set on the current pointer;
//   6. the object is downloaded again through a signed URL and re-hashed, so
//      what the jobs read back is proved to be the approved bytes.
//
// Idempotent. A rerun finds a published release for the profile whose checksum
// and object path already match the manifest, re-verifies the stored bytes and
// stops: no third version, no second publication event. A run that died between
// step 4 and step 5 is repaired by reusing the orphaned release instead of
// minting another.
//
// Flags:
//   --verify-only   run every check and the signed re-download, write nothing
//   --json          machine-readable summary on stdout
//
// Secrets: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are read from the
// repository .env (or the ambient environment). No value is ever printed.

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const BUCKET = "style-anchors";
const ANCHOR_VERSION = "v1";
const CREATED_BY = "operator:style-anchors-publish";
const APPROVAL_NOTE =
  "Approved Caleums style anchor v1 restored from the authorized private source; sha256 matched the signed manifest and the stored object was re-downloaded and re-hashed before publication.";

/** Manifest key -> registry profile. The order is the report order. */
const PROFILE_MAP = Object.freeze({
  worn: "image.worn",
  packshot: "image.packshot",
  macroGift: "image.macro_gift",
  darkEditorial: "image.dark_editorial",
  studioHero: "image.studio_hero",
  billboard: "image.billboard",
});

class PublishError extends Error {}

function fail(message) {
  throw new PublishError(message);
}

/** `.env` is the same file every other script here reads; ambient wins. */
async function loadEnvFile() {
  let text;
  try {
    text = await readFile(path.join(REPO_ROOT, ".env"), "utf8");
  } catch {
    return;
  }
  for (const line of text.split("\n")) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(
      line,
    );
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
      (value.startsWith("'") && value.endsWith("'") && value.length > 1)
    )
      value = value.slice(1, -1);
    process.env[key] = value;
  }
}

/**
 * The source task ids are read out of the TypeScript registry rather than
 * copied here, so this script cannot drift from the constant the SQL pins.
 */
async function readRegistrySourceTaskIds() {
  const file = path.join(
    REPO_ROOT,
    "packages",
    "ai",
    "src",
    "prompt-registry.ts",
  );
  const source = await readFile(file, "utf8");
  const block =
    /export const STYLE_ANCHOR_SOURCE_TASK_IDS\s*=\s*\{([\s\S]*?)\}\s*as const;/.exec(
      source,
    );
  if (!block) fail(`STYLE_ANCHOR_SOURCE_TASK_IDS not found in ${file}`);
  const ids = {};
  for (const entry of block[1].matchAll(
    /"([a-z_.]+)"\s*:\s*"([0-9a-f-]{36})"/g,
  ))
    ids[entry[1]] = entry[2];
  const expected = Object.values(PROFILE_MAP);
  const found = Object.keys(ids);
  if (
    found.length !== expected.length ||
    expected.some((profile) => !ids[profile])
  )
    fail(
      `STYLE_ANCHOR_SOURCE_TASK_IDS covers ${found.length} profiles, expected ${expected.join(", ")}`,
    );
  return ids;
}

function expandHome(value) {
  return value.startsWith("~")
    ? path.join(homedir(), value.slice(1))
    : path.resolve(value);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Supabase REST/storage with the service role. Never logs a header. */
class Supabase {
  #url;
  #key;
  constructor(url, key) {
    this.#url = url.replace(/\/+$/, "");
    this.#key = key;
  }
  get url() {
    return this.#url;
  }
  #headers(extra = {}) {
    return {
      apikey: this.#key,
      authorization: `Bearer ${this.#key}`,
      ...extra,
    };
  }
  async #send(pathname, init = {}) {
    const response = await fetch(`${this.#url}${pathname}`, {
      ...init,
      headers: this.#headers(init.headers),
    });
    if (!response.ok) {
      const body = (await response.text()).slice(0, 400);
      fail(`${init.method ?? "GET"} ${pathname} -> ${response.status} ${body}`);
    }
    return response;
  }
  async rest(pathname, init = {}) {
    const response = await this.#send(`/rest/v1${pathname}`, {
      ...init,
      headers: { "content-type": "application/json", ...init.headers },
    });
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }
  async rpc(name, body) {
    return this.rest(`/rpc/${name}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }
  static encodePath(objectPath) {
    const segments = objectPath.split("/");
    if (
      segments.some(
        (segment) => !segment || segment === "." || segment === "..",
      )
    )
      fail(`invalid object path ${objectPath}`);
    return segments.map((segment) => encodeURIComponent(segment)).join("/");
  }
  async upload(objectPath, bytes) {
    await this.#send(
      `/storage/v1/object/${BUCKET}/${Supabase.encodePath(objectPath)}`,
      {
        method: "POST",
        headers: { "content-type": "image/png", "x-upsert": "true" },
        body: bytes,
      },
    );
  }
  /** Signed URL then download, the same two steps the jobs take. */
  async downloadSigned(objectPath, expiresIn = 120) {
    const signed = await this.#send(
      `/storage/v1/object/sign/${BUCKET}/${Supabase.encodePath(objectPath)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ expiresIn }),
      },
    ).then((response) => response.json());
    const relative = signed.signedURL ?? signed.signedUrl;
    if (!relative) fail(`no signed URL for ${objectPath}`);
    const absolute = relative.startsWith("http")
      ? relative
      : `${this.#url}/storage/v1${relative}`;
    const response = await fetch(absolute);
    if (!response.ok)
      fail(`signed download of ${objectPath} -> ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const verifyOnly = argv.includes("--verify-only");
  const asJson = argv.includes("--json");
  const positional = argv.filter((value) => !value.startsWith("--"));
  await loadEnvFile();

  const dirValue = positional[0] ?? process.env.STYLE_ANCHORS_DIR;
  if (!dirValue)
    fail(
      "STYLE_ANCHORS_DIR (or a directory argument) is required; the anchors are private and are never committed",
    );
  const dir = expandHome(dirValue);
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl) fail("SUPABASE_URL is required");
  if (!serviceKey) fail("SUPABASE_SERVICE_ROLE_KEY is required");
  const supabase = new Supabase(supabaseUrl, serviceKey);

  const manifest = JSON.parse(
    await readFile(path.join(dir, "manifest.json"), "utf8"),
  );
  if (manifest.version !== ANCHOR_VERSION)
    fail(`manifest version ${manifest.version}, expected ${ANCHOR_VERSION}`);
  const registryIds = await readRegistrySourceTaskIds();

  const publications = await supabase.rest(
    "/style_anchor_publications?select=profile,release_id",
  );
  const pointerByProfile = new Map(
    publications.map((row) => [row.profile, row.release_id]),
  );
  const releases = await supabase.rest(
    "/style_anchor_releases?select=id,profile,version,status,source_task_id,bucket_id,object_path,checksum_sha256&order=profile,version",
  );

  console.error(
    `target ${supabase.url}  bucket ${BUCKET}  source ${dir}${verifyOnly ? "  (verify only)" : ""}`,
  );

  const results = [];
  for (const [key, profile] of Object.entries(PROFILE_MAP)) {
    const entry = manifest.anchors?.[key];
    if (!entry) fail(`manifest has no anchor "${key}"`);
    const sourceTaskId = registryIds[profile];
    if (entry.sourceTaskId !== sourceTaskId)
      fail(
        `${profile}: manifest sourceTaskId ${entry.sourceTaskId} does not equal STYLE_ANCHOR_SOURCE_TASK_IDS ${sourceTaskId}`,
      );
    const bytes = await readFile(path.join(dir, entry.file));
    const localSha = sha256(bytes);
    if (localSha !== entry.sha256)
      fail(
        `${profile}: sha256 of ${entry.file} is ${localSha}, manifest says ${entry.sha256}`,
      );
    const objectPath = `${profile}/${ANCHOR_VERSION}/${sourceTaskId}.png`;

    const forProfile = releases.filter((row) => row.profile === profile);
    const seeded = forProfile.find((row) => row.version === 1);
    if (!seeded)
      fail(`${profile}: no seeded version 1 release to publish away from`);
    if (seeded.source_task_id && seeded.source_task_id !== sourceTaskId)
      fail(`${profile}: seeded release pins a different source task id`);
    const matching = forProfile.find(
      (row) =>
        row.status === "published" &&
        row.bucket_id === BUCKET &&
        row.object_path === objectPath &&
        row.checksum_sha256 === localSha,
    );

    let release = matching;
    let action = "unchanged";
    if (!release) {
      if (verifyOnly) {
        results.push({
          profile,
          sourceTaskId,
          objectPath,
          version: null,
          status: "not published",
          releaseId: null,
          action: "would publish",
          sha256: localSha,
          verified: false,
        });
        continue;
      }
      await supabase.upload(objectPath, bytes);
      release = await supabase.rpc("create_style_anchor_release", {
        p_profile: profile,
        p_source_task_id: sourceTaskId,
        p_bucket_id: BUCKET,
        p_object_path: objectPath,
        p_checksum_sha256: localSha,
        p_approval_note: APPROVAL_NOTE,
        p_created_by: CREATED_BY,
      });
      action = "created";
    } else if (!verifyOnly) {
      // A rerun still re-uploads nothing: the release already names these exact
      // bytes and the signed re-download below is what proves the object.
      action = "unchanged";
    }

    const pointer = pointerByProfile.get(profile);
    if (pointer !== release.id) {
      if (verifyOnly) {
        action = "would repoint";
      } else {
        await supabase.rpc("publish_style_anchor_release", {
          p_release_id: release.id,
          p_expected_current_release_id: pointer ?? null,
          p_published_by: CREATED_BY,
        });
        pointerByProfile.set(profile, release.id);
        action = action === "created" ? "published" : "repointed";
      }
    }

    const roundTrip = await supabase.downloadSigned(objectPath);
    const remoteSha = sha256(roundTrip);
    if (remoteSha !== localSha)
      fail(
        `${profile}: re-downloaded object hashes ${remoteSha}, expected ${localSha}`,
      );

    results.push({
      profile,
      sourceTaskId,
      objectPath,
      version: release.version,
      status: release.status,
      releaseId: release.id,
      action,
      sha256: localSha,
      verified: true,
    });
  }

  if (asJson) {
    console.log(JSON.stringify({ bucket: BUCKET, anchors: results }, null, 2));
    return;
  }
  const width = (pick) =>
    Math.max(...results.map((row) => String(pick(row)).length));
  const profileWidth = width((row) => row.profile);
  const actionWidth = width((row) => row.action);
  for (const row of results)
    console.log(
      `${row.profile.padEnd(profileWidth)}  v${row.version ?? "-"}  ${row.status.padEnd(9)}  ${row.action.padEnd(actionWidth)}  sha ${row.sha256}  ${row.verified ? "re-download matches" : "not verified"}  ${row.releaseId ?? ""}`,
    );
  const published = results.filter(
    (row) => row.status === "published" && row.verified,
  ).length;
  console.log(
    `${published}/${results.length} anchors published and re-hashed from a signed URL`,
  );
  if (published !== results.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(
    error instanceof PublishError ? `refused: ${error.message}` : error,
  );
  process.exitCode = 1;
});
