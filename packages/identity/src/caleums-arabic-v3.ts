import { createHash } from "node:crypto";
import { label4 } from "./geometry";
import {
  IDENTITY_BRIDGE_WIDTH,
  IDENTITY_LANCZOS_SUPPORT,
  IDENTITY_MAX_BRIDGES,
  IDENTITY_MIN_RECENTRE_SCALE,
  IDENTITY_RECENTRE_BOX,
  IDENTITY_RESAMPLE_INK_THRESHOLD,
  IDENTITY_RING_ANCHOR_EROSION,
  IDENTITY_RING_ANCHOR_SPANS,
  IDENTITY_RING_INNER,
  IDENTITY_RING_MAX_LIFT,
  IDENTITY_RING_OUTER,
  IDENTITY_RING_OUTWARD_FRACTION,
  IDENTITY_RING_TOP_CLEARANCE,
  IDENTITY_RING_WELD_ANCHOR_DEPTH,
  IDENTITY_RING_WELD_OVERLAP,
  IDENTITY_RING_WELD_START_GAP,
  IDENTITY_RING_WELD_WIDTH,
  IDENTITY_THICKEN_PASSES,
  type IdentityScript,
  type ShapingMeasurement,
} from "./shaping";

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
  /**
   * Whether to weld the two jump rings on. Rings are the default: a pendant
   * with no ring cannot hang on a chain. A construction that carries its own
   * suspension opts out, and that decision belongs to the caller
   * (`IDENTITY_RINGLESS_CONSTRUCTIONS` in `@jewelo/config`), never to this
   * package, which reads no environment.
   */
  rings?: boolean;
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
  /** Capsule bars drawn to join the islands (P1-4; was `fuseMoves`). */
  bridges: number;
  /** Dilation passes applied before bridging. */
  dilationPixels: number;
  /** Rings welded on: two by default, zero for a ring-free construction. */
  jumpRingCount: number;
  componentsFinal: 1;
  /** Measured by HarfBuzz: no glyph id 0 and every NFC code point covered. */
  exactCharactersPreserved: boolean;
  passed: true;
}

/** One welded ring: where its centre is, and the metal it grips. */
export interface IdentityRingCentre {
  readonly x: number;
  readonly y: number;
  /** The eroded-body pixel the ring was seated on, in the same coordinates. */
  readonly anchorX: number;
  readonly anchorY: number;
}

/**
 * How the raster was turned into one castable piece (P1-4), measured while it
 * happened rather than asserted afterwards.
 *
 * Every count below is stated in *pre-recentre* canvas coordinates, because
 * that is the only frame in which "the ink did not move" is a meaningful claim:
 * `recentre` then crops, optionally downscales and re-centres the whole piece,
 * and `recentreOffsetX/Y` plus `recentreScale` are exactly the transform it
 * applied, so a pre-recentre pixel `(x, y)` lands at
 * `(x * recentreScale + recentreOffsetX, y * recentreScale + recentreOffsetY)`.
 */
export interface IdentityConstructionMeasurement {
  /** Dilation passes applied before bridging (`make_stencil.py` THICKEN). */
  readonly thickenPasses: number;
  /** 4-connected islands after thickening, before any bridge was drawn. */
  readonly islandsBeforeBridging: number;
  /** Capsule bars drawn to join the islands. */
  readonly bridges: number;
  /** Ink pixels the bars added; nothing else changes ink before the rings. */
  readonly bridgePixelsAdded: number;
  /** Ink pixels present after thickening and before the first bar. */
  readonly inkPixelsBeforeBridging: number;
  /**
   * How many of those pixels are still ink at the same coordinate after
   * bridging. The solver refuses to continue unless this equals
   * `inkPixelsBeforeBridging`: a moved dot or hamza is a misspelled pendant.
   */
  readonly inkPixelsPreserved: number;
  /** Jump rings welded on (P1-5): two by default, zero when rings are off. */
  readonly jumpRings: number;
  /**
   * Ring centres in pre-recentre coordinates, left then right, each with the
   * anchor it was seated on. The hole always clears that anchor
   * (`y + IDENTITY_RING_INNER <= anchorY`), which is the per-side statement of
   * "the ring sits on top of the stroke rather than in it": the two ends of a
   * name are rarely the same height, so a ring welded to the short end is
   * correctly lower than the tall end's ascender. Empty when the construction
   * carries its own suspension.
   */
  readonly ringCentres: readonly IdentityRingCentre[];
  /**
   * The name's ink box `[minX, minY, maxX, maxY]` measured after bridging and
   * before the first ring, so a caller can check that each ring hole sits above
   * the lettering rather than inside it.
   */
  readonly glyphBoxBeforeRings: readonly [number, number, number, number];
  /**
   * Glyph ink pixels the rings cleared: pixels that were ink after bridging and
   * are background once both rings, their holes and their weld fillets have
   * been drawn. Rings may add metal anywhere; they may not take the name away,
   * so the solver refuses any piece where this is not zero.
   */
  readonly glyphPixelsPunchedByRings: number;
  /** Scale `recentre` applied; 1 unless the piece overflowed the body box. */
  readonly recentreScale: number;
  readonly recentreOffsetX: number;
  readonly recentreOffsetY: number;
}

