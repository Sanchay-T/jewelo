// P1-1 proof, kept in the repository so P1-6 and P1-7 can rerun it.
//
// Decodes every stencil PNG a manifest names with the production `decodeMask`,
// measures it with the production `measureMask`, and compares the measurement
// against what the manifest claims. The measurement is the truth; the manifest
// is the claim under test.
//
// Two comparisons run per file, and they have different sources on purpose
// (adversarial review 2, finding 6). MATCH is this script's decode of the bytes
// against the engine's own decode of the same bytes: one ruler read twice, so
// it catches a file that changed after it was written, and nothing else. CLAIM
// is the engine's measurement against the engine's *construction account* - the
// rings it says it welded and where, the islands it says it bridged, the ink it
// says it preserved - so a renderer whose account and whose raster disagree is
// caught by a source that did not write the raster. The third ruler, and the
// only fully independent one, stays `lab/verify_stencil.py`.
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

import { findMaskHoles, measureMask } from "@jewelo/identity";

import { decodeMask } from "../src/decode-mask";

const REPO_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const DEFAULT_DIR = "docs/goals/overnight-launch/lab/stencils/lab";
const DEFAULT_MANIFEST = "lab-manifest.json";

/**
 * How far a measured ring hole centroid may sit from the ring centre the
 * renderer says it drew, in pixels, after the recentre transform. Measured
 * over the 232-cell sweep: the x delta stays inside 0.4 px and the y delta runs
 * 3.8 to 4.8 px, because the weld fillet fills the bottom of the hole and pulls
 * the centroid up. Eight pixels is that spread with room, and a third of the
 * hole radius, so a ring drawn at the wrong seat cannot hide inside it.
 */
const RING_CENTRE_TOLERANCE_PX = 8;

/**
 * How much of the claimed pre-bridge ink may be missing from the finished
 * raster, after the claimed downscale. Rings and bars only add metal and the
 * punch gate refuses any hole that eats the name, so the finished piece carries
 * at least the pre-bridge ink; the only loss is Lanczos resampling at
 * `recentreScale < 1`, measured at up to 2.0% (`layla-ar-kufi`).
 */
const INK_SCALE_TOLERANCE = 0.95;

/** What a manifest claims about one stencil, normalised across manifest shapes. */
interface StencilClaim {
  readonly file: string;
  /** Connected components the manifest claims. `null` means the manifest makes no claim. */
  readonly componentsFinal: number | null;
  /** Jump rings the manifest claims. Holes are a superset (letter counters count too). */
  readonly jumpRings: number | null;
  /**
   * Where the claim says the open ring holes are, in image coordinates. When a
   * manifest carries these (a solver report does), the ring count is checked
   * exactly: the ruler looks up the enclosed hole at each of those points in
   * the decoded PNG and counts the distinct ones. Without them the total hole
   * count is only a lower bound, because letter counters are holes too.
   */
  readonly ringHoleCentres: readonly (readonly [number, number])[] | null;
  readonly sha256: string | null;
  /**
   * The engine's measurement of the encoded PNG next to the engine's own
   * account of how it built it. `null` for a manifest that carries only one of
   * the two, which is every manifest but a solver report.
   */
  readonly crossCheck: StencilCrossCheck | null;
}

/** The two blocks of a solver report, as far as the cross-check reads them. */
interface StencilCrossCheck {
  readonly measured: {
    readonly inkPixels: number;
    readonly componentsFinal: number;
    readonly jumpRingCount: number;
    readonly ringHoles: readonly { centreX: number; centreY: number }[];
  };
  readonly claimed: {
    readonly jumpRings: number;
    readonly ringCentres: readonly { x: number; y: number }[];
    readonly islandsBeforeBridging: number;
    readonly bridges: number;
    readonly inkPixelsBeforeBridging: number;
    readonly inkPixelsPreserved: number;
    readonly glyphPixelsPunchedByRings: number;
    readonly glyphPixelsUnderRingMetal: number;
    readonly recentreScale: number;
    readonly recentreOffsetX: number;
    readonly recentreOffsetY: number;
  };
}

/**
 * Compares the engine's decode of a stencil with the engine's construction
 * account of the same stencil. Returns the disagreements, empty when the two
 * tell the same story.
 */
