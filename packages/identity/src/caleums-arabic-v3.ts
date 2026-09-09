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
  IDENTITY_CARRIER_CORNER_SEGMENTS,
  IDENTITY_CARRIER_FRAME_CORNER_RADIUS,
  IDENTITY_CARRIER_FRAME_INSET,
  IDENTITY_CARRIER_MIN_NAME_SCALE,
  IDENTITY_CARRIER_RAIL_GAP,
  IDENTITY_CARRIER_RAIL_OVERHANG,
  IDENTITY_CARRIER_RAIL_WIDTH,
  IDENTITY_CARRIER_RING_END_INSET,
  IDENTITY_CARRIER_WELDS_PER_RAIL,
  IDENTITY_GLYPH_CLASS_MARK,
  IDENTITY_LANCZOS_SUPPORT,
  IDENTITY_MAX_BRIDGES,
  IDENTITY_MIN_RECENTRE_SCALE,
  IDENTITY_RECENTRE_BOX,
  IDENTITY_RESAMPLE_INK_THRESHOLD,
  IDENTITY_RING_ANCHOR_CANDIDATES,
  IDENTITY_RING_ANCHOR_EROSION,
  IDENTITY_RING_ANCHOR_MAX_DEPTH_FRACTION,
  IDENTITY_RING_ANCHOR_SHOULDER_STEP,
  IDENTITY_RING_ANCHOR_SHOULDER_STEPS,
  IDENTITY_RING_CARRIER_MIN_CONTOUR_AREA_FRACTION,
  IDENTITY_RING_CARRIER_MIN_CONTOUR_GLYPH_HEIGHT_FRACTION,
  IDENTITY_RING_CARRIER_MIN_TALLEST_HEIGHT_FRACTION,
  IDENTITY_RING_HOLE_MIN_AREA_FRACTION,
  IDENTITY_RING_INNER,
  IDENTITY_RING_MIN_SPAN_FRACTION,
  IDENTITY_RING_MAX_INWARD_SHIFT,
  IDENTITY_RING_MAX_LIFT,
  IDENTITY_RING_MAX_OUTWARD_SHIFT,
  IDENTITY_RING_MAX_OVERHANG_FRACTION,
  IDENTITY_RING_MAX_POST_FRACTION,
  IDENTITY_RING_MAX_POST_PX,
  IDENTITY_RING_MAX_TILT_DEGREES,
  IDENTITY_RING_SHARED_GLYPH_MIN_SPAN_FRACTION,
  IDENTITY_RING_OUTER,
  IDENTITY_RING_OUTWARD_FRACTION,
  IDENTITY_RING_TOP_CLEARANCE,
  IDENTITY_RING_WELD_ANCHOR_DEPTH,
  IDENTITY_RING_WELD_OVERLAP,
  IDENTITY_RING_WELD_START_GAP,
  IDENTITY_RING_WELD_WIDTH,
  IDENTITY_STENCIL_COUNTER_REMNANT_FRACTION,
  IDENTITY_STENCIL_PINHOLE_MAX_AREA,
  IDENTITY_THICKEN_PASSES,
  type IdentityScript,
  type ShapingMeasurement,
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
  /**
   * The pendant construction the customer approved (`PendantConstruction`):
   * `classical`, `origami-ribbon`, `framed-minimal` or `diamond-rails`.
   *
   * P2-2b: this is a shape input, not a label. `framed-minimal` and
   * `diamond-rails` are pendants with a frame and with two rails, so the
   * stencil draws them; the id is part of the fingerprint, so two pendants that
   * differ only by construction are two different artifacts. A revision
   * approved before constructions existed carries none, and an id this engine
   * does not draw structure for renders as the lettering alone, which is what
   * `classical` and `origami-ribbon` are.
   */
  construction?: string;
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
  /**
   * Distance between the two measured ring hole centroids, in pixels of the
   * decoded PNG; 0 when the piece does not carry two rings. Gated against
   * `IDENTITY_RING_MIN_SPAN_FRACTION` of the measured ink width (blocker 2).
   */
  readonly ringSpan: number;
  /**
   * Angle of the line through the two ring hole centroids off horizontal, in
   * degrees; 0 when the piece does not carry two rings. This is the angle the
   * piece hangs at on a chain, gated against `IDENTITY_RING_MAX_TILT_DEGREES`
   * (adversarial review 5, blocker 1).
   */
  readonly ringTilt: number;
  /**
   * The worse of the two sides' overhangs: ink outside the nearer ring hole
   * over the measured ink width; 0 when the piece does not carry two rings.
   * Gated against `IDENTITY_RING_MAX_OVERHANG_FRACTION` (blocker 2).
   */
  readonly ringOverhang: number;
  /**
   * Enclosed regions of at most `IDENTITY_STENCIL_PINHOLE_MAX_AREA` pixels
   * still present in the decoded PNG. Any at all is a refusal (minor 2).
   */
  readonly pinholes: number;
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
   * buffer HarfBuzz returned, and which contour of that glyph (D-020). A ring
   * that hangs from a letter stroke carries a real index for both; a ring
   * welded onto the construction's own frame or rail (P2-2b) hangs from no
   * glyph at all and carries -1, which `carrier.ringAnchors` and
   * `ringPlacement: "frame"` say positively.
   */
  readonly glyphIndex: number;
  readonly contourIndex: number;
  /**
   * Which entry of that side's candidate list the carrier was, counting from
   * the outermost base glyph inward. Zero is the outermost letter, which is
   * where the overhang score pushes it back to (adversarial review 5,
   * blocker 2).
   *
   * Adversarial review 4, minor 3: a ring stepped one glyph inward because the
   * name starts with punctuation (`-Ali-`) looked exactly like a ring that
   * collapsed onto the wrong glyph, because nothing recorded which candidate
   * had been used. It is recorded now.
   */
  readonly candidateIndex: number;
}

/**
 * How the two jump rings are attached.
 *
 * `welded` is the piece the lab proved and the shop sells: each ring sits on
 * the outer top corner, or the outer shoulder, of a letter stroke at one end of
 * the name. `none` is the ring-free construction, which carries its own
 * suspension - a frame or a bezel the caller asked for, not a failure.
 *
 * Adversarial review 5, major 3: there used to be a third value, `bar`, a rail
 * drawn across the top of the lettering with a ring at each end, for names
 * where no carrier offered a clean seat. Measured, the rail was not a load
 * path: on `قق` it touched the name along 11% of its span and the whole piece
 * hung from the two nuqta of the final qaf through a 24 px bridge; on `آية` it
 * covered 37.6% of the madda; on `تسنيم` in `minimal` it touched 11%. Making it
 * honest means bridging the rail down to every base glyph and scanning under
 * it, which is the weld machinery again with weaker evidence, and the result is
 * a different product - a nameplate on a bar - that the shop never approved
 * (major 4 is exactly that open question). The rail is gone. A name that cannot
 * seat two rings under the gates raises `identity_no_ring_seat`, which is a
 * terminal pre-spend block with a code and no customer text, the same routing
 * the bar path reached through `identity_bar_fallback` with its default on.
 *
 * P2-2b adds `frame`: the construction the customer chose carries its own
 * structure, and the rings are welded onto that structure rather than onto a
 * letter. Which structure it is - a rectangular frame or a pair of rails - is
 * `carrier.kind`, so there is one placement value and one detail rather than
 * two values a caller has to keep in step. This is not the deleted `bar`: that
 * rail was a fallback drawn over a name that offered no seat, this is the
 * pendant the shopper picked, and the piece is one component because the name
 * is welded into it, not because a bar was laid across it.
 */
export type IdentityRingPlacement = "welded" | "frame" | "none";

/** Which structure a construction adds around the name. */
export type IdentityCarrierKind = "frame" | "rails";

/** One straight or curved run of rail, as a capsule centreline in pixels. */
export interface IdentityCarrierSegment {
  readonly rail: "top" | "bottom" | "left" | "right" | "corner";
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

/**
 * The structure the construction added around the name, in pre-recentre canvas
 * pixels (P2-2b), measured while it was drawn.
 *
 * Everything here is a statement about metal that exists in the encoded PNG:
 * the centrelines the capsules were laid along, the rail width they were laid
 * at, the outer box the finished structure occupies, where the name was welded
 * into it and where the rings were anchored on it. A verifier registers the
 * stencil against a photograph, so it needs the frame in pixels, not the fact
 * that a frame was requested.
 */
export interface IdentityCarrierMeasurement {
  readonly kind: IdentityCarrierKind;
  /** Capsule width every segment was drawn at (`IDENTITY_CARRIER_RAIL_WIDTH`). */
  readonly railWidth: number;
  /** The centrelines, in the order they were drawn. */
  readonly segments: readonly IdentityCarrierSegment[];
  /**
   * `[minX, minY, maxX, maxY]` of the assembly once the structure and its welds
   * are drawn and before any ring, inclusive. On both constructions the
   * structure encloses or overhangs the name, so this is the structure's own
   * outer edge; it is measured rather than derived so it stays true if that
   * ever stops being so.
   */
  readonly outerBox: readonly [number, number, number, number];
  /** The name's ink box after it was placed and before the structure was drawn. */
  readonly nameBox: readonly [number, number, number, number];
  /**
   * The scale the name was resampled by to leave room for the structure; 1 when
   * the layout already left enough. The name is fitted to the canvas before the
   * construction exists, so a frame needs room from somewhere, and taking it
   * from the name is the same operation `recentre` performs on an overflowing
   * piece.
   */
  readonly nameScale: number;
  /**
   * The name's ink before and after that resample, in pixels.
   *
   * `identity_bridge_moved_ink` is measured before the structure exists, and a
   * resample afterwards is exactly the step that could quietly thin a name, so
   * the cost is reported rather than left to be inferred from the scale. The
   * ratio tracks `nameScale` squared; the component, counter and pinhole gates
   * on the encoded bytes are what refuse a name the resample actually broke.
   */
  readonly nameInkBefore: number;
  readonly nameInkAfter: number;
  /** Welds drawn from the name to a rail, and the ink they added. */
  readonly welds: number;
  readonly weldPixelsAdded: number;
  /** Ink the rails themselves added. */
  readonly railPixelsAdded: number;
  /**
   * Bars the general connector still had to draw after the welds, to make the
   * name and its structure one component. Zero on every cell of the matrix; it
   * is reported because "the welds were enough" is a measurement, not a hope.
   */
  readonly bridges: number;
  /** Where each ring was anchored on the structure, left then right. */
  readonly ringAnchors: readonly { readonly x: number; readonly y: number }[];
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
  /**
   * The construction id the piece was built for, normalised, or the empty
   * string when the caller named none (P2-2b). It is part of the fingerprint
   * input, so a name reordered from `classical` to `framed-minimal` is a
   * different artifact rather than the same one relabelled.
   */
  readonly constructionId: string;
  /**
   * The structure that construction added around the name, or `null` for a
   * construction whose piece is the lettering alone (`classical`, and
   * `origami-ribbon`, whose folded facets are a finish the stencil reports
   * nothing about and never claims).
   */
  readonly carrier: IdentityCarrierMeasurement | null;
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
  /**
   * Enclosed background regions at or below
   * `IDENTITY_STENCIL_PINHOLE_MAX_AREA` that `fillPinholes` closed on the
   * finished raster (minor 2). Regions the name itself asked for - counters
   * present before the thickening - are never among them (adversarial review 5,
   * minor 1). `measured.pinholes` is the independent statement that none
   * survived into the encoded bytes.
   */
  readonly pinholesFilled: number;
  /** Jump rings welded on (P1-5): two by default, zero when rings are off. */
  readonly jumpRings: number;
  /**
   * How those rings are attached: `welded` on letter strokes (D-020), `frame`
   * on the construction's own structure (P2-2b), `none` when the caller asked
   * for no rings at all.
   */
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
   * Seats the ring placement search evaluated, summed over both rings.
   *
   * Adversarial review 4, minor 4: the search is O(lift x columns x fillet box)
   * and its lift cap was the whole canvas, so its cost was a bound nobody had
   * measured. `IDENTITY_RING_MAX_LIFT` bounds it now and this reports what it
   * actually spent.
   */
  readonly seatSearchSteps: number;
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

