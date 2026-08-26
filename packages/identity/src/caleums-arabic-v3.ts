import { createHash } from "node:crypto";

export const CALEUMS_ARABIC_ENGINE_RELEASE = "caleums-arabic-v3" as const;

export type CaleumsArabicStyle = "classic" | "minimal";

export interface IdentitySolverInput {
  approvedNames: readonly string[];
  language: "ar";
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

export interface ArabicIdentityRasterizer {
  typeset(input: {
    approvedText: string;
    fontFile: "Amiri-Regular.ttf" | "ScheherazadeNew-Regular.ttf";
    fontSize: number;
    padding: number;
  }): Promise<RasterMask>;
  encodePng(mask: RasterMask): Promise<Uint8Array>;
  shapingVersions(): Readonly<Record<string, string>>;
}

export interface IdentityValidationReport {
  engineRelease: typeof CALEUMS_ARABIC_ENGINE_RELEASE;
  pipelineRelease: string;
  approvedCharacters: string;
  style: CaleumsArabicStyle;
  fontFile: string;
  fontSha256: string;
  shaping: Readonly<Record<string, string>>;
  componentsBefore: number;
  fuseMoves: number;
  dilationPixels: number;
  jumpRingCount: 2;
  componentsFinal: 1;
  exactCharactersPreserved: true;
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
      | "identity_fuse_failed"
      | "identity_component_gate_failed",
    message: string = code,
  ) {
    super(message);
    this.name = "IdentitySolverError";
  }
}

const LIVE_STYLES = {
  classic: {
    fontFile: "Amiri-Regular.ttf",
    fontSha256:
      "b092096eb992aebe59084b0cb5cf0015ae82c7e76b0aac5e7d60ae5113af5f54",
    dilationPixels: 0,
  },
  minimal: {
    fontFile: "ScheherazadeNew-Regular.ttf",
    fontSha256:
      "794bac8dc9e83d1d620bc471ea694f5f31d0965ce8006490a79dfc51a2d283b3",
    dilationPixels: 2,
  },
} as const;

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

export async function solveArabicIdentity(
  input: IdentitySolverInput,
  rasterizer: ArabicIdentityRasterizer,
): Promise<IdentityArtifact> {
  const support = classifyArabicIdentityInput(input);
  if (!support.supported) throw new IdentitySolverError(support.code);
  const approvedText = input.approvedNames[0]?.normalize("NFC").trim();
  if (!approvedText) throw new IdentitySolverError("approved_text_missing");
  const style = LIVE_STYLES[support.style];
  const mask = await rasterizer.typeset({
    approvedText,
    fontFile: style.fontFile,
    fontSize: 560,
    padding: 186,
  });
  const componentsBefore = components(mask).length;
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
      "ar",
      approvedText,
      support.style,
      input.layout,
      input.connector,
      style.fontSha256,
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
      fontFile: style.fontFile,
      fontSha256: style.fontSha256,
      shaping: rasterizer.shapingVersions(),
      componentsBefore,
      fuseMoves: fused.moves,
      dilationPixels: style.dilationPixels,
      jumpRingCount: 2,
      componentsFinal: 1,
      exactCharactersPreserved: true,
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
