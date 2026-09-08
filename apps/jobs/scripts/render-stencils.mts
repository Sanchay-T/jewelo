// P1-3 and P1-4 proof, kept in the repository so P1-5 and P1-6 can rerun it.
//
// Renders the four lab names in both scripts and both letterings through the
// production path (`renderIdentityAnchor` -> one solver -> the path-only SVG
// rasteriser), then measures every PNG with the independent ruler: `decodeMask`
// decodes the bytes that were written and `measureMask` reports the geometry.
// Nothing here reads the renderer's in-memory mask, so the table below can
// disagree with the engine, which is the point.
//
// P1-4 adds two things. The bridging table prints, per file, the islands the
// solver found after thickening and before any bar was drawn (the "before"
// picture, next to the measured "after" component count), the bars it drew,
// the pre-bridge ink pixels and how many of them are still ink at the same
// pre-recentre coordinate, and the transform `recentre` then applied. And the
// wide sweep renders the ZIP's 17 regression names plus the four lab names in
// both scripts and every live style, printing one component count per cell.
//
// Run it (Node is pinned to 24.18.1):
//   corepack pnpm --filter @jewelo/jobs render-stencils
//   corepack pnpm --filter @jewelo/jobs render-stencils /some/output/directory
//
// The directory argument is optional. It defaults to a directory under the
// system temporary directory: these are working artefacts, never repository
// files.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";

import {
  findMaskHoles,
  IDENTITY_RING_INNER,
  IDENTITY_RING_OUTER,
  identityFontUrl,
  identityStencilSvg,
  LIVE_IDENTITY_STYLES,
  measureMask,
  shapeText,
  type IdentityScript,
  type IdentityValidationReport,
  type MaskHoleGeometry,
} from "@jewelo/identity";

import { decodeMask } from "../src/decode-mask";
import { renderIdentityAnchor } from "../src/identity-anchor";

/** The four names the image lab measures, in both scripts. */
const NAMES: readonly {
  readonly label: string;
  readonly text: Record<IdentityScript, string>;
}[] = [
  { label: "asma", text: { en: "Asma", ar: "أسماء" } },
  { label: "noor", text: { en: "Noor", ar: "نور" } },
  { label: "layla", text: { en: "Layla", ar: "ليلى" } },
  { label: "muhammad", text: { en: "Muhammad", ar: "محمد" } },
];

/**
 * The ZIP's 17-name Arabic regression suite (the list in
 * `apps/jobs/src/identity-anchor.test.ts`, which is never run here), plus a
 * Latin transliteration per name so the same suite can be swept in both
 * scripts. The transliterations are this script's own: the ZIP carries Arabic
 * only, and P1-4's gate is geometry, not romanisation.
 */
const ZIP_NAMES: readonly {
  readonly label: string;
  readonly text: Record<IdentityScript, string>;
}[] = [
  {
    label: "muhammad",
    text: { ar: "\u0645\u062d\u0645\u062f", en: "Muhammad" },
  },
  { label: "omar", text: { ar: "\u0639\u0645\u0631", en: "Omar" } },
  { label: "hasan", text: { ar: "\u062d\u0633\u0646", en: "Hasan" } },
  { label: "sara", text: { ar: "\u0633\u0627\u0631\u0629", en: "Sara" } },
  { label: "khalid", text: { ar: "\u062e\u0627\u0644\u062f", en: "Khalid" } },
  { label: "layla", text: { ar: "\u0644\u064a\u0644\u0649", en: "Layla" } },
  { label: "noor", text: { ar: "\u0646\u0648\u0631", en: "Noor" } },
  { label: "warda", text: { ar: "\u0648\u0631\u062f\u0629", en: "Warda" } },
  { label: "rua", text: { ar: "\u0631\u0624\u0649", en: "Rua" } },
  { label: "aya", text: { ar: "\u0622\u064a\u0629", en: "Aya" } },
  { label: "duaa", text: { ar: "\u062f\u0639\u0627\u0621", en: "Duaa" } },
  { label: "alaa", text: { ar: "\u0622\u0644\u0627\u0621", en: "Alaa" } },
  {
    label: "tasneem",
    text: { ar: "\u062a\u0633\u0646\u064a\u0645", en: "Tasneem" },
  },
  {
    label: "shahrazad",
    text: { ar: "\u0634\u0647\u0631\u0632\u0627\u062f", en: "Shahrazad" },
  },
  {
    label: "abdullah",
    text: { ar: "\u0639\u0628\u062f\u0627\u0644\u0644\u0647", en: "Abdullah" },
  },
  {
    label: "nooralhuda",
    text: {
      ar: "\u0646\u0648\u0631\u0627\u0644\u0647\u062f\u0649",
      en: "Nooralhuda",
    },
  },
  {
    label: "abdulrahman",
    text: {
      ar: "\u0639\u0628\u062f\u0627\u0644\u0631\u062d\u0645\u0646",
      en: "Abdulrahman",
    },
  },
];