  // The counters of the name as the rasteriser painted it, before any pass of
  // this engine could add or close one (minor 1 of adversarial review 5).
  const enclosedBeforeThickening = enclosedRegionAreas(mask);
  // Minor 5 of adversarial review 6: the same raster's ink, so a small enclosed
  // region of the finished piece can be asked what it was made of and not only
  // whether it came from a counter.
  const inkBeforeThickening = mask.ink.slice();

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

  // P2-2b. The construction the shopper chose is part of the piece, so it is
  // drawn before the rings: the frame or the rails are what the rings hang
  // from. The name plane is kept as it stood here, because that is what "no
  // letter under ring metal" is a statement about - rail metal under a ring is
  // the weld, letter metal under a ring is a swallowed stroke.
  const constructionId = (input.construction ?? "")
    .normalize("NFC")
    .trim()
    .toLowerCase();
  const carrierKind = carrierKindFor(constructionId);
  const namePlane = mask.ink.slice();
  const inkPixelsBeforeCarrier = countInk(namePlane);
  let carrier: IdentityCarrierMeasurement | null = null;
  let carrierTransform: RecentrePlacement | undefined;
  if (carrierKind) {
    const placed = placeNameForCarrier(mask, carrierPadding(carrierKind));
    carrierTransform = placed.transform;
    // The placement resamples the name, so the plane the ring gates measure
    // against is the name where it now stands, not where it was typeset.
    namePlane.set(mask.ink);
    carrier = drawCarrier(
      mask,
      carrierKind,
      placed.nameBox,
      placed.scale,
      inkPixelsBeforeCarrier,
    );
    // The structure may only add metal. `drawBar` never clears a pixel, and
    // this is the measurement that says so rather than the comment that assumes
    // it: the same statement `identity_bridge_moved_ink` makes about the bars.
    let carrierPreserved = 0;
    for (let index = 0; index < namePlane.length; index += 1)
      if (namePlane[index] && mask.ink[index]) carrierPreserved += 1;
    const nameInk = countInk(namePlane);
    if (carrierPreserved !== nameInk)
      throw new IdentitySolverError(
        "identity_carrier_moved_ink",
        `identity_carrier_moved_ink:moved=${nameInk - carrierPreserved},of=${nameInk}`,
      );
  }