function crossCheckClaim(check: StencilCrossCheck): string[] {
  const { measured, claimed } = check;
  const failures: string[] = [];
  if (measured.jumpRingCount !== claimed.jumpRings)
    failures.push(
      `rings measured ${measured.jumpRingCount} vs claimed ${claimed.jumpRings}`,
    );
  claimed.ringCentres.forEach((centre, index) => {
    const hole = measured.ringHoles[index];
    if (!hole) {
      failures.push(`ring ${index} claimed but no hole measured`);
      return;
    }
    const x = centre.x * claimed.recentreScale + claimed.recentreOffsetX;
    const y = centre.y * claimed.recentreScale + claimed.recentreOffsetY;
    const dx = Math.abs(x - hole.centreX);
    const dy = Math.abs(y - hole.centreY);
    if (dx > RING_CENTRE_TOLERANCE_PX || dy > RING_CENTRE_TOLERANCE_PX)
      failures.push(
        `ring ${index} claimed at ${x.toFixed(1)},${y.toFixed(1)} but measured at ${hole.centreX.toFixed(1)},${hole.centreY.toFixed(1)}`,
      );
  });
  // Every bar joins one island to the body, so a piece that claims n islands
  // and n-1 bars must measure as exactly one component. A renderer that lost an
  // island, or bridged one it never counted, breaks this identity.
  if (measured.componentsFinal !== 1)
    failures.push(`components measured ${measured.componentsFinal}`);
  if (claimed.islandsBeforeBridging - claimed.bridges !== 1)
    failures.push(
      `claimed ${claimed.islandsBeforeBridging} islands and ${claimed.bridges} bars`,
    );
  if (claimed.inkPixelsPreserved !== claimed.inkPixelsBeforeBridging)
    failures.push(
      `claimed ink ${claimed.inkPixelsPreserved} of ${claimed.inkPixelsBeforeBridging} preserved`,
    );
  const floor =
    claimed.inkPixelsPreserved *
    claimed.recentreScale *
    claimed.recentreScale *
    INK_SCALE_TOLERANCE;
  if (measured.inkPixels < floor)
    failures.push(
      `ink measured ${measured.inkPixels} below the claimed floor ${Math.round(floor)}`,
    );
  if (claimed.glyphPixelsPunchedByRings !== 0)
    failures.push(`claimed ${claimed.glyphPixelsPunchedByRings} punched`);
  if (claimed.glyphPixelsUnderRingMetal !== 0)
    failures.push(`claimed ${claimed.glyphPixelsUnderRingMetal} welded`);
  return failures;
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
    /**
     * Adversarial finding 5: the solver report is two blocks now, and only
     * `measured` came off the decoded PNG. The claim under test is read from
     * there and nowhere else, so a renderer that flattered itself in `claimed`
     * could not move this comparison.
     */
    readonly measured?: {
      readonly inkPixels?: number;
      readonly componentsFinal?: number;
      readonly jumpRingCount?: number;
      readonly ringHoles?: readonly {
        readonly centreX: number;
        readonly centreY: number;
      }[];
    };
    /** The renderer's own account (finding 6): the other side of `CLAIM`. */
    readonly claimed?: Record<string, unknown>;
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
    return (parsed as RenderReport).map((entry) => {
      const measured = entry.report?.measured;
      const claimed = entry.report?.claimed;
      return {
        file: entry.file,
        componentsFinal: measured?.componentsFinal ?? null,
        jumpRings: measured?.jumpRingCount ?? null,
        ringHoleCentres:
          measured?.ringHoles?.map(
            (hole) => [hole.centreX, hole.centreY] as const,
          ) ?? null,
        sha256: entry.pngSha256 ?? null,
        crossCheck:
          measured?.inkPixels !== undefined &&
          measured.componentsFinal !== undefined &&
          measured.jumpRingCount !== undefined &&
          claimed !== undefined
            ? ({
                measured: {
                  inkPixels: measured.inkPixels,
                  componentsFinal: measured.componentsFinal,
                  jumpRingCount: measured.jumpRingCount,
                  ringHoles: measured.ringHoles ?? [],
                },
                claimed: claimed as StencilCrossCheck["claimed"],
              } satisfies StencilCrossCheck)
            : null,
      };
    });
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
    ringHoleCentres: null,
    sha256: entry.sha256 ?? null,
    crossCheck: null,
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
    "  comp(node/man)  holes/rings(cmp)   rule       sha  holeSizes",
);

let matches = 0;
let unclaimed = 0;
let singlePiece = 0;
let crossChecked = 0;
let crossCheckable = 0;
const mismatches: string[] = [];
const claimFailures: string[] = [];

