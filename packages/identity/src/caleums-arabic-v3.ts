import { createHash } from "node:crypto";
import {
  findMaskHoles,
  label4,
  measureMask,
  type DecodedMaskGeometryInput,
  type MaskBoundingBox,
  type MaskInkRule,
} from "./geometry";
import { IdentitySolverError } from "./errors";
import {
  IDENTITY_BRIDGE_WIDTH,
  IDENTITY_GLYPH_CLASS_MARK,
  IDENTITY_LANCZOS_SUPPORT,
  IDENTITY_MAX_BRIDGES,
  IDENTITY_MIN_RECENTRE_SCALE,
  IDENTITY_RECENTRE_BOX,
  IDENTITY_RESAMPLE_INK_THRESHOLD,
  IDENTITY_RING_ANCHOR_CANDIDATES,
  IDENTITY_RING_ANCHOR_EROSION,
  IDENTITY_RING_BAR_DEPTH,
  IDENTITY_RING_BAR_WIDTH,
  IDENTITY_RING_CARRIER_MIN_CONTOUR_AREA_FRACTION,
  IDENTITY_RING_CARRIER_MIN_CONTOUR_GLYPH_HEIGHT_FRACTION,
  IDENTITY_RING_CARRIER_MIN_RUN_HEIGHT_FRACTION,
  IDENTITY_RING_HOLE_MIN_AREA_FRACTION,
  IDENTITY_RING_INNER,
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
  type StencilBox,
  type StencilContour,
  type StencilGlyphOutline,
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
  /**
   * The glyph outlines the rasteriser painted, placed on the same canvas as
   * `mask`, in the same pixel coordinates (D-020).
   *
   * The mask alone cannot say which metal is a letter stroke and which is a
   * dot: by the time it exists the two are the same black pixels. The outlines
   * can, because a contour belongs to a glyph and a glyph has a GDEF class, so
   * the ring carrier is decided from the font rather than guessed from a blob.
   */
  readonly outlines: readonly StencilGlyphOutline[];
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
  /**
   * Which glyph of the shaped run carries this ring, as an index into the
   * buffer HarfBuzz returned, and which contour of that glyph (D-020). Both are
   * -1 on the bar fallback, where the ring hangs from the bar and not from a
   * letter.
   */
  readonly glyphIndex: number;
  readonly contourIndex: number;
}

/**
 * How the two jump rings are attached.
 *
 * `welded` is the piece the lab proved and the shop sells: each ring sits on
 * the outer top corner of a letter stroke at one end of the name. `bar` is the
 * fallback for a name where no clean seat exists on any carrier at either end -
 * a thin rail across the top of the lettering with a ring at each of its ends.
 * `none` is the ring-free construction, which carries its own suspension.
 *
 * D-020: the engine never refuses a customer's name because a ring would not
 * seat. A bar piece is a real pendant and it is reported as what it is, so the
 * pipeline can route it to an operator before it is photographed.
 */
