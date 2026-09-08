import { createHash } from "node:crypto";
import type { IdentityScript, ShapingMeasurement } from "./shaping";

// D-019: the engine opens the pinned font bytes and shapes them with HarfBuzz
// instead of asking a rendering library for a family name, and it now serves
// both scripts, so the release identifier is no longer Arabic-only. The fonts
// directory keeps its old name (`CALEUMS_IDENTITY_FONT_DIRECTORY`); only the
// release identifier moves, and the fingerprint already carries it.
export const CALEUMS_ARABIC_ENGINE_RELEASE = "caleums-identity-v4" as const;

export type CaleumsArabicStyle =
  "classic" | "minimal" | "diwani" | "thuluth-inspired" | "kufi" | "signature";

export interface IdentitySolverInput {
  approvedNames: readonly string[];
  /** One solver serves both scripts since P1-3; the script picks the font. */
  language: IdentityScript;
  style: string;
  layout: string;
  connector: string;
  dimensions: Readonly<{
    widthMm: number;
    heightMm: number;
    thicknessMm: number;
  }>;
  pipelineRelease: string;
}

export interface RasterMask {
  width: number;
  height: number;
  /** One byte per pixel: 1 is pendant material and 0 is background. */
  ink: Uint8Array;
}

/** What the rasterizer returns: the mask plus what shaping measured. */
export interface TypesetResult {
  readonly mask: RasterMask;
  readonly shaping: ShapingMeasurement;
}

/** The pinned faces the live styles may use, per script. */
export type IdentityFontFile =
  | "Amiri-Regular.ttf"
  | "ScheherazadeNew-Regular.ttf"
  | "NotoNaskhArabic-Regular.ttf"
  | "ArefRuqaa-Regular.ttf"
  | "NotoKufiArabic-Regular.ttf"
  | "rakkas.ttf"
  | "PlayfairDisplay-SemiBold.ttf"
  | "cairo.ttf";

/**
 * The rasteriser port. One implementation serves both scripts since P1-3: it
 * shapes the pinned bytes, builds the path-only stencil SVG and paints it, so
 * there is no size or padding to pass - the fit is `identityStencilSvg`'s.
 */
export interface IdentityRasterizer {
  typeset(input: {
    approvedText: string;
    fontFile: IdentityFontFile;
    script: IdentityScript;
  }): Promise<TypesetResult>;
  encodePng(mask: RasterMask): Promise<Uint8Array>;
  shapingVersions(): Readonly<Record<string, string>>;
}

export interface IdentityValidationReport {
  engineRelease: typeof CALEUMS_ARABIC_ENGINE_RELEASE;
  pipelineRelease: string;
  approvedCharacters: string;
  style: CaleumsArabicStyle;
  fontFile: string;
  /** The sha declared by the pinned style table. */
  fontSha256: string;
  /** The sha of the bytes HarfBuzz actually shaped with. */
  fontSha256Measured: string;
  shaping: Readonly<Record<string, string>>;
  componentsBefore: number;
  fuseMoves: number;
  dilationPixels: number;
  jumpRingCount: 2;
  componentsFinal: 1;
  /** Measured by HarfBuzz: no glyph id 0 and every NFC code point covered. */
  exactCharactersPreserved: boolean;
  passed: true;
}

export interface IdentityArtifact {
  png: Uint8Array;
  pngSha256: string;
  fingerprint: string;
  report: IdentityValidationReport;
}

export class IdentitySolverError extends Error {
  constructor(
    readonly code:
      | "unsupported_arabic_style"
      | "unsupported_arabic_two_name"
      | "approved_text_missing"
      | "identity_mask_empty"
      | "identity_fuse_failed"
      | "identity_component_gate_failed"
      | "identity_font_bytes_mismatch"
      | "identity_shaping_gate_failed",
    message: string = code,
  ) {
    super(message);
    this.name = "IdentitySolverError";
  }
}

interface PinnedFace {
  readonly fontFile: IdentityFontFile;
  /** Sha of the bytes this style pins; shaping must load exactly these. */
  readonly fontSha256: string;
}