export interface IdentityArtifact {
  png: Uint8Array;
  pngSha256: string;
  fingerprint: string;
  report: IdentityValidationReport;
  /** P1-6 folds this into the report; until then it rides alongside it. */
  construction: IdentityConstructionMeasurement;
}

export class IdentitySolverError extends Error {
  constructor(
    readonly code:
      | "unsupported_arabic_style"
      | "unsupported_arabic_two_name"
      | "approved_text_missing"
      | "identity_mask_empty"
      | "identity_bridge_failed"
      | "identity_bridge_moved_ink"
      | "identity_recentre_too_large"
      | "identity_component_gate_failed"
      | "identity_ring_anchor_missing"
      | "identity_ring_punched_ink"
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
  },
  minimal: {
    ar: {
      fontFile: "ScheherazadeNew-Regular.ttf",
      fontSha256:
        "794bac8dc9e83d1d620bc471ea694f5f31d0965ce8006490a79dfc51a2d283b3",
    },
    en: { fontFile: PLAYFAIR, fontSha256: PLAYFAIR_SHA },
  },
  // Opened to all customers on 2026-08-27: no atelier gate on style.
  // Aref Ruqaa slopes the baseline, so the stencil stopped reading as one
  // horizontal pendant; both styles render on the certified Naskh face and
  // reach the model as a style word through {{arabic_style}} instead.
  diwani: {
    ar: { fontFile: NASKH, fontSha256: NASKH_SHA },
    en: { fontFile: PLAYFAIR, fontSha256: PLAYFAIR_SHA },
  },
  signature: {
    ar: { fontFile: NASKH, fontSha256: NASKH_SHA },
    en: { fontFile: PLAYFAIR, fontSha256: PLAYFAIR_SHA },
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
  },
  "thuluth-inspired": {
    ar: {
      fontFile: "rakkas.ttf",
      fontSha256:
        "54278882e4774c14d50c3b555f127d0fe586366d5b787316ebbcbd8108829e60",
    },
    en: { fontFile: PLAYFAIR, fontSha256: PLAYFAIR_SHA },
  },
} as const satisfies Record<string, Record<IdentityScript, PinnedFace>>;

/**
 * Every style the solver serves, in table order. Exported so a proof script can
 * sweep the whole live matrix instead of repeating the list and drifting from
 * it.
 */