/** The 17 ZIP names plus the four lab names, deduplicated by label. */
const MATRIX_NAMES = [
  ...ZIP_NAMES,
  ...NAMES.filter((name) => !ZIP_NAMES.some((zip) => zip.label === name.label)),
];

/** The two letterings `make_stencil.py` renders: classic and kufi. */
const LETTERINGS = ["classic", "kufi"] as const;

const SCRIPTS: readonly IdentityScript[] = ["en", "ar"];

/*
 * P1-5. Rings are on by default. `--rings=off` renders the same sweep for a
 * construction that is named in the ring-free set, which is the flag
 * `IDENTITY_RINGLESS_CONSTRUCTIONS` carries in production: the set is built
 * here rather than read from the environment so the script proves the
 * plumbing (specification.construction -> set membership -> solver) without a
 * deployment.
 */
const RINGLESS_CONSTRUCTION = "framed-minimal";
const flags = process.argv.slice(2).filter((value) => value.startsWith("--"));
const ringsOff = flags.includes("--rings=off");
if (flags.some((flag) => flag !== "--rings=off" && flag !== "--rings=on"))
  throw new Error(`unknown flag among ${JSON.stringify(flags)}`);
const ringlessConstructions: ReadonlySet<string> = ringsOff
  ? new Set([RINGLESS_CONSTRUCTION])
  : new Set<string>();
const specificationConstruction = ringsOff
  ? RINGLESS_CONSTRUCTION
  : "classical";

const positional = process.argv
  .slice(2)
  .filter((value) => !value.startsWith("--"));
const directoryArgument =
  positional[0] ?? join(tmpdir(), "jewelo-identity-stencils");
const directory = isAbsolute(directoryArgument)
  ? directoryArgument
  : resolve(process.cwd(), directoryArgument);
mkdirSync(directory, { recursive: true });

interface Row {
  readonly file: string;
  readonly label: string;
  readonly script: IdentityScript;
  readonly lettering: string;
  readonly text: string;
  readonly fontFile: string;
  readonly fontSha256: string;
  readonly fontSize: number;
  readonly advances: readonly number[];
  readonly outlineWidth: number;
  readonly sha256: string;
  readonly rule: string;
  readonly components: number;
  readonly holes: number;
  readonly inkPixels: number;
  readonly bbox: readonly number[] | null;
  readonly inkBoxWidth: number;
  /** P1-4: islands before thickening, as the solver counted them. */
  readonly componentsBefore: number;
  readonly islandsBeforeBridging: number;
  readonly bridges: number;
  readonly bridgePixelsAdded: number;
  readonly inkPixelsBeforeBridging: number;
  readonly inkPixelsPreserved: number;
  readonly recentreScale: number;
  readonly recentreOffsetX: number;
  readonly recentreOffsetY: number;
  /** P1-5: rings the solver welded on, and where it says it put them. */
  readonly jumpRings: number;
  readonly glyphPixelsPunchedByRings: number;
  /** Pre-ring ink under ring metal outside the weld zone (finding 2). */
  readonly glyphPixelsUnderRingMetal: number;
  /** The pre-ring glyph box top, mapped into final image coordinates. */
  readonly glyphTop: number;
  /** The measured hole at each predicted ring centre. */
  readonly ringHoles: readonly RingHole[];
  /** Every enclosed hole whose centroid sits above the glyph box top. */
  readonly holesAboveGlyphTop: number;
  /**
   * The solver's own validation report, verbatim. Review finding 6: the
   * manifest used to restate this script's measurement, so re-measuring it
   * confirmed nothing. The claim under test has to come from the engine.
   */
  readonly report: IdentityValidationReport;
}