const NASKH = "NotoNaskhArabic-Regular.ttf" as const;
const NASKH_SHA =
  "67b5a525a661b607971fbd3f96a81b89d3a768e74534fca84f18ac97e6fab72f" as const;
const PLAYFAIR = "PlayfairDisplay-SemiBold.ttf" as const;
const PLAYFAIR_SHA =
  "c40f2293766a503bc70cce9e512ef844a4ccb7cbcde792fe2ea31d191917d8d6" as const;

/**
 * The live styles, each pinning one face per script by file name and by the
 * sha of that file's bytes. The Latin column mirrors `make_stencil.py` FONTS:
 * Playfair Display is the certified serif, and Kufi has no Latin coverage at
 * all, so the English side of the Kufi family uses Cairo, the geometric sans
 * from the same licensed pack.
 */
const LIVE_STYLES = {
  classic: {
    // Amiri stacks lam-ya under HarfBuzz; Noto Naskh keeps the flat form the
    // approved renders used.
    ar: { fontFile: NASKH, fontSha256: NASKH_SHA },
    en: { fontFile: PLAYFAIR, fontSha256: PLAYFAIR_SHA },
    dilationPixels: 1,
  },
  minimal: {
    ar: {
      fontFile: "ScheherazadeNew-Regular.ttf",
      fontSha256:
        "794bac8dc9e83d1d620bc471ea694f5f31d0965ce8006490a79dfc51a2d283b3",
    },
    en: { fontFile: PLAYFAIR, fontSha256: PLAYFAIR_SHA },
    dilationPixels: 2,
  },
  // Opened to all customers on 2026-08-27: no atelier gate on style.
  // Aref Ruqaa slopes the baseline, so the stencil stopped reading as one
  // horizontal pendant; both styles render on the certified Naskh face and
  // reach the model as a style word through {{arabic_style}} instead.
  diwani: {
    ar: { fontFile: NASKH, fontSha256: NASKH_SHA },
    en: { fontFile: PLAYFAIR, fontSha256: PLAYFAIR_SHA },
    dilationPixels: 1,
  },
  signature: {
    ar: { fontFile: NASKH, fontSha256: NASKH_SHA },
    en: { fontFile: PLAYFAIR, fontSha256: PLAYFAIR_SHA },
    dilationPixels: 1,
  },
  kufi: {
    ar: {
      fontFile: "NotoKufiArabic-Regular.ttf",
      fontSha256:
        "494f6b61469d7a02a2d63f0fc4930bb007388d8cfe551de5eb98354e100889f3",
    },
    en: {
      fontFile: "cairo.ttf",
      fontSha256:
        "667c987182391c91f4e57a2f455b1794fb5e3ee6ca4ef3383e86bb690fa9c964",
    },
    dilationPixels: 1,
  },
  "thuluth-inspired": {
    ar: {
      fontFile: "rakkas.ttf",
      fontSha256:
        "54278882e4774c14d50c3b555f127d0fe586366d5b787316ebbcbd8108829e60",
    },
    en: { fontFile: PLAYFAIR, fontSha256: PLAYFAIR_SHA },
    dilationPixels: 1,
  },
} as const satisfies Record<
  string,
  Record<IdentityScript, PinnedFace> & { dilationPixels: number }
>;

export function classifyArabicIdentityInput(
  input: IdentitySolverInput,
):
  | { supported: true; style: CaleumsArabicStyle }
  | { supported: false; code: IdentitySolverError["code"] } {
  if (input.approvedNames.length !== 1)
    return { supported: false, code: "unsupported_arabic_two_name" };
  if (!(input.style in LIVE_STYLES))
    return { supported: false, code: "unsupported_arabic_style" };
  return { supported: true, style: input.style as CaleumsArabicStyle };
}