for (const claim of claims) {
  const bytes = readFileSync(join(dir, claim.file));
  const decoded = await decodeMask(bytes);
  const report = measureMask(decoded);
  const sha = createHash("sha256").update(bytes).digest("hex");

  const shaOk = claim.sha256 === null || sha === claim.sha256;
  const componentsOk =
    claim.componentsFinal === null ||
    report.components === claim.componentsFinal;
  // The ring count is measured, not inferred from the total: the ruler finds
  // the enclosed hole at each claimed ring centre in the decoded PNG and counts
  // the distinct ones. A filled ring is a point that lands in no hole, so the
  // count drops and the comparison below fails. Manifests without ring centres
  // (the lab's own) can only be checked as a lower bound; that is printed.
  const geometry = findMaskHoles(decoded);
  const exactRings = claim.ringHoleCentres !== null;
  const measuredRings = exactRings
    ? new Set(
        (claim.ringHoleCentres ?? [])
          .map(([x, y]) => geometry.regionAt(Math.round(x), Math.round(y)))
          .filter((region) => region >= 0),
      ).size
    : report.holes;
  const holesOk =
    claim.jumpRings === null ||
    (exactRings
      ? measuredRings === claim.jumpRings
      : report.holes >= claim.jumpRings);

  if (claim.componentsFinal === null) unclaimed += 1;
  if (report.components === 1) singlePiece += 1;

  if (shaOk && componentsOk && holesOk) matches += 1;
  else
    mismatches.push(
      `${claim.file}: components ${report.components} vs ${claim.componentsFinal ?? "-"}, ` +
        `ring holes ${measuredRings} ${exactRings ? "==" : ">="} jumpRings ${claim.jumpRings ?? "-"}, ` +
        `sha ${shaOk ? "ok" : "DIFFERENT"}`,
    );

  if (claim.crossCheck) {
    crossCheckable += 1;
    const failures = crossCheckClaim(claim.crossCheck);
    if (failures.length === 0) crossChecked += 1;
    else claimFailures.push(`${claim.file}: ${failures.join("; ")}`);
    const { measured: engineMeasured, claimed } = claim.crossCheck;
    const deltas = claimed.ringCentres.map((centre, index) => {
      const hole = engineMeasured.ringHoles[index];
      if (!hole) return "MISSING";
      const x = centre.x * claimed.recentreScale + claimed.recentreOffsetX;
      const y = centre.y * claimed.recentreScale + claimed.recentreOffsetY;
      return `${(x - hole.centreX).toFixed(1)},${(y - hole.centreY).toFixed(1)}`;
    });
    console.log(
      `CLAIM ${claim.file.padEnd(26)}` +
        `rings ${claimed.jumpRings}/${engineMeasured.jumpRingCount}  ` +
        `centre delta [${deltas.join(" ")}]  ` +
        `islands ${claimed.islandsBeforeBridging}-${claimed.bridges} bars -> comp ${engineMeasured.componentsFinal}  ` +
        `ink ${claimed.inkPixelsPreserved}/${claimed.inkPixelsBeforeBridging} kept, ${engineMeasured.inkPixels} final at scale ${claimed.recentreScale.toFixed(3)}  ` +
        (failures.length === 0 ? "ok" : `FAILED: ${failures.join("; ")}`),
    );
  }

  console.log(
    claim.file.padEnd(26) +
      `${report.width}x${report.height}`.padEnd(12) +
      String(report.inkPixels).padStart(8) +
      `  ${report.components}/${claim.componentsFinal ?? "-"}`.padEnd(18) +
      `${report.holes}/${measuredRings}${exactRings ? "=" : ">"}${claim.jumpRings ?? "-"}`.padEnd(
        19,
      ) +
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

// The second, differently sourced comparison (finding 6). MATCH above says the
// bytes still read the way the engine read them; CLAIM says the engine's own
// account of what it welded, bridged and preserved agrees with those bytes.
if (crossCheckable === 0)
  console.log("CLAIM -/- (this manifest carries no construction account)");
else if (claimFailures.length === 0)
  console.log(`CLAIM ${crossChecked}/${crossCheckable}`);
else {
  console.log(
    `CLAIM FAILED ${claimFailures.length}/${crossCheckable}`,
  );
  for (const line of claimFailures) console.log(`  ${line}`);
  process.exitCode = 1;
}