export const LIVE_IDENTITY_STYLES: readonly CaleumsArabicStyle[] =
  Object.freeze(Object.keys(LIVE_STYLES) as CaleumsArabicStyle[]);

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
      `identity_shaping_gate_failed:notdef=${shaping.notdefGlyphs},uncovered=${shaping.uncoveredCodePoints.length}`,
    );
  const componentsBefore = countComponents(mask);
  if (componentsBefore === 0)
    throw new IdentitySolverError(
      "identity_mask_empty",
      "identity_mask_empty:rasterizer produced no ink",
    );

  // The lab's order (`make_stencil.py:227-232`): thicken, bridge, ring, centre.
  // Bridging before the rings means the rings are welded onto a body that is
  // already one piece, and re-centring last means every measurement above is
  // taken in one stable frame.
  for (let pass = 0; pass < IDENTITY_THICKEN_PASSES; pass += 1) dilate(mask);
  const beforeBridging = mask.ink.slice();
  const inkPixelsBeforeBridging = countInk(beforeBridging);
  const islandsBeforeBridging = countComponents(mask);
  const bridged = bridgeAll(mask, IDENTITY_BRIDGE_WIDTH);
  // The invariant this task exists for, checked in pre-recentre coordinates:
  // a bar may only add metal, never move a dot, a hamza or a serif.
  let inkPixelsPreserved = 0;
  for (let index = 0; index < beforeBridging.length; index += 1)
    if (beforeBridging[index] && mask.ink[index]) inkPixelsPreserved += 1;
  if (inkPixelsPreserved !== inkPixelsBeforeBridging)
    throw new IdentitySolverError(
      "identity_bridge_moved_ink",
      `identity_bridge_moved_ink:moved=${inkPixelsBeforeBridging - inkPixelsPreserved},of=${inkPixelsBeforeBridging}`,
    );

  const rings =
    input.rings === false
      ? {
          centres: [] as readonly IdentityRingCentre[],
          glyphBox: inkBox(mask),
          glyphPixelsPunchedByRings: 0,
        }
      : addRings(mask);
  // The second half of the ink-preservation invariant, and the reason it is not
  // vacuous: `drawBar` only ever adds metal, but `drawDisk(..., 0)` clears it,
  // so the rings are the one step that can take a piece of the name away. The
  // lift in `addRings` is what keeps this at zero; this is the check that says
  // so instead of assuming it.
  if (rings.glyphPixelsPunchedByRings > 0)
    throw new IdentitySolverError(
      "identity_ring_punched_ink",
      `identity_ring_punched_ink:pixels=${rings.glyphPixelsPunchedByRings}`,
    );
  const placement = recentre(mask);
  const componentsFinal = countComponents(mask);
  if (componentsFinal !== 1)
    throw new IdentitySolverError(
      "identity_component_gate_failed",
      `identity_component_gate_failed:components=${componentsFinal}`,
    );
  const construction: IdentityConstructionMeasurement = {
    thickenPasses: IDENTITY_THICKEN_PASSES,
    islandsBeforeBridging,
    bridges: bridged.bridges,
    bridgePixelsAdded: bridged.pixelsAdded,
    inkPixelsBeforeBridging,
    inkPixelsPreserved,
    jumpRings: rings.centres.length,
    ringCentres: rings.centres,
    glyphBoxBeforeRings: rings.glyphBox,
    glyphPixelsPunchedByRings: rings.glyphPixelsPunchedByRings,
    recentreScale: placement.scale,
    recentreOffsetX: placement.offsetX,
    recentreOffsetY: placement.offsetY,
  };
  const png = await rasterizer.encodePng(mask);
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
      bridges: bridged.bridges,
      dilationPixels: IDENTITY_THICKEN_PASSES,
      jumpRingCount: rings.centres.length,
      componentsFinal: 1,
      exactCharactersPreserved: shaping.exactCharactersPreserved,
      passed: true,
    },
    construction,
  };
}

export function countConnectedComponents(mask: RasterMask): number {
  return countComponents(mask);
}

const isInkValue = (value: number) => value !== 0;

/** 4-connected ink islands, counted with the geometry ruler's own labeller. */
function countComponents(mask: RasterMask): number {
  return label4(mask.width, mask.height, mask.ink, isInkValue).count;
}

function countInk(ink: Uint8Array): number {
  let total = 0;
  for (let index = 0; index < ink.length; index += 1)
    if (ink[index]) total += 1;
  return total;
}

/**
 * One filled capsule between two pixel centres - a cast metal bridge. A port of
 * `draw_bar` (`make_stencil.py:90-107`): every pixel whose distance to the
 * segment is at most half the bar width becomes ink, and no pixel is ever
 * cleared. Returns how many pixels the bar added.
 */
function drawBar(
  mask: RasterMask,
  y0: number,
  x0: number,
  y1: number,
  x1: number,
  width: number,
): number {
  const radius = width / 2;
  const yMin = Math.max(0, Math.trunc(Math.min(y0, y1) - radius) - 1);
  const yMax = Math.min(
    mask.height - 1,
    Math.trunc(Math.max(y0, y1) + radius) + 1,
  );
  const xMin = Math.max(0, Math.trunc(Math.min(x0, x1) - radius) - 1);
  const xMax = Math.min(
    mask.width - 1,
    Math.trunc(Math.max(x0, x1) + radius) + 1,
  );
  const dy = y1 - y0;
  const dx = x1 - x0;
  const segment = dy * dy + dx * dx;
  let added = 0;
  for (let y = yMin; y <= yMax; y += 1)
    for (let x = xMin; x <= xMax; x += 1) {
      const t =
        segment === 0
          ? 0
          : Math.min(1, Math.max(0, ((y - y0) * dy + (x - x0) * dx) / segment));
      const py = y0 + t * dy;
      const px = x0 + t * dx;
      if ((y - py) ** 2 + (x - px) ** 2 > radius * radius) continue;
      const index = y * mask.width + x;
      if (mask.ink[index]) continue;
      mask.ink[index] = 1;
      added += 1;
    }
  return added;
}

