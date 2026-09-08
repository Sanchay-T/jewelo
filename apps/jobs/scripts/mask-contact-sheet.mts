// P2-2 proof. Runs the photograph pendant mask and the stencil registration
// over every ledger row that resolves to a still, writes one overlay per image
// and a self-contained `index.html` contact sheet, and prints the IoU
// distributions the P2-3 threshold is taken from.
//
// The corpus comes from `docs/goals/overnight-launch/lab/replay-report.json`,
// which is P2-1's resolution of every still and every stencil path; the ledger
// itself is not re-parsed here, so the two harnesses cannot disagree about
// which file a row means.
//
// The threshold P2-3 uses is the p05 of the IoU over the studio packshot rows
// the human viewer passed, rounded down to two decimals. It is printed by this
// script and nowhere else. The other three views are measured and shown, but
// they are not claimed: their view briefs ask for a three-quarter macro, a
// chain leaving the frame and one ring in shot, so an orthographic stencil
// cannot register onto them and P2-3 compares them against the verified studio
// master instead (phase 2 plan review, B1 and B2).
//
// Run it (Node is pinned to 24.18.1):
//   corepack pnpm --filter @jewelo/jobs mask-contact-sheet
//   corepack pnpm --filter @jewelo/jobs mask-contact-sheet --limit=8
//   corepack pnpm --filter @jewelo/jobs mask-contact-sheet --out=/absolute/dir
//
// Nothing here calls a provider and nothing here writes outside the output
// directory. The overlays are downscaled JPEGs because the directory is
// committed to a public repository; the lab stills are already public in this
// repository, and no style anchor and nothing from `caleums-private` is read.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parsePhotoMaskEnv, type PhotoMaskConfig } from "@jewelo/config";
import sharp from "sharp";

import { decodeMask } from "../src/decode-mask";
import { renderIdentityAnchor } from "../src/identity-anchor";
import {
  buildPhotoPendantMask,
  projectStencil,
  registerStencilToPhoto,
  type RegistrationResult,
} from "../src/photo-mask";

const REPO_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const DEFAULT_REPORT = "docs/goals/overnight-launch/lab/replay-report.json";
const DEFAULT_OUT = "docs/goals/road-to-gold/dogfood-2026-09-08/phase2-mask";

/**
 * Overlays are written at the mask's own working resolution and encoded as
 * JPEG, because this directory is committed to a public repository and 91
 * full-size PNGs would not be.
 */
const OVERLAY_JPEG_QUALITY = 72;

/** The five tags a geometry gate could own; the separation target is against these. */
const GEOMETRY_TAGS = [
  "extra-ring",
  "missing-ring",
  "disconnected-component",
  "floating-mark",
  "floating-stone",
] as const;

const VIEW_ORDER = ["studio", "on_skin", "close_up", "dark"] as const;
const VERDICT_ORDER = ["pass", "tweak", "fail", "unscored"] as const;

interface ReplayRow {
  readonly id: string;
  readonly look: string | null;
  readonly presentationView: string;
  readonly verdict: string | null;
  readonly tags: readonly string[];
  readonly file: string;
  readonly fileResolved: boolean;
  readonly stencil: string | null;
  /** P2-2b: what a construction stencil for this row would have to say. */
  readonly approvedText: string | null;
  readonly script: string | null;
}

/**
 * P2-2b. `--construction-stencils` renders the stencil for a row whose look
 * carries structure through the production engine, instead of reading the
 * ledger's bare-name PNG.
 *
 * P2-2 measured the corpus and found no separation, and the reason was not the
 * mask: the ledger stencil for a `framed-minimal` still is the name alone while
 * the photograph is a name inside a frame, so the registration was comparing
 * two different objects. D-021 made the stencil carry the construction, and
 * this is the flag that measures whether that closed the gap. It is opt-in so
 * the P2-2 numbers stay reproducible line for line.
 */