/* -------------------------------------------------------------------------
 * P1-5 ring measurement, taken from the written PNG only.
 *
 * The solver reports where it put the ring centres in pre-recentre
 * coordinates; `recentre` then moved and possibly scaled the whole piece, and
 * the construction record carries exactly that transform. So the script maps
 * each predicted centre forward, looks up the enclosed background region that
 * contains that pixel in the decoded image, and reports its measured size and
 * centroid. A ring hole that is not there, or that reaches the border, or that
 * is not the region at the predicted point, fails the lookup.
 * ---------------------------------------------------------------------- */

interface RingHole {
  readonly found: boolean;
  readonly size: number;
  readonly centreX: number;
  readonly centreY: number;
  /** Hole centroid above the top of the whole name; reported, not gated. */
  readonly aboveGlyphTop: boolean;
  /**
   * The hole clears the stroke the ring is welded to: its lowest row is above
   * the anchor pixel. This is the gated statement, because a name's two ends
   * are rarely the same height and a ring welded to the short end is correctly
   * lower than the tall end's ascender.
   */
  readonly aboveAnchor: boolean;
}

/** Maps a pre-recentre point through the transform `recentre` applied. */
const mapForward = (value: number, scale: number, offset: number): number =>
  value * scale + offset;

interface RingMeasurement {
  readonly glyphTop: number;
  readonly ringHoles: readonly RingHole[];
  readonly holesAboveGlyphTop: number;
}

function measureRings(
  decoded: { width: number; height: number; ink: Uint8Array },
  construction: {
    readonly ringCentres: readonly {
      readonly x: number;
      readonly y: number;
      readonly anchorX: number;
      readonly anchorY: number;
    }[];
    readonly glyphBoxBeforeRings: readonly [number, number, number, number];
    readonly recentreScale: number;
    readonly recentreOffsetX: number;
    readonly recentreOffsetY: number;
  },
): RingMeasurement {
  const geometry: MaskHoleGeometry = findMaskHoles(decoded);
  const glyphTop = mapForward(
    construction.glyphBoxBeforeRings[1],
    construction.recentreScale,
    construction.recentreOffsetY,
  );
  const ringHoles = construction.ringCentres.map((centre) => {
    const x = Math.round(
      mapForward(
        centre.x,
        construction.recentreScale,
        construction.recentreOffsetX,
      ),
    );
    const y = Math.round(
      mapForward(
        centre.y,
        construction.recentreScale,
        construction.recentreOffsetY,
      ),
    );
    const index = geometry.regionAt(x, y);
    const hole = index >= 0 ? geometry.holes[index] : undefined;
    return {
      found: hole !== undefined,
      size: hole ? hole.size : 0,
      centreX: hole ? hole.centreX : x,
      centreY: hole ? hole.centreY : y,
      aboveGlyphTop: hole ? hole.centreY < glyphTop : false,
      aboveAnchor: centre.y + IDENTITY_RING_INNER <= centre.anchorY,
    };
  });
  return {
    glyphTop,
    ringHoles,
    holesAboveGlyphTop: geometry.holes.filter((hole) => hole.centreY < glyphTop)
      .length,
  };
}

const rows: Row[] = [];