export type IdentityRingPlacement = "welded" | "bar" | "none";

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
  /** How those rings are attached (D-020): on letter strokes, or on a bar. */
  readonly ringPlacement: IdentityRingPlacement;
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
  /**
   * The horizontal scale `recentre` actually applied; 1 unless the piece
   * overflowed the body box.
   *
   * Review finding 10: this used to report the scale `recentre` computed, while
   * the raster was resampled to `trunc(width * scale)` columns, so the number a
   * caller mapped ring centres through was not the number the pixels moved by.
   * Both axes are reported now, each as `output / input` on its own axis, which
   * is the transform to the pixel and differs between the axes by up to one
   * output row's worth of truncation.
   */
  readonly recentreScale: number;
  /** The vertical scale `recentre` actually applied. */
  readonly recentreScaleY: number;
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
  const { mask, shaping, outlines } = await rasterizer.typeset({
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
          placement: "none" as IdentityRingPlacement,
          glyphBox: inkBox(mask),
          glyphPixelsPunchedByRings: 0,
          glyphPixelsUnderRingMetal: 0,
        }
      : addRings(mask, outlines);
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
    ringPlacement: rings.placement,
    ringCentres: rings.centres,
    glyphBoxBeforeRings: rings.glyphBox,
    glyphPixelsPunchedByRings: rings.glyphPixelsPunchedByRings,
    glyphPixelsUnderRingMetal: rings.glyphPixelsUnderRingMetal,
    recentreScale: placement.scaleX,
    recentreScaleY: placement.scaleY,
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
  // What the hole would measure if the ring were a perfect circle at the size
  // it was drawn and nothing intruded. Review finding 5: the weld fillet used
  // to start inside the hole and take up to a third of it, and no gate said so,
  // so a pendant could ship with a hole too small for its own chain. The fillet
  // now starts on the hole boundary and this is the measurement that keeps it
  // there.
  const ideal =
    Math.PI *
    IDENTITY_RING_INNER *
    IDENTITY_RING_INNER *
    construction.recentreScale *
    construction.recentreScaleY;
  const minimum = ideal * IDENTITY_RING_HOLE_MIN_AREA_FRACTION;
  for (const centre of construction.ringCentres) {
    const x = Math.round(
      centre.x * construction.recentreScale + construction.recentreOffsetX,
    );
    const y = Math.round(
      centre.y * construction.recentreScaleY + construction.recentreOffsetY,
    );
    const region = geometry.regionAt(x, y);
    if (region < 0 || seen.has(region)) continue;
    seen.add(region);
    const hole = geometry.holes[region] as MeasuredRingHole;
    if (hole.size < minimum)
      throw new IdentitySolverError(
        "identity_ring_hole_too_small",
        `identity_ring_hole_too_small:hole=${holes.length},size=${Math.round(hole.size)},min=${Math.round(minimum)}`,
      );
    holes.push(hole);
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
  // Review finding 7: the loop used to fall out of its last iteration straight
  // into this throw, so a piece that needed exactly `IDENTITY_MAX_BRIDGES` bars
  // and converged on the last one was refused anyway. The cap is a
  // non-convergence guard, not a bar budget, so the question it asks is whether
  // the piece is one component after the last bar - which only a fresh labelling
  // can answer.
  const settled = label4(mask.width, mask.height, mask.ink, isInkValue);
  if (settled.count <= 1) return { bridges, pixelsAdded };
  throw new IdentitySolverError(
    "identity_bridge_failed",
    `identity_bridge_failed:bars=${IDENTITY_MAX_BRIDGES},components=${settled.count},converged=false`,
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
  /** Applied horizontal scale: output columns divided by input columns. */
  readonly scaleX: number;
  /** Applied vertical scale: output rows divided by input rows. */
  readonly scaleY: number;
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
  const sourceWidth = width;
  const sourceHeight = height;
  let art = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1)
      art[y * width + x] = mask.ink[
        (minY + y) * mask.width + minX + x
      ] as number;

  if (height > IDENTITY_RECENTRE_BOX || width > IDENTITY_RECENTRE_BOX) {
    // The scale the fit wants. It is not reported: what the caller needs is the
    // scale the pixels took, which the truncation below fixes per axis.
    const scale = Math.min(
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

  // Review finding 10: this reported `scale`, the number the fit computed,
  // while the resample truncated it independently on each axis
  // (`trunc(width * scale)` columns and `trunc(height * scale)` rows). The
  // caller maps ring centres through this transform to find their holes, so it
  // has to be the transform the pixels actually took: output over input, per
  // axis. Both are exactly 1 when nothing was downscaled.
  const scaleX = width / sourceWidth;
  const scaleY = height / sourceHeight;
  return {
    scaleX,
    scaleY,
    offsetX: left - minX * scaleX,
    offsetY: top - minY * scaleY,
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
  /** Whether those rings are welded to letter strokes or hung from a bar. */
  readonly placement: IdentityRingPlacement;
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

/* -------------------------------------------------------------------------
 * D-020: choosing the metal a jump ring hangs from.
 *
 * Three fix passes tried to answer "is this blob a letter or a dot" on the
 * finished raster - erosion window, island-area ratio, blob compactness - and
 * each of them was falsified by a name outside the corpus it was tuned on: the
 * tittle of the i in `Ali`, the nuqta of the n in `Noor`. The question has an
 * exact answer one step earlier. HarfBuzz hands back each glyph's contours and
 * each glyph's GDEF class, so a mark is a mark because the font says so, and
 * the stroke of a letter is its largest contour. The carrier is chosen there,
 * before anything is painted, and the raster is used only to find one pixel on
 * it and to prove afterwards that no other ink ended up under ring metal.
 * ---------------------------------------------------------------------- */

/** One contour of one base glyph, offered to the placement search. */
interface CarrierCandidate {
  readonly glyphIndex: number;
  readonly contourIndex: number;
  readonly contour: StencilContour;
}

/** The union of every glyph box: the run's ink box, in canvas pixels. */
function outlineRunBox(outlines: readonly StencilGlyphOutline[]): StencilBox {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const glyph of outlines) {
    if (glyph.contours.length === 0) continue;
    if (glyph.box.x < minX) minX = glyph.box.x;
    if (glyph.box.y < minY) minY = glyph.box.y;
    if (glyph.box.x + glyph.box.width > maxX)
      maxX = glyph.box.x + glyph.box.width;
    if (glyph.box.y + glyph.box.height > maxY)
      maxY = glyph.box.y + glyph.box.height;
  }
  if (!Number.isFinite(minX))
    throw new IdentitySolverError(
      "identity_mask_empty",
      "identity_mask_empty:no outline to anchor",
    );
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * The carrier contour of one glyph, or nothing when the glyph is all mark.
 *
 * The carrier is the largest contour by area among those that are large enough
 * relative to the glyph's own largest contour and tall enough relative to the
 * glyph and to the whole name. That is what excludes the tittle of an `i`, the
 * nuqta over a Kufi `n` and the hamza on an alef when they are contours of the
 * base glyph rather than glyphs of their own; `IDENTITY_GLYPH_CLASS_MARK`
 * excludes them when they are glyphs of their own.
 */
function carrierContourOf(
  glyph: StencilGlyphOutline,
  runBox: StencilBox,
): { contour: StencilContour; contourIndex: number } | undefined {
  if (glyph.glyphClass === IDENTITY_GLYPH_CLASS_MARK) return undefined;
  if (glyph.contours.length === 0) return undefined;
  let largestArea = 0;
  for (const contour of glyph.contours)
    if (contour.area > largestArea) largestArea = contour.area;
  if (largestArea <= 0) return undefined;
  const minimumArea =
    largestArea * IDENTITY_RING_CARRIER_MIN_CONTOUR_AREA_FRACTION;
  const minimumHeight = Math.max(
    glyph.box.height * IDENTITY_RING_CARRIER_MIN_CONTOUR_GLYPH_HEIGHT_FRACTION,
    runBox.height * IDENTITY_RING_CARRIER_MIN_RUN_HEIGHT_FRACTION,
  );
  let chosen: { contour: StencilContour; contourIndex: number } | undefined;
  glyph.contours.forEach((contour, contourIndex) => {
    if (contour.area < minimumArea) return;
    if (contour.box.height < minimumHeight) return;
    if (chosen && chosen.contour.area >= contour.area) return;
    chosen = { contour, contourIndex };
  });
  return chosen;
}

/**
 * The carriers on one side of the name, outermost first.
 *
 * "Outermost" is measured on the canvas, not in the buffer: the left ring looks
 * at the glyph whose box starts furthest left and the right ring at the glyph
 * whose box ends furthest right, which is the same statement for Latin and for
 * Arabic without either of them having to know which way the script runs.
 */
function carrierCandidates(
  side: "left" | "right",
  outlines: readonly StencilGlyphOutline[],
  runBox: StencilBox,
): CarrierCandidate[] {
  const ordered = outlines
    .filter((glyph) => glyph.contours.length > 0)
    .slice()
    .sort((left, right) =>
      side === "left"
        ? left.box.x - right.box.x
        : right.box.x + right.box.width - (left.box.x + left.box.width),
    );
  const candidates: CarrierCandidate[] = [];
  for (const glyph of ordered) {
    if (candidates.length >= IDENTITY_RING_ANCHOR_CANDIDATES) break;
    const carrier = carrierContourOf(glyph, runBox);
    if (!carrier) continue;
    candidates.push({
      glyphIndex: glyph.index,
      contourIndex: carrier.contourIndex,
      contour: carrier.contour,
    });
  }
  return candidates;
}

/**
 * Fills one closed contour on its own, even-odd, sampling pixel centres.
 *
 * A single closed contour has no self-intersection to speak of, so even-odd and
 * nonzero agree; what matters is that this is the contour *alone*, without the
 * counter that the glyph's other contours cut out of it. The result is
 * intersected with the painted mask straight afterwards, so the counter comes
 * back off and any half-pixel disagreement with the SVG rasteriser is resolved
 * in the rasteriser's favour.
 */
function fillContour(
  width: number,
  height: number,
  points: readonly number[],
): Uint8Array {
  const ink = new Uint8Array(width * height);
  const count = points.length / 2;
  if (count < 3) return ink;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (let index = 1; index < points.length; index += 2) {
    const y = points[index] as number;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const firstRow = Math.max(0, Math.floor(minY));
  const lastRow = Math.min(height - 1, Math.ceil(maxY));
  const crossings: number[] = [];
  for (let y = firstRow; y <= lastRow; y += 1) {
    const scan = y + 0.5;
    crossings.length = 0;
    for (let index = 0; index < count; index += 1) {
      const x0 = points[2 * index] as number;
      const y0 = points[2 * index + 1] as number;
      const next = (index + 1) % count;
      const x1 = points[2 * next] as number;
      const y1 = points[2 * next + 1] as number;
      if (y0 === y1) continue;
      // Half-open in y so a vertex shared by two edges is counted once.
      if (scan < Math.min(y0, y1) || scan >= Math.max(y0, y1)) continue;
      crossings.push(x0 + ((scan - y0) / (y1 - y0)) * (x1 - x0));
    }
    if (crossings.length < 2) continue;
    crossings.sort((left, right) => left - right);
    for (let pair = 0; pair + 1 < crossings.length; pair += 2) {
      const from = Math.max(0, Math.ceil((crossings[pair] as number) - 0.5));
      const to = Math.min(
        width - 1,
        Math.floor((crossings[pair + 1] as number) - 0.5),
      );
      for (let x = from; x <= to; x += 1) ink[y * width + x] = 1;
    }
  }
  return ink;
}

/** `passes` rounds of 8-connected dilation on a standalone ink plane. */
function dilateInk(
  width: number,
  height: number,
  ink: Uint8Array,
  passes: number,
): Uint8Array {
  const plane: RasterMask = { width, height, ink: ink.slice() };
  for (let pass = 0; pass < passes; pass += 1) dilate(plane);
  return plane.ink;
}

/**
 * The pixels of one carrier contour, as the finished raster has them.
 *
 * The contour is filled on its own, grown by the same `IDENTITY_THICKEN_PASSES`
 * the piece was thickened by, and then intersected with the mask: what comes
 * out is metal that both belongs to this contour and is actually painted, so a
 * half-pixel difference between this fill and the SVG rasteriser's cannot
 * invent ink that is not there.
 */
function carrierPixelsFor(
  mask: RasterMask,
  contour: StencilContour,
): Uint8Array {
  const filled = fillContour(mask.width, mask.height, contour.points);
  const grown = dilateInk(
    mask.width,
    mask.height,
    filled,
    IDENTITY_THICKEN_PASSES,
  );
  return intersect(grown, mask.ink);
}

/**
 * The outer top corner of a carrier stroke: the topmost row of its metal, and
 * on that row the pixel nearest the end of the name. This is the lab's anchor
 * (`np.argmin` over the eroded body's rows) computed on one contour's own
 * raster instead of on the merged piece, which is the whole of D-020.
 */
function carrierAnchor(
  mask: RasterMask,
  carrier: Uint8Array,
  eroded: Uint8Array,
  side: "left" | "right",
): { x: number; y: number } | undefined {
  // Load-bearing first: metal thick enough to hold a chain. A contour whose
  // every stroke is thinner than the erosion window has none, and then the
  // contour itself is the best available answer - it is still a letter stroke.
  let solid = intersect(carrier, eroded);
  if (!solid.some((value) => value === 1)) solid = carrier;
  for (let y = 0; y < mask.height; y += 1) {
    let found = -1;
    for (let x = 0; x < mask.width; x += 1) {
      if (!solid[y * mask.width + x]) continue;
      if (side === "left") return { x, y };
      found = x;
    }
    if (found >= 0) return { x: found, y };
  }
  return undefined;
}

/** A seat the search accepted: a clean ring centre over one carrier. */
interface RingSeat {
  readonly x: number;
  readonly y: number;
  readonly anchorX: number;
  readonly anchorY: number;
  readonly glyphIndex: number;
  readonly contourIndex: number;
}

/**
 * The first clean seat above one anchor, or nothing.
 *
 * Clean means the hole punches no pre-ring ink out and no pre-ring ink lies
 * under the ring metal outside the weld. The search spends, in order, the room
 * above the anchor, the outward room and the inward room. Fix pass 3 kept the
 * least-bad seat when nothing was clean and let the measured gate refuse the
 * customer's piece; D-020 returns nothing instead, and the caller moves to the
 * next carrier and then to the bar.
 */
function findSeat(
  mask: RasterMask,
  beforeRings: Uint8Array,
  anchor: { x: number; y: number },
  outward: -1 | 1,
): { x: number; y: number } | undefined {
  const outwardStep = Math.trunc(
    IDENTITY_RING_OUTER * IDENTITY_RING_OUTWARD_FRACTION,
  );
  const leftmostRingX = IDENTITY_RING_OUTER + IDENTITY_RING_TOP_CLEARANCE;
  const rightmostRingX =
    mask.width - 1 - IDENTITY_RING_TOP_CLEARANCE - IDENTITY_RING_OUTER;
  const lowest = IDENTITY_RING_OUTER + IDENTITY_RING_TOP_CLEARANCE;
  const seatX = anchor.x + outward * outwardStep;
  const seat = Math.max(
    lowest,
    anchor.y - IDENTITY_RING_OUTER + IDENTITY_RING_WELD_OVERLAP,
  );
  // A ring pushed off the canvas would have its annulus clipped, so its hole
  // would no longer be enclosed: the legal band is the canvas margin and
  // nothing narrower. The candidates are collected once, outward first and then
  // inward, deduplicated after clamping, so a clamp costs one candidate rather
  // than the whole search (adversarial review 3, finding 7).
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
    if (lift > 0 && candidateY === Math.max(lowest, seat - (lift - 1))) break;
    for (const candidateX of columns) {
      const ring = {
        x: candidateX,
        y: candidateY,
        anchorX: anchor.x,
        anchorY: anchor.y,
        glyphIndex: -1,
        contourIndex: -1,
      } satisfies IdentityRingCentre;
      const punched = countDisk(
        mask,
        beforeRings,
        candidateX,
        candidateY,
        IDENTITY_RING_INNER,
      );
      if (punched !== 0) continue;
      if (countGlyphPixelsUnderRingMetal(mask, beforeRings, ring) !== 0)
        continue;
      return { x: candidateX, y: candidateY };
    }
  }
  return undefined;
}

/** Draws one ring: the body, the hole, and the fillet down to its anchor. */
function drawRing(mask: RasterMask, ring: IdentityRingCentre): void {
  drawDisk(mask, ring.x, ring.y, IDENTITY_RING_OUTER, 1);
  drawDisk(mask, ring.x, ring.y, IDENTITY_RING_INNER, 0);
  drawBar(
    mask,
    ring.y + IDENTITY_RING_INNER + IDENTITY_RING_WELD_START_GAP,
    ring.x,
    ring.anchorY + IDENTITY_RING_WELD_ANCHOR_DEPTH,
    ring.anchorX,
    IDENTITY_RING_WELD_WIDTH,
  );
}

/**
 * Two jump rings welded onto the top edge, one over each end of the name. A
 * port of `add_rings` (`make_stencil.py:143-178`) with D-020's carrier rule.
 *
 * The anchor is the outer top corner of a carrier contour: metal that belongs
 * to a base glyph's largest contour, because the font said so, and that
 * survives an `IDENTITY_RING_ANCHOR_EROSION` window, because a chain has to
 * hang from it. The ring centre then steps outward from that anchor, away from
 * the middle of the name, and up by
 * `IDENTITY_RING_OUTER - IDENTITY_RING_WELD_OVERLAP`, so the ring body sinks
 * into the stroke it sits on - integral metal, not a floating circle - and the
 * hole itself clears the lettering.
 *
 * When no seat above the outermost carrier is clean the search steps one glyph
 * inward, and when no carrier on either side works it falls back to the bar.
 * The one thing it never does is refuse the customer's name.
 */
function addRings(
  mask: RasterMask,
  outlines: readonly StencilGlyphOutline[],
): RingPlacement {
  const glyphBox = inkBox(mask);
  const runBox = outlineRunBox(outlines);
  const beforeRings = mask.ink.slice();
  const eroded = erodeSquare(
    mask.width,
    mask.height,
    mask.ink,
    IDENTITY_RING_ANCHOR_EROSION,
  );

  const seats: (RingSeat | undefined)[] = (["left", "right"] as const).map(
    (side) => {
      const outward = side === "left" ? -1 : 1;
      for (const candidate of carrierCandidates(side, outlines, runBox)) {
        const carrier = carrierPixelsFor(mask, candidate.contour);
        const anchor = carrierAnchor(mask, carrier, eroded, side);
        if (!anchor) continue;
        const seat = findSeat(mask, beforeRings, anchor, outward);
        if (!seat) continue;
        return {
          x: seat.x,
          y: seat.y,
          anchorX: anchor.x,
          anchorY: anchor.y,
          glyphIndex: candidate.glyphIndex,
          contourIndex: candidate.contourIndex,
        } satisfies RingSeat;
      }
      return undefined;
    },
  );

  const centres: IdentityRingCentre[] = [];
  let placement: IdentityRingPlacement = "welded";
  if (seats.every((seat) => seat !== undefined)) {
    for (const seat of seats as RingSeat[]) {
      const ring: IdentityRingCentre = {
        x: seat.x,
        y: seat.y,
        anchorX: seat.anchorX,
        anchorY: seat.anchorY,
        glyphIndex: seat.glyphIndex,
        contourIndex: seat.contourIndex,
      };
      drawRing(mask, ring);
      centres.push(ring);
    }
  } else {
    placement = "bar";
    centres.push(...drawBarSuspension(mask, glyphBox));
  }

  // Measured, not predicted: the seat search asked what would happen before the
  // hole was cut, while this compares the finished mask against the name as it
  // stood before any ring, so a hole that ate a stroke the search never
  // considered - or a fillet that filled one back in - is counted here. On the
  // bar construction `beforeRings` is the name without the bar, so the bar's own
  // metal is neither punched nor welded: it is part of the piece, not part of
  // the name.
  let glyphPixelsPunchedByRings = 0;
  for (let index = 0; index < beforeRings.length; index += 1)
    if (beforeRings[index] && !mask.ink[index]) glyphPixelsPunchedByRings += 1;

  let glyphPixelsUnderRingMetal = 0;
  for (const centre of centres)
    glyphPixelsUnderRingMetal += countGlyphPixelsUnderRingMetal(
      mask,
      beforeRings,
      centre,
    );

  return {
    centres,
    placement,
    glyphBox,
    glyphPixelsPunchedByRings,
    glyphPixelsUnderRingMetal,
  };
}

/**
 * The fallback suspension: a thin rail across the top of the lettering with a
 * ring at each end.
 *
 * D-020's promise is that a customer's name is never refused for want of a ring
 * seat. When neither end of a name offers a carrier with clean air above it,
 * the piece gets a bail rail instead: a capsule at
 * `IDENTITY_RING_BAR_DEPTH` below the topmost ink, which overlaps that ink
 * along the whole span so the piece is still one casting, and a ring above each
 * of its ends, high enough that its whole annulus clears the lettering. The
 * construction reports itself as `bar` so an operator sees it before the piece
 * is photographed; nothing here is presented as the welded piece the lab
 * proved.
 */
function drawBarSuspension(
  mask: RasterMask,
  glyphBox: readonly [number, number, number, number],
): IdentityRingCentre[] {
  const [minX, minY, maxX] = glyphBox;
  const barY = minY + IDENTITY_RING_BAR_DEPTH;
  const leftmostRingX = IDENTITY_RING_OUTER + IDENTITY_RING_TOP_CLEARANCE;
  const rightmostRingX =
    mask.width - 1 - IDENTITY_RING_TOP_CLEARANCE - IDENTITY_RING_OUTER;
  const lowest = IDENTITY_RING_OUTER + IDENTITY_RING_TOP_CLEARANCE;
  // The whole annulus above the topmost ink of the name, so no letter can lie
  // under ring metal however the name is shaped.
  const ringY = Math.max(lowest, minY - IDENTITY_RING_OUTER - 1);
  drawBar(mask, barY, minX, barY, maxX, IDENTITY_RING_BAR_WIDTH);
  const centres: IdentityRingCentre[] = [];
  for (const end of [minX, maxX]) {
    const ringX = Math.min(rightmostRingX, Math.max(leftmostRingX, end));
    const ring: IdentityRingCentre = {
      x: ringX,
      y: ringY,
      // The fillet runs straight down the ring's own column into the rail, so
      // the anchor is the rail rather than a letter, and `glyphIndex` says so.
      anchorX: ringX,
      anchorY: barY - IDENTITY_RING_WELD_ANCHOR_DEPTH,
      glyphIndex: -1,
      contourIndex: -1,
    };
    drawRing(mask, ring);
    centres.push(ring);
  }
  return centres;
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
    Math.trunc(
      Math.min(ring.y - IDENTITY_RING_OUTER, barY0, barY1) - barRadius,
    ),
  );
  const yMax = Math.min(
    mask.height - 1,
    Math.ceil(Math.max(ring.y + IDENTITY_RING_OUTER, barY0, barY1) + barRadius),
  );
  const xMin = Math.max(
    0,
    Math.trunc(
      Math.min(ring.x - IDENTITY_RING_OUTER, barX0, barX1) - barRadius,
    ),
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
        radial <= IDENTITY_RING_OUTER ** 2 && radial > IDENTITY_RING_INNER ** 2;
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
