// P1-3 proof, kept in the repository so P1-4, P1-5 and P1-6 can rerun it.
//
// Renders the four lab names in both scripts and both letterings through the
// production path (`renderIdentityAnchor` -> one solver -> the path-only SVG
// rasteriser), then measures every PNG with the independent ruler: `decodeMask`
// decodes the bytes that were written and `measureMask` reports the geometry.
// Nothing here reads the renderer's in-memory mask, so the table below can
// disagree with the engine, which is the point.
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
  identityFontUrl,
  identityStencilSvg,
  measureMask,
  shapeText,
  type IdentityScript,
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

/** The two letterings `make_stencil.py` renders: classic and kufi. */
const LETTERINGS = ["classic", "kufi"] as const;

const SCRIPTS: readonly IdentityScript[] = ["en", "ar"];

const directoryArgument =
  process.argv[2] ?? join(tmpdir(), "jewelo-identity-stencils");
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
          layout: "single-name",
          connector: "none",
          names: [{ approvedArabicText: script === "ar" ? text : null }],
          dimensions: { widthMm: 32, heightMm: 12, thicknessMm: 1.2 },
        },
      );
      writeFileSync(join(directory, file), rendered.png);

      const report = rendered.report as Record<string, unknown>;
      const fontFile = String(report.fontFile ?? "unknown");
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

      rows.push({
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

const luminance = rows.filter((row) => row.rule === "luminance").length;
const singlePiece = rows.filter((row) => row.components === 1).length;
console.log("");
console.log(`LUMINANCE ${luminance}/${rows.length}`);
console.log(`SINGLE-PIECE ${singlePiece}/${rows.length} (bridging is P1-4)`);

const manifest = join(directory, "render-report.json");
writeFileSync(
  manifest,
  `${JSON.stringify(
    rows.map((row) => ({
      file: row.file,
      pngSha256: row.sha256,
      report: { componentsFinal: row.components, jumpRingCount: 2 },
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
