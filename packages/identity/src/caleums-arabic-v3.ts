import { createHash } from "node:crypto";
import {
  findMaskHoles,
  label4,
  measureMask,
  type DecodedMaskGeometryInput,
  type MaskBoundingBox,
  type MaskInkRule,
} from "./geometry";
import {
  IDENTITY_BRIDGE_WIDTH,
  IDENTITY_LANCZOS_SUPPORT,
  IDENTITY_MAX_BRIDGES,
  IDENTITY_MIN_RECENTRE_SCALE,
  IDENTITY_RECENTRE_BOX,
  IDENTITY_RESAMPLE_INK_THRESHOLD,
  IDENTITY_RING_ANCHOR_CANDIDATES,
  IDENTITY_RING_ANCHOR_EROSION,
  IDENTITY_RING_ANCHOR_MIN_ISLAND_FRACTION,
  IDENTITY_RING_ANCHOR_OUTER_SPANS,
  IDENTITY_RING_ANCHOR_SPANS,
  IDENTITY_RING_INNER,
  IDENTITY_RING_MARK_MAX_COMPACTNESS,
  IDENTITY_RING_MAX_INWARD_SHIFT,
  IDENTITY_RING_MAX_LIFT,
  IDENTITY_RING_MAX_OUTWARD_SHIFT,
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
  /**
   * Decodes PNG bytes back into a binary mask, with the ink rule the decoder
   * used. P1-6: the solver measures its own encoded bytes through this port and
   * reports only what came back, so the report can disagree with the renderer.
   * `apps/jobs` injects `decodeMask`, the same decoder the P1-1 ruler uses.
   * The decoder names itself in `rulerId`, and that name is what the report's
   * `measured.measuredBy` carries: the engine never writes it (finding 5).
   */
  decodePng(bytes: Uint8Array): Promise<DecodedIdentityMask>;
  shapingVersions(): Readonly<Record<string, string>>;
}

/**
 * A decoded mask that says who decoded it. The string travels into the report
 * unchanged, so swapping the decoder swaps the name the stored report carries.
 */
export interface DecodedIdentityMask extends DecodedMaskGeometryInput {
  readonly rulerId: string;
}

/** One measured ring hole, in the coordinates of the encoded PNG. */
export interface MeasuredRingHole {
  readonly size: number;
  readonly centreX: number;
  readonly centreY: number;
}

/**
 * Everything that came out of the decoded PNG, and nothing else.
 *
 * Adversarial finding 5: the report used to mix the ruler's readings with the
 * renderer's own account in one flat object, so `dilationPixels` (a constant)
 * sat beside `inkPixels` (a measurement) and a reader had to know the engine to
 * tell them apart. They are two blocks now, and `passed` is computed from this
 * one only.
 */
export interface IdentityMeasuredReport {
  /**
   * Which ruler produced every field in this block, derived from the decoder
   * the caller injected rather than written by the engine: the port names
   * itself and the solver copies that name.
   */
  readonly measuredBy: string;
  /** The decoder's ink branch on the encoded bytes; the stencil is luminance. */
  readonly rule: MaskInkRule;
  /** Canvas of the encoded PNG, as decoded. */
  readonly width: number;
  readonly height: number;
  /** Ink pixels in the decoded PNG. */
  readonly inkPixels: number;
  /** 4-connected ink components in the decoded PNG. One means one piece. */
  readonly componentsFinal: number;
  /** Every enclosed hole in the decoded PNG: ring holes plus letter counters. */
  readonly holes: number;
  /** The largest hole sizes, descending, as `measureMask` caps them. */
  readonly holeSizes: readonly number[];
  /** Ink bounding box of the decoded PNG, or null when it carries no ink. */
  readonly bbox: MaskBoundingBox | null;
  /**
   * Ring holes still open in the decoded PNG: the holes the welded ring centres
   * actually land in, not the rings the solver intended to draw.
   */
  readonly jumpRingCount: number;
  readonly ringHoles: readonly MeasuredRingHole[];
}