for (const name of NAMES) {
  for (const script of SCRIPTS) {
    for (const lettering of LETTERINGS) {
      const text = name.text[script];
      const file = `${name.label}-${script}-${lettering}.png`;
      const rendered = await renderIdentityAnchor(
        {
          approvedText: text,
          language: script,
          typography: lettering,
          fingerprint: `p1-3-${name.label}-${script}-${lettering}`,
        },
        {
          // Arabic reads `arabicStyle`, English reads `lettering`; the solver
          // resolves both to the same style row and picks the face by script.
          arabicStyle: lettering,
          lettering,
          construction: specificationConstruction,
          layout: "single-name",
          connector: "none",
          names: [{ approvedArabicText: script === "ar" ? text : null }],
          dimensions: { widthMm: 32, heightMm: 12, thicknessMm: 1.2 },
        },
        "caleums-final-media-v2",
        ringlessConstructions,
      );
      writeFileSync(join(directory, file), rendered.png);

      const fontFile = rendered.report.fontFile;
      // The advances and the outline box are measured again here, straight from
      // the pinned bytes, so the table compares two independent measurements of
      // the same run rather than echoing one.
      const shaped = await shapeText({
        fontBytes: new Uint8Array(readFileSync(identityFontUrl(fontFile))),
        text,
        script,
      });
      const layout = identityStencilSvg(shaped);
      const decoded = await decodeMask(rendered.png);
      const measured = measureMask(decoded);
      const ring = measureRings(decoded, rendered.construction);

      rows.push({
        report: rendered.report,
        file,
        label: name.label,
        script,
        lettering,
        text,
        fontFile,
        fontSha256: shaped.fontSha256Measured,
        fontSize: layout.fontSize,
        advances: layout.advances,
        outlineWidth: layout.inkBox.width,
        sha256: rendered.pngSha256,
        rule: decoded.rule,
        components: measured.components,
        holes: measured.holes,
        inkPixels: measured.inkPixels,
        bbox: measured.bbox,
        inkBoxWidth: measured.bbox
          ? measured.bbox[2] - measured.bbox[0] + 1
          : 0,
        componentsBefore: rendered.report.claimed.componentsBefore,
        islandsBeforeBridging: rendered.construction.islandsBeforeBridging,
        bridges: rendered.construction.bridges,
        bridgePixelsAdded: rendered.construction.bridgePixelsAdded,
        inkPixelsBeforeBridging: rendered.construction.inkPixelsBeforeBridging,
        inkPixelsPreserved: rendered.construction.inkPixelsPreserved,
        recentreScale: rendered.construction.recentreScale,
        recentreOffsetX: rendered.construction.recentreOffsetX,
        recentreOffsetY: rendered.construction.recentreOffsetY,
        jumpRings: rendered.construction.jumpRings,
        glyphPixelsPunchedByRings:
          rendered.construction.glyphPixelsPunchedByRings,
        glyphPixelsUnderRingMetal:
          rendered.construction.glyphPixelsUnderRingMetal,
        glyphTop: ring.glyphTop,
        ringHoles: ring.ringHoles,
        holesAboveGlyphTop: ring.holesAboveGlyphTop,
      });
    }
  }
}

console.log(`stencils: ${directory}`);
console.log("");
console.log(
  "file".padEnd(26) +
    "font".padEnd(30) +
    "size".padStart(5) +
    "  rule".padEnd(13) +
    "comp".padStart(5) +
    "holes".padStart(6) +
    "ink".padStart(9) +
    "  bbox",
);
for (const row of rows) {
  console.log(
    row.file.padEnd(26) +
      row.fontFile.padEnd(30) +
      String(row.fontSize).padStart(5) +
      "  " +
      row.rule.padEnd(11) +
      String(row.components).padStart(5) +
      String(row.holes).padStart(6) +
      String(row.inkPixels).padStart(9) +
      "  " +
      JSON.stringify(row.bbox),
  );
}

console.log("");
console.log(
  "P1-4 bridging. islands is the 4-connected count after thickening and before",
);
console.log(
  "any bar, so it is the before picture; comp above is the after picture. ink",
);
console.log(
  "before and kept are pre-recentre coordinates: they must be equal, which is",
);
console.log("the invariant that a bar adds metal and never moves a glyph.");
console.log(
  "file".padEnd(26) +
    "raw".padStart(4) +
    "islands".padStart(8) +
    "bars".padStart(5) +
    "barPx".padStart(7) +
    "inkBefore".padStart(11) +
    "kept".padStart(11) +
    "moved".padStart(7) +
    "  scale".padEnd(9) +
    "offset",
);
for (const row of rows) {
  console.log(
    row.file.padEnd(26) +
      String(row.componentsBefore).padStart(4) +
      String(row.islandsBeforeBridging).padStart(8) +
      String(row.bridges).padStart(5) +
      String(row.bridgePixelsAdded).padStart(7) +
      String(row.inkPixelsBeforeBridging).padStart(11) +
      String(row.inkPixelsPreserved).padStart(11) +
      String(row.inkPixelsBeforeBridging - row.inkPixelsPreserved).padStart(7) +
      "  " +
      row.recentreScale.toFixed(3).padEnd(7) +
      `(${row.recentreOffsetX}, ${row.recentreOffsetY})`,
  );
}

