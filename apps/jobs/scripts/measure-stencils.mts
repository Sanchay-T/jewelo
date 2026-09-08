// P1-1 proof, kept in the repository so P1-6 and P1-7 can rerun it.
//
// Decodes every stencil PNG a manifest names with the production `decodeMask`,
// measures it with the production `measureMask`, and compares the measurement
// against what the manifest claims. The measurement is the truth; the manifest
// is the claim under test.
//
// Run it (Node is pinned to 24.18.1):
//   corepack pnpm --filter @jewelo/jobs measure-stencils
//   corepack pnpm --filter @jewelo/jobs measure-stencils \
//     docs/goals/overnight-launch/lab/stencils/production render-report.json
//
// Both arguments are optional and default to the lab stencil directory and
// `lab-manifest.json`. A directory argument is resolved against the current
// working directory first and against the repository root second, so the same
// path works from the repository root and from `apps/jobs`.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { measureMask } from "@jewelo/identity";

import { decodeMask } from "../src/decode-mask";

const REPO_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const DEFAULT_DIR = "docs/goals/overnight-launch/lab/stencils/lab";
const DEFAULT_MANIFEST = "lab-manifest.json";

/** What a manifest claims about one stencil, normalised across manifest shapes. */
interface StencilClaim {
  readonly file: string;
  /** Connected components the manifest claims. `null` means the manifest makes no claim. */
  readonly componentsFinal: number | null;
  /** Jump rings the manifest claims. Holes are a superset (letter counters count too). */
  readonly jumpRings: number | null;
  readonly sha256: string | null;
}

/** `lab-manifest.json`: an object with a `stencils` array. */
interface LabManifest {
  readonly stencils: readonly {
    readonly file: string;
    readonly componentsFinal?: number;
    readonly jumpRings?: number;
    readonly sha256?: string;
  }[];
}

/** `render-report.json`: a bare array, with the claim nested under `report`. */
type RenderReport = readonly {
  readonly file: string;
  readonly pngSha256?: string;
  readonly report?: {
    readonly componentsFinal?: number;
    readonly jumpRingCount?: number;
  };
}[];

function resolveDir(argument: string): string {
  if (isAbsolute(argument)) return argument;
  const fromCwd = resolve(process.cwd(), argument);
  if (existsSync(fromCwd)) return fromCwd;
  return resolve(REPO_ROOT, argument);
}

function readClaims(manifestPath: string): StencilClaim[] {
  const parsed: unknown = JSON.parse(readFileSync(manifestPath, "utf8"));

  if (Array.isArray(parsed)) {
    return (parsed as RenderReport).map((entry) => ({
      file: entry.file,
      componentsFinal: entry.report?.componentsFinal ?? null,
      jumpRings: entry.report?.jumpRingCount ?? null,
      sha256: entry.pngSha256 ?? null,
    }));
  }

  const stencils = (parsed as LabManifest).stencils;
  if (!Array.isArray(stencils)) {
    throw new Error(
      `${manifestPath}: expected an array of render records or an object with a "stencils" array`,
    );
  }
  return stencils.map((entry) => ({
    file: entry.file,
    componentsFinal: entry.componentsFinal ?? null,
    jumpRings: entry.jumpRings ?? null,
    sha256: entry.sha256 ?? null,
  }));
}

const dir = resolveDir(process.argv[2] ?? DEFAULT_DIR);
const manifestPath = join(dir, process.argv[3] ?? DEFAULT_MANIFEST);
const claims = readClaims(manifestPath);

console.log(`stencils: ${dir}`);
console.log(`manifest: ${manifestPath} (${claims.length} entries)`);
console.log("");
console.log(
  "file".padEnd(26) +
    "size".padEnd(12) +
    "ink".padStart(8) +
    "  comp(node/man)  holes(node/rings)  rule       sha  holeSizes",
);

let matches = 0;
let unclaimed = 0;
let singlePiece = 0;
const mismatches: string[] = [];

for (const claim of claims) {
  const bytes = readFileSync(join(dir, claim.file));
  const decoded = await decodeMask(bytes);
  const report = measureMask(decoded);
  const sha = createHash("sha256").update(bytes).digest("hex");

  const shaOk = claim.sha256 === null || sha === claim.sha256;
  const componentsOk =
    claim.componentsFinal === null || report.components === claim.componentsFinal;
  // Holes include the jump rings plus every letter counter, so the manifest's
  // jump ring count is a lower bound, not an equality.
  const holesOk = claim.jumpRings === null || report.holes >= claim.jumpRings;

  if (claim.componentsFinal === null) unclaimed += 1;
  if (report.components === 1) singlePiece += 1;

  if (shaOk && componentsOk && holesOk) matches += 1;
  else
    mismatches.push(
      `${claim.file}: components ${report.components} vs ${claim.componentsFinal ?? "-"}, ` +
        `holes ${report.holes} vs jumpRings ${claim.jumpRings ?? "-"}, ` +
        `sha ${shaOk ? "ok" : "DIFFERENT"}`,
    );

  console.log(
    claim.file.padEnd(26) +
      `${report.width}x${report.height}`.padEnd(12) +
      String(report.inkPixels).padStart(8) +
      `  ${report.components}/${claim.componentsFinal ?? "-"}`.padEnd(18) +
      `${report.holes}/${claim.jumpRings ?? "-"}`.padEnd(19) +
      decoded.rule.padEnd(11) +
      (shaOk ? "ok " : "DIFF") +
      "  " +
      JSON.stringify(report.holeSizes.slice(0, 6)) +
      `  bbox=${JSON.stringify(report.bbox)}`,
  );
}

console.log("");
console.log(`SINGLE-PIECE ${singlePiece}/${claims.length}`);
if (unclaimed > 0) {
  console.log(
    `NO-CLAIM ${unclaimed}/${claims.length} (manifest states no componentsFinal; the measurement above stands alone)`,
  );
}

if (mismatches.length === 0) {
  console.log(`MATCH ${matches}/${claims.length}`);
} else {
  console.log(`MISMATCH ${mismatches.length}/${claims.length}`);
  for (const line of mismatches) console.log(`  ${line}`);
  process.exitCode = 1;
}