/** A nearest-source field: squared distance, and the index of that source. */
interface NearestSourceField {
  readonly distanceSquared: Float64Array;
  /** Pixel index of the nearest source, or -1 when there is no source at all. */
  readonly source: Int32Array;
}

/** Stands in for infinity without producing NaN in the envelope arithmetic. */
const FAR_AWAY = 1e15;

/**
 * The sentinel that closes the parabola envelope at both ends. It must be
 * strictly larger than any crossing the envelope can compute, or the leading
 * boundary could compare equal to a crossing and pop `top` below zero, which
 * reads `vertices[-1]` as undefined. A crossing is bounded by the column
 * distances (at most `FAR_AWAY`) plus the squared column index, so three orders
 * of magnitude above `FAR_AWAY` is a margin, not a coincidence.
 */
const ENVELOPE_BOUNDARY = FAR_AWAY * 1e3;

function sinc(value: number): number {
  if (value === 0) return 1;
  const scaled = value * Math.PI;
  return Math.sin(scaled) / scaled;
}

/** Pillow's `LANCZOS` kernel, a = 3 (`_imaging` `lanczos_filter`). */
function lanczos(value: number): number {
  if (value < -IDENTITY_LANCZOS_SUPPORT || value >= IDENTITY_LANCZOS_SUPPORT)
    return 0;
  return sinc(value) * sinc(value / IDENTITY_LANCZOS_SUPPORT);
}

/**
 * Exact squared Euclidean distance transform with the nearest source carried
 * along, after Felzenszwalb and Huttenlocher: one linear sweep per column, then
 * the lower envelope of parabolas per row. It is O(width * height) and exact,
 * which is why the solver uses it instead of comparing every pair of pixels.
 */
function nearestSourceTransform(
  width: number,
  height: number,
  source: Uint8Array,
): NearestSourceField {
  const size = width * height;
  const columnDistance = new Float64Array(size);
  const columnSource = new Int32Array(size);
  for (let x = 0; x < width; x += 1) {
    let seen = -1;
    for (let y = 0; y < height; y += 1) {
      const index = y * width + x;
      if (source[index]) seen = y;
      if (seen < 0) {
        columnDistance[index] = FAR_AWAY;
        columnSource[index] = -1;
      } else {
        columnDistance[index] = (y - seen) ** 2;
        columnSource[index] = seen;
      }
    }
    seen = -1;
    for (let y = height - 1; y >= 0; y -= 1) {
      const index = y * width + x;
      if (source[index]) seen = y;
      if (seen < 0) continue;
      const candidate = (seen - y) ** 2;
      if (candidate < (columnDistance[index] as number)) {
        columnDistance[index] = candidate;
        columnSource[index] = seen;
      }
    }
  }

  const distanceSquared = new Float64Array(size);
  const nearest = new Int32Array(size);
  const vertices = new Int32Array(width);
  const boundaries = new Float64Array(width + 1);
  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    let top = 0;
    vertices[0] = 0;
    boundaries[0] = -ENVELOPE_BOUNDARY;
    boundaries[1] = ENVELOPE_BOUNDARY;
    for (let q = 1; q < width; q += 1) {
      const fq = (columnDistance[row + q] as number) + q * q;
      let previous = vertices[top] as number;
      let crossing =
        (fq -
          ((columnDistance[row + previous] as number) + previous * previous)) /
        (2 * q - 2 * previous);
      while (crossing <= (boundaries[top] as number)) {
        top -= 1;
        previous = vertices[top] as number;
        crossing =
          (fq -
            ((columnDistance[row + previous] as number) +
              previous * previous)) /
          (2 * q - 2 * previous);
      }
      top += 1;
      vertices[top] = q;
      boundaries[top] = crossing;
      boundaries[top + 1] = ENVELOPE_BOUNDARY;
    }
    top = 0;
    for (let q = 0; q < width; q += 1) {
      while ((boundaries[top + 1] as number) < q) top += 1;
      const best = vertices[top] as number;
      distanceSquared[row + q] =
        (q - best) ** 2 + (columnDistance[row + best] as number);
      const sourceY = columnSource[row + best] as number;
      nearest[row + q] = sourceY < 0 ? -1 : sourceY * width + best;
    }
  }
  return { distanceSquared, source: nearest };
}