console.log("");
console.log(
  ringsOff
    ? `P1-5 rings OFF (construction "${RINGLESS_CONSTRUCTION}" is in the ring-free set).`
    : `P1-5 rings ON (the default). Ring radii: outer ${IDENTITY_RING_OUTER}px, inner ${IDENTITY_RING_INNER}px.`,
);
console.log(
  "glyphTop is the pre-ring ink box top, mapped through the recentre transform.",
);
console.log(
  "Each ring hole is the enclosed background region found at the solver's own",
);
console.log(
  "ring centre after the same mapping; size and centre below are measured on",
);
console.log(
  "the written PNG. inHole counts pre-ring ink pixels a ring hole punched out,",
);
console.log(
  "welded counts pre-ring ink pixels lying under ring metal outside the weld",
);
console.log("zone around the anchor (adversarial finding 2). Both must be 0.");
console.log(
  "file".padEnd(26) +
    "rings".padStart(6) +
    "holes".padStart(6) +
    "aboveTop".padStart(9) +
    "glyphTop".padStart(9) +
    "inHole".padStart(7) +
    "welded".padStart(7) +
    "  ring holes (size @ x,y, above?)",
);
for (const row of rows)
  console.log(
    row.file.padEnd(26) +
      String(row.jumpRings).padStart(6) +
      String(row.holes).padStart(6) +
      String(row.holesAboveGlyphTop).padStart(9) +
      row.glyphTop.toFixed(1).padStart(9) +
      String(row.glyphPixelsPunchedByRings).padStart(7) +
      String(row.glyphPixelsUnderRingMetal).padStart(7) +
      "  " +
      (row.ringHoles.length === 0
        ? "-"
        : row.ringHoles
            .map(
              (hole) =>
                `${hole.found ? hole.size : "MISSING"} @ ${hole.centreX.toFixed(1)},${hole.centreY.toFixed(1)} anchor:${hole.aboveAnchor ? "clear" : "IN-STROKE"} name:${hole.aboveGlyphTop ? "above" : "below"}`,
            )
            .join("   ")),
  );

for (const row of rows) {
  if (ringsOff) {
    if (row.jumpRings !== 0 || row.holesAboveGlyphTop !== 0) {
      console.log(
        `GATE FAILED: ${row.file} has ${row.jumpRings} rings and ${row.holesAboveGlyphTop} holes above the glyph box with rings off`,
      );
      process.exitCode = 1;
    }
    continue;
  }
  if (row.jumpRings !== 2 || row.ringHoles.length !== 2) {
    console.log(`GATE FAILED: ${row.file} welded ${row.jumpRings} rings`);
    process.exitCode = 1;
  }
  if (row.ringHoles.some((hole) => !hole.found || !hole.aboveAnchor)) {
    console.log(
      `GATE FAILED: ${row.file} has a ring hole that is missing or sits inside the stroke it is welded to`,
    );
    process.exitCode = 1;
  }
  if (row.glyphPixelsPunchedByRings !== 0) {
    console.log(
      `GATE FAILED: ${row.file} punched ${row.glyphPixelsPunchedByRings} ink pixels of the name out with a ring hole`,
    );
    process.exitCode = 1;
  }
  if (row.glyphPixelsUnderRingMetal !== 0) {
    console.log(
      `GATE FAILED: ${row.file} welded ${row.glyphPixelsUnderRingMetal} ink pixels of the name into the ring metal`,
    );
    process.exitCode = 1;
  }
}

console.log("");
console.log(
  "per-glyph advances (px at the fitted size) next to the measured ink width",
);
console.log(
  "file".padEnd(26) +
    "glyphs".padStart(7) +
    "  outlineW".padStart(11) +
    "  inkW".padStart(8) +
    "  advances",
);
for (const row of rows) {
  console.log(
    row.file.padEnd(26) +
      String(row.advances.length).padStart(7) +
      String(row.outlineWidth.toFixed(1)).padStart(11) +
      String(row.inkBoxWidth).padStart(8) +
      "  " +
      JSON.stringify(row.advances.map((value) => Number(value.toFixed(1)))),
  );
}

console.log("");
console.log(
  "sha256 of the written PNG, and the sha of the font the engine loaded",
);
console.log("file".padEnd(26) + "pngSha256".padEnd(66) + "fontSha256");
for (const row of rows)
  console.log(row.file.padEnd(26) + row.sha256.padEnd(66) + row.fontSha256);