const CONSTRUCTION_STENCIL_LOOKS = new Set(["framed-minimal", "diamond-rails"]);

interface SheetRow {
  readonly id: string;
  readonly look: string;
  readonly view: string;
  readonly verdict: string;
  readonly tags: readonly string[];
  readonly overlay: string;
  readonly iou: number;
  readonly status: string;
  readonly reason: string | null;
  readonly scale: number;
  readonly rotation: number;
  readonly coverage: number;
  readonly components: number;
  readonly strokeWidth: number;
  readonly closeRadius: number;
}

/** Everything printed to stdout, kept so the sheet can carry it as well. */
const printed: string[] = [];
function say(line: string): void {
  printed.push(line);
  console.log(line);
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function resolveArgumentPath(value: string): string {
  if (isAbsolute(value)) return value;
  const fromCwd = resolve(process.cwd(), value);
  if (existsSync(fromCwd)) return fromCwd;
  return join(REPO_ROOT, value);
}

function argumentValue(name: string): string | null {
  const prefix = `--${name}=`;
  const found = process.argv.slice(2).find((entry) => entry.startsWith(prefix));
  return found === undefined ? null : found.slice(prefix.length);
}

function asRow(value: unknown): ReplayRow | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  const id = record["id"];
  const view = record["presentationView"];
  const file = record["file"];
  if (typeof id !== "string" || typeof view !== "string") return null;
  if (typeof file !== "string") return null;
  const verdict = record["verdict"];
  const stencil = record["stencil"];
  const look = record["look"];
  const tags = Array.isArray(record["tags"])
    ? (record["tags"] as unknown[]).filter(
        (tag): tag is string => typeof tag === "string",
      )
    : [];
  return {
    id,
    look: typeof look === "string" ? look : null,
    presentationView: view,
    verdict: typeof verdict === "string" ? verdict : null,
    tags,
    file,
    fileResolved: record["fileResolved"] === true,
    stencil: typeof stencil === "string" ? stencil : null,
    approvedText:
      typeof record["approvedText"] === "string"
        ? (record["approvedText"] as string)
        : null,
    script: typeof record["script"] === "string" ? (record["script"] as string) : null,
  };
}

/**
 * The stencil bytes this row is registered against: the ledger's file, or the
 * piece the production engine draws for this row's construction.
 *
 * The lettering comes from the ledger stencil's own name (`asma-en-classic`),
 * because that is what the lab rendered the still from; only the construction
 * changes, so a difference in the numbers is the construction and nothing else.
 */
async function stencilBytesFor(
  row: ReplayRow,
  stencilPath: string,
  useConstruction: boolean,
): Promise<Buffer> {
  const look = row.look;
  if (
    !useConstruction ||
    look === null ||
    !CONSTRUCTION_STENCIL_LOOKS.has(look) ||
    row.approvedText === null ||
    row.script === null
  )
    return readFileSync(stencilPath);
  const lettering = /-(classic|kufi)\.png$/.exec(stencilPath)?.[1] ?? "classic";
  const script = row.script === "ar" ? "ar" : "en";
  const rendered = await renderIdentityAnchor(
    {
      approvedText: row.approvedText,
      language: script,
      typography: lettering,
      fingerprint: `p2-2b-${row.id}`,
    },
    {
      arabicStyle: lettering,
      lettering,
      construction: look,
      layout: "single-name",
      connector: "none",
      names: [{ approvedArabicText: script === "ar" ? row.approvedText : null }],
      dimensions: { widthMm: 32, heightMm: 12, thicknessMm: 1.2 },
    },
    "caleums-final-media-v2",
    new Set<string>(),
  );
  return rendered.png;
}

/**
 * Percentile of an ascending sample by nearest rank on `floor(p * (n - 1))`.
 * Stated because "the p05" has to mean one thing: with 49 studio passes the
 * p05 is the third smallest value, not an interpolation between two of them.
 */