/**
 * Connects every island to the growing main body with capsule bars. A port of
 * `bridge_all` (`make_stencil.py:118-140`), and the reason this task exists:
 * the old `fuse()` translated the smallest island towards the body, so a dot or
 * a hamza silently changed its typographic place while the report still called
 * the spelling exact. Nothing here moves a pixel; bars only add metal.
 *
 * Each round labels the mask, takes the largest island as the body, computes
 * the exact nearest body pixel for every pixel with one distance transform, and
 * draws one bar to the closest island. That is O(width * height) per bar and at
 * most `IDENTITY_MAX_BRIDGES` bars, so a 1024 canvas costs a handful of linear
 * passes - milliseconds, not the quadratic pixel-pair scan `fuse()` sampled its
 * way around.
 */
function bridgeAll(
  mask: RasterMask,
  width: number,
): { bridges: number; pixelsAdded: number } {
  let bridges = 0;
  let pixelsAdded = 0;
  for (let attempt = 0; attempt < IDENTITY_MAX_BRIDGES; attempt += 1) {
    const labelled = label4(mask.width, mask.height, mask.ink, isInkValue);
    if (labelled.count <= 1) return { bridges, pixelsAdded };
    const sizes = new Int32Array(labelled.count + 1);
    for (let index = 0; index < labelled.labels.length; index += 1) {
      const region = labelled.labels[index] as number;
      if (region !== 0) sizes[region] = (sizes[region] as number) + 1;
    }
    let main = 1;
    for (let region = 2; region <= labelled.count; region += 1)
      if ((sizes[region] as number) > (sizes[main] as number)) main = region;
    const body = new Uint8Array(labelled.labels.length);
    for (let index = 0; index < body.length; index += 1)
      body[index] = labelled.labels[index] === main ? 1 : 0;
    const field = nearestSourceTransform(mask.width, mask.height, body);

    let islandPixel = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < labelled.labels.length; index += 1) {
      const region = labelled.labels[index] as number;
      if (region === 0 || region === main) continue;
      const distance = field.distanceSquared[index] as number;
      if (distance < bestDistance) {
        bestDistance = distance;
        islandPixel = index;
      }
    }
    const bodyPixel =
      islandPixel < 0 ? -1 : (field.source[islandPixel] as number);
    if (islandPixel < 0 || bodyPixel < 0)
      throw new IdentitySolverError(
        "identity_bridge_failed",
        `identity_bridge_failed:components=${labelled.count},pair=none`,
      );
    pixelsAdded += drawBar(
      mask,
      Math.floor(islandPixel / mask.width),
      islandPixel % mask.width,
      Math.floor(bodyPixel / mask.width),
      bodyPixel % mask.width,
      width,
    );
    bridges += 1;
  }
  throw new IdentitySolverError(
    "identity_bridge_failed",
    `identity_bridge_failed:bars=${IDENTITY_MAX_BRIDGES},converged=false`,
  );
}

/** One resampling axis: which input pixels feed an output pixel, and how much. */
interface AxisCoefficients {
  readonly starts: Int32Array;
  readonly lengths: Int32Array;
  readonly weights: Float64Array[];
}

/** Pillow's `precompute_coeffs`, so the downscale matches the lab's LANCZOS. */
function axisCoefficients(inSize: number, outSize: number): AxisCoefficients {
  const scale = inSize / outSize;
  const filterScale = Math.max(1, scale);
  const support = IDENTITY_LANCZOS_SUPPORT * filterScale;
  const starts = new Int32Array(outSize);
  const lengths = new Int32Array(outSize);
  const weights: Float64Array[] = [];
  for (let out = 0; out < outSize; out += 1) {
    const centre = (out + 0.5) * scale;
    const start = Math.max(0, Math.trunc(centre - support + 0.5));
    const end = Math.min(inSize, Math.trunc(centre + support + 0.5));
    const length = Math.max(0, end - start);
    const row = new Float64Array(length);
    let total = 0;
    for (let index = 0; index < length; index += 1) {
      const value = lanczos((index + start - centre + 0.5) / filterScale);
      row[index] = value;
      total += value;
    }
    if (total !== 0)
      for (let index = 0; index < length; index += 1)
        row[index] = (row[index] as number) / total;
    starts[out] = start;
    lengths[out] = length;
    weights.push(row);
  }
  return { starts, lengths, weights };
}

