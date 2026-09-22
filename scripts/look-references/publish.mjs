#!/usr/bin/env node
// Publish the per-construction look references into the private
// `look-references` bucket.
//
// A look reference is a text-free crop of the shop's own reference photo for
// one pendant construction. It is delivered to a still call as a texture-only
// input (role `look`), because on gpt-image-2.5-sunburst the folded ribbon look
// only appears when such a crop is supplied; wording alone gives a flat plate.
//
// The PNGs are private brand reference and never enter this repository - it is
// public. They live outside git with a manifest that carries their sha256:
//
//   LOOK_REFERENCES_DIR=~/hq/projects/devonel/caleums-private/look-references-v1 \
//     node scripts/look-references/publish.mjs
//
// or `node scripts/look-references/publish.mjs <dir>`. The manifest is
//
//   { "version": "v1", "looks": { "origami-ribbon": { "file": "...png", "sha256": "..." } } }
//
// Per construction, refusing before any write when a check fails:
//   1. the construction id is one the still compiler requires a look for
//      (LOOK_REFERENCE_CONSTRUCTIONS in packages/ai/src/prompt-registry.ts);
//   2. sha256 of the file on disk equals the manifest entry;
//   3. the bytes go to look-references/<construction>/v1.png with the service
//      role;
//   4. the object is downloaded again through a signed URL and re-hashed, so
//      what the job reads back is proved to be the approved bytes.
//
// There is no release table: the job is pinned to the exact bytes by the
// checksum in `LOOK_REFERENCES`, which this script prints at the end. Until
// that variable names a construction, a run of that construction is refused
// before any spend.
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
const BUCKET = "look-references";
const LOOK_VERSION = "v1";

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
 * Which constructions need a look is read out of the compiler rather than
 * copied here, so this script cannot publish an asset the job will never ask
 * for, or miss one it will.
 */
async function readLookConstructions() {
  const file = path.join(
    REPO_ROOT,
    "packages",
    "ai",
    "src",
    "prompt-registry.ts",
  );
  const source = await readFile(file, "utf8");
  const block =
    /export const LOOK_REFERENCE_CONSTRUCTIONS[^=]*=\s*new Set\(\[([\s\S]*?)\]\);/.exec(
      source,
    );
  if (!block) fail(`LOOK_REFERENCE_CONSTRUCTIONS not found in ${file}`);
  const ids = [...block[1].matchAll(/"([a-z0-9-]+)"/g)].map((match) => match[1]);
  if (!ids.length) fail("LOOK_REFERENCE_CONSTRUCTIONS is empty");
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

/** Supabase storage with the service role. Never logs a header. */
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
  async #send(pathname, init = {}) {
    const response = await fetch(`${this.#url}${pathname}`, {
      ...init,
      headers: {
        apikey: this.#key,
        authorization: `Bearer ${this.#key}`,
        ...init.headers,
      },
    });
    if (!response.ok) {
      const body = (await response.text()).slice(0, 400);
      fail(`${init.method ?? "GET"} ${pathname} -> ${response.status} ${body}`);
    }
    return response;
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
  /** Signed URL then download, the same two steps the job takes. */
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

  const dirValue = positional[0] ?? process.env.LOOK_REFERENCES_DIR;
  if (!dirValue)
    fail(
      "LOOK_REFERENCES_DIR (or a directory argument) is required; the look references are private and are never committed",
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
  if (manifest.version !== LOOK_VERSION)
    fail(`manifest version ${manifest.version}, expected ${LOOK_VERSION}`);
  const constructions = await readLookConstructions();
  for (const key of Object.keys(manifest.looks ?? {}))
    if (!constructions.includes(key))
      fail(
        `manifest has a look for "${key}", which the still compiler never asks for`,
      );

  console.error(
    `target ${supabase.url}  bucket ${BUCKET}  source ${dir}${verifyOnly ? "  (verify only)" : ""}`,
  );

  const results = [];
  for (const construction of constructions) {
    const entry = manifest.looks?.[construction];
    if (!entry) fail(`manifest has no look for "${construction}"`);
    const bytes = await readFile(path.join(dir, entry.file));
    const localSha = sha256(bytes);
    if (localSha !== entry.sha256)
      fail(
        `${construction}: sha256 of ${entry.file} is ${localSha}, manifest says ${entry.sha256}`,
      );
    const objectPath = `${construction}/${LOOK_VERSION}.png`;
    if (!verifyOnly) await supabase.upload(objectPath, bytes);
    let verified = false;
    try {
      const roundTrip = await supabase.downloadSigned(objectPath);
      const remoteSha = sha256(roundTrip);
      if (remoteSha !== localSha)
        fail(
          `${construction}: re-downloaded object hashes ${remoteSha}, expected ${localSha}`,
        );
      verified = true;
    } catch (error) {
      // Verify-only against a bucket that has nothing in it yet is a report,
      // not a failure; anything after an upload is.
      if (!verifyOnly) throw error;
    }
    results.push({
      construction,
      objectPath,
      sha256: localSha,
      action: verifyOnly ? "would publish" : "published",
      verified,
    });
  }

  if (asJson) {
    console.log(JSON.stringify({ bucket: BUCKET, looks: results }, null, 2));
    return;
  }
  for (const row of results)
    console.log(
      `${row.construction}  ${row.objectPath}  sha ${row.sha256}  ${row.action}  ${row.verified ? "re-download matches" : "not verified"}`,
    );
  console.log(
    `\nLOOK_REFERENCES=${results.map((row) => `${row.construction}:${row.sha256}`).join(",")}`,
  );
  const verified = results.filter((row) => row.verified).length;
  console.log(
    `${verified}/${results.length} look references stored and re-hashed from a signed URL`,
  );
  if (!verifyOnly && verified !== results.length) process.exitCode = 1;
}

// A raw error object prints whatever the thrower attached - a fetch failure
// carries the request URL, and the URLs this script handles are signed storage
// links whose query string is a bearer token. Only the class and the message
// are printed, with the query string of any URL in them removed, so a failure
// can never leave a usable link in a terminal or a log.
main().catch((error) => {
  const message =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : String(error);
  console.error(
    (error instanceof PublishError ? `refused: ${error.message}` : message)
      .replaceAll(/(https?:\/\/\S+?)\?\S*/gu, "$1?[redacted]"),
  );
  process.exitCode = 1;
});