console.log("");
console.log(
  "byte difference, Kufi versus the classic face, per name and script",
);
console.log(
  "name".padEnd(12) +
    "script".padEnd(8) +
    "classic face".padEnd(30) +
    "kufi face".padEnd(30) +
    "bytes differ",
);
for (const name of NAMES) {
  for (const script of SCRIPTS) {
    const classic = rows.find(
      (row) =>
        row.label === name.label &&
        row.script === script &&
        row.lettering === "classic",
    );
    const kufi = rows.find(
      (row) =>
        row.label === name.label &&
        row.script === script &&
        row.lettering === "kufi",
    );
    if (!classic || !kufi) continue;
    console.log(
      name.label.padEnd(12) +
        script.padEnd(8) +
        classic.fontFile.padEnd(30) +
        kufi.fontFile.padEnd(30) +
        (classic.sha256 === kufi.sha256 ? "IDENTICAL" : "yes"),
    );
  }
}

console.log("");
console.log(
  `WELDED-GLYPH ${rows.filter((row) => row.glyphPixelsUnderRingMetal > 0).length}/${rows.length} lab cells have ink welded into ring metal`,
);

const luminance = rows.filter((row) => row.rule === "luminance").length;
const singlePiece = rows.filter((row) => row.components === 1).length;
console.log("");
console.log(`LUMINANCE ${luminance}/${rows.length}`);
console.log(`SINGLE-PIECE ${singlePiece}/${rows.length}`);

const manifest = join(directory, "render-report.json");
writeFileSync(
  manifest,
  `${JSON.stringify(
    rows.map((row) => ({
      file: row.file,
      pngSha256: row.sha256,
      // The engine's claim, verbatim; `measure-stencils` re-measures the PNG
      // and compares against it, which is only a test while the two differ in
      // origin. `measured` below is this script's own reading of the same file.
      report: row.report,
      text: row.text,
      script: row.script,
      lettering: row.lettering,
      fontFile: row.fontFile,
      fontSha256: row.fontSha256,
      fontSize: row.fontSize,
      advances: row.advances,
      measured: {
        components: row.components,
        holes: row.holes,
        inkPixels: row.inkPixels,
        bbox: row.bbox,
        rule: row.rule,
      },
      rings: {
        jumpRings: row.jumpRings,
        ringHoleSizes: row.ringHoles.map((hole) => hole.size),
        ringHoleCentres: row.ringHoles.map((hole) => [
          Number(hole.centreX.toFixed(1)),
          Number(hole.centreY.toFixed(1)),
        ]),
        ringHolesFound: row.ringHoles.filter((hole) => hole.found).length,
        ringHolesClearOfAnchor: row.ringHoles.filter((hole) => hole.aboveAnchor)
          .length,
        holesAboveGlyphTop: row.holesAboveGlyphTop,
        glyphTop: Number(row.glyphTop.toFixed(1)),
        glyphPixelsPunchedByRings: row.glyphPixelsPunchedByRings,
        glyphPixelsUnderRingMetal: row.glyphPixelsUnderRingMetal,
      },
      construction: {
        componentsBefore: row.componentsBefore,
        islandsBeforeBridging: row.islandsBeforeBridging,
        bridges: row.bridges,
        bridgePixelsAdded: row.bridgePixelsAdded,
        inkPixelsBeforeBridging: row.inkPixelsBeforeBridging,
        inkPixelsPreserved: row.inkPixelsPreserved,
        recentreScale: row.recentreScale,
        recentreOffsetX: row.recentreOffsetX,
        recentreOffsetY: row.recentreOffsetY,
      },
    })),
    null,
    2,
  )}\n`,
);
console.log(`manifest: ${manifest}`);

if (luminance !== rows.length) {
  console.log("GATE FAILED: a stencil carried alpha instead of luminance ink");
  process.exitCode = 1;
}

const sha = (file: string) =>
  createHash("sha256")
    .update(readFileSync(join(directory, file)))
    .digest("hex");
for (const row of rows)
  if (sha(row.file) !== row.sha256) {
    console.log(
      `GATE FAILED: ${row.file} on disk does not match the reported sha`,
    );
    process.exitCode = 1;
  }

for (const row of rows) {
  if (row.components !== 1) {
    console.log(`GATE FAILED: ${row.file} is ${row.components} components`);
    process.exitCode = 1;
  }
  if (row.inkPixelsPreserved !== row.inkPixelsBeforeBridging) {
    console.log(
      `GATE FAILED: ${row.file} lost ${row.inkPixelsBeforeBridging - row.inkPixelsPreserved} pre-bridge ink pixels`,
    );
    process.exitCode = 1;
  }
}