export async function solveIdentity(
  input: IdentitySolverInput,
  rasterizer: IdentityRasterizer,
): Promise<IdentityArtifact> {
  const support = classifyArabicIdentityInput(input);
  if (!support.supported) throw new IdentitySolverError(support.code);
  const approvedText = input.approvedNames[0]?.normalize("NFC").trim();
  if (!approvedText) throw new IdentitySolverError("approved_text_missing");
  const style = LIVE_STYLES[support.style];
  const face = style[input.language];
  const { mask, shaping } = await rasterizer.typeset({
    approvedText,
    fontFile: face.fontFile,
    script: input.language,
  });
  // The bytes that were shaped must be the bytes the style pins: a font
  // swapped on disk changes the spelling without changing anything else.
  if (shaping.fontSha256Measured !== face.fontSha256)
    throw new IdentitySolverError(
      "identity_font_bytes_mismatch",
      `${face.fontFile}: loaded ${shaping.fontSha256Measured}`,
    );
  if (!shaping.exactCharactersPreserved)
    throw new IdentitySolverError(
      "identity_shaping_gate_failed",
      `${approvedText}: ${shaping.notdefGlyphs} notdef glyphs, ${shaping.uncoveredCodePoints.length} uncovered code points`,
    );
  const componentsBefore = components(mask).length;
  if (componentsBefore === 0)
    throw new IdentitySolverError(
      "identity_mask_empty",
      `${approvedText}: rasterizer produced no ink`,
    );
  const fused = fuse(mask, Math.max(3, Math.floor(560 / 45)));
  for (let index = 0; index < style.dilationPixels; index += 1)
    dilate(fused.mask);
  addJumpRings(fused.mask, 560);
  const componentsFinal = components(fused.mask).length;
  if (componentsFinal !== 1)
    throw new IdentitySolverError(
      "identity_component_gate_failed",
      `${approvedText}: ${componentsFinal} components after solving`,
    );
  const png = await rasterizer.encodePng(fused.mask);
  const pngSha256 = sha256(png);
  const fingerprint = sha256(
    [
      CALEUMS_ARABIC_ENGINE_RELEASE,
      input.pipelineRelease,
      input.language,
      approvedText,
      support.style,
      input.layout,
      input.connector,
      shaping.fontSha256Measured,
      pngSha256,
    ].join("|"),
  );
  return {
    png,
    pngSha256,
    fingerprint,
    report: {
      engineRelease: CALEUMS_ARABIC_ENGINE_RELEASE,
      pipelineRelease: input.pipelineRelease,
      approvedCharacters: approvedText,
      style: support.style,
      fontFile: face.fontFile,
      fontSha256: face.fontSha256,
      fontSha256Measured: shaping.fontSha256Measured,
      shaping: {
        ...rasterizer.shapingVersions(),
        harfbuzzShaper: shaping.harfbuzzVersion,
      },
      componentsBefore,
      fuseMoves: fused.moves,
      dilationPixels: style.dilationPixels,
      jumpRingCount: 2,
      componentsFinal: 1,
      exactCharactersPreserved: shaping.exactCharactersPreserved,
      passed: true,
    },
  };
}

export function countConnectedComponents(mask: RasterMask): number {
  return components(mask).length;
}

function fuse(mask: RasterMask, overlap: number) {
  let moves = 0;
  while (true) {
    const found = components(mask);
    if (found.length === 1) return { mask, moves };
    const smallest = found.reduce((left, right) =>
      left.length <= right.length ? left : right,
    );
    const selected = new Set(smallest);
    const others: number[] = [];
    for (let index = 0; index < mask.ink.length; index += 1)
      if (mask.ink[index] && !selected.has(index)) others.push(index);
    const source = sample(smallest, 600);
    const target = sample(others, 6000);
    let bestSource = source[0]!;
    let bestTarget = target[0]!;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const sourceIndex of source) {
      const sy = Math.floor(sourceIndex / mask.width);
      const sx = sourceIndex % mask.width;
      for (const targetIndex of target) {
        const ty = Math.floor(targetIndex / mask.width);
        const tx = targetIndex % mask.width;
        const distance = (ty - sy) ** 2 + (tx - sx) ** 2;
        if (distance < bestDistance) {
          bestDistance = distance;
          bestSource = sourceIndex;
          bestTarget = targetIndex;
        }
      }
    }
    const sy = Math.floor(bestSource / mask.width);
    const sx = bestSource % mask.width;
    const ty = Math.floor(bestTarget / mask.width);
    const tx = bestTarget % mask.width;
    const length = Math.hypot(ty - sy, tx - sx) || 1;
    const dy = Math.round(
      ((ty - sy) / length) * (Math.sqrt(bestDistance) + overlap),
    );
    const dx = Math.round(
      ((tx - sx) / length) * (Math.sqrt(bestDistance) + overlap),
    );
    for (const index of smallest) mask.ink[index] = 0;
    for (const index of smallest) {
      const y = Math.max(
        0,
        Math.min(mask.height - 1, Math.floor(index / mask.width) + dy),
      );
      const x = Math.max(
        0,
        Math.min(mask.width - 1, (index % mask.width) + dx),
      );
      mask.ink[y * mask.width + x] = 1;
    }
    moves += 1;
    if (moves > 60)
      throw new IdentitySolverError(
        "identity_fuse_failed",
        "fuse did not converge after 60 moves",
      );
  }
}