function clip8(value: number): number {
  const rounded = Math.round(value);
  return rounded < 0 ? 0 : rounded > 255 ? 255 : rounded;
}

/**
 * Downscales a 0/255 image with the separable LANCZOS kernel, horizontally then
 * vertically with an 8-bit intermediate, exactly as Pillow's `Image.resize`
 * does in `make_stencil.py:192`.
 */
function lanczosResize(
  source: Uint8Array,
  inWidth: number,
  inHeight: number,
  outWidth: number,
  outHeight: number,
): Uint8Array {
  const horizontalCoefficients = axisCoefficients(inWidth, outWidth);
  const horizontal = new Uint8Array(outWidth * inHeight);
  for (let y = 0; y < inHeight; y += 1)
    for (let x = 0; x < outWidth; x += 1) {
      const start = horizontalCoefficients.starts[x] as number;
      const length = horizontalCoefficients.lengths[x] as number;
      const weights = horizontalCoefficients.weights[x] as Float64Array;
      let total = 0;
      for (let index = 0; index < length; index += 1)
        total +=
          (weights[index] as number) *
          (source[y * inWidth + start + index] as number);
      horizontal[y * outWidth + x] = clip8(total);
    }
  const verticalCoefficients = axisCoefficients(inHeight, outHeight);
  const result = new Uint8Array(outWidth * outHeight);
  for (let y = 0; y < outHeight; y += 1) {
    const start = verticalCoefficients.starts[y] as number;
    const length = verticalCoefficients.lengths[y] as number;
    const weights = verticalCoefficients.weights[y] as Float64Array;
    for (let x = 0; x < outWidth; x += 1) {
      let total = 0;
      for (let index = 0; index < length; index += 1)
        total +=
          (weights[index] as number) *
          (horizontal[(start + index) * outWidth + x] as number);
      result[y * outWidth + x] = clip8(total);
    }
  }
  return result;
}

/** What `recentre` did, so the caller can map a pre-recentre pixel forwards. */
interface RecentrePlacement {
  readonly scale: number;
  readonly offsetX: number;
  readonly offsetY: number;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Crops the finished piece and centres it on the canvas, downscaling only when
 * it overflows the body box. A port of `recentre` (`make_stencil.py:181-198`).
 * The mask is rewritten in place and the transform is returned, because every
 * measurement the solver reports is taken before this runs.
 */
function recentre(mask: RasterMask): RecentrePlacement {
  let minX = mask.width;
  let minY = mask.height;
  let maxX = -1;
  let maxY = -1;
  for (let index = 0; index < mask.ink.length; index += 1) {
    if (!mask.ink[index]) continue;
    const x = index % mask.width;
    const y = (index - x) / mask.width;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  if (maxX < 0)
    throw new IdentitySolverError(
      "identity_mask_empty",
      "identity_mask_empty:nothing to centre",
    );

  let width = maxX - minX + 1;
  let height = maxY - minY + 1;
  let art = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1)
      art[y * width + x] = mask.ink[
        (minY + y) * mask.width + minX + x
      ] as number;

  let scale = 1;
  if (height > IDENTITY_RECENTRE_BOX || width > IDENTITY_RECENTRE_BOX) {
    scale = Math.min(
      IDENTITY_RECENTRE_BOX / width,
      IDENTITY_RECENTRE_BOX / height,
    );
    if (scale < IDENTITY_MIN_RECENTRE_SCALE)
      throw new IdentitySolverError(
        "identity_recentre_too_large",
        `identity_recentre_too_large:assembly=${width}x${height},box=${IDENTITY_RECENTRE_BOX}`,
      );
    const outWidth = Math.max(1, Math.trunc(width * scale));
    const outHeight = Math.max(1, Math.trunc(height * scale));
    const grey = Uint8Array.from(art, (value) => (value ? 255 : 0));
    const resized = lanczosResize(grey, width, height, outWidth, outHeight);
    art = Uint8Array.from(resized, (value) =>
      value > IDENTITY_RESAMPLE_INK_THRESHOLD ? 1 : 0,
    );
    width = outWidth;
    height = outHeight;
  }

  const left = Math.floor((mask.width - width) / 2);
  const top = Math.floor((mask.height - height) / 2);
  mask.ink.fill(0);
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1)
      if (art[y * width + x]) mask.ink[(top + y) * mask.width + left + x] = 1;