/* -------------------------------------------------------------------------
 * P1-4 wide sweep: the 17 ZIP regression names plus Asma, Noor, Layla and
 * Muhammad, in both scripts and every live style. Only the component count is
 * printed here; every cell must be 1, and the ruler measures the written bytes,
 * not the engine's mask.
 * ---------------------------------------------------------------------- */

const matrixDirectory = join(directory, "matrix");
mkdirSync(matrixDirectory, { recursive: true });

interface MatrixCell {
  readonly file: string;
  readonly components: number;
  readonly islandsBeforeBridging: number;
  readonly bridges: number;
  readonly moved: number;
  readonly recentreScale: number;
  readonly jumpRings: number;
  readonly ringHolesFound: number;
  readonly ringHolesAbove: number;
  readonly ringHoleSizes: readonly number[];
  readonly holesAboveGlyphTop: number;
  readonly glyphPixelsPunchedByRings: number;
  readonly glyphPixelsUnderRingMetal: number;
  /**
   * The solver's own ring centres and anchors, in pre-recentre coordinates.
   * Recorded so a placement change can be compared cell by cell against an
   * earlier sweep instead of being taken on trust.
   */
  readonly ringCentres: readonly {
    readonly x: number;
    readonly y: number;
    readonly anchorX: number;
    readonly anchorY: number;
  }[];
}

const matrix = new Map<string, MatrixCell>();
const cellKey = (label: string, script: string, style: string) =>
  `${label}|${script}|${style}`;

for (const name of MATRIX_NAMES) {
  for (const script of SCRIPTS) {
    for (const style of LIVE_IDENTITY_STYLES) {
      const text = name.text[script];
      const file = `${name.label}-${script}-${style}.png`;
      const rendered = await renderIdentityAnchor(
        {
          approvedText: text,
          language: script,
          typography: style,
          fingerprint: `p1-4-${name.label}-${script}-${style}`,
        },
        {
          arabicStyle: style,
          lettering: style,
          construction: specificationConstruction,
          layout: "single-name",
          connector: "none",
          names: [{ approvedArabicText: script === "ar" ? text : null }],
          dimensions: { widthMm: 32, heightMm: 12, thicknessMm: 1.2 },
        },
        "caleums-final-media-v2",
        ringlessConstructions,
      );
      writeFileSync(join(matrixDirectory, file), rendered.png);
      const decodedCell = await decodeMask(rendered.png);
      const measured = measureMask(decodedCell);
      const ring = measureRings(decodedCell, rendered.construction);
      matrix.set(cellKey(name.label, script, style), {
        file,
        components: measured.components,
        jumpRings: rendered.construction.jumpRings,
        ringHolesFound: ring.ringHoles.filter((hole) => hole.found).length,
        ringHolesAbove: ring.ringHoles.filter(
          (hole) => hole.found && hole.aboveAnchor,
        ).length,
        ringHoleSizes: ring.ringHoles.map((hole) => hole.size),
        holesAboveGlyphTop: ring.holesAboveGlyphTop,
        glyphPixelsPunchedByRings:
          rendered.construction.glyphPixelsPunchedByRings,
        glyphPixelsUnderRingMetal:
          rendered.construction.glyphPixelsUnderRingMetal,
        ringCentres: rendered.construction.ringCentres.map((centre) => ({
          x: centre.x,
          y: centre.y,
          anchorX: centre.anchorX,
          anchorY: centre.anchorY,
        })),
        islandsBeforeBridging: rendered.construction.islandsBeforeBridging,
        bridges: rendered.construction.bridges,
        moved:
          rendered.construction.inkPixelsBeforeBridging -
          rendered.construction.inkPixelsPreserved,
        recentreScale: rendered.construction.recentreScale,
      });
    }
  }
}

console.log("");
console.log(
  `components per cell, ${MATRIX_NAMES.length} names x ${SCRIPTS.length} scripts x ${LIVE_IDENTITY_STYLES.length} styles = ${matrix.size} stencils`,
);
console.log(`matrix stencils: ${matrixDirectory}`);
console.log(
  "name".padEnd(14) +
    "script".padEnd(8) +
    LIVE_IDENTITY_STYLES.map((style) => style.padStart(18)).join(""),
);
for (const name of MATRIX_NAMES)
  for (const script of SCRIPTS)
    console.log(
      name.label.padEnd(14) +
        script.padEnd(8) +
        LIVE_IDENTITY_STYLES.map((style) => {
          const cell = matrix.get(cellKey(name.label, script, style));
          return String(cell ? cell.components : "-").padStart(18);
        }).join(""),
    );