  const rings =
    input.rings === false
      ? {
          centres: [] as readonly IdentityRingCentre[],
          placement: "none" as IdentityRingPlacement,
          glyphBox: inkBox(mask),
          glyphPixelsPunchedByRings: 0,
          glyphPixelsUnderRingMetal: 0,
          seatSearchSteps: 0,
        }
      : carrier
        ? addCarrierRings(mask, carrier, namePlane)
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
  // Minor 2: casting pinholes are closed on the finished raster, which is the
  // one place every pass that can make one has already run. Adversarial review
  // 5, minor 1: the raster as the rasteriser painted it says which enclosed
  // regions are the name's own counters, and those are never filled.
  // P2-2b: a construction that carries structure moved the name before the
  // rails were drawn, so the route back to the rasteriser's own raster is the
  // two transforms composed. Passing the recentre alone would look up the wrong
  // pixel and could take a real counter for a casting pinhole and fill it.
  const pinholesFilled = fillPinholes(
    mask,
    enclosedBeforeThickening,
    inkBeforeThickening,
    carrierTransform
      ? {
          scaleX: carrierTransform.scaleX * placement.scaleX,
          scaleY: carrierTransform.scaleY * placement.scaleY,
          offsetX: carrierTransform.offsetX * placement.scaleX + placement.offsetX,
          offsetY: carrierTransform.offsetY * placement.scaleY + placement.offsetY,
        }
      : placement,
  );
  const construction: IdentityConstructionMeasurement = {
    constructionId,
    carrier,
    thickenPasses: IDENTITY_THICKEN_PASSES,
    islandsBeforeBridging,
    bridges: bridged.bridges,
    bridgePixelsAdded: bridged.pixelsAdded,
    inkPixelsBeforeBridging,
    inkPixelsPreserved,
    pinholesFilled,
    jumpRings: rings.centres.length,
    ringPlacement: rings.placement,
    ringCentres: rings.centres,
    glyphBoxBeforeRings: rings.glyphBox,
    glyphPixelsPunchedByRings: rings.glyphPixelsPunchedByRings,
    glyphPixelsUnderRingMetal: rings.glyphPixelsUnderRingMetal,
    seatSearchSteps: rings.seatSearchSteps,
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

  // Minor 2: a pinhole is an enclosed region far below anything a name or a
  // ring asks for. `fillPinholes` closed the ones the thickening pass made
  // before the rings were drawn; this reads the encoded bytes and refuses any
  // that survived, so the floor is a gate and not a hope.
  const pinholes = findMaskHoles(decoded).holes.filter(
    (hole) => hole.size <= IDENTITY_STENCIL_PINHOLE_MAX_AREA,
  ).length;
  if (pinholes > 0)
    throw new IdentitySolverError(
      "identity_stencil_pinhole",
      `identity_stencil_pinhole:count=${pinholes}`,
    );

  const ringHoles = measureRingHoles(decoded, construction);
  if (ringHoles.length !== construction.jumpRings)
    throw new IdentitySolverError(
      "identity_ring_gate_failed",
      `identity_ring_gate_failed:holes=${ringHoles.length},expected=${construction.jumpRings}`,
    );

  // Adversarial review 6, blocker 1. The post is the metal between the letter
  // the ring is welded to and the centre of the ring hole, and until this pass
  // nothing measured it: over the pass-6 matrix it ran to 346 px, a rod welded
  // at one point at the foot of a letter, and on Latin faces the rod reads as a
  // stroke of the name - `Sara` in `classic` came out `iSarai`, upstream of the
  // verifier and of every human eye that would have caught it.
  //
  // The seat search cannot even evaluate a seat outside this cap, so on the
  // welded path this gate is the same kind of statement `identity_ring_punched_ink`
  // is: the search asked before the metal was laid, this asks the finished
  // account afterwards, and a placement that ever stops agreeing with the
  // search says so here rather than on a customer's neck. Both quantities are
  // in pre-recentre pixels, which is the one frame the anchor exists in.
  if (construction.ringCentres.length > 0) {
    const postCap = ringPostCap(construction.glyphBoxBeforeRings);
    const ordered = [...construction.ringCentres].sort(
      (first, second) => first.x - second.x,
    );
    ordered.forEach((ring, index) => {
      const post = ringPostLength(ring);
      if (post > postCap)
        throw new IdentitySolverError(
          "identity_ring_post_too_long",
          `identity_ring_post_too_long:side=${index === 0 ? "left" : "right"},px=${Math.round(post)},max=${postCap}`,
        );
    });
  }

  // Blocker 2 of adversarial review 4, measured on the decoded PNG rather than
  // on the seats the solver believes it chose: two rings a centimetre apart at
  // one corner of the pendant is a piece that rotates to near vertical on a
  // chain, and before this nothing measured ring separation at all. The
  // distance between the two hole centroids is compared with the finished
  // piece's own ink width, so it is a shape statement about the pendant and not
  // a canvas constant.
  const ringSpan =
    ringHoles.length === 2
      ? Math.hypot(
          (ringHoles[0] as MeasuredRingHole).centreX -
            (ringHoles[1] as MeasuredRingHole).centreX,
          (ringHoles[0] as MeasuredRingHole).centreY -
            (ringHoles[1] as MeasuredRingHole).centreY,
        )
      : 0;
  // Adversarial review 5, blocker 1: the line through the two holes is the line
  // the chain makes, so its angle off horizontal is the angle the name reads at
  // on the neck. Span alone cannot see it - two holes far apart can be far
  // apart diagonally - and 110 of the 547 welded cells of pass 5 were over 10
  // degrees, `لي` in `minimal` at 64.7. The placement is what keeps this small;
  // this is the measurement on the encoded bytes that says so.
  let ringTilt = 0;
  // Blocker 2: how much of the piece hangs outboard of the nearer hole on the
  // worse side, over the measured ink width. `عائشة` in classic measured 0.66
  // here with every pass-5 gate green.
  let ringOverhang = 0;
  if (ringHoles.length === 2 && measured.bbox) {
    const inkWidth = measured.bbox[2] - measured.bbox[0] + 1;
    const first = ringHoles[0] as MeasuredRingHole;
    const second = ringHoles[1] as MeasuredRingHole;
    // Minor 6 of adversarial review 6: the overhang is a statement about the
    // name, and the ruler it was taken against was the piece with the ring
    // metal added. A ring at the end of the piece put its own 42 px radius into
    // both the numerator and the denominator, which floored the distribution at
    // a constant 0.041 and made every reading a few points lenient. The ruler
    // is the name's own ink box, taken before any ring was drawn and carried
    // into the frame of the encoded piece by the recentre transform the report
    // states; the numerator is the name's ink outboard of the nearer hole, so a
    // ring that reaches past the end of the name scores zero on that side
    // rather than scoring its own radius.
    const nameLeft =
      construction.glyphBoxBeforeRings[0] * placement.scaleX +
      placement.offsetX;
    const nameInkWidth =
      (construction.glyphBoxBeforeRings[2] -
        construction.glyphBoxBeforeRings[0] +
        1) *
      placement.scaleX;
    const nameRight = nameLeft + nameInkWidth - 1;
    // The one-letter floor is for two rings that had to share a letter. Two
    // rings on a frame share no glyph at all (both carry -1), which would read
    // as one shared carrier and put a framed piece under a floor measured on
    // one-letter names. P2-2b makes the placement part of the question; a frame
    // is held to the general floor, on the same decoded bytes.
    const shared =
      construction.ringPlacement === "welded" &&
      construction.ringCentres.length === 2 &&
      (construction.ringCentres[0] as IdentityRingCentre).glyphIndex ===
        (construction.ringCentres[1] as IdentityRingCentre).glyphIndex;
    const spanFraction = shared
      ? IDENTITY_RING_SHARED_GLYPH_MIN_SPAN_FRACTION
      : IDENTITY_RING_MIN_SPAN_FRACTION;
    const minimumSpan = inkWidth * spanFraction;
    if (ringSpan < minimumSpan)
      throw new IdentitySolverError(
        "identity_ring_span_too_narrow",
        `identity_ring_span_too_narrow:span=${Math.round(ringSpan)},min=${Math.round(minimumSpan)}`,
      );
    ringTilt =
      (Math.atan2(
        Math.abs(first.centreY - second.centreY),
        Math.abs(first.centreX - second.centreX),
      ) *
        180) /
      Math.PI;
    if (ringTilt > IDENTITY_RING_MAX_TILT_DEGREES)
      throw new IdentitySolverError(
        "identity_ring_tilt_too_steep",
        `identity_ring_tilt_too_steep:deg=${ringTilt.toFixed(1)},max=${IDENTITY_RING_MAX_TILT_DEGREES}`,
      );
    const leftOverhang =
      Math.max(0, Math.min(first.centreX, second.centreX) - nameLeft) /
      nameInkWidth;
    const rightOverhang =
      Math.max(0, nameRight - Math.max(first.centreX, second.centreX)) /
      nameInkWidth;
    ringOverhang = Math.max(leftOverhang, rightOverhang);
    if (ringOverhang > IDENTITY_RING_MAX_OVERHANG_FRACTION)
      throw new IdentitySolverError(
        "identity_ring_overhang_too_wide",
        `identity_ring_overhang_too_wide:side=${leftOverhang > rightOverhang ? "left" : "right"},fraction=${ringOverhang.toFixed(3)},max=${IDENTITY_RING_MAX_OVERHANG_FRACTION}`,
      );
  }

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
      // P2-2b: the construction is a shape, so it is a fingerprint input. Two
      // pendants that differ only by construction are two artifacts, and a
      // cached `classical` stencil can never be served for a framed piece.
      constructionId,
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
        ringSpan,
        ringTilt,
        ringOverhang,
        pinholes,
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

/**
 * The area of the enclosed background region each pixel sits in, or 0.
 *
 * On the raster as the rasteriser painted it - before any thickening, bridging
 * or ring - an enclosed region is a counter: the eye of an `e`, the bowl of a
 * `ه`, the loop of a `و`. That is the plane `fillPinholes` needs in order to
 * tell a casting pinhole from a letter, and the area is needed too, because a
 * counter the thickening has all but closed is no longer a counter.
 */
function enclosedRegionAreas(mask: RasterMask): Float64Array {
  const geometry = findMaskHoles(mask);
  const plane = new Float64Array(mask.width * mask.height);
  for (let y = 0; y < mask.height; y += 1)
    for (let x = 0; x < mask.width; x += 1) {
      const region = geometry.regionAt(x, y);
      if (region < 0) continue;
      plane[y * mask.width + x] = geometry.holes[region]?.size ?? 0;
    }
  return plane;
}

/**
 * Closes every enclosed background region of at most
 * `IDENTITY_STENCIL_PINHOLE_MAX_AREA` pixels that the piece's own construction
 * created, and returns how many regions it closed.
 *
 * Adversarial review 4, minor 2: `muhammad-en-classic` and `muhammad-en-kufi`
 * carried one and two pixel enclosed regions among their hole sizes, counted as
 * holes by every ruler and floored by none. At the pendant's scale that is a
 * tenth of a millimetre of void, and it is not something the name asked for.
 *
 * Measured pass by pass, the cause is the ring pass: the same names carry no
 * such region after thickening and after bridging, and one to seven of them
 * once the rings and their fillets are drawn, in the notch where a fillet meets
 * the stroke it welds to. This therefore runs on the finished raster, after the
 * recentre, which is the only point at which every pass that can make a void -
 * thickening, bridging, the rings and the Lanczos resample - has already run.
 * It only ever adds metal, and `identity_stencil_pinhole` on the decoded bytes
 * is the proof that none survived.
 *
 * Adversarial review 5, minor 1: it used to fill *every* enclosed region under
 * the floor, so a counter the recentre downscale had squeezed under the floor
 * was welded solid before the gate could look - thirty `e` in Kufi came out
 * with every counter filled and `passed: true`. A pinhole is a gap the
 * construction made; a counter existed before it. So each small region is
 * traced back through the recentre transform to the raster as the rasteriser
 * painted it: a region that is still most of the counter it came from is left
 * alone, and `identity_stencil_pinhole` then refuses the piece, which is the
 * honest answer - a 16 px counter is a letter that did not cast. A region that
 * retains less than `IDENTITY_STENCIL_COUNTER_REMNANT_FRACTION` of that
 * counter's own scaled area is not a counter any more: the thickening closed
 * the counter and left a sliver, which is precisely a pinhole, and it is filled.
 *
 * Adversarial review 6, minor 5: the source of a region is now a test over
 * every one of its pixels rather than one hit. It is a counter only when
 * *every* pixel maps back inside an enclosed region of the rasteriser's own
 * raster, and the counter it is compared against is the smallest of those. The
 * old rule took the largest counter any single pixel landed in, so a notch of
 * the finished piece that merely clipped the edge of a real counter was judged
 * as that counter and could have refused a good piece. And a region that is not
 * a counter is now named rather than left to fall through: every pixel over
 * pre-thickening ink means a void this engine closed inside solid metal, and a
 * pixel over open canvas means the piece grew around a notch. Both are casting
 * pinholes and both are filled; the difference is that the code says which it
 * saw. Neither classification changed a cell of the corpus.
 */
function fillPinholes(
  mask: RasterMask,
  beforeThickening: Float64Array,
  sourceInk: Uint8Array,
  placement: RecentrePlacement,
): number {
  const geometry = findMaskHoles(mask);
  const small = new Set<number>();
  // Adversarial review 6, minor 5: what a small region was made of before this
  // engine touched the raster, decided by a test over every one of its pixels
  // rather than by whether any one pixel happened to land in a counter.
  //
  // `fromCounter` is every pixel of the region mapping back inside an enclosed
  // region of the raster the rasteriser painted, and `counterArea` the smallest
  // such region it maps into. Before this the rule was the *largest* counter
  // any single pixel hit, so a notch of the finished piece that merely clipped
  // the edge of a real counter was judged as that counter and could refuse a
  // good piece. `allMetal` is every pixel mapping back onto ink: a void this
  // engine's own thickening, bridging or weld closed inside solid metal, which
  // is a casting pinhole by construction. Everything else grew out of open
  // canvas the piece closed around - the fillet meeting the stroke is the usual
  // maker - and is a pinhole too. Only a region that is a counter, and still
  // holds enough of that counter to be one, is left open for
  // `identity_stencil_pinhole` to refuse.
  const fromCounter = new Map<number, boolean>();
  const counterArea = new Map<number, number>();
  const allMetal = new Map<number, boolean>();
  for (let y = 0; y < mask.height; y += 1)
    for (let x = 0; x < mask.width; x += 1) {
      const region = geometry.regionAt(x, y);
      if (region < 0) continue;
      const hole = geometry.holes[region];
      if (!hole || hole.size > IDENTITY_STENCIL_PINHOLE_MAX_AREA) continue;
      if (!small.has(region)) {
        small.add(region);
        fromCounter.set(region, true);
        allMetal.set(region, true);
      }
      const sourceX = Math.round((x - placement.offsetX) / placement.scaleX);
      const sourceY = Math.round((y - placement.offsetY) / placement.scaleY);
      if (
        sourceX < 0 ||
        sourceY < 0 ||
        sourceX >= mask.width ||
        sourceY >= mask.height
      ) {
        // Off the raster the rasteriser painted: nothing is known about this
        // pixel, so the region is neither all counter nor all metal.
        fromCounter.set(region, false);
        allMetal.set(region, false);
        continue;
      }
      const index = sourceY * mask.width + sourceX;
      const area = beforeThickening[index] as number;
      if (area > 0) {
        const seen = counterArea.get(region);
        if (seen === undefined || area < seen) counterArea.set(region, area);
      } else fromCounter.set(region, false);
      if (!sourceInk[index]) allMetal.set(region, false);
    }
  const keepOpen = new Set<number>();
  for (const region of small) {
    if (!(fromCounter.get(region) ?? false)) continue;
    const source = counterArea.get(region) ?? 0;
    if (source <= 0) continue;
    const expected = source * placement.scaleX * placement.scaleY;
    const size = geometry.holes[region]?.size ?? 0;
    if (size >= expected * IDENTITY_STENCIL_COUNTER_REMNANT_FRACTION)
      keepOpen.add(region);
  }
  for (let y = 0; y < mask.height; y += 1)
    for (let x = 0; x < mask.width; x += 1) {
      const region = geometry.regionAt(x, y);
      if (region < 0 || !small.has(region) || keepOpen.has(region)) continue;
      mask.ink[y * mask.width + x] = 1;
    }
  let filled = 0;
  for (const region of small) if (!keepOpen.has(region)) filled += 1;
  return filled;
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

/* -------------------------------------------------------------------------
 * P2-2b. The construction the shopper chose, drawn on the same raster.
 *
 * The stencil is the truth for the whole physical piece, not only for the name.
 * `framed-minimal` is a name inside a rectangular frame with the rings in its
 * two top corners, `diamond-rails` is a name held between two straight rails
 * with the rings at the outer ends of the top one, and both are what the look
 * briefs ask the model for (`lab/compile.mjs:57-84`). Drawing them here means
 * the verifier registers the stencil against the photograph of the pendant the
 * shopper actually chose, and it means the rings hang from structure that is
 * level by construction instead of from whichever letter offered a seat.
 *
 * Everything below uses `drawBar` and `drawDisk`, the same two primitives the
 * bridges and the rings use, so the Python reference can reproduce a frame the
 * same way it reproduces a bridge, and every number comes from `shaping.ts`.
 * ---------------------------------------------------------------------- */

/** Which constructions carry structure, and which structure each one carries. */
const CARRIER_CONSTRUCTIONS: Readonly<Record<string, IdentityCarrierKind>> = {
  "framed-minimal": "frame",
  "diamond-rails": "rails",
};

/**
 * The structure a construction id asks for, or `undefined` for a construction
 * whose piece is the lettering alone.
 *
 * `classical` is the letters and nothing else, and `origami-ribbon` is the same
 * outline with a folded-facet finish: a finish is a surface, not geometry, so
 * the stencil says nothing about it and the verifier claims nothing about it.
 */
function carrierKindFor(
  constructionId: string,
): IdentityCarrierKind | undefined {
  return CARRIER_CONSTRUCTIONS[constructionId];
}

/** How far a carrier ring's centre sits above the rail centreline it grips. */
const CARRIER_RING_LIFT = IDENTITY_RING_OUTER - IDENTITY_RING_WELD_OVERLAP;

/** How far a carrier ring's metal reaches above the rail's outer edge. */
const CARRIER_RING_HEADROOM =
  CARRIER_RING_LIFT + IDENTITY_RING_OUTER - IDENTITY_CARRIER_RAIL_WIDTH / 2;

/** Room the structure needs around the name's ink box, per side, in pixels. */
interface CarrierPadding {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

function carrierPadding(kind: IdentityCarrierKind): CarrierPadding {
  if (kind === "frame") {
    const side = IDENTITY_CARRIER_FRAME_INSET + IDENTITY_CARRIER_RAIL_WIDTH;
    return {
      left: side,
      right: side,
      bottom: side,
      top: side + CARRIER_RING_HEADROOM,
    };
  }
  const rail = IDENTITY_CARRIER_RAIL_GAP + IDENTITY_CARRIER_RAIL_WIDTH;
  const end = IDENTITY_CARRIER_RAIL_OVERHANG + IDENTITY_CARRIER_RAIL_WIDTH / 2;
  return {
    left: end,
    right: end,
    bottom: rail,
    top: rail + CARRIER_RING_HEADROOM,
  };
}

/**
 * Makes room for the structure and puts the name where it will sit inside it.
 *
 * The name was fitted to the canvas before the construction existed, so a frame
 * or a pair of rails has to take its room from somewhere. It is taken from the
 * name, by the same operation `recentre` performs on a piece that overflows its
 * box - crop, Lanczos, threshold - and only when the name is actually too big
 * for its structure; the scale is reported, never assumed. The assembly is then
 * centred on the canvas so the final `recentre` has nothing left to scale.
 */
function placeNameForCarrier(
  mask: RasterMask,
  padding: CarrierPadding,
): {
  nameBox: readonly [number, number, number, number];
  scale: number;
  /**
   * The transform the name's pixels took, in the same form `recentre` reports:
   * a typeset pixel `(x, y)` is now at `(x * scaleX + offsetX, ...)`. The
   * pinhole pass reads the raster as the rasteriser painted it through this and
   * the recentre transform composed, so a letter counter is still recognised as
   * a counter after the name has been moved to make room.
   */
  transform: RecentrePlacement;
} {
  const [minX, minY, maxX, maxY] = inkBox(mask);
  const sourceWidth = maxX - minX + 1;
  const sourceHeight = maxY - minY + 1;
  const scale = Math.min(
    1,
    (IDENTITY_RECENTRE_BOX - padding.left - padding.right) / sourceWidth,
    (IDENTITY_RECENTRE_BOX - padding.top - padding.bottom) / sourceHeight,
  );
  if (scale < IDENTITY_CARRIER_MIN_NAME_SCALE)
    throw new IdentitySolverError(
      "identity_carrier_no_room",
      `identity_carrier_no_room:name=${sourceWidth}x${sourceHeight},scale=${scale.toFixed(3)},min=${IDENTITY_CARRIER_MIN_NAME_SCALE}`,
    );

  let art = new Uint8Array(sourceWidth * sourceHeight);
  for (let y = 0; y < sourceHeight; y += 1)
    for (let x = 0; x < sourceWidth; x += 1)
      art[y * sourceWidth + x] = mask.ink[
        (minY + y) * mask.width + minX + x
      ] as number;
  let width = sourceWidth;
  let height = sourceHeight;
  if (scale < 1) {
    width = Math.max(1, Math.trunc(sourceWidth * scale));
    height = Math.max(1, Math.trunc(sourceHeight * scale));
    const grey = Uint8Array.from(art, (value) => (value ? 255 : 0));
    const resized = lanczosResize(grey, sourceWidth, sourceHeight, width, height);
    art = Uint8Array.from(resized, (value) =>
      value > IDENTITY_RESAMPLE_INK_THRESHOLD ? 1 : 0,
    );
  }

  const left =
    Math.floor((mask.width - (width + padding.left + padding.right)) / 2) +
    padding.left;
  const top =
    Math.floor((mask.height - (height + padding.top + padding.bottom)) / 2) +
    padding.top;
  mask.ink.fill(0);
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1)
      if (art[y * width + x]) mask.ink[(top + y) * mask.width + left + x] = 1;
  const scaleX = width / sourceWidth;
  const scaleY = height / sourceHeight;
  return {
    nameBox: [left, top, left + width - 1, top + height - 1],
    scale: scaleX,
    transform: {
      scaleX,
      scaleY,
      offsetX: left - minX * scaleX,
      offsetY: top - minY * scaleY,
    },
  };
}

/**
 * The points the name is welded to a rail from: the lowest (or highest) ink
 * inside each of `IDENTITY_CARRIER_WELDS_PER_RAIL` windows spaced from one end
 * of the name to the other.
 *
 * Two contact points rather than one is the look brief's own rule - "the word
 * is never held by a single contact point, a name cantilevered from one corner
 * is wrong" - and taking the extreme ink of each window is what makes the weld
 * short and vertical, so it reads as the baseline merging into the bar rather
 * than as a post.
 *
 * The windows are the ends of the name, not halves of it. Halves put both welds
 * on the same stroke whenever one descender is the lowest ink of the whole run:
 * the `y` of `Layla` straddles the midpoint, so each half chose it and the two
 * welds landed one pixel apart - the single contact point the brief refuses,
 * drawn twice.
 */
function carrierWeldPoints(
  mask: RasterMask,
  nameBox: readonly [number, number, number, number],
  edge: "top" | "bottom",
): { x: number; y: number }[] {
  const [nx0, , nx1] = nameBox;
  const span = nx1 - nx0 + 1;
  const count = IDENTITY_CARRIER_WELDS_PER_RAIL;
  const window = Math.max(1, Math.floor(span / (2 * count)));
  const points: { x: number; y: number }[] = [];
  for (let index = 0; index < count; index += 1) {
    const from =
      nx0 +
      (count > 1
        ? Math.round((index * (span - window)) / (count - 1))
        : Math.floor((span - window) / 2));
    const to = Math.min(nx1, from + window - 1);
    let best: { x: number; y: number } | undefined;
    for (let x = from; x <= to; x += 1)
      for (let y = 0; y < mask.height; y += 1) {
        if (!mask.ink[y * mask.width + x]) continue;
        if (!best || (edge === "bottom" ? y > best.y : y < best.y))
          best = { x, y };
      }
    if (best) points.push(best);
  }
  return points;
}

/** The rail the rings are welded to, as a centreline. */
interface CarrierTopRail {
  readonly y: number;
  readonly x0: number;
  readonly x1: number;
  /** How far in from each end the ring centres sit. */
  readonly ringInset: number;
}

/**
 * Draws the structure around the placed name and welds the name into it.
 *
 * Only metal is added: `drawBar` never clears a pixel, and the caller checks
 * that statement against the name plane rather than trusting it.
 */
function drawCarrier(
  mask: RasterMask,
  kind: IdentityCarrierKind,
  nameBox: readonly [number, number, number, number],
  nameScale: number,
  nameInkBefore: number,
): IdentityCarrierMeasurement {
  const nameInkAfter = countInk(mask.ink);
  const [nx0, ny0, nx1, ny1] = nameBox;
  const half = IDENTITY_CARRIER_RAIL_WIDTH / 2;
  const segments: IdentityCarrierSegment[] = [];
  let railPixelsAdded = 0;
  const lay = (
    rail: IdentityCarrierSegment["rail"],
    x0: number,
    y0: number,
    x1: number,
    y1: number,
  ): void => {
    railPixelsAdded += drawBar(
      mask,
      y0,
      x0,
      y1,
      x1,
      IDENTITY_CARRIER_RAIL_WIDTH,
    );
    segments.push({ rail, x0, y0, x1, y1 });
  };

  // Where the name will be welded to its structure, read off the name alone.
  // Taken after the rails were drawn this would find the rail itself - it is
  // the lowest ink in the band by then - and weld the bar to nothing.
  const bottomPoints = carrierWeldPoints(mask, nameBox, "bottom");
  const topPoints =
    kind === "rails" ? carrierWeldPoints(mask, nameBox, "top") : [];

  let topRail: CarrierTopRail;
  let bottomRailY: number;
  if (kind === "frame") {
    const cx0 = nx0 - IDENTITY_CARRIER_FRAME_INSET - half;
    const cx1 = nx1 + IDENTITY_CARRIER_FRAME_INSET + half;
    const cy0 = ny0 - IDENTITY_CARRIER_FRAME_INSET - half;
    const cy1 = ny1 + IDENTITY_CARRIER_FRAME_INSET + half;
    // A corner can never be larger than the frame it belongs to; a short name
    // would otherwise ask for an arc that crosses the opposite rail.
    const radius = Math.min(
      IDENTITY_CARRIER_FRAME_CORNER_RADIUS,
      Math.floor((cx1 - cx0) / 2),
      Math.floor((cy1 - cy0) / 2),
    );
    lay("top", cx0 + radius, cy0, cx1 - radius, cy0);
    lay("bottom", cx0 + radius, cy1, cx1 - radius, cy1);
    lay("left", cx0, cy0 + radius, cx0, cy1 - radius);
    lay("right", cx1, cy0 + radius, cx1, cy1 - radius);
    // Each corner is a quarter turn of capsules laid along the centreline arc,
    // clockwise on a canvas whose y grows downward.
    for (const corner of [
      { x: cx0 + radius, y: cy0 + radius, from: 180 },
      { x: cx1 - radius, y: cy0 + radius, from: 270 },
      { x: cx1 - radius, y: cy1 - radius, from: 0 },
      { x: cx0 + radius, y: cy1 - radius, from: 90 },
    ]) {
      for (let step = 0; step < IDENTITY_CARRIER_CORNER_SEGMENTS; step += 1) {
        const a0 =
          ((corner.from + (90 * step) / IDENTITY_CARRIER_CORNER_SEGMENTS) *
            Math.PI) /
          180;
        const a1 =
          ((corner.from + (90 * (step + 1)) / IDENTITY_CARRIER_CORNER_SEGMENTS) *
            Math.PI) /
          180;
        lay(
          "corner",
          corner.x + radius * Math.cos(a0),
          corner.y + radius * Math.sin(a0),
          corner.x + radius * Math.cos(a1),
          corner.y + radius * Math.sin(a1),
        );
      }
    }
    topRail = {
      y: cy0,
      x0: cx0,
      x1: cx1,
      ringInset: Math.max(IDENTITY_CARRIER_RING_END_INSET, radius),
    };
    bottomRailY = cy1;
  } else {
    const ty = ny0 - IDENTITY_CARRIER_RAIL_GAP - half;
    const by = ny1 + IDENTITY_CARRIER_RAIL_GAP + half;
    const rx0 = nx0 - IDENTITY_CARRIER_RAIL_OVERHANG;
    const rx1 = nx1 + IDENTITY_CARRIER_RAIL_OVERHANG;
    lay("top", rx0, ty, rx1, ty);
    lay("bottom", rx0, by, rx1, by);
    topRail = {
      y: ty,
      x0: rx0,
      x1: rx1,
      ringInset: IDENTITY_CARRIER_RING_END_INSET,
    };
    bottomRailY = by;
  }

  // The welds. A frame is welded at the baseline, which is what the v4.3 look
  // brief asks the model for and what the passing lab stills show; a pair of
  // rails is welded to both, because a name that only touched the top one would
  // be hanging in front of the bottom rail rather than held between them.
  let weldPixelsAdded = 0;
  let welds = 0;
  const weld = (points: { x: number; y: number }[], railY: number): void => {
    for (const point of points) {
      weldPixelsAdded += drawBar(
        mask,
        point.y,
        point.x,
        railY,
        point.x,
        IDENTITY_BRIDGE_WIDTH,
      );
      welds += 1;
    }
  };
  weld(bottomPoints, bottomRailY);
  weld(topPoints, topRail.y);

  // The welds should be enough, and this is what says so: whatever the general
  // connector still has to draw is counted and reported, never silent.
  const joined = bridgeAll(mask, IDENTITY_BRIDGE_WIDTH);

  const outer = inkBox(mask);
  return {
    kind,
    railWidth: IDENTITY_CARRIER_RAIL_WIDTH,
    segments,
    outerBox: outer,
    nameBox,
    nameScale,
    nameInkBefore,
    nameInkAfter,
    welds,
    weldPixelsAdded,
    railPixelsAdded,
    bridges: joined.bridges,
    ringAnchors: [
      { x: Math.round(topRail.x0 + topRail.ringInset), y: Math.round(topRail.y) },
      { x: Math.round(topRail.x1 - topRail.ringInset), y: Math.round(topRail.y) },
    ],
  };
}

/**
 * The two jump rings of a construction that carries its own structure.
 *
 * There is no seat search here and there is nothing to search: the rail is
 * straight, both anchors sit on its centreline, so the line through the two
 * holes is horizontal by construction. That is a reason to measure the tilt on
 * the encoded bytes, not a reason to stop measuring it - the gates in
 * `solveIdentity` run exactly as they do for a welded piece.
 *
 * The plane the ring gates are measured against is the *name*, not the piece:
 * the ring is meant to sit on the rail and swallow rail metal, and the thing
 * that must never happen is a ring hole cut through a letter or ring metal laid
 * over one. `namePlane` is the raster as it stood after bridging and before any
 * rail was drawn, so "zero name pixels punched or under ring metal" means the
 * same thing here as it does under D-020.
 */
function addCarrierRings(
  mask: RasterMask,
  carrier: IdentityCarrierMeasurement,
  namePlane: Uint8Array,
): RingPlacement {
  const centres: IdentityRingCentre[] = carrier.ringAnchors.map((anchor) => ({
    x: anchor.x,
    y: anchor.y - CARRIER_RING_LIFT,
    anchorX: anchor.x,
    anchorY: anchor.y,
    glyphIndex: -1,
    contourIndex: -1,
    candidateIndex: -1,
  }));
  for (const ring of centres) drawRing(mask, ring);

  let glyphPixelsPunchedByRings = 0;
  for (let index = 0; index < namePlane.length; index += 1)
    if (namePlane[index] && !mask.ink[index]) glyphPixelsPunchedByRings += 1;
  let glyphPixelsUnderRingMetal = 0;
  for (const ring of centres)
    glyphPixelsUnderRingMetal += countGlyphPixelsUnderRingMetal(
      mask,
      namePlane,
      ring,
      // Every pixel of the name is foreign to a rail: the weld exemption exists
      // for the stroke a ring is welded to, and no ring here is welded to a
      // stroke, so nothing about the name is excused.
      namePlane,
    );
  return {
    centres,
    placement: "frame",
    glyphBox: carrier.nameBox,
    glyphPixelsPunchedByRings,
    glyphPixelsUnderRingMetal,
    seatSearchSteps: 0,
  };
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
  /** Seats the placement search evaluated, over both rings (minor 4). */
  readonly seatSearchSteps: number;
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
  /** Position in this side's candidate list: 0 is the outermost base glyph. */
  readonly candidateIndex: number;
  readonly glyphIndex: number;
  readonly contourIndex: number;
  readonly contour: StencilContour;
  /** Where the glyph sits on the canvas, so a pair can be ordered on it. */
  readonly glyphX: number;
}

/**
 * The height of the tallest base glyph of the run, in canvas pixels.
 *
 * Adversarial review 4, blocker 2: the height floor for a carrier contour used
 * to be a fraction of the whole run's ink box, marks included, so a madda or a
 * damma raised the floor above the letters it sits on and disqualified them.
 * The reference is the letters themselves now. Zero when the run is all marks,
 * in which case there is no carrier and the piece goes to the bar.
 */
function tallestBaseGlyphHeight(
  outlines: readonly StencilGlyphOutline[],
): number {
  let tallest = 0;
  for (const glyph of outlines) {
    if (glyph.contours.length === 0) continue;
    if (glyph.glyphClass === IDENTITY_GLYPH_CLASS_MARK) continue;
    if (glyph.box.height > tallest) tallest = glyph.box.height;
  }
  return tallest;
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
  tallestBase: number,
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
    tallestBase * IDENTITY_RING_CARRIER_MIN_TALLEST_HEIGHT_FRACTION,
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
  tallestBase: number,
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
    const carrier = carrierContourOf(glyph, tallestBase);
    if (!carrier) continue;
    candidates.push({
      candidateIndex: candidates.length,
      glyphIndex: glyph.index,
      contourIndex: carrier.contourIndex,
      contour: carrier.contour,
      glyphX: glyph.box.x,
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
/**
 * Every pixel of the raster that belongs to some glyph contour, by the same
 * fill-grow-intersect rule `carrierPixelsFor` uses.
 *
 * Subtracting one carrier's plane from this leaves exactly "ink of a contour
 * that is not this carrier", which is what a weld fillet may not cover
 * (blocker 1). Metal that belongs to no contour at all - a bridging bar, the
 * one- or two-pixel skin the thickening pass grows outside every outline - is
 * in neither plane and is not held against the ring: the bar is the solver's
 * own metal and the skin is a rounding difference between two rasterisations of
 * the same outline, and counting either would refuse seats over letters that
 * carry no mark at all. Measured while fixing this: the strictest reading, "any
 * pre-ring ink under the fillet that is not carrier ink", rejected the outer
 * seat of `أسماء` in Kufi and of `أمير` in `minimal` on a single pixel each.
 */
function allContourPixels(
  mask: RasterMask,
  outlines: readonly StencilGlyphOutline[],
): Uint8Array {
  const union = new Uint8Array(mask.width * mask.height);
  for (const glyph of outlines)
    for (const contour of glyph.contours) {
      const filled = fillContour(mask.width, mask.height, contour.points);
      for (let index = 0; index < union.length; index += 1)
        if (filled[index]) union[index] = 1;
    }
  const grown = dilateInk(
    mask.width,
    mask.height,
    union,
    IDENTITY_THICKEN_PASSES,
  );
  return intersect(grown, mask.ink);
}

/** `left` minus `right`, pixel by pixel. */
function subtract(left: Uint8Array, right: Uint8Array): Uint8Array {
  const out = new Uint8Array(left.length);
  for (let index = 0; index < left.length; index += 1)
    out[index] = left[index] && !right[index] ? 1 : 0;
  return out;
}

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
 * The anchor ladder of a carrier stroke, outermost first.
 *
 * Every rung is a column of the contour's load-bearing metal and the topmost
 * pixel of that column: the top of the stroke, seen from above, where a weld
 * fillet can land. The rungs are the outermost columns of the contour's
 * *shoulder* - the top `IDENTITY_RING_ANCHOR_MAX_DEPTH_FRACTION` of the
 * contour's own height - at least `IDENTITY_RING_ANCHOR_SHOULDER_STEP` apart.
 *
 * Adversarial review 6, blocker 1: the ladder used to be six blind steps
 * inward from the outer edge of the stroke, whatever depth they landed at, and
 * the score key charged nothing for the distance a ring then had to stand off
 * to reach the top line. 56% of the anchors it produced were in the bottom half
 * of the lettering and 285 of 1136 in the bottom quarter, and the ring above
 * them stood on a rod up to 346 px long welded at the foot of a letter. The
 * outer edge of a `Z` is the foot of its bottom serif, 620 px below its
 * top-left corner, and no ring belongs there. Cutting the ladder to the
 * shoulder band is what D-020 says in the first place - "at the outer top
 * corner" - and scanning for the band rather than stepping blindly into it is
 * what keeps the rungs *outermost*: on `PlayfairDisplay` the outer edge of an
 * `S` is the middle of its left bowl and the shoulder does not start for
 * another 130 px, so a blind ladder found nothing in the band, fell back to the
 * lab anchor near the middle of the letter, and cantilevered a quarter of the
 * name. `addRings` scores the rungs rather than taking the first that works,
 * because outwardness, level and post length all pull against each other. The
 * lab's own anchor, the topmost row
 * of the contour and on that row the pixel nearest the end of the name
 * (`np.argmin` over the eroded body's rows, computed on one contour's own
 * raster instead of on the merged piece, which is the whole of D-020), is a
 * rung too, placed by its column like the rest.
 *
 * Adversarial review 5, blocker 2: with only the lab anchor, a letter carrying
 * dots directly above it - the ta marbuta of `عائشة` and `موزة`, the final qaf,
 * the shin of `شمس` - has no clean corridor from a ring down to that one point,
 * because the ring is seated a little outward of the anchor and the fillet then
 * runs back under the dots. The search's only move was to walk inward to the
 * next letter, and with both sides doing that the two rings ended up in one
 * corner of the piece with two thirds of it cantilevered. On a bowl like the ta
 * marbuta the outermost column's top is most of a letter-height below the
 * topmost row, and it is out from under the dots: the ring lifts above them and
 * the fillet comes down beside them onto the letter's outer shoulder.
 */
function carrierAnchors(
  mask: RasterMask,
  carrier: Uint8Array,
  eroded: Uint8Array,
  side: "left" | "right",
): { x: number; y: number }[] {
  // Load-bearing first: metal thick enough to hold a chain. A contour whose
  // every stroke is thinner than the erosion window has none, and then the
  // contour itself is the best available answer - it is still a letter stroke.
  let solid = intersect(carrier, eroded);
  if (!solid.some((value) => value === 1)) solid = carrier;
  // The topmost row of load-bearing metal in every column, in one pass. The
  // ladder walk below asks for it up to a canvas width of times and the
  // shoulder band asks for the contour's own extent, so both are answered from
  // this array rather than from a scan each.
  const tops = new Int32Array(mask.width).fill(-1);
  for (let y = mask.height - 1; y >= 0; y -= 1)
    for (let x = 0; x < mask.width; x += 1)
      if (solid[y * mask.width + x]) tops[x] = y;
  const topOf = (x: number): number => tops[x] as number;
  let edge = -1;
  for (let step = 0; step < mask.width; step += 1) {
    const x = side === "left" ? step : mask.width - 1 - step;
    if (topOf(x) >= 0) {
      edge = x;
      break;
    }
  }
  if (edge < 0) return [];
  // Adversarial review 6, blocker 1: the shoulder band of this contour. Every
  // rung deeper than `IDENTITY_RING_ANCHOR_MAX_DEPTH_FRACTION` of the contour's
  // own height is the foot of the letter rather than its shoulder, and a ring
  // welded there either hangs the piece upside down or stands on a rod to reach
  // the top line of the name. The band is measured on this contour alone, so a
  // short letter beside a tall one keeps its own shoulder.
  let contourTop = mask.height;
  let contourBottom = -1;
  for (let index = 0; index < solid.length; index += 1)
    if (solid[index]) {
      const y = Math.trunc(index / mask.width);
      if (y < contourTop) contourTop = y;
      if (y > contourBottom) contourBottom = y;
    }
  if (contourBottom < 0) return [];
  const deepest =
    contourTop +
    Math.round(
      (contourBottom - contourTop + 1) * IDENTITY_RING_ANCHOR_MAX_DEPTH_FRACTION,
    );
  const inward = side === "left" ? 1 : -1;
  const columns = new Set<number>();
  // The outermost `IDENTITY_RING_ANCHOR_SHOULDER_STEPS` columns of the shoulder
  // band, at least `IDENTITY_RING_ANCHOR_SHOULDER_STEP` apart.
  //
  // The walk scans every column of the contour rather than stepping blindly,
  // because on a face like Playfair the outer edge of an `S` is the middle of
  // its left bowl and the shoulder does not begin for another 130 px: a blind
  // six-step ladder found nothing in the band and collapsed onto the lab anchor
  // near the middle of the letter, which is 0.25 of the name's width of
  // overhang. Scanning keeps the rungs *outermost within the band*, which is
  // what D-020 asks for.
  let previous: number | undefined;
  for (let step = 0; step < mask.width; step += 1) {
    if (columns.size >= IDENTITY_RING_ANCHOR_SHOULDER_STEPS) break;
    const x = edge + inward * step;
    if (x < 0 || x >= mask.width) break;
    const top = topOf(x);
    // A column with no load-bearing metal is not a shoulder; the stroke has
    // ended or a counter is in the way, and a column whose metal starts below
    // the shoulder band is a foot rather than a shoulder.
    if (top < 0 || top > deepest) continue;
    if (previous !== undefined &&
        Math.abs(x - previous) < IDENTITY_RING_ANCHOR_SHOULDER_STEP)
      continue;
    columns.add(x);
    previous = x;
  }
  // The lab's anchor: the topmost row of the stroke, outermost pixel on it. It
  // is at depth 0 by construction, so the ladder is never empty.
  for (let y = 0; y < mask.height; y += 1) {
    let found = -1;
    for (let x = 0; x < mask.width; x += 1) {
      if (!solid[y * mask.width + x]) continue;
      if (side === "left") {
        found = x;
        break;
      }
      found = x;
    }
    if (found >= 0) {
      columns.add(found);
      break;
    }
  }
  return [...columns]
    .sort((a, b) => (side === "left" ? a - b : b - a))
    .map((x) => ({ x, y: topOf(x) }));
}

/** A seat ladder the search accepted for one rung of one carrier candidate. */
interface RingSeat {
  readonly ladder: SeatLadder;
  readonly glyphIndex: number;
  readonly contourIndex: number;
  readonly candidateIndex: number;
  readonly glyphX: number;
  /**
   * Ink of every glyph contour except this seat's carrier. A weld fillet that
   * covers any of it is welding a piece of the name into the ring, which is
   * what the seat search refuses and what the post-draw count measures.
   */
  readonly foreignInk: Uint8Array;
}

/**
 * A summed-area table over an ink plane, so "is there any ink in this box" is
 * two subtractions instead of a scan.
 *
 * Adversarial review 5 asks the seat search to try a ladder of anchors and,
 * for every seat it accepts, the whole run of rows above it that stay clean.
 * That is an order of magnitude more probes than the pass-5 search, and the
 * probe itself was a scan of the ring-and-fillet box. Almost every probe of a
 * lifted ring is over empty canvas, and the table answers those in constant
 * time; the exact scan still runs whenever a box is not empty, so the accepted
 * seats are exactly the seats the scan would have accepted.
 */
function summedArea(
  width: number,
  height: number,
  ink: Uint8Array,
): Int32Array {
  const table = new Int32Array((width + 1) * (height + 1));
  for (let y = 0; y < height; y += 1) {
    let row = 0;
    for (let x = 0; x < width; x += 1) {
      row += ink[y * width + x] ? 1 : 0;
      table[(y + 1) * (width + 1) + x + 1] =
        (table[y * (width + 1) + x + 1] as number) + row;
    }
  }
  return table;
}

/** Ink in the inclusive box, clamped to the canvas; 0 when the box is empty. */
function boxSum(
  table: Int32Array,
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): number {
  const left = Math.max(0, Math.floor(x0));
  const top = Math.max(0, Math.floor(y0));
  const right = Math.min(width - 1, Math.ceil(x1));
  const bottom = Math.min(height - 1, Math.ceil(y1));
  if (right < left || bottom < top) return 0;
  const stride = width + 1;
  return (
    (table[(bottom + 1) * stride + right + 1] as number) -
    (table[top * stride + right + 1] as number) -
    (table[(bottom + 1) * stride + left] as number) +
    (table[top * stride + left] as number)
  );
}

/** Every clean seat one carrier offers, and the rows it stays clean through. */
interface SeatLadder {
  readonly x: number;
  readonly anchorX: number;
  readonly anchorY: number;
  /**
   * Ring centre rows that are clean at column `x` with this anchor, lowest
   * first. The first entry is the seat the pass-5 search would have taken; the
   * rest are the room above it, which is what lets two rings be brought to a
   * common row (blocker 1).
   */
  readonly rows: readonly number[];
}

/**
 * Every clean seat above one carrier's anchor ladder, or nothing.
 *
 * Clean means the hole punches no pre-ring ink out and no pre-ring ink lies
 * under the ring metal outside the weld. The search spends, in order, the room
 * above the anchor, the outward room and the inward room, and it prefers the
 * least lift. Fix pass 3 kept the
 * least-bad seat when nothing was clean and let the measured gate refuse the
 * customer's piece; D-020 returns nothing instead and the caller moves to the
 * next carrier.
 *
 * Adversarial review 5, blocker 1: it used to return that first seat and
 * nothing else, so the two sides were chosen independently and the piece could
 * hang 64.7 degrees out of level with every gate green. It returns the column
 * it settled on and every row above the seat that is also clean, so `addRings`
 * can pick the pair of rows that levels the piece. It is called once per rung
 * of the anchor ladder, and only for the rungs `addRings` asks for.
 */
function findSeat(
  mask: RasterMask,
  beforeRings: Uint8Array,
  beforeArea: Int32Array,
  anchor: { x: number; y: number },
  outward: -1 | 1,
  foreignInk: Uint8Array,
  foreignArea: Int32Array,
  nameBox: MaskBoundingBox,
  maxPost: number,
): { ladder: SeatLadder | undefined; steps: number } {
  const outwardStep = Math.trunc(
    IDENTITY_RING_OUTER * IDENTITY_RING_OUTWARD_FRACTION,
  );
  const leftmostRingX = IDENTITY_RING_OUTER + IDENTITY_RING_TOP_CLEARANCE;
  const rightmostRingX =
    mask.width - 1 - IDENTITY_RING_TOP_CLEARANCE - IDENTITY_RING_OUTER;
  const lowest = IDENTITY_RING_OUTER + IDENTITY_RING_TOP_CLEARANCE;
  // A ring pushed off the canvas would have its annulus clipped, so its hole
  // would no longer be enclosed: the legal band is the canvas margin and
  // nothing narrower. The candidates are collected once, outward first and then
  // inward, deduplicated after clamping, so a clamp costs one candidate rather
  // than the whole search (adversarial review 3, finding 7).
  // Adversarial review 6, major 4: the ring used to be sought outward of the
  // anchor and then clamped to the canvas margin, so on a name typeset to the
  // full width of the fit both rings ended against the canvas edge - 450 of 568
  // cells - and the finished piece was 1020 px wide against a 912 px recentre
  // box, which downscaled the lettering to 0.894 for no gain. A ring whose body
  // stays inside the name's own ink box costs the piece no width at all. So the
  // preferred column is the outward seat pulled back to at least
  // `inboard` inside the name's edge on this side.
  //
  // Three things bound how far in it may be pulled, and the smallest wins: the
  // ring's own radius, because past that the ring no longer pokes out and there
  // is nothing left to gain; half the overhang gate's width, so a narrow piece
  // is never pulled into its own middle; and half the post cap, so the sideways
  // offset never eats the room the fillet needs to reach up.
  const nameWidth = nameBox[2] - nameBox[0] + 1;
  const inboard = Math.min(
    IDENTITY_RING_OUTER,
    Math.round((nameWidth * IDENTITY_RING_MAX_OVERHANG_FRACTION) / 2),
    Math.floor(maxPost / 2),
  );
  const outwardSeat = anchor.x + outward * outwardStep;
  const seatX =
    outward === -1
      ? Math.max(outwardSeat, nameBox[0] + inboard)
      : Math.min(outwardSeat, nameBox[2] - inboard);
  const columns: number[] = [];
  const offer = (value: number) => {
    const clamped = Math.min(rightmostRingX, Math.max(leftmostRingX, value));
    // Blocker 1: a column so far to the side of the anchor that the post alone
    // would break the cap is not a seat, whatever is above it.
    if (Math.abs(clamped - anchor.x) >= maxPost) return;
    if (!columns.includes(clamped)) columns.push(clamped);
  };
  for (let shift = 0; shift <= IDENTITY_RING_MAX_OUTWARD_SHIFT; shift += 1)
    offer(seatX + outward * shift);
  for (let shift = 1; shift <= IDENTITY_RING_MAX_INWARD_SHIFT; shift += 1)
    offer(seatX - outward * shift);
  const seatY = Math.max(
    lowest,
    anchor.y - IDENTITY_RING_OUTER + IDENTITY_RING_WELD_OVERLAP,
  );
  // Blocker 1: the room above a column is whatever the post cap leaves once the
  // sideways offset of that column is spent, and never more than the lift cap.
  // `highest` is the best any column can do; `postClear` is the per-column
  // statement, so a seat the search accepts can never carry a rod.
  const roomFor = (x: number): number =>
    Math.floor(
      Math.sqrt(
        Math.max(0, maxPost * maxPost - (x - anchor.x) * (x - anchor.x)),
      ),
    );
  const postClear = (x: number, y: number): boolean =>
    anchor.y - y <= roomFor(x);
  const highest = Math.max(
    lowest,
    seatY - IDENTITY_RING_MAX_LIFT,
    columns.length === 0
      ? seatY
      : anchor.y - Math.max(...columns.map((x) => roomFor(x))),
  );

  // Minor 4: every seat this search evaluates is one step, and the count is
  // reported so the cost of a name is a measured number rather than a bound.
  let steps = 0;
  const clean = (x: number, y: number): boolean => {
    steps += 1;
    const barY0 = y + IDENTITY_RING_INNER + IDENTITY_RING_WELD_START_GAP;
    const barY1 = anchor.y + IDENTITY_RING_WELD_ANCHOR_DEPTH;
    const radius = IDENTITY_RING_WELD_WIDTH / 2;
    const ringClear =
      boxSum(
        beforeArea,
        mask.width,
        mask.height,
        x - IDENTITY_RING_OUTER,
        y - IDENTITY_RING_OUTER,
        x + IDENTITY_RING_OUTER,
        y + IDENTITY_RING_OUTER,
      ) === 0;
    const filletClear =
      boxSum(
        foreignArea,
        mask.width,
        mask.height,
        Math.min(x, anchor.x) - radius,
        Math.min(barY0, barY1) - radius,
        Math.max(x, anchor.x) + radius,
        Math.max(barY0, barY1) + radius,
      ) === 0;
    // The two boxes together cover the punch disk, the annulus and the fillet,
    // so an empty pair is a clean seat without a scan. Anything else is scanned
    // by the same two functions the post-draw gate uses.
    if (ringClear && filletClear) return true;
    if (countDisk(mask, beforeRings, x, y, IDENTITY_RING_INNER) !== 0)
      return false;
    const ring = {
      x,
      y,
      anchorX: anchor.x,
      anchorY: anchor.y,
      glyphIndex: -1,
      contourIndex: -1,
      candidateIndex: -1,
    } satisfies IdentityRingCentre;
    return (
      countGlyphPixelsUnderRingMetal(mask, beforeRings, ring, foreignInk) === 0
    );
  };

  let found: { x: number; y: number } | undefined;
  for (let y = seatY; y >= highest && !found; y -= 1)
    for (const candidateX of columns)
      if (postClear(candidateX, y) && clean(candidateX, y)) {
        found = { x: candidateX, y };
        break;
      }
  if (!found) return { ladder: undefined, steps };
  // The room above the seat. Every row is probed rather than stopping at the
  // first that is not clean: a mark above the stroke blocks a band of rows and
  // leaves clean air above it, and that air is often exactly where the other
  // ring already sits.
  const rows = [found.y];
  for (let y = found.y - 1; y >= highest; y -= 1)
    if (postClear(found.x, y) && clean(found.x, y)) rows.push(y);
  return {
    ladder: { x: found.x, anchorX: anchor.x, anchorY: anchor.y, rows },
    steps,
  };
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
 * The straight metal between a ring's anchor and the centre of its hole: the
 * post the ring stands on, in pixels of the engine canvas.
 *
 * It is the whole of what adversarial review 6 blocker 1 measured. On a piece
 * where the ring sits on the shoulder of a letter it is a weld about the ring's
 * own radius long. On the pass-6 corpus it reached 346 px, a free-standing rod
 * welded at one point at the foot of a letter, and on Latin faces the eye reads
 * that rod as a stroke of the name.
 */
function ringPostLength(ring: {
  readonly x: number;
  readonly y: number;
  readonly anchorX: number;
  readonly anchorY: number;
}): number {
  return Math.hypot(ring.x - ring.anchorX, ring.y - ring.anchorY);
}

/**
 * The longest post this name may carry: a fraction of its own ink height, and
 * never more than the absolute cap. Both bounds are in the same frame as the
 * box they are taken from, so the caller may pass the pre-recentre name box and
 * compare it with a pre-recentre post.
 */
function ringPostCap(nameBox: MaskBoundingBox): number {
  const height = nameBox[3] - nameBox[1] + 1;
  return Math.min(
    IDENTITY_RING_MAX_POST_PX,
    Math.floor(height * IDENTITY_RING_MAX_POST_FRACTION),
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
 * inward. When no pair of carriers can be brought under the level and overhang
 * gates the piece raises `identity_no_ring_seat`: the rail that used to catch
 * this case was not a load path (adversarial review 5, major 3) and a piece
 * that hangs sideways or nose-down off one corner is not a piece the shop can
 * sell either.
 */
function addRings(
  mask: RasterMask,
  outlines: readonly StencilGlyphOutline[],
): RingPlacement {
  const glyphBox = inkBox(mask);
  const tallestBase = tallestBaseGlyphHeight(outlines);
  const beforeRings = mask.ink.slice();
  const beforeArea = summedArea(mask.width, mask.height, beforeRings);
  const eroded = erodeSquare(
    mask.width,
    mask.height,
    mask.ink,
    IDENTITY_RING_ANCHOR_EROSION,
  );

  const allContourInk = allContourPixels(mask, outlines);
  // Adversarial review 6, blocker 1: the longest post this name may hang from,
  // the smaller of a fraction of its own ink height and the absolute cap. Every
  // seat the search evaluates is inside it, and `identity_ring_post_too_long`
  // says so again on the encoded piece.
  const maxPost = ringPostCap(glyphBox);
  let seatSearchSteps = 0;
  // One carrier contour costs a fill, a dilation and a summed-area table, so it
  // is prepared once and shared by every rung of its anchor ladder.
  interface CarrierPlane {
    readonly anchors: readonly { x: number; y: number }[];
    readonly foreignInk: Uint8Array;
    readonly foreignArea: Int32Array;
  }
  const planes = new Map<string, CarrierPlane>();
  const planeFor = (
    side: "left" | "right",
    candidate: CarrierCandidate,
  ): CarrierPlane => {
    const key = `${side}:${candidate.glyphIndex}:${candidate.contourIndex}`;
    const cached = planes.get(key);
    if (cached) return cached;
    const carrierInk = carrierPixelsFor(mask, candidate.contour);
    const foreignInk = subtract(allContourInk, carrierInk);
    const plane: CarrierPlane = {
      anchors: carrierAnchors(mask, carrierInk, eroded, side),
      foreignInk,
      foreignArea: summedArea(mask.width, mask.height, foreignInk),
    };
    planes.set(key, plane);
    return plane;
  };
  // The seats of one rung, computed on demand and remembered. Lazily, because
  // most names are seated by the first rung of the first carrier on each side
  // and the further rungs are only worth their search when that pair is not
  // level or not balanced.
  const seats = new Map<string, RingSeat | undefined>();
  const seatFor = (
    side: "left" | "right",
    candidate: CarrierCandidate,
    rung: number,
  ): RingSeat | undefined => {
    const key = `${side}:${candidate.glyphIndex}:${candidate.contourIndex}:${rung}`;
    if (seats.has(key)) return seats.get(key);
    const plane = planeFor(side, candidate);
    const anchor = plane.anchors[rung];
    let seat: RingSeat | undefined;
    if (anchor) {
      const found = findSeat(
        mask,
        beforeRings,
        beforeArea,
        anchor,
        side === "left" ? -1 : 1,
        plane.foreignInk,
        plane.foreignArea,
        glyphBox,
        maxPost,
      );
      seatSearchSteps += found.steps;
      if (found.ladder)
        seat = {
          ladder: found.ladder,
          glyphIndex: candidate.glyphIndex,
          contourIndex: candidate.contourIndex,
          candidateIndex: candidate.candidateIndex,
          glyphX: candidate.glyphX,
          foreignInk: plane.foreignInk,
        };
    }
    seats.set(key, seat);
    return seat;
  };

  // Blocker 2 of adversarial review 4: the left ring works inward from the
  // leftmost base glyph and the right ring inward from the rightmost, and the
  // two may not settle on the same glyph while any other glyph of the run
  // carries a contour a ring could sit on. Before this the height floor could
  // disqualify every base letter but one, both lists collapsed to that letter
  // and both rings landed on its topmost row 81 to 150 px apart. Sharing is
  // allowed only when the run really has one eligible base glyph - a
  // single-letter name - and the span gate on the decoded PNG is the
  // measurement that catches the collapse whatever the search believed.
  const left = carrierCandidates("left", outlines, tallestBase);
  const right = carrierCandidates("right", outlines, tallestBase);
  const eligible = new Set<number>();
  for (const candidate of [...left, ...right]) eligible.add(candidate.glyphIndex);
  const mayShare = eligible.size <= 1;

  // Blockers 1 and 2 of adversarial review 5. The pass-5 search took the first
  // clean seat on the left, then the first clean seat on the right, and
  // whatever tilt and whatever balance came out of that was what the customer
  // got: 110 of 547 welded cells hung more than 10 degrees off level and
  // `عائشة` in classic put both rings in the right-hand third. The two sides are
  // chosen together now. Every carrier and every rung of its anchor ladder that
  // the ordering rules allow is scored as a pair on the finished shape - how
  // far off level the two holes sit, and how much of the piece hangs outboard
  // of the nearer ring on the worse side - and the best pair wins. The key, in
  // order: a pair that breaks no gate beats one that does, then the most level
  // to the degree, then the shortest post, then the exact angle, then the pair
  // nearest the top line of the name, then the most balanced.
  //
  // Adversarial review 6, blocker 1: the pass-6 key put continuous overhang
  // above everything below it and left the lift last, so a pair that was a
  // fraction of a point better balanced beat a pair whose posts were 300 px
  // shorter, and the suspension became a rod welded at the foot of a letter.
  // Post length is now the thing the search minimises once both gates are
  // satisfied and the piece is level.
  // The row a ring belongs on: the top of the name's own ink. A jump ring is
  // soldered at the top of a pendant, so a seat is judged by how close it comes
  // to that line, not by how little metal it costs. Adversarial review 5 was
  // answered once with "the outermost rung that works", and `Ali` in classic
  // came out with both rings on the bottom serifs of the `A` and the `i` -
  // level, balanced, and upside down on a chain.
  const topLine = glyphBox[1];
  // The post a ring resting on the shoulder of its letter needs: the ring body
  // sunk into the stroke, at the widest sideways offset the inboard clamp
  // allows. A pair at or under it is welded, not stood off, and that is half of
  // what lets the search stop early.
  const shoulderPost = Math.hypot(
    IDENTITY_RING_OUTER,
    IDENTITY_RING_OUTER - IDENTITY_RING_WELD_OVERLAP,
  );
  const scoreOf = (
    leftSeat: RingSeat,
    leftY: number,
    rightSeat: RingSeat,
    rightY: number,
  ): readonly number[] => {
    const dx = Math.abs(rightSeat.ladder.x - leftSeat.ladder.x);
    const tilt = (Math.atan2(Math.abs(rightY - leftY), dx) * 180) / Math.PI;
    // Minor 6 of adversarial review 6: the overhang is a statement about the
    // name, so the ruler is the name's own ink and not the piece with the ring
    // metal added. Including the metal put a constant 42 px in both the
    // numerator and the denominator, which floored the whole distribution at
    // 0.041 and made every measurement a few points lenient. Ink inboard of the
    // ring counts for nothing: a ring that reaches past the end of the name has
    // no overhang on that side, it has clearance.
    const width = glyphBox[2] - glyphBox[0] + 1;
    const overhangPixels = Math.max(
      Math.max(0, leftSeat.ladder.x - glyphBox[0]),
      Math.max(0, glyphBox[2] - rightSeat.ladder.x),
    );
    const overhang = overhangPixels / width;
    // Blocker 1: the longer of the two posts. This is the term the search was
    // missing - continuous overhang always beat a 300 px shorter post, and the
    // lift term at the end of the key never decided anything.
    const post = Math.max(
      ringPostLength({
        x: leftSeat.ladder.x,
        y: leftY,
        anchorX: leftSeat.ladder.anchorX,
        anchorY: leftSeat.ladder.anchorY,
      }),
      ringPostLength({
        x: rightSeat.ladder.x,
        y: rightY,
        anchorX: rightSeat.ladder.anchorX,
        anchorY: rightSeat.ladder.anchorY,
      }),
    );
    return [
      Math.max(0, overhang - IDENTITY_RING_MAX_OVERHANG_FRACTION),
      Math.max(0, tilt - IDENTITY_RING_MAX_TILT_DEGREES),
      Math.max(0, post - maxPost),
      // Whole degrees, then the balance counted in ring radii, then the post,
      // then the exact angle. A tenth of a degree and a fraction of a ring's
      // own width are both below what an eye on a neck can see, and 200 px of
      // rod is not: inside those two resolutions the shorter post wins, and
      // outside them a pair may not buy balance or level with a rod. The
      // resolution of the balance term is the ring's own radius because that is
      // the overhang a ring seated on the end letter cannot avoid.
      Math.floor(tilt),
      Math.floor(overhangPixels / IDENTITY_RING_OUTER),
      post,
      tilt,
      Math.abs(leftY - topLine) + Math.abs(rightY - topLine),
      overhang,
    ];
  };
  const better = (a: readonly number[], b: readonly number[]): boolean => {
    for (let index = 0; index < a.length; index += 1) {
      const first = a[index] as number;
      const second = b[index] as number;
      if (first < second) return true;
      if (first > second) return false;
    }
    return false;
  };
  // The most level rows the two ladders can both reach, and of those the pair
  // nearest the top line of the name. Each ladder is its clean rows lowest
  // first, so this walks the left ladder and takes the nearest right row to
  // each: with the ladders sorted the walk is linear.
  const levelRows = (
    leftRows: readonly number[],
    rightRows: readonly number[],
  ): { leftY: number; rightY: number } => {
    const keyOf = (leftY: number, rightY: number) => [
      Math.abs(leftY - rightY),
      Math.abs(leftY - topLine) + Math.abs(rightY - topLine),
    ];
    let best = { leftY: leftRows[0] as number, rightY: rightRows[0] as number };
    let bestKey = keyOf(best.leftY, best.rightY);
    let cursor = 0;
    for (const leftY of leftRows) {
      // `rightRows` descends, so the first row at or below `leftY` and the one
      // before it bracket the closest match.
      while (
        cursor + 1 < rightRows.length &&
        (rightRows[cursor] as number) > leftY
      )
        cursor += 1;
      for (const index of [cursor - 1, cursor]) {
        const rightY = rightRows[index];
        if (rightY === undefined) continue;
        const key = keyOf(leftY, rightY);
        if (
          (key[0] as number) < (bestKey[0] as number) ||
          ((key[0] as number) === (bestKey[0] as number) &&
            (key[1] as number) < (bestKey[1] as number))
        ) {
          best = { leftY, rightY };
          bestKey = key;
        }
      }
    }
    return best;
  };

  let pair:
    | {
        readonly left: RingSeat;
        readonly right: RingSeat;
        readonly leftY: number;
        readonly rightY: number;
        readonly score: readonly number[];
      }
    | undefined;
  // A pair that satisfies both gates, hangs dead level, holds both rings clear
  // above the name's topmost ink and sits on the outermost letter of each side
  // is as good as this search gets: nothing further in the order can beat it on
  // anything but a tie, and stopping there is what keeps the common name at a
  // few seat searches rather than at seventy-two.
  const settled = () =>
    pair !== undefined &&
    (pair.score[0] as number) === 0 &&
    (pair.score[1] as number) === 0 &&
    (pair.score[2] as number) === 0 &&
    (pair.score[3] as number) === 0 &&
    (pair.score[4] as number) <= 1 &&
    // Blocker 1: and the two rings sit on the letters rather than on posts.
    // Without this term the search stopped at the first level, balanced pair it
    // found and that pair was routinely a pair of rods.
    (pair.score[5] as number) <= shoulderPost &&
    pair.leftY <= topLine &&
    pair.rightY <= topLine &&
    pair.left.candidateIndex === 0 &&
    pair.right.candidateIndex === 0;
  for (const candidate of left) {
    for (let leftRung = 0; leftRung < IDENTITY_RING_ANCHOR_SHOULDER_STEPS; leftRung += 1) {
      const leftSeat = seatFor("left", candidate, leftRung);
      if (!leftSeat) continue;
      for (const other of right) {
        if (!mayShare && other.glyphIndex === leftSeat.glyphIndex) continue;
        // The left ring hangs from a glyph that is actually to the left of the
        // right ring's glyph. Without this the two lists can cross - `آية` in
        // classic seated the left ring on the middle letter and the right ring
        // on the first, 201 px apart on a 670 px piece - and the pendant hangs
        // from one corner exactly as blocker 2 describes.
        if (!mayShare && other.glyphX <= candidate.glyphX) continue;
        for (let rightRung = 0; rightRung < IDENTITY_RING_ANCHOR_SHOULDER_STEPS; rightRung += 1) {
          const rightSeat = seatFor("right", other, rightRung);
          if (!rightSeat) continue;
          // Two rings in the same column is not a pair, whatever it scores.
          if (rightSeat.ladder.x <= leftSeat.ladder.x) continue;
          const rows = levelRows(leftSeat.ladder.rows, rightSeat.ladder.rows);
          // A one-letter name is the only case the rule above lets the two
          // rings share a glyph, and it is exactly the shape
          // `identity_ring_span_too_narrow` refuses. It gets its own floor
          // (adversarial review 5, minor 2): the general floor was justified
          // against multi-letter pieces. The estimate is the finished piece's
          // own ink box before the recentre - the name's box widened by
          // whichever ring reaches past it - so it is the same quantity the
          // post-draw gate measures on the decoded bytes.
          if (leftSeat.glyphIndex === rightSeat.glyphIndex) {
            const pieceMinX = Math.min(
              glyphBox[0],
              leftSeat.ladder.x - IDENTITY_RING_OUTER,
              rightSeat.ladder.x - IDENTITY_RING_OUTER,
            );
            const pieceMaxX = Math.max(
              glyphBox[2],
              leftSeat.ladder.x + IDENTITY_RING_OUTER,
              rightSeat.ladder.x + IDENTITY_RING_OUTER,
            );
            const span = Math.hypot(
              leftSeat.ladder.x - rightSeat.ladder.x,
              rows.leftY - rows.rightY,
            );
            if (
              span <
              (pieceMaxX - pieceMinX + 1) *
                IDENTITY_RING_SHARED_GLYPH_MIN_SPAN_FRACTION
            )
              continue;
          }
          const score = scoreOf(leftSeat, rows.leftY, rightSeat, rows.rightY);
          if (!pair || better(score, pair.score))
            pair = {
              left: leftSeat,
              right: rightSeat,
              leftY: rows.leftY,
              rightY: rows.rightY,
              score,
            };
          if (settled()) break;
        }
        if (settled()) break;
      }
      if (settled()) break;
    }
    if (settled()) break;
  }

  const centres: IdentityRingCentre[] = [];
  const foreigns: Uint8Array[] = [];
  const placement: IdentityRingPlacement = "welded";
  if (!pair)
    throw new IdentitySolverError(
      "identity_no_ring_seat",
      `identity_no_ring_seat:left=${left.length},right=${right.length},steps=${seatSearchSteps}`,
    );
  for (const seat of [
    { seat: pair.left, y: pair.leftY },
    { seat: pair.right, y: pair.rightY },
  ]) {
    const ring: IdentityRingCentre = {
      x: seat.seat.ladder.x,
      y: seat.y,
      anchorX: seat.seat.ladder.anchorX,
      anchorY: seat.seat.ladder.anchorY,
      glyphIndex: seat.seat.glyphIndex,
      contourIndex: seat.seat.contourIndex,
      candidateIndex: seat.seat.candidateIndex,
    };
    drawRing(mask, ring);
    centres.push(ring);
    foreigns.push(seat.seat.foreignInk);
  }

  // Measured, not predicted: the seat search asked what would happen before the
  // hole was cut, while this compares the finished mask against the name as it
  // stood before any ring, so a hole that ate a stroke the search never
  // considered - or a fillet that filled one back in - is counted here.
  let glyphPixelsPunchedByRings = 0;
  for (let index = 0; index < beforeRings.length; index += 1)
    if (beforeRings[index] && !mask.ink[index]) glyphPixelsPunchedByRings += 1;

  let glyphPixelsUnderRingMetal = 0;
  centres.forEach((centre, index) => {
    glyphPixelsUnderRingMetal += countGlyphPixelsUnderRingMetal(
      mask,
      beforeRings,
      centre,
      foreigns[index] as Uint8Array,
    );
  });

  return {
    centres,
    placement,
    glyphBox,
    glyphPixelsPunchedByRings,
    glyphPixelsUnderRingMetal,
    seatSearchSteps,
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
 * The one exemption is the weld, and it is narrower than the weld: a pixel
 * under the fillet capsule is exempt only when it is metal of the carrier
 * contour this ring is being welded to. Ink there is the joint being made. Ink
 * anywhere else under the metal - including ink under the fillet that belongs
 * to some other contour - is a piece of the name the ring absorbed.
 *
 * Adversarial review 4, blocker 1: the exemption used to be the whole capsule,
 * which on a lifted ring is 39 px wide and up to 165 px long, and the seat
 * search uses this same function, so the search did not even avoid running the
 * stem over a mark. Probe `fillet3.mts` attributed the exempted pixels to
 * contours and found 1309 to 1942 GDEF class 3 pixels - the madda of `آية`, the
 * hamza of `أمير`, the damma of `مُحَمَّدٌ` - swallowed whole under a fillet on a
 * piece every gate called clean. The carrier plane is `carrierPixelsFor`: the
 * contour filled on its own, grown by the same thickening the piece got, and
 * intersected with the painted mask, so a mark that merely touches the carrier
 * after dilation is exempt exactly where the two overlap and counted
 * everywhere else.
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
  foreignInk: Uint8Array,
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
      // Under the fillet only ink of another contour counts: that is the
      // difference between welding the ring to the stroke it was seated on and
      // swallowing a mark that happened to lie in the way.
      if (underFillet && !foreignInk[y * mask.width + x]) continue;
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