function percentile(sorted: readonly number[], fraction: number): number {
  if (sorted.length === 0) return Number.NaN;
  const index = Math.floor(fraction * (sorted.length - 1));
  return sorted[index] as number;
}

function describe(label: string, values: readonly number[]): string {
  if (values.length === 0) return `${label}: none`;
  const sorted = [...values].sort((a, b) => a - b);
  const at = (fraction: number) => percentile(sorted, fraction).toFixed(3);
  return [
    `${label}:`,
    `count=${String(sorted.length)}`,
    `min=${(sorted[0] as number).toFixed(3)}`,
    `p05=${at(0.05)}`,
    `median=${at(0.5)}`,
    `max=${(sorted[sorted.length - 1] as number).toFixed(3)}`,
  ].join(" ");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Photo, the mask tinted over it, and the registered stencil outline drawn on
 * top. The tint is what tells a reader whether the mask found the piece; the
 * outline is what tells them whether the registration put the stencil where
 * the piece is. Both have to be visible at a glance in a contact sheet.
 */
async function writeOverlay(
  stillPath: string,
  mask: { width: number; height: number; ink: Uint8Array },
  outline: Uint8Array,
  destination: string,
): Promise<void> {
  const { data } = await sharp(stillPath, { failOn: "error" })
    .removeAlpha()
    .resize({ width: mask.width, height: mask.height, fit: "fill" })
    .toColourspace("srgb")
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = Buffer.from(data);
  for (let index = 0; index < mask.ink.length; index += 1) {
    const offset = index * 3;
    if (mask.ink[index] !== 0) {
      pixels[offset] = Math.round((pixels[offset] as number) * 0.45);
      pixels[offset + 1] = Math.round(
        (pixels[offset + 1] as number) * 0.45 + 0.55 * 235,
      );
      pixels[offset + 2] = Math.round(
        (pixels[offset + 2] as number) * 0.45 + 0.55 * 255,
      );
    }
    if (outline[index] !== 0) {
      pixels[offset] = 255;
      pixels[offset + 1] = 0;
      pixels[offset + 2] = 170;
    }
  }
  await sharp(pixels, {
    raw: { width: mask.width, height: mask.height, channels: 3 },
  })
    .jpeg({ quality: OVERLAY_JPEG_QUALITY })
    .toFile(destination);
}

/** Boundary of a projected mask: ink with a 4-neighbour that is not ink. */
function outlineOf(
  width: number,
  height: number,
  ink: Uint8Array,
): Uint8Array {
  const edge = new Uint8Array(ink.length);
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (ink[index] === 0) continue;
      const open =
        x === 0 ||
        y === 0 ||
        x === width - 1 ||
        y === height - 1 ||
        ink[index - 1] === 0 ||
        ink[index + 1] === 0 ||
        ink[index - width] === 0 ||
        ink[index + width] === 0;
      if (open) edge[index] = 1;
    }
  return edge;
}