function components(mask: RasterMask): number[][] {
  const visited = new Uint8Array(mask.ink.length);
  const result: number[][] = [];
  const neighbors = [-mask.width, mask.width, -1, 1];
  for (let start = 0; start < mask.ink.length; start += 1) {
    if (!mask.ink[start] || visited[start]) continue;
    const component: number[] = [];
    const queue = [start];
    visited[start] = 1;
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor]!;
      component.push(current);
      const x = current % mask.width;
      for (const offset of neighbors) {
        if (
          (offset === -1 && x === 0) ||
          (offset === 1 && x === mask.width - 1)
        )
          continue;
        const next = current + offset;
        if (
          next >= 0 &&
          next < mask.ink.length &&
          mask.ink[next] &&
          !visited[next]
        ) {
          visited[next] = 1;
          queue.push(next);
        }
      }
    }
    result.push(component);
  }
  return result;
}

function sample(values: number[], maximum: number): number[] {
  if (values.length <= maximum) return values;
  const stride = Math.max(1, Math.floor(values.length / maximum));
  return values
    .filter((_value, index) => index % stride === 0)
    .slice(0, maximum);
}

function dilate(mask: RasterMask): void {
  const source = mask.ink.slice();
  for (let index = 0; index < source.length; index += 1) {
    if (!source[index]) continue;
    const y = Math.floor(index / mask.width);
    const x = index % mask.width;
    for (let dy = -1; dy <= 1; dy += 1)
      for (let dx = -1; dx <= 1; dx += 1) {
        const ny = y + dy;
        const nx = x + dx;
        if (ny >= 0 && ny < mask.height && nx >= 0 && nx < mask.width)
          mask.ink[ny * mask.width + nx] = 1;
      }
  }
}

function addJumpRings(mask: RasterMask, nominalSize: number): void {
  const points: Array<{ x: number; y: number }> = [];
  for (let index = 0; index < mask.ink.length; index += 1)
    if (mask.ink[index])
      points.push({ x: index % mask.width, y: Math.floor(index / mask.width) });
  if (!points.length) throw new IdentitySolverError("approved_text_missing");
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
  }
  const range = Math.max(1, maxX - minX);
  const outer = Math.floor(nominalSize / 15);
  const inner = Math.floor(nominalSize / 28);
  for (const side of ["left", "right"] as const) {
    const candidates = points.filter((point) =>
      side === "left"
        ? point.x < minX + range * 0.2
        : point.x > maxX - range * 0.2,
    );
    const anchor = candidates.reduce((top, point) =>
      point.y < top.y ? point : top,
    );
    const cx = anchor.x;
    const cy = anchor.y - outer + Math.max(2, Math.floor(nominalSize / 80));
    drawDisk(mask, cx, cy, outer, 1);
    drawDisk(mask, cx, cy, inner, 0);
  }
}

function drawDisk(
  mask: RasterMask,
  cx: number,
  cy: number,
  radius: number,
  value: 0 | 1,
): void {
  for (
    let y = Math.max(0, cy - radius);
    y <= Math.min(mask.height - 1, cy + radius);
    y += 1
  )
    for (
      let x = Math.max(0, cx - radius);
      x <= Math.min(mask.width - 1, cx + radius);
      x += 1
    )
      if ((x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2)
        mask.ink[y * mask.width + x] = value;
}

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}