/**
 * The renderer's own account of how it built the piece. Nothing here was read
 * back off the encoded bytes, so nothing here may decide `passed`; it is what a
 * reader compares the measurement against when the two disagree.
 */
export interface IdentityClaimedReport extends IdentityConstructionMeasurement {
  /** Islands the rasteriser produced, counted on the in-memory mask. */
  readonly componentsBefore: number;
  /** The sha the pinned style table declares for the face. */
  readonly fontSha256Declared: string;
}

export interface IdentityValidationReport {
  engineRelease: typeof CALEUMS_ARABIC_ENGINE_RELEASE;
  pipelineRelease: string;
  approvedCharacters: string;
  style: CaleumsArabicStyle;
  fontFile: string;
  /** The sha of the bytes HarfBuzz actually shaped with. */
  fontSha256Measured: string;
  shaping: Readonly<Record<string, string>>;
  /** Measured by HarfBuzz: no glyph id 0 and every NFC code point covered. */
  exactCharactersPreserved: boolean;
  /**
   * Every gate above agreed with the decoded measurement. It is computed from
   * `measured` alone, never asserted: a disagreement throws before this object
   * exists, and the database check on `identity_artifacts.validation_report`
   * rejects anything else. It stays top level because that check reads
   * `validation_report->>'passed'`.
   */
  passed: boolean;
  /** What the ruler read off the encoded PNG. */
  measured: IdentityMeasuredReport;
  /** What the engine says it drew (P1-4/P1-5), never a measurement. */
  claimed: IdentityClaimedReport;
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
  /**
   * Glyph ink pixels the rings swallowed: pixels that were ink after bridging
   * and lie under the ring annulus outside the weld capsule that joins the ring
   * to its anchor stroke. The punch count above cannot see these,
   * because adding metal over ink changes no pixel; a floating dot absorbed
   * into a ring is a different letter, so the solver refuses any piece where
   * this is not zero (adversarial finding 2).
   */
  readonly glyphPixelsUnderRingMetal: number;
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
  /** The same object the report now carries, kept for callers that read it. */
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
      | "identity_ring_gate_failed"
      | "identity_gate_failed"
      | "identity_ring_anchor_missing"
      | "identity_ring_punched_ink"
      | "identity_ring_welded_to_glyph"
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
          glyphPixelsUnderRingMetal: 0,
        }
      : addRings(mask, beforeBridging);
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
  // Adversarial finding 2: adding metal over a floating dot changes no pixel,
  // so the punch count above cannot see it. This is the same statement for the
  // half of the ring that only ever adds ink.
  if (rings.glyphPixelsUnderRingMetal > 0)
    throw new IdentitySolverError(
      "identity_ring_welded_to_glyph",
      `identity_ring_welded_to_glyph:pixels=${rings.glyphPixelsUnderRingMetal}`,
    );
  const placement = recentre(mask);
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
    glyphPixelsUnderRingMetal: rings.glyphPixelsUnderRingMetal,
    recentreScale: placement.scale,
    recentreOffsetX: placement.offsetX,
    recentreOffsetY: placement.offsetY,
  };
  const png = await rasterizer.encodePng(mask);

  // P1-6. Everything the report claims about the finished piece is measured
  // here, on the bytes that were just encoded, by the P1-1 ruler reading them
  // back through the decoder. `intended` is what the renderer believes it drew;
  // it is only ever used to name a disagreement, never to fill in the report.
  const decoded = await rasterizer.decodePng(png);
  const measured = measureMask(decoded);
  const intended = measureMask(mask);

  if (measured.components !== 1)
    throw new IdentitySolverError(
      "identity_component_gate_failed",
      `identity_component_gate_failed:components=${measured.components}`,
    );

  const ringHoles = measureRingHoles(decoded, construction);
  if (ringHoles.length !== construction.jumpRings)
    throw new IdentitySolverError(
      "identity_ring_gate_failed",
      `identity_ring_gate_failed:holes=${ringHoles.length},expected=${construction.jumpRings}`,
    );

  const disagreements: string[] = [];
  if (decoded.rule !== "luminance") disagreements.push("rule");
  if (measured.width !== intended.width || measured.height !== intended.height)
    disagreements.push("canvas");
  if (measured.inkPixels !== intended.inkPixels) disagreements.push("ink");
  if (JSON.stringify(measured.bbox) !== JSON.stringify(intended.bbox))
    disagreements.push("bbox");
  if (measured.holes !== intended.holes) disagreements.push("holes");
  // Finding 8: the count of pieces and the sizes of the holes are exactly what
  // a lossy encode or a decoder on a different ink rule would move, so they
  // belong in the general comparison and not only in the ring gate above.
  if (measured.components !== intended.components)
    disagreements.push("components");
  if (JSON.stringify(measured.holeSizes) !== JSON.stringify(intended.holeSizes))
    disagreements.push("holeSizes");
  if (disagreements.length > 0)
    throw new IdentitySolverError(
      "identity_gate_failed",
      `identity_gate_failed:${disagreements.join(",")}`,
    );

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
      fontSha256Measured: shaping.fontSha256Measured,
      shaping: {
        ...rasterizer.shapingVersions(),
        harfbuzzShaper: shaping.harfbuzzVersion,
      },
      exactCharactersPreserved: shaping.exactCharactersPreserved,
      // Every gate above threw on disagreement, so this is the conjunction of
      // measurements rather than a promise - and, adversarial review 2 finding
      // 5, that means it cannot be false here: each conjunct has already thrown
      // by the time this object is built. It is written out because the row is
      // stored and read by people and by the database check, not because this
      // line is the thing that stops a bad piece. Only `measured` and the shaping
      // measurement take part; `construction.jumpRings` appears as the ring
      // count the caller asked for (rings on or off), never as a claim about
      // what the raster contains, and the gate above already threw if the
      // decoded holes disagreed with it.
      passed:
        measured.components === 1 &&
        ringHoles.length === construction.jumpRings &&
        shaping.exactCharactersPreserved &&
        decoded.rule === "luminance",
      measured: {
        measuredBy: decoded.rulerId,
        rule: decoded.rule,
        width: measured.width,
        height: measured.height,
        inkPixels: measured.inkPixels,
        componentsFinal: measured.components,
        holes: measured.holes,
        holeSizes: measured.holeSizes,
        bbox: measured.bbox,
        jumpRingCount: ringHoles.length,
        ringHoles,
      },
      claimed: {
        ...construction,
        componentsBefore,
        fontSha256Declared: face.fontSha256,
      },
    },
    construction,
  };
}