function renderSheet(
  rows: readonly SheetRow[],
  config: PhotoMaskConfig,
  summary: readonly string[],
): string {
  const sections: string[] = [];
  for (const view of VIEW_ORDER) {
    const inView = rows.filter((row) => row.view === view);
    if (inView.length === 0) continue;
    const groups: string[] = [];
    for (const verdict of VERDICT_ORDER) {
      const cells = inView.filter((row) => row.verdict === verdict);
      if (cells.length === 0) continue;
      const figures = cells
        .map((row) => {
          const caption = [
            escapeHtml(row.id),
            escapeHtml(row.verdict),
            row.tags.length > 0 ? escapeHtml(row.tags.join(", ")) : "no tags",
            `IoU ${row.iou.toFixed(3)}`,
            escapeHtml(row.status),
            `scale ${row.scale.toFixed(2)} rot ${row.rotation.toFixed(1)} deg`,
            `cover ${(row.coverage * 100).toFixed(1)}% parts ${String(row.components)}`,
            `stroke ${String(row.strokeWidth)} close ${String(row.closeRadius)}`,
            row.reason === null ? "" : escapeHtml(row.reason),
          ]
            .filter((entry) => entry.length > 0)
            .join("<br>");
          return `<figure class="cell ${escapeHtml(row.status)}"><img src="${escapeHtml(row.overlay)}" alt="${escapeHtml(row.id)}" loading="lazy"><figcaption>${caption}</figcaption></figure>`;
        })
        .join("\n");
      groups.push(
        `<h3>${escapeHtml(verdict)} (${String(cells.length)})</h3>\n<div class="grid">\n${figures}\n</div>`,
      );
    }
    sections.push(
      `<section><h2>${escapeHtml(view)} (${String(inView.length)})</h2>\n${groups.join("\n")}\n</section>`,
    );
  }
  const settings = Object.entries(config)
    .map(([key, value]) => `${escapeHtml(key)} = ${escapeHtml(String(value))}`)
    .join("<br>");
  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>P2-2 photograph pendant masks</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; padding: 24px; background: #f6f4f0; color: #1c1a17;
         font: 13px/1.45 ui-sans-serif, system-ui, sans-serif; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 16px; margin: 28px 0 4px; text-transform: capitalize; }
  h3 { font-size: 13px; margin: 14px 0 6px; font-weight: 600; color: #6b6257; }
  p.note { max-width: 78ch; color: #4a443c; }
  .grid { display: grid; gap: 12px;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
  figure { margin: 0; background: #fff; border: 1px solid #e2ddd4; border-radius: 6px;
           overflow: hidden; }
  figure.registration_failed { border-color: #c0392b; }
  img { display: block; width: 100%; height: auto; }
  figcaption { padding: 6px 8px; font-size: 11px; line-height: 1.35; color: #4a443c; }
  details { margin-top: 18px; }
  code, pre.summary { font-family: ui-monospace, monospace; }
  pre.summary { background: #fff; border: 1px solid #e2ddd4; border-radius: 6px;
                padding: 12px 14px; font-size: 11px; overflow-x: auto; }
</style>
<h1>P2-2 photograph pendant masks and stencil registration</h1>
<pre class="summary">${escapeHtml(summary.join("\n"))}</pre>
<p class="note">Cyan is the measured pendant mask. The magenta line is the outline of the
deterministic stencil after a similarity registration (uniform scale, in-plane rotation,
translation) initialised from image moments and refined by a bounded IoU search. A cell with a
red border is <code>registration_failed</code>: the transform left its configured bounds, which
is a different event from a low IoU and must not be read as one. The studio packshot group is
the only one the P2-3 threshold is taken from.</p>
${sections.join("\n")}
<details><summary>Configuration these masks were measured with</summary><p>${settings}</p></details>
</html>
`;
}

async function main(): Promise<void> {
  const config = parsePhotoMaskEnv(process.env);
  const reportPath = resolveArgumentPath(argumentValue("report") ?? DEFAULT_REPORT);
  const outDirectory = resolveArgumentPath(argumentValue("out") ?? DEFAULT_OUT);
  const dumpId = argumentValue("dump");
  // P2-2b: register the two structural looks against the piece the production
  // engine draws for them, not against the ledger's bare name.
  const useConstructionStencils = process.argv
    .slice(2)
    .includes("--construction-stencils");
  const limitArgument = argumentValue("limit");
  const limit =
    limitArgument === null ? Number.POSITIVE_INFINITY : Number(limitArgument);
  if (!existsSync(reportPath))
    fail(`mask-contact-sheet: no replay report at ${reportPath} (run replay-lab first)`);

  const parsed: unknown = JSON.parse(readFileSync(reportPath, "utf8"));
  const rowsValue =
    typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)["rows"]
      : null;
  if (!Array.isArray(rowsValue)) fail("mask-contact-sheet: report has no rows array");
  const rows = (rowsValue as unknown[])
    .map(asRow)
    .filter((row): row is ReplayRow => row !== null);

  if (existsSync(outDirectory)) rmSync(outDirectory, { recursive: true });
  mkdirSync(join(outDirectory, "overlays"), { recursive: true });

  const sheetRows: SheetRow[] = [];
  const skipped: string[] = [];
  let done = 0;
  for (const row of rows) {
    if (done >= limit) break;
    if (!row.fileResolved || row.stencil === null) {
      skipped.push(`${row.id}: no still or no stencil`);
      continue;
    }
    const stillPath = join(REPO_ROOT, row.file);
    const stencilPath = join(REPO_ROOT, row.stencil);
    if (!existsSync(stillPath) || !existsSync(stencilPath)) {
      skipped.push(`${row.id}: path missing on disk`);
      continue;
    }
    const trace = dumpId !== null && dumpId === row.id;
    const mask = await buildPhotoPendantMask(readFileSync(stillPath), config, {
      trace,
    });
    const stencil = await decodeMask(
      await stencilBytesFor(row, stencilPath, useConstructionStencils),
    );
    const registration: RegistrationResult = registerStencilToPhoto(
      stencil,
      mask,
      config,
    );
    const projected = projectStencil(stencil, mask, registration.transform);
    if (trace) {
      let both = 0;
      let onlyStencil = 0;
      let onlyPhoto = 0;
      for (let index = 0; index < projected.length; index += 1) {
        const inStencil = projected[index] !== 0;
        const inPhoto = mask.ink[index] !== 0;
        if (inStencil && inPhoto) both += 1;
        else if (inStencil) onlyStencil += 1;
        else if (inPhoto) onlyPhoto += 1;
      }
      process.stderr.write(
        `  trace ${row.id}: both=${String(both)} stencil-only=${String(onlyStencil)} photo-only=${String(onlyPhoto)}\n`,
      );
    }
    if (trace && mask.trace !== undefined) {
      for (const [name, plane] of [
        ["edges", mask.trace.edges],
        ["closed-edges", mask.trace.closedEdges],
        ["first-pass", mask.trace.firstPass],
        ["mask", mask.ink],
        ["projected-stencil", projected],
      ] as const) {
        const grey = Buffer.from(plane.map((value) => (value !== 0 ? 255 : 0)));
        await sharp(grey, {
          raw: { width: mask.width, height: mask.height, channels: 1 },
        }).png().toFile(join(outDirectory, `trace-${row.id}-${name}.png`));
      }
    }

    const overlay = join("overlays", `${row.id}.jpg`);
    await writeOverlay(
      stillPath,
      mask,
      outlineOf(mask.width, mask.height, projected),
      join(outDirectory, overlay),
    );
    sheetRows.push({
      id: row.id,
      look: row.look ?? "unknown",
      view: row.presentationView,
      verdict: row.verdict ?? "unscored",
      tags: row.tags,
      overlay,
      iou: registration.iou,
      status: registration.status,
      reason: registration.reason,
      scale: registration.transform.scale,
      rotation: registration.transform.rotationDegrees,
      coverage: mask.coverage,
      components: mask.components,
      strokeWidth: mask.strokeWidth,
      closeRadius: mask.closeRadius,
    });
    done += 1;
    if (done % 10 === 0) process.stderr.write(`  ${String(done)} images\n`);
  }

  writeFileSync(
    join(outDirectory, "measurements.json"),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), config, rows: sheetRows }, null, 2)}\n`,
    "utf8",
  );

  const studio = sheetRows.filter((row) => row.view === "studio");
  const registered = (rows_: readonly SheetRow[]) =>
    rows_.filter((row) => row.status === "registered").map((row) => row.iou);
  const studioPasses = studio.filter((row) => row.verdict === "pass");
  const studioPassIou = registered(studioPasses);

  say("");
  say(`P2-2 mask contact sheet: ${String(sheetRows.length)} overlays`);
  say(`out: ${outDirectory}`);
  say("percentile rule: nearest rank, index = floor(fraction * (n - 1))");
  say("");
  say(describe("studio human passes", studioPassIou));
  for (const view of VIEW_ORDER) {
    if (view === "studio") continue;
    const passes = sheetRows.filter(
      (row) => row.view === view && row.verdict === "pass",
    );
    say(
      `${describe(`${view} human passes (reported, not claimed)`, registered(passes))}`,
    );
  }
  say("");
  say(
    useConstructionStencils
      ? "studio human passes by look - `framed-minimal` and `diamond-rails` are registered against"
      : "studio human passes by look - the stencil is the whole piece only for `classical`;",
  );
  say(
    useConstructionStencils
      ? "  the construction stencil the production engine draws (D-021); `origami-ribbon` is still a bare name:"
      : "  every other look adds a frame, a rail or a ribbon that no stencil in this corpus carries:",
  );
  for (const look of [...new Set(sheetRows.map((row) => row.look))].sort()) {
    const passes = studioPasses.filter((row) => row.look === look);
    if (passes.length === 0) continue;
    say(`  ${describe(look, registered(passes))}`);
  }
  say("");
  say("defect rows by tag (studio only):");
  const tags = new Set<string>();
  for (const row of sheetRows) for (const tag of row.tags) tags.add(tag);
  for (const tag of [...tags].sort()) {
    const tagged = studio.filter((row) => row.tags.includes(tag));
    say(`  ${describe(tag, registered(tagged))}`);
  }
  say("");
  const geometry = studio.filter((row) =>
    row.tags.some((tag) => (GEOMETRY_TAGS as readonly string[]).includes(tag)),
  );
  say(
    describe("studio geometry-defect rows (the five tags a gate owns)", registered(geometry)),
  );
  const geometryIou = registered(geometry);
  const passP05 =
    studioPassIou.length === 0
      ? Number.NaN
      : percentile([...studioPassIou].sort((a, b) => a - b), 0.05);
  const worstDefect =
    geometryIou.length === 0 ? Number.NaN : Math.max(...geometryIou);
  say("");
  say(
    `studio pass p05 = ${passP05.toFixed(3)}; highest geometry-defect IoU = ${worstDefect.toFixed(3)}`,
  );
  say(
    `P2-3 threshold candidate (p05 rounded down to two decimals) = ${(Math.floor(passP05 * 100) / 100).toFixed(2)}`,
  );
  say(
    passP05 > worstDefect
      ? "separation: the studio pass p05 is above every geometry-defect row"
      : "separation: NOT achieved - at least one geometry-defect row scores at or above the pass p05",
  );
  say("");
  const failures = sheetRows.filter((row) => row.status === "registration_failed");
  say(`registration failures: ${String(failures.length)} of ${String(sheetRows.length)}`);
  for (const row of failures)
    say(`  ${row.id} (${row.view}, ${row.verdict}): ${row.reason ?? "unknown"}`);
  if (skipped.length > 0) {
    say("");
    say(`skipped rows: ${String(skipped.length)}`);
    for (const entry of skipped) say(`  ${entry}`);
  }
  say("");
  say("five lowest studio passes:");
  for (const row of [...studioPasses].sort((a, b) => a.iou - b.iou).slice(0, 5))
    say(
      `  ${row.id}: IoU ${row.iou.toFixed(3)} ${row.status} cover ${(row.coverage * 100).toFixed(1)}% parts ${String(row.components)} stroke ${String(row.strokeWidth)} close ${String(row.closeRadius)}`,
    );

  // The sheet carries the same numbers it was measured with, so a reader in a
  // browser never has to trust a paste of the console output.
  writeFileSync(
    join(outDirectory, "index.html"),
    renderSheet(sheetRows, config, printed),
    "utf8",
  );
}

await main();