  return {
    scale: round3(scale),
    offsetX: round3(left - minX * scale),
    offsetY: round3(top - minY * scale),
  };
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

/** Where the two rings landed, and what the placement had to prove. */
interface RingPlacement {
  /** Ring centres in pre-recentre canvas coordinates, left then right. */
  readonly centres: readonly IdentityRingCentre[];
  /** The name's ink box before any ring was drawn, `[minX, minY, maxX, maxY]`. */
  readonly glyphBox: readonly [number, number, number, number];
  /**
   * Glyph ink pixels the rings cleared, counted against the post-bridge mask
   * after every ring, hole and weld fillet has been drawn. Every one of them is
   * a piece of the name a ring hole punched out, which is the Asma defect: the
   * old `addJumpRings` centred the ring on the topmost ink pixel, so the hole
   * sat inside a letter. It must be zero.
   */
  readonly glyphPixelsPunchedByRings: number;
}

/**
 * Erosion by a square of ones, `IDENTITY_RING_ANCHOR_EROSION` on a side, with
 * the outside of the canvas treated as background - `binary_erosion` with
 * scipy's default `border_value=0`. The square is separable, so this runs as a
 * horizontal pass and then a vertical pass over sliding windows instead of one
 * pass per window pixel.
 */
function erodeSquare(
  width: number,
  height: number,
  ink: Uint8Array,
  side: number,
): Uint8Array {
  const radius = Math.floor(side / 2);
  const horizontal = new Uint8Array(ink.length);
  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    let zeros = 0;
    for (let x = 0; x < radius && x < width; x += 1)
      if (!ink[row + x]) zeros += 1;
    for (let x = 0; x < width; x += 1) {
      const entering = x + radius;
      if (entering < width && !ink[row + entering]) zeros += 1;
      const leaving = x - radius - 1;
      if (leaving >= 0 && !ink[row + leaving]) zeros -= 1;
      const clipped = x - radius < 0 || x + radius > width - 1;
      horizontal[row + x] = zeros === 0 && !clipped ? 1 : 0;
    }
  }
  const eroded = new Uint8Array(ink.length);
  for (let x = 0; x < width; x += 1) {
    let zeros = 0;
    for (let y = 0; y < radius && y < height; y += 1)
      if (!horizontal[y * width + x]) zeros += 1;
    for (let y = 0; y < height; y += 1) {
      const entering = y + radius;
      if (entering < height && !horizontal[entering * width + x]) zeros += 1;
      const leaving = y - radius - 1;
      if (leaving >= 0 && !horizontal[leaving * width + x]) zeros -= 1;
      const clipped = y - radius < 0 || y + radius > height - 1;
      eroded[y * width + x] = zeros === 0 && !clipped ? 1 : 0;
    }
  }
  return eroded;
}

/**
 * Two jump rings welded onto the top edge, one over each end of the name. A
 * port of `add_rings` (`make_stencil.py:143-178`).
 *
 * The anchor is chosen on eroded ink, so only metal that is at least
 * `IDENTITY_RING_ANCHOR_EROSION` pixels thick in both axes can carry a chain: a
 * dot, a hamza or a hairline serif is gone before the search starts. The ring
 * centre then steps outward from that anchor, away from the middle of the name,
 * and up by `IDENTITY_RING_OUTER - IDENTITY_RING_WELD_OVERLAP`, so the ring body
 * sinks into the stroke it sits on - integral metal, not a floating circle - and
 * the hole itself clears the lettering into the reserved ring band.
 */