console.log("");
console.log("islands before bridging -> bars drawn, same matrix");
console.log(
  "name".padEnd(14) +
    "script".padEnd(8) +
    LIVE_IDENTITY_STYLES.map((style) => style.padStart(18)).join(""),
);
for (const name of MATRIX_NAMES)
  for (const script of SCRIPTS)
    console.log(
      name.label.padEnd(14) +
        script.padEnd(8) +
        LIVE_IDENTITY_STYLES.map((style) => {
          const cell = matrix.get(cellKey(name.label, script, style));
          return (
            cell ? `${cell.islandsBeforeBridging}->${cell.bridges}` : "-"
          ).padStart(18);
        }).join(""),
    );

const matrixCells = [...matrix.values()];
const joined = matrixCells.filter((cell) => cell.components === 1).length;
const movedInk = matrixCells.filter((cell) => cell.moved !== 0);
const downscaled = matrixCells.filter((cell) => cell.recentreScale !== 1);
console.log("");
console.log(`MATRIX SINGLE-PIECE ${joined}/${matrixCells.length}`);
console.log(`MATRIX MOVED-INK ${movedInk.length}/${matrixCells.length}`);
console.log(
  `MATRIX RECENTRE-DOWNSCALED ${downscaled.length}/${matrixCells.length}`,
);
for (const cell of matrixCells)
  if (cell.components !== 1) {
    console.log(
      `GATE FAILED: matrix/${cell.file} is ${cell.components} components`,
    );
    process.exitCode = 1;
  }

const expectedRings = ringsOff ? 0 : 2;
const ringOk = matrixCells.filter(
  (cell) =>
    cell.jumpRings === expectedRings &&
    cell.ringHolesFound === expectedRings &&
    cell.ringHolesAbove === expectedRings &&
    cell.glyphPixelsPunchedByRings === 0 &&
    cell.glyphPixelsUnderRingMetal === 0,
).length;
const welded = matrixCells.filter((cell) => cell.glyphPixelsUnderRingMetal > 0);
console.log(
  `MATRIX WELDED-GLYPH ${welded.length}/${matrixCells.length} cells have ink welded into ring metal` +
    (welded.length
      ? `, worst ${welded
          .slice()
          .sort(
            (left, right) =>
              right.glyphPixelsUnderRingMetal - left.glyphPixelsUnderRingMetal,
          )
          .slice(0, 5)
          .map((cell) => `${cell.file}:${cell.glyphPixelsUnderRingMetal}`)
          .join(" ")}`
      : ""),
);
const sizes = matrixCells.flatMap((cell) => cell.ringHoleSizes);
console.log(
  `MATRIX RINGS ${ringOk}/${matrixCells.length} cells have exactly ${expectedRings} ring holes, each clear of the stroke it is welded to, with no punched-out and no welded-in ink`,
);
if (sizes.length)
  console.log(
    `MATRIX RING HOLE SIZE min ${Math.min(...sizes)} max ${Math.max(...sizes)} mean ${Math.round(sizes.reduce((total, value) => total + value, 0) / sizes.length)}`,
  );
for (const cell of matrixCells) {
  if (
    cell.jumpRings === expectedRings &&
    cell.ringHolesFound === expectedRings &&
    cell.ringHolesAbove === expectedRings &&
    cell.glyphPixelsPunchedByRings === 0 &&
    cell.glyphPixelsUnderRingMetal === 0
  )
    continue;
  console.log(
    `GATE FAILED: matrix/${cell.file} rings=${cell.jumpRings} holesFound=${cell.ringHolesFound} above=${cell.ringHolesAbove} holesAboveGlyphTop=${cell.holesAboveGlyphTop} punched=${cell.glyphPixelsPunchedByRings} welded=${cell.glyphPixelsUnderRingMetal}`,
  );
  process.exitCode = 1;
}

writeFileSync(
  join(matrixDirectory, "matrix-report.json"),
  `${JSON.stringify(matrixCells, null, 2)}\n`,
);