/**
 * The ring holes that are still open in the encoded PNG.
 *
 * The solver knows where it welded each ring, in pre-recentre coordinates;
 * `recentre` then reported the exact transform it applied, so each centre maps
 * forward to a pixel in the decoded image. A ring hole counts only when that
 * pixel lands inside an enclosed hole the ruler found in the decoded bytes, so
 * a filled ring is missing here even though the letter counters still count as
 * holes. Two rings that somehow merged into one hole count once, which is also
 * a failure.
 */
function measureRingHoles(
  decoded: DecodedMaskGeometryInput,
  construction: IdentityConstructionMeasurement,
): MeasuredRingHole[] {
  const geometry = findMaskHoles(decoded);
  const seen = new Set<number>();
  const holes: MeasuredRingHole[] = [];
  for (const centre of construction.ringCentres) {
    const x = Math.round(
      centre.x * construction.recentreScale + construction.recentreOffsetX,
    );
    const y = Math.round(
      centre.y * construction.recentreScale + construction.recentreOffsetY,
    );
    const region = geometry.regionAt(x, y);
    if (region < 0 || seen.has(region)) continue;
    seen.add(region);
    holes.push(geometry.holes[region] as MeasuredRingHole);
  }
  return holes;
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

  // Review finding 10: reported unrounded. Rounding the offsets to three
  // decimals while the transform itself is exact makes the mapping wrong as
  // soon as `scale` is not 1, and the ring gate maps ring centres through it.
  return {
    scale,
    offsetX: left - minX * scale,
    offsetY: top - minY * scale,
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
  /**
   * Pre-ring ink pixels lying under ring metal outside the weld zone, summed
   * over both rings. Also zero on a sound piece: a dot fused into the ring is a
   * different letter even though no ink was cleared.
   */
  readonly glyphPixelsUnderRingMetal: number;
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

/** Pixels that are set in both masks. */
function intersect(left: Uint8Array, right: Uint8Array): Uint8Array {
  const both = new Uint8Array(left.length);
  for (let index = 0; index < both.length; index += 1)
    both[index] = left[index] && right[index] ? 1 : 0;
  return both;
}

/**
 * Chebyshev distance to the nearest background pixel, for every ink pixel of
 * `ink`, with the outside of the canvas counted as background.
 *
 * Two sequential passes over the grid, forward then backward, which is the
 * exact chessboard transform: the distance at a pixel is one more than the
 * smallest distance among its already-settled 8-neighbours. The value at a
 * pixel is the half-side of the largest square of ink centred there, so the
 * maximum over an island is that island's inradius - how many stroke widths
 * of metal it is made of.
 */
function chebyshevDistanceTransform(
  width: number,
  height: number,
  ink: Uint8Array,
): Int32Array {
  const distance = new Int32Array(ink.length);
  const edge = (x: number, y: number) =>
    x === 0 || y === 0 || x === width - 1 || y === height - 1;
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (!ink[index]) continue;
      if (edge(x, y)) {
        distance[index] = 1;
        continue;
      }
      distance[index] =
        Math.min(
          distance[index - width - 1] as number,
          distance[index - width] as number,
          distance[index - width + 1] as number,
          distance[index - 1] as number,
        ) + 1;
    }
  for (let y = height - 1; y >= 0; y -= 1)
    for (let x = width - 1; x >= 0; x -= 1) {
      const index = y * width + x;
      if (!ink[index]) continue;
      if (edge(x, y)) {
        distance[index] = 1;
        continue;
      }
      const below =
        Math.min(
          distance[index + width - 1] as number,
          distance[index + width] as number,
          distance[index + width + 1] as number,
          distance[index + 1] as number,
        ) + 1;
      if (below < (distance[index] as number)) distance[index] = below;
    }
  return distance;
}

/** The pre-bridge islands, with the ones a jump ring may be anchored to. */
interface RingAnchorCarrier {
  /** Island label per pixel of the pre-bridge raster; 0 is background. */
  readonly labels: Int32Array;
  /** 1 where the pixel belongs to an island that may carry a ring. */
  readonly carrier: Uint8Array;
}

/**
 * The metal a jump ring is allowed to be anchored to: the letter bodies, and
 * nothing else.
 *
 * The mask the rings are welded onto is already one piece, so by the time
 * `addRings` runs a dot, a hamza or a nuqta is joined to its letter by a
 * `IDENTITY_BRIDGE_WIDTH` bar and is indistinguishable, in the finished raster,
 * from a stroke. The distinction survives one step earlier: `beforeBridging` is
 * the thickened raster *before* any bar was drawn, where a dot is its own small
 * 4-connected island. So the carrier is built there, and bridge bars - ink in
 * no island - are excluded for free: a ring welded to a 24 px bar would hang
 * the whole pendant off the thinnest metal on it.
 *
 * What separates a mark from a letter is not how big it is next to its
 * neighbours. Adversarial review 3: comparing areas is exactly wrong for Latin,
 * where every letter is its own island, so the tittle of the i is measured
 * against whatever the biggest letter happens to be and passes at 13.5% in
 * "Ali". A mark is a *blob*: a lump of metal about as wide as it is thick. A
 * letter is a *stroke*: a run of metal several stroke widths long, bent around
 * a shape. So each island is measured against itself -
 * `area / thickness^2`, thickness taken from its own largest inscribed square -
 * and anything at or below `IDENTITY_RING_MARK_MAX_COMPACTNESS` is a mark.
 * The largest island of the piece is always a carrier whatever it measures, so
 * the search always has somewhere legitimate to look.
 */
function ringAnchorCarrier(
  mask: RasterMask,
  beforeBridging: Uint8Array,
): RingAnchorCarrier {
  const { labels, count } = label4(
    mask.width,
    mask.height,
    beforeBridging,
    (value) => value !== 0,
  );
  const carrier = new Uint8Array(mask.ink.length);
  if (count === 0) return { labels, carrier };
  const sizes = new Int32Array(count + 1);
  const inradius = new Int32Array(count + 1);
  const distance = chebyshevDistanceTransform(
    mask.width,
    mask.height,
    beforeBridging,
  );
  for (let index = 0; index < labels.length; index += 1) {
    const label = labels[index] as number;
    if (label <= 0) continue;
    sizes[label] = (sizes[label] as number) + 1;
    if ((distance[index] as number) > (inradius[label] as number))
      inradius[label] = distance[index] as number;
  }
  let largest = 0;
  for (let label = 1; label <= count; label += 1)
    if ((sizes[label] as number) > (sizes[largest] as number)) largest = label;
  const minimumArea =
    (sizes[largest] as number) * IDENTITY_RING_ANCHOR_MIN_ISLAND_FRACTION;
  const isCarrier = new Uint8Array(count + 1);
  for (let label = 1; label <= count; label += 1) {
    const thickness = 2 * (inradius[label] as number) - 1;
    const compactness =
      thickness > 0 ? (sizes[label] as number) / (thickness * thickness) : 0;
    isCarrier[label] =
      label === largest ||
      (compactness > IDENTITY_RING_MARK_MAX_COMPACTNESS &&
        (sizes[label] as number) >= minimumArea)
        ? 1
        : 0;
  }
  for (let index = 0; index < labels.length; index += 1) {
    const label = labels[index] as number;
    if (label > 0 && isCarrier[label]) carrier[index] = 1;
  }
  return { labels, carrier };
}

/**
 * Two jump rings welded onto the top edge, one over each end of the name. A
 * port of `add_rings` (`make_stencil.py:143-178`).
 *
 * The anchor is chosen on eroded ink that also belongs to a letter body, so it
 * is both thick enough to carry a chain (`IDENTITY_RING_ANCHOR_EROSION` pixels
 * in both axes) and part of the name rather than one of its marks: a dot, a
 * hamza, a hairline serif or a bridge bar is gone before the search starts. The ring
 * centre then steps outward from that anchor, away from the middle of the name,
 * and up by `IDENTITY_RING_OUTER - IDENTITY_RING_WELD_OVERLAP`, so the ring body
 * sinks into the stroke it sits on - integral metal, not a floating circle - and
 * the hole itself clears the lettering into the reserved ring band.
 */
function addRings(
  mask: RasterMask,
  beforeBridging: Uint8Array,
): RingPlacement {
  const glyphBox = inkBox(mask);
  const [minX, , maxX] = glyphBox;
  const span = Math.max(1, maxX - minX);

  const eroded = erodeSquare(
    mask.width,
    mask.height,
    mask.ink,
    IDENTITY_RING_ANCHOR_EROSION,
  );
  const { labels, carrier } = ringAnchorCarrier(mask, beforeBridging);
  // The anchor has to be load-bearing in two different senses, and the erosion
  // only answers the first. Eroded ink is metal thick enough to hold a chain;
  // carrier ink is metal that belongs to a *letter body* rather than to a dot,
  // a hamza or a bridge bar. Fix pass 3, finding 1: on نور in Kufi the eroded
  // mask is a single component, because a 24 px bridge bar survives an 11 px
  // erosion, so "largest eroded component" still offers the dot of ن as the
  // topmost pixel on the right - and the shop would hang the pendant from that
  // dot. Both conditions together, and only then the fallbacks, weakest last.
  let solid = intersect(eroded, carrier);
  // The one fallback, and it stays inside the letter bodies: a piece whose
  // strokes are everywhere thinner than the erosion window has no load-bearing
  // metal at all, and the old fallback to the raw mask would then hand the
  // search a dot again. Carrier ink is never empty - the largest island always
  // qualifies - so the search always has somewhere legitimate to look.
  if (!solid.some((value) => value === 1)) solid = carrier;

  const beforeRings = mask.ink.slice();
  const centres: IdentityRingCentre[] = [];
  const outwardStep = Math.trunc(
    IDENTITY_RING_OUTER * IDENTITY_RING_OUTWARD_FRACTION,
  );

  const leftmostRingX = IDENTITY_RING_OUTER + IDENTITY_RING_TOP_CLEARANCE;
  const rightmostRingX =
    mask.width - 1 - IDENTITY_RING_TOP_CLEARANCE - IDENTITY_RING_OUTER;
  const lowest = IDENTITY_RING_OUTER + IDENTITY_RING_TOP_CLEARANCE;

  for (const side of ["left", "right"] as const) {
    const outward = side === "left" ? -1 : 1;
    // The anchors this side may be seated on, best first: the topmost pixel of
    // each distinct carrier island inside the end band, widening the band until
    // there are enough of them. The first one is what the lab picked and what a
    // jeweller would pick; the rest exist because a name must not die when the
    // best anchor happens to have no clean seat above it (adversarial review 3,
    // finding 3).
    const anchors: { x: number; y: number }[] = [];
    const seenIslands = new Set<number>();
    const seenAnchors = new Set<string>();
    const collect = (fraction: number, perIsland: boolean) => {
      if (anchors.length >= IDENTITY_RING_ANCHOR_CANDIDATES) return;
      const boundary =
        side === "left" ? minX + span * fraction : maxX - span * fraction;
      // Row-major scan: the first hit on an island is its topmost row, and the
      // leftmost pixel of that row, exactly what `np.argmin` picks out of
      // `np.nonzero`.
      for (
        let y = 0;
        y < mask.height && anchors.length < IDENTITY_RING_ANCHOR_CANDIDATES;
        y += 1
      )
        for (let x = 0; x < mask.width; x += 1) {
          const index = y * mask.width + x;
          if (!solid[index]) continue;
          if (side === "left" ? x >= boundary : x <= boundary) continue;
          if (perIsland && seenIslands.has(labels[index] as number)) continue;
          seenIslands.add(labels[index] as number);
          const key = `${x},${y}`;
          if (!seenAnchors.has(key)) {
            seenAnchors.add(key);
            anchors.push({ x, y });
          }
          // One candidate per island when scanning the inward bands; one
          // candidate per band when scanning the outer ones.
          if (!perIsland) return;
          break;
        }
    };
    // The end band widening inward, one candidate per carrier island: the first
    // of them is the anchor the lab picks and the one a jeweller would pick.
    for (const fraction of IDENTITY_RING_ANCHOR_SPANS) collect(fraction, true);
    // Then the narrower bands toward the end of the name, which is the only
    // place left to look on a piece that is a single island.
    for (const fraction of IDENTITY_RING_ANCHOR_OUTER_SPANS)
      collect(fraction, false);
    if (anchors.length === 0)
      throw new IdentitySolverError(
        "identity_ring_anchor_missing",
        `identity_ring_anchor_missing:side=${side}`,
      );

    // The lab seats the ring at one place and stops. Three things go wrong at
    // that one seat, and each costs a customer the right name. A hairline that
    // rises above the load-bearing anchor loses a few pixels to the hole; a
    // floating dot outside the weld joint disappears into the ring metal, which
    // reads as a different letter while every other gate stays green; and a
    // ring already against the canvas edge has nowhere outward to go. So the
    // solver spends, in order, the reserved ring band above the anchor, the
    // outward room, the inward room, and then the next anchor on the carrier.
    // It takes the first seat where the hole punches nothing out and no ink
    // outside the weld lies under the ring metal. Failing all of that it keeps
    // the least-bad seat and lets the measured gates below refuse the piece,
    // which is the honest answer only when no clean seat exists at all.
    let chosen = anchors[0] as { x: number; y: number };
    let cx = Math.min(
      rightmostRingX,
      Math.max(leftmostRingX, chosen.x + outward * outwardStep),
    );
    let cy = Math.max(
      lowest,
      chosen.y - IDENTITY_RING_OUTER + IDENTITY_RING_WELD_OVERLAP,
    );
    let cost = Number.POSITIVE_INFINITY;
    search: for (const anchor of anchors) {
      const anchorX = anchor.x;
      const anchorY = anchor.y;
      const seatX = anchorX + outward * outwardStep;
      const seat = Math.max(
        lowest,
        anchorY - IDENTITY_RING_OUTER + IDENTITY_RING_WELD_OVERLAP,
      );
      // A ring pushed off the canvas would have its annulus clipped, so its
      // hole would no longer be enclosed: the legal band is the canvas margin
      // and nothing narrower. Fix pass 3 clamped every illegal x onto that
      // margin, which made 25 shifts collapse onto one candidate and left the
      // ring unable to travel at all (adversarial review 3, finding 7). The
      // candidates are collected once here instead, outward first and then
      // inward, deduplicated, so a clamp costs one candidate rather than the
      // whole search.
      const columns: number[] = [];
      const offer = (value: number) => {
        const clamped = Math.min(rightmostRingX, Math.max(leftmostRingX, value));
        if (!columns.includes(clamped)) columns.push(clamped);
      };
      for (let shift = 0; shift <= IDENTITY_RING_MAX_OUTWARD_SHIFT; shift += 1)
        offer(seatX + outward * shift);
      for (let shift = 1; shift <= IDENTITY_RING_MAX_INWARD_SHIFT; shift += 1)
        offer(seatX - outward * shift);

      for (let lift = 0; lift <= IDENTITY_RING_MAX_LIFT; lift += 1) {
        const candidateY = Math.max(lowest, seat - lift);
        if (lift > 0 && candidateY === Math.max(lowest, seat - (lift - 1)))
          break;
        for (const candidateX of columns) {
          const ring = {
            x: candidateX,
            y: candidateY,
            anchorX,
            anchorY,
          } satisfies IdentityRingCentre;
          const punched = countDisk(
            mask,
            beforeRings,
            candidateX,
            candidateY,
            IDENTITY_RING_INNER,
          );
          const welded = countGlyphPixelsUnderRingMetal(
            mask,
            beforeRings,
            ring,
          );
          if (punched === 0 && welded === 0) {
            cx = candidateX;
            cy = candidateY;
            chosen = anchor;
            cost = 0;
            break search;
          }
          if (punched + welded < cost) {
            cost = punched + welded;
            cx = candidateX;
            cy = candidateY;
            chosen = anchor;
          }
        }
      }
    }
    const anchorX = chosen.x;
    const anchorY = chosen.y;
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

  // The other half of that statement, and the one the punch count cannot see:
  // ink the ring metal swallowed rather than cleared. Counted against the ring
  // geometry that was actually drawn, on the name as it stood before any ring.
  let glyphPixelsUnderRingMetal = 0;
  for (const centre of centres)
    glyphPixelsUnderRingMetal += countGlyphPixelsUnderRingMetal(
      mask,
      beforeRings,
      centre,
    );

  return {
    centres,
    glyphBox,
    glyphPixelsPunchedByRings,
    glyphPixelsUnderRingMetal,
  };
}

/**
 * Pre-ring ink pixels that lie under one ring's metal outside the weld itself.
 *
 * "Under the metal" is every pixel the ring adds metal over: the annulus
 * between the hole and the outer edge, and the weld fillet, which on a lifted
 * ring reaches far below the annulus. It is measured geometrically rather than
 * as a change of state, because `drawDisk(..., 1)` writes 1 over a pixel that
 * was already 1 and leaves no trace, so the scan covers the bounding box of the
 * ring *and* the fillet rather than the ring alone.
 *
 * The one exemption is the weld, and it is exactly the metal `drawBar` lays:
 * the same capsule predicate on the same segment, so the measurement and the
 * drawing cannot drift apart. Ink there is the joint being made. Ink anywhere
 * else under the metal is a piece of the name the ring absorbed.
 *
 * Fix pass 3 exempted two capsules, the drawn fillet and a second one running
 * from the ring *centre* into the anchor. Adversarial review 3, finding 2: that
 * second capsule is metal the solver never lays, it covered the corridor
 * between the hole and the stroke, and together the pair made 30.8% of every
 * annulus unmeasurable - a detached mark parked in that corridor was invisible
 * to the gate that exists to catch exactly that. It is gone.
 */
function countGlyphPixelsUnderRingMetal(
  mask: RasterMask,
  source: Uint8Array,
  ring: IdentityRingCentre,
): number {
  // The fillet `drawBar` lays: from just below the hole down into the stroke.
  const barY0 = ring.y + IDENTITY_RING_INNER + IDENTITY_RING_WELD_START_GAP;
  const barX0 = ring.x;
  const barY1 = ring.anchorY + IDENTITY_RING_WELD_ANCHOR_DEPTH;
  const barX1 = ring.anchorX;
  const barRadius = IDENTITY_RING_WELD_WIDTH / 2;
  // The box the ring and its fillet together occupy.
  const yMin = Math.max(
    0,
    Math.trunc(Math.min(ring.y - IDENTITY_RING_OUTER, barY0, barY1) - barRadius),
  );
  const yMax = Math.min(
    mask.height - 1,
    Math.ceil(Math.max(ring.y + IDENTITY_RING_OUTER, barY0, barY1) + barRadius),
  );
  const xMin = Math.max(
    0,
    Math.trunc(Math.min(ring.x - IDENTITY_RING_OUTER, barX0, barX1) - barRadius),
  );
  const xMax = Math.min(
    mask.width - 1,
    Math.ceil(Math.max(ring.x + IDENTITY_RING_OUTER, barX0, barX1) + barRadius),
  );
  let welded = 0;
  for (let y = yMin; y <= yMax; y += 1)
    for (let x = xMin; x <= xMax; x += 1) {
      if (!source[y * mask.width + x]) continue;
      const radial = (x - ring.x) ** 2 + (y - ring.y) ** 2;
      const underAnnulus =
        radial <= IDENTITY_RING_OUTER ** 2 &&
        radial > IDENTITY_RING_INNER ** 2;
      const underFillet = insideCapsule(
        x,
        y,
        barX0,
        barY0,
        barX1,
        barY1,
        barRadius,
      );
      // The hole is the punch count's business; anywhere the ring lays no
      // metal is nobody's.
      if (!underAnnulus && !underFillet) continue;
      // The exemption, and the whole of it: the fillet the solver welds.
      if (underFillet) continue;
      welded += 1;
    }
  return welded;
}

/**
 * Whether `(x, y)` lies inside the capsule of radius `radius` around the
 * segment `(x0, y0) - (x1, y1)`: the same region `drawBar` fills, as a
 * predicate, so the measurement and the drawing cannot drift apart.
 */
function insideCapsule(
  x: number,
  y: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  radius: number,
): boolean {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const segment = dx * dx + dy * dy;
  const t =
    segment === 0
      ? 0
      : Math.min(1, Math.max(0, ((y - y0) * dy + (x - x0) * dx) / segment));
  const px = x0 + t * dx;
  const py = y0 + t * dy;
  return (y - py) ** 2 + (x - px) ** 2 <= radius * radius;
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