function addRings(mask: RasterMask): RingPlacement {
  const glyphBox = inkBox(mask);
  const [minX, , maxX] = glyphBox;
  const span = Math.max(1, maxX - minX);

  let solid = erodeSquare(
    mask.width,
    mask.height,
    mask.ink,
    IDENTITY_RING_ANCHOR_EROSION,
  );
  if (!solid.some((value) => value === 1)) solid = mask.ink;

  const beforeRings = mask.ink.slice();
  const centres: IdentityRingCentre[] = [];
  const outwardStep = Math.trunc(
    IDENTITY_RING_OUTER * IDENTITY_RING_OUTWARD_FRACTION,
  );

  for (const side of ["left", "right"] as const) {
    const outward = side === "left" ? -1 : 1;
    let anchorX = -1;
    let anchorY = -1;
    for (const fraction of IDENTITY_RING_ANCHOR_SPANS) {
      const boundary =
        side === "left" ? minX + span * fraction : maxX - span * fraction;
      // Row-major scan: the first hit is the topmost row of the band, and its
      // leftmost pixel, exactly what `np.argmin` picks out of `np.nonzero`.
      for (let y = 0; y < mask.height && anchorY < 0; y += 1)
        for (let x = 0; x < mask.width; x += 1) {
          if (!solid[y * mask.width + x]) continue;
          if (side === "left" ? x >= boundary : x <= boundary) continue;
          anchorX = x;
          anchorY = y;
          break;
        }
      if (anchorY >= 0) break;
    }
    if (anchorY < 0)
      throw new IdentitySolverError(
        "identity_ring_anchor_missing",
        `identity_ring_anchor_missing:side=${side}`,
      );

    const cx = anchorX + outward * outwardStep;
    const lowest = IDENTITY_RING_OUTER + IDENTITY_RING_TOP_CLEARANCE;
    const seat = Math.max(
      lowest,
      anchorY - IDENTITY_RING_OUTER + IDENTITY_RING_WELD_OVERLAP,
    );
    // The lab seats the ring here and stops. A name whose hairline rises above
    // the load-bearing anchor then loses a few pixels of that hairline to the
    // hole, so the solver spends the reserved ring band: it lifts the ring
    // until the hole is clear of the name, and keeps the seat with the least
    // ink inside if no lift within the band clears it.
    let cy = seat;
    let punched = countDisk(mask, beforeRings, cx, seat, IDENTITY_RING_INNER);
    for (
      let lift = 1;
      punched > 0 && lift <= IDENTITY_RING_MAX_LIFT;
      lift += 1
    ) {
      const candidate = Math.max(lowest, seat - lift);
      if (candidate === cy) break;
      const inside = countDisk(
        mask,
        beforeRings,
        cx,
        candidate,
        IDENTITY_RING_INNER,
      );
      if (inside < punched) {
        punched = inside;
        cy = candidate;
      }
      if (candidate === lowest) break;
    }
    drawDisk(mask, cx, cy, IDENTITY_RING_OUTER, 1);
    drawDisk(mask, cx, cy, IDENTITY_RING_INNER, 0);
    // The weld fillet: metal continuity from under the ring into the stroke.
    drawBar(
      mask,
      cy + IDENTITY_RING_INNER + IDENTITY_RING_WELD_START_GAP,
      cx,
      anchorY + IDENTITY_RING_WELD_ANCHOR_DEPTH,
      anchorX,
      IDENTITY_RING_WELD_WIDTH,
    );
    centres.push({ x: cx, y: cy, anchorX, anchorY });
  }

  // Measured, not predicted: `punched` above is what the seat search expected
  // before the hole was cut, while this compares the finished mask against the
  // name as it stood before any ring, so a hole that ate a stroke the search
  // never considered - or a fillet that filled one back in - is counted here.
  let glyphPixelsPunchedByRings = 0;
  for (let index = 0; index < beforeRings.length; index += 1)
    if (beforeRings[index] && !mask.ink[index]) glyphPixelsPunchedByRings += 1;

  return { centres, glyphBox, glyphPixelsPunchedByRings };
}

/**
 * The ink bounding box `[minX, minY, maxX, maxY]`, inclusive. Shared by the
 * ring placement and by the ring-free path, which still has to report the box
 * the rings would have sat above.
 */
function inkBox(mask: RasterMask): readonly [number, number, number, number] {
  let minX = mask.width;
  let minY = mask.height;
  let maxX = -1;
  let maxY = -1;
  for (let index = 0; index < mask.ink.length; index += 1) {
    if (!mask.ink[index]) continue;
    const x = index % mask.width;
    const y = (index - x) / mask.width;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  if (maxX < 0)
    throw new IdentitySolverError(
      "identity_mask_empty",
      "identity_mask_empty:no ink to measure",
    );
  return [minX, minY, maxX, maxY];
}

/** Ink pixels of `source` that lie inside a disk on the mask's grid. */
function countDisk(
  mask: RasterMask,
  source: Uint8Array,
  cx: number,
  cy: number,
  radius: number,
): number {
  let inside = 0;
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
      if (
        (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2 &&
        source[y * mask.width + x]
      )
        inside += 1;
  return inside;
}

/** A filled disk, set or cleared - the ring body and then the ring hole. */
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
