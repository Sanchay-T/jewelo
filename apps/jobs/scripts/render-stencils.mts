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
  IDENTITY_RING_BAR_DEPTH,
  IDENTITY_RING_BAR_WIDTH,
  IDENTITY_RING_HOLE_MIN_AREA_FRACTION,
  IDENTITY_RING_INNER,
  IDENTITY_RING_OUTER,
  IDENTITY_RING_WELD_ANCHOR_DEPTH,
  IDENTITY_RING_WELD_START_GAP,
  IDENTITY_RING_WELD_WIDTH,
  IDENTITY_THICKEN_PASSES,
  identityFontUrl,
  identityStencilSvg,
  LIVE_IDENTITY_STYLES,
  measureMask,
  shapeText,
  type IdentityScript,
  type IdentityValidationReport,
  type MaskHoleGeometry,
  type StencilGlyphOutline,
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

/**
 * The stress list adversarial review 3 named, in both scripts.
 *
 * Every one of them is a name whose spelling lives in a mark: the tittle of an
 * i or a j in Latin, a nuqta, a hamza or a madda in Arabic, and in several of
 * them the mark is the topmost ink at one end of the piece, which is exactly
 * where a jump ring wants to sit. They are in the permanent matrix so a later
 * change to the anchor rule has to answer for them without anyone remembering
 * to run a scratch script.
 */
const STRESS_NAMES: readonly {
  readonly label: string;
  readonly text: Record<IdentityScript, string>;
}[] = [
  { label: "ali", text: { en: "Ali", ar: "علي" } },
  { label: "amir", text: { en: "Amir", ar: "أمير" } },
  { label: "niki", text: { en: "Niki", ar: "نيكي" } },
  { label: "titi", text: { en: "Titi", ar: "تيتي" } },
  { label: "jiji", text: { en: "Jiji", ar: "جيجي" } },
  { label: "li", text: { en: "Li", ar: "لي" } },
  { label: "ij", text: { en: "Ij", ar: "إيج" } },
  { label: "maji", text: { en: "Maji", ar: "ماجي" } },
  { label: "nunu", text: { en: "Nunu", ar: "نن" } },
  { label: "qq", text: { en: "Qq", ar: "قق" } },
  { label: "yazan", text: { en: "Yazan", ar: "يزن" } },
  { label: "bayan", text: { en: "Bayan", ar: "بيان" } },
  { label: "taim", text: { en: "Taim", ar: "تيم" } },
  { label: "thikra", text: { en: "Thikra", ar: "ذكرى" } },
  { label: "ghaith", text: { en: "Ghaith", ar: "غيث" } },
  { label: "shams", text: { en: "Shams", ar: "شمس" } },
  {
    label: "yaseen",
    text: { en: "Yaseen", ar: "ياسين" },
  },
  { label: "iman", text: { en: "Iman", ar: "إيمان" } },
];

/**
 * The D-020 additions to the permanent matrix.
 *
 * `zoe` is the package review's regression row: the diaeresis needs 123 px of
 * lift and the old cap stopped at 110, so all six styles refused the name.
 * `bartholomewsonlongest` is the long-name end of the fit. The rest are common
 * Gulf given names in both scripts, added so the carrier rule is measured on
 * the names a shop in Dubai actually types rather than only on the marks the
 * adversarial reviews went looking for.
 */
const D020_NAMES: readonly {
  readonly label: string;
  readonly text: Record<IdentityScript, string>;
}[] = [
  { label: "zoe", text: { en: "Zo\u00eb", ar: "\u0632\u0648\u064a" } },
  {
    label: "bartholomewsonlongest",
    text: {
      en: "Bartholomewsonlongest",
      ar: "\u0628\u0627\u0631\u062b\u0648\u0644\u0648\u0645\u064a\u0648",
    },
  },
  {
    label: "fatima",
    text: { en: "Fatima", ar: "\u0641\u0627\u0637\u0645\u0629" },
  },
  { label: "mariam", text: { en: "Mariam", ar: "\u0645\u0631\u064a\u0645" } },
  { label: "salem", text: { en: "Salem", ar: "\u0633\u0627\u0644\u0645" } },
  { label: "rashid", text: { en: "Rashid", ar: "\u0631\u0627\u0634\u062f" } },
  {
    label: "hamdan",
    text: { en: "Hamdan", ar: "\u062d\u0645\u062f\u0627\u0646" },
  },
  { label: "shaikha", text: { en: "Shaikha", ar: "\u0634\u064a\u062e\u0629" } },
  { label: "moza", text: { en: "Moza", ar: "\u0645\u0648\u0632\u0629" } },
  { label: "saeed", text: { en: "Saeed", ar: "\u0633\u0639\u064a\u062f" } },
  {
    label: "latifa",
    text: { en: "Latifa", ar: "\u0644\u0637\u064a\u0641\u0629" },
  },
  { label: "jassim", text: { en: "Jassim", ar: "\u062c\u0627\u0633\u0645" } },
];

/**
 * The 17 ZIP names, the four lab names, the 18 stress names and the 12 D-020
 * names, deduplicated by label.
 */
const MATRIX_NAMES = [
  ...ZIP_NAMES,
  ...[...NAMES, ...STRESS_NAMES, ...D020_NAMES].filter(
    (candidate, index, all) =>
      !ZIP_NAMES.some((zip) => zip.label === candidate.label) &&
      all.findIndex((other) => other.label === candidate.label) === index,
  ),
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
  readonly recentreScaleY: number;
  readonly recentreOffsetX: number;
  readonly recentreOffsetY: number;
  /** P1-5: rings the solver welded on, and where it says it put them. */
  readonly jumpRings: number;
  /** D-020: `welded` on letter strokes, `bar` on the fallback rail, `none`. */
  readonly ringPlacement: string;
  /** D-020: the carrier the solver chose per ring, `glyph:contour`. */
  readonly ringCarriers: readonly string[];
  /** The smallest hole area this cell's rings may have, after the downscale. */
  readonly ringHoleFloor: number;
  /**
   * Pre-ring ink the ring holes punched out, and pre-ring ink the ring metal
   * swallowed outside the weld, both measured from the written PNG and a
   * second rings-off PNG of the same name (adversarial review 3, finding 5).
   * These are the gated numbers.
   */
  readonly measuredPunchedByRings: number;
  readonly measuredWeldedIntoRingMetal: number;
  /** The same two numbers as the engine reports them, printed beside. */
  readonly claimedPunchedByRings: number;
  readonly claimedWeldedIntoRingMetal: number;
  /** The pre-ring glyph box top, mapped into final image coordinates. */
  readonly glyphTop: number;
  /** The measured hole at each predicted ring centre. */
  readonly ringHoles: readonly RingHole[];
  /** Every enclosed hole whose centroid sits above the glyph box top. */
  readonly holesAboveGlyphTop: number;
  /** Blocker 1: pre-ring ink under a fillet owned by some other contour. */
  readonly foreignUnderFillet: number;
  /** Blocker 2: ring hole separation, in pixels and against the ink width. */
  readonly ringSpan: number;
  readonly ringSpanRatio: number;
  /** Minor 2: enclosed regions of a few pixels left in the written PNG. */
  readonly pinholes: number;
  /** Minor 4: seats the placement search evaluated for this cell. */
  readonly seatSearchSteps: number;
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
  /** The lowest row of the measured hole, or -1 when no hole was found. */
  readonly holeBottom: number;
}

/**
 * The smallest area a ring hole may measure on this cell, in pixels.
 *
 * The ideal hole is `pi * IDENTITY_RING_INNER^2` before the recentre downscale
 * and that area times the two applied scales after it.
 * `IDENTITY_RING_HOLE_MIN_AREA_FRACTION` is the engine's own floor; the script
 * recomputes it from the transform the manifest claims rather than reading a
 * verdict, so a hole the weld fillet crept back into fails here as well as in
 * the engine.
 */
function ringHoleFloor(construction: {
  readonly recentreScale: number;
  readonly recentreScaleY: number;
}): number {
  return (
    Math.PI *
    IDENTITY_RING_INNER *
    IDENTITY_RING_INNER *
    construction.recentreScale *
    construction.recentreScaleY *
    IDENTITY_RING_HOLE_MIN_AREA_FRACTION
  );
}

/** Maps a pre-recentre point through the transform `recentre` applied. */
const mapForward = (value: number, scale: number, offset: number): number =>
  value * scale + offset;

interface RingMeasurement {
  readonly glyphTop: number;
  readonly ringHoles: readonly RingHole[];
  readonly holesAboveGlyphTop: number;
}

/**
 * The pre-ring name, read back out of a second PNG.
 *
 * Adversarial review 3, findings 5 and 6: this script used to read `welded` and
 * `punched` off `rendered.construction`, which is the engine restating a number
 * the solver had already thrown on, so the assertion could never fail. The
 * independent version needs the name as it stood before any ring, and the only
 * honest source for that is a second file: the same name rendered again through
 * the public API with the construction in the ring-free set. Both PNGs carry
 * their own `recentre` transform, so the two are compared in pre-recentre
 * coordinates, where the ring centres the engine claims are also expressed.
 *
 * `preInk(px, py)` answers "was there ink here before any ring", by mapping the
 * pre-recentre point forward through the *rings-off* transform and reading that
 * pixel of the rings-off decode. Nothing in it comes from the engine's
 * in-memory mask.
 */
interface PreRingMask {
  readonly width: number;
  readonly height: number;
  readonly at: (x: number, y: number) => boolean;
}

async function renderPreRingMask(
  text: string,
  script: IdentityScript,
  style: string,
  fingerprint: string,
): Promise<PreRingMask> {
  const off = await renderIdentityAnchor(
    { approvedText: text, language: script, typography: style, fingerprint },
    {
      arabicStyle: style,
      lettering: style,
      construction: RINGLESS_CONSTRUCTION,
      layout: "single-name",
      connector: "none",
      names: [{ approvedArabicText: script === "ar" ? text : null }],
      dimensions: { widthMm: 32, heightMm: 12, thicknessMm: 1.2 },
    },
    "caleums-final-media-v2",
    new Set([RINGLESS_CONSTRUCTION]),
  );
  const decoded = await decodeMask(off.png);
  const { recentreScale, recentreScaleY, recentreOffsetX, recentreOffsetY } =
    off.construction;
  return {
    width: decoded.width,
    height: decoded.height,
    at: (x, y) => {
      const fx = Math.round(mapForward(x, recentreScale, recentreOffsetX));
      const fy = Math.round(mapForward(y, recentreScaleY, recentreOffsetY));
      if (fx < 0 || fy < 0 || fx >= decoded.width || fy >= decoded.height)
        return false;
      return decoded.ink[fy * decoded.width + fx] !== 0;
    },
  };
}

/** Whether `(x, y)` lies inside the capsule of `radius` around a segment. */
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
  return (y - (y0 + t * dy)) ** 2 + (x - (x0 + t * dx)) ** 2 <= radius * radius;
}

/**
 * Whether `(x, y)` is inside a closed polygon, by the even-odd crossing rule.
 *
 * This is how a pre-ring ink pixel is attributed to a glyph contour here, and
 * it deliberately shares no code with the engine: the engine fills the contour
 * with a scanline pass, grows it by the thickening passes and intersects it
 * with the painted mask, while this asks the flattened outline directly whether
 * the pixel centre is inside it. A pixel inside no contour at all (metal a
 * bridging bar added, or the one- or two-pixel skin the thickening pass grew
 * outside every outline) is attributed to nobody and is not counted against the
 * ring, which makes this the weaker of the two rules and therefore a check the
 * engine cannot pass by agreeing with itself.
 */
/**
 * How far apart the two measured ring holes sit, as a fraction of the finished
 * piece's measured ink width (blocker 2). Both numbers come off the decoded
 * PNG, so this is the pendant's own proportion and not a canvas constant.
 */
/**
 * Enclosed regions of at most this many pixels are casting pinholes, not holes
 * anyone asked for. The engine closes them before the rings and gates the
 * encoded bytes on none surviving; this is the independent count of the same
 * thing off this script's own decode (minor 2). The floor is written out here
 * rather than imported, for the same reason the ring geometry is.
 */
const PINHOLE_MAX_AREA = 16;

function countPinholes(decoded: {
  width: number;
  height: number;
  ink: Uint8Array;
}): number {
  return findMaskHoles(decoded).holes.filter(
    (hole) => hole.size <= PINHOLE_MAX_AREA,
  ).length;
}

function ringSpanRatioOf(
  ringHoles: readonly RingHole[],
  bbox: readonly number[] | null,
): { span: number; ratio: number } {
  const [first, second] = ringHoles;
  if (!first || !second || !first.found || !second.found || !bbox)
    return { span: 0, ratio: 0 };
  const span = Math.hypot(
    first.centreX - second.centreX,
    first.centreY - second.centreY,
  );
  const width = (bbox[2] as number) - (bbox[0] as number) + 1;
  return { span, ratio: width > 0 ? span / width : 0 };
}

function inPolygon(x: number, y: number, points: readonly number[]): boolean {
  let inside = false;
  const count = points.length / 2;
  let previous = count - 1;
  for (let index = 0; index < count; index += 1) {
    const xi = points[2 * index] as number;
    const yi = points[2 * index + 1] as number;
    const xj = points[2 * previous] as number;
    const yj = points[2 * previous + 1] as number;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      inside = !inside;
    previous = index;
  }
  return inside;
}

/**
 * Pre-ring ink under the ring metal, and pre-ring ink inside the ring holes,
 * measured from two decoded PNGs, the glyph outlines this script shapes for
 * itself, and the ring geometry the manifest claims.
 *
 * The geometry is written out again here rather than imported from the solver,
 * because the point of this measurement is to disagree with the solver when the
 * solver is wrong: annulus plus weld fillet is metal, the hole is a punch, and
 * the *only* ink the weld excuses is ink of the very contour the manifest says
 * the ring was welded to.
 *
 * Adversarial review 4, blocker 1: this script used to exempt the whole fillet
 * capsule, which is exactly what the engine did, so `MATRIX WELDED-GLYPH 0/576`
 * was two copies of one blind spot rather than two measurements. The exemption
 * is re-derived here from the rings-off render plus the carrier contour the
 * report names, by point-in-polygon on outlines this script shaped itself;
 * nothing about it is imported from the engine.
 */
function measureRingMetal(
  pre: PreRingMask,
  centres: readonly {
    readonly x: number;
    readonly y: number;
    readonly anchorX: number;
    readonly anchorY: number;
    readonly glyphIndex: number;
    readonly contourIndex: number;
  }[],
  glyphs: readonly StencilGlyphOutline[],
  glyphBoxBeforeRings: readonly [number, number, number, number],
): { welded: number; punched: number; foreignUnderFillet: number } {
  // A bar ring hangs from the rail, not from a letter, so the ink its fillet is
  // allowed to cover is the ink the rail already grips. The rail is re-derived
  // here from the pre-ring glyph box the report states and the published bar
  // constants, not read back from the solver.
  const [barMinX, barMinY, barMaxX] = glyphBoxBeforeRings;
  const barLine = barMinY + IDENTITY_RING_BAR_DEPTH;
  const onRail = (x: number, y: number) =>
    insideCapsule(
      x,
      y,
      barMinX,
      barLine,
      barMaxX,
      barLine,
      IDENTITY_RING_BAR_WIDTH / 2,
    );
  let welded = 0;
  let punched = 0;
  let foreignUnderFillet = 0;
  const radius = IDENTITY_RING_WELD_WIDTH / 2;
  for (const centre of centres) {
    const barY0 = centre.y + IDENTITY_RING_INNER + IDENTITY_RING_WELD_START_GAP;
    const barY1 = centre.anchorY + IDENTITY_RING_WELD_ANCHOR_DEPTH;
    const yMin = Math.max(
      0,
      Math.trunc(
        Math.min(centre.y - IDENTITY_RING_OUTER, barY0, barY1) - radius,
      ),
    );
    const yMax = Math.min(
      pre.height - 1,
      Math.ceil(
        Math.max(centre.y + IDENTITY_RING_OUTER, barY0, barY1) + radius,
      ),
    );
    const xMin = Math.max(
      0,
      Math.trunc(
        Math.min(centre.x - IDENTITY_RING_OUTER, centre.anchorX) - radius,
      ),
    );
    const xMax = Math.min(
      pre.width - 1,
      Math.ceil(
        Math.max(centre.x + IDENTITY_RING_OUTER, centre.anchorX) + radius,
      ),
    );
    for (let y = yMin; y <= yMax; y += 1)
      for (let x = xMin; x <= xMax; x += 1) {
        if (!pre.at(x, y)) continue;
        const radial = (x - centre.x) ** 2 + (y - centre.y) ** 2;
        if (radial <= IDENTITY_RING_INNER ** 2) {
          punched += 1;
          continue;
        }
        const underFillet = insideCapsule(
          x,
          y,
          centre.x,
          barY0,
          centre.anchorX,
          barY1,
          radius,
        );
        if (underFillet) {
          if (centre.glyphIndex < 0 && onRail(x, y)) continue;
          // Whose ink is it? Every contour of every glyph is asked, and the
          // weld only excuses the carrier the report named.
          //
          // The carrier wins wherever the two overlap, and it wins out to the
          // distance the thickening pass grows it: Arabic letters join, so two
          // adjacent glyph outlines share the joining stroke, and a letter's
          // own counter is a contour nested inside its body. Counting either of
          // those as "another contour" would call the weld itself a swallowed
          // mark. `IDENTITY_THICKEN_PASSES` is the published growth and is
          // applied here as nine samples on a square of that radius rather than
          // by importing the engine's dilation.
          const carrier = glyphs
            .find((glyph) => glyph.index === centre.glyphIndex)
            ?.contours[centre.contourIndex];
          let onCarrier = false;
          if (carrier)
            for (
              let dx = -IDENTITY_THICKEN_PASSES;
              dx <= IDENTITY_THICKEN_PASSES;
              dx += 1
            )
              for (
                let dy = -IDENTITY_THICKEN_PASSES;
                dy <= IDENTITY_THICKEN_PASSES;
                dy += 1
              )
                if (inPolygon(x + 0.5 + dx, y + 0.5 + dy, carrier.points))
                  onCarrier = true;
          if (onCarrier) continue;
          let foreign = false;
          for (const glyph of glyphs)
            for (
              let contour = 0;
              contour < glyph.contours.length;
              contour += 1
            ) {
              if (
                glyph.index === centre.glyphIndex &&
                contour === centre.contourIndex
              )
                continue;
              const outline = glyph.contours[contour];
              if (!outline) continue;
              if (inPolygon(x + 0.5, y + 0.5, outline.points)) foreign = true;
            }
          if (foreign) {
            foreignUnderFillet += 1;
            welded += 1;
          }
          continue;
        }
        if (radial <= IDENTITY_RING_OUTER ** 2) welded += 1;
      }
  }
  return { welded, punched, foreignUnderFillet };
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
    readonly recentreScaleY: number;
    readonly recentreOffsetX: number;
    readonly recentreOffsetY: number;
  },
): RingMeasurement {
  const geometry: MaskHoleGeometry = findMaskHoles(decoded);
  const glyphTop = mapForward(
    construction.glyphBoxBeforeRings[1],
    construction.recentreScaleY,
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
        construction.recentreScaleY,
        construction.recentreOffsetY,
      ),
    );
    const index = geometry.regionAt(x, y);
    const hole = index >= 0 ? geometry.holes[index] : undefined;
    // The lowest row of the measured hole, found by walking the decoded image
    // outward from the point that landed in it. Adversarial review 3, finding
    // 5: `aboveAnchor` used to be arithmetic on two numbers the engine claimed
    // (`centre.y + INNER <= anchorY`), which restates the engine's intention
    // and cannot catch a hole that came out somewhere else. It is now the
    // measured extent of the hole in the written bytes against the anchor the
    // manifest claims, mapped through the claimed transform.
    let holeBottom = -1;
    if (hole !== undefined) {
      const reach =
        Math.ceil(
          IDENTITY_RING_OUTER *
            Math.max(construction.recentreScale, construction.recentreScaleY),
        ) + 4;
      for (let dy = -reach; dy <= reach; dy += 1)
        for (let dx = -reach; dx <= reach; dx += 1)
          if (
            geometry.regionAt(x + dx, y + dy) === index &&
            y + dy > holeBottom
          )
            holeBottom = y + dy;
    }
    const anchorY = mapForward(
      centre.anchorY,
      construction.recentreScaleY,
      construction.recentreOffsetY,
    );
    return {
      found: hole !== undefined,
      size: hole ? hole.size : 0,
      centreX: hole ? hole.centreX : x,
      centreY: hole ? hole.centreY : y,
      holeBottom,
      aboveGlyphTop: hole ? hole.centreY < glyphTop : false,
      aboveAnchor:
        hole !== undefined && holeBottom >= 0 && holeBottom < anchorY,
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
      // The independent welded and punched counts: the same name rendered
      // again with no rings, decoded, and compared with the ring geometry the
      // engine claims. Two files and a claim, not a number the engine restates.
      const metal = ringsOff
        ? { welded: 0, punched: 0, foreignUnderFillet: 0 }
        : measureRingMetal(
            await renderPreRingMask(
              text,
              script,
              lettering,
              `p1-3-off-${name.label}-${script}-${lettering}`,
            ),
            rendered.construction.ringCentres,
            layout.glyphs,
            rendered.construction.glyphBoxBeforeRings,
          );

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
        recentreScaleY: rendered.construction.recentreScaleY,
        recentreOffsetX: rendered.construction.recentreOffsetX,
        recentreOffsetY: rendered.construction.recentreOffsetY,
        jumpRings: rendered.construction.jumpRings,
        ringPlacement: rendered.construction.ringPlacement,
        ringCarriers: rendered.construction.ringCentres.map(
          (centre) =>
            `${centre.glyphIndex}:${centre.contourIndex}@${centre.candidateIndex}`,
        ),
        ringHoleFloor: ringHoleFloor(rendered.construction),
        measuredPunchedByRings: metal.punched,
        measuredWeldedIntoRingMetal: metal.welded,
        claimedPunchedByRings: rendered.construction.glyphPixelsPunchedByRings,
        claimedWeldedIntoRingMetal:
          rendered.construction.glyphPixelsUnderRingMetal,
        glyphTop: ring.glyphTop,
        ringHoles: ring.ringHoles,
        holesAboveGlyphTop: ring.holesAboveGlyphTop,
        foreignUnderFillet: metal.foreignUnderFillet,
        ringSpan: ringSpanRatioOf(ring.ringHoles, measured.bbox).span,
        ringSpanRatio: ringSpanRatioOf(ring.ringHoles, measured.bbox).ratio,
        pinholes: countPinholes(decoded),
        seatSearchSteps: rendered.construction.seatSearchSteps,
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
console.log(
  "fillet. Both come from this script's own decode of two PNGs - the stencil",
);
console.log(
  "and the same name rendered again with no rings - against the ring geometry",
);
console.log(
  "the engine claims, never from the engine's counters. Both must be 0.",
);
console.log(
  "file".padEnd(26) +
    "rings".padStart(6) +
    "place".padStart(7) +
    "carrier".padStart(12) +
    "holes".padStart(6) +
    "aboveTop".padStart(9) +
    "glyphTop".padStart(9) +
    "inHole".padStart(7) +
    "welded".padStart(7) +
    "  floor".padStart(8) +
    "  ring holes (size @ x,y, above?)",
);
for (const row of rows)
  console.log(
    row.file.padEnd(26) +
      String(row.jumpRings).padStart(6) +
      row.ringPlacement.padStart(7) +
      row.ringCarriers.join(",").padStart(12) +
      String(row.holes).padStart(6) +
      String(row.holesAboveGlyphTop).padStart(9) +
      row.glyphTop.toFixed(1).padStart(9) +
      String(row.measuredPunchedByRings).padStart(7) +
      String(row.measuredWeldedIntoRingMetal).padStart(7) +
      String(Math.round(row.ringHoleFloor)).padStart(8) +
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
  if (row.measuredPunchedByRings !== 0) {
    console.log(
      `GATE FAILED: ${row.file} punched ${row.measuredPunchedByRings} ink pixels of the name out with a ring hole`,
    );
    process.exitCode = 1;
  }
  if (row.measuredWeldedIntoRingMetal !== 0) {
    console.log(
      `GATE FAILED: ${row.file} welded ${row.measuredWeldedIntoRingMetal} ink pixels of the name into the ring metal`,
    );
    process.exitCode = 1;
  }
  if (row.foreignUnderFillet !== 0) {
    console.log(
      `GATE FAILED: ${row.file} has ${row.foreignUnderFillet} pre-ring ink pixels of another contour under a weld fillet`,
    );
    process.exitCode = 1;
  }
  if (row.pinholes !== 0) {
    console.log(
      `GATE FAILED: ${row.file} carries ${row.pinholes} enclosed regions of ${PINHOLE_MAX_AREA} px or less`,
    );
    process.exitCode = 1;
  }
  const small = row.ringHoles.filter((hole) => hole.size < row.ringHoleFloor);
  if (small.length > 0) {
    console.log(
      `GATE FAILED: ${row.file} has a ring hole of ${small.map((hole) => hole.size).join(", ")} px against a floor of ${Math.round(row.ringHoleFloor)}`,
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
  `WELDED-GLYPH ${rows.filter((row) => row.measuredWeldedIntoRingMetal > 0).length}/${rows.length} lab cells have ink welded into ring metal`,
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
        measuredPunchedByRings: row.measuredPunchedByRings,
        measuredWeldedIntoRingMetal: row.measuredWeldedIntoRingMetal,
        foreignUnderFillet: row.foreignUnderFillet,
        ringSpan: Number(row.ringSpan.toFixed(1)),
        ringSpanRatio: Number(row.ringSpanRatio.toFixed(3)),
        pinholes: row.pinholes,
        claimedPunchedByRings: row.claimedPunchedByRings,
        claimedWeldedIntoRingMetal: row.claimedWeldedIntoRingMetal,
        ringHoleBottoms: row.ringHoles.map((hole) => hole.holeBottom),
      },
      construction: {
        componentsBefore: row.componentsBefore,
        islandsBeforeBridging: row.islandsBeforeBridging,
        bridges: row.bridges,
        bridgePixelsAdded: row.bridgePixelsAdded,
        inkPixelsBeforeBridging: row.inkPixelsBeforeBridging,
        inkPixelsPreserved: row.inkPixelsPreserved,
        recentreScale: row.recentreScale,
        recentreScaleY: row.recentreScaleY,
        recentreOffsetX: row.recentreOffsetX,
        recentreOffsetY: row.recentreOffsetY,
        ringPlacement: row.ringPlacement,
        ringCarriers: row.ringCarriers,
        seatSearchSteps: row.seatSearchSteps,
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
  /** D-020: `welded`, `bar` or `none`. Every `bar` cell is named in the log. */
  readonly ringPlacement: string;
  /** D-020: `glyphIndex:contourIndex` of the carrier each ring was seated on. */
  readonly ringCarriers: readonly string[];
  readonly ringHoleFloor: number;
  readonly ringHolesFound: number;
  readonly ringHolesAbove: number;
  readonly ringHoleSizes: readonly number[];
  readonly holesAboveGlyphTop: number;
  readonly measuredPunchedByRings: number;
  readonly measuredWeldedIntoRingMetal: number;
  readonly claimedPunchedByRings: number;
  readonly claimedWeldedIntoRingMetal: number;
  /** Blocker 1: pre-ring ink under a fillet owned by some other contour. */
  readonly foreignUnderFillet: number;
  /** Blocker 2: ring hole separation, in pixels and against the ink width. */
  readonly ringSpan: number;
  readonly ringSpanRatio: number;
  /** Minor 2: enclosed regions of a few pixels left in the written PNG. */
  readonly pinholes: number;
  /** Minor 4: seats the placement search evaluated for this cell. */
  readonly seatSearchSteps: number;
  /** The lift the accepted seats needed, the deepest of the two rings. */
  readonly ringLift: number;
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
      // The outlines are shaped here, from the pinned bytes, so the contour a
      // fillet pixel belongs to is this script's own answer (blocker 1).
      const cellLayout = identityStencilSvg(
        await shapeText({
          fontBytes: new Uint8Array(
            readFileSync(identityFontUrl(rendered.report.fontFile)),
          ),
          text,
          script,
        }),
      );
      const metal = ringsOff
        ? { welded: 0, punched: 0, foreignUnderFillet: 0 }
        : measureRingMetal(
            await renderPreRingMask(
              text,
              script,
              style,
              `p1-4-off-${name.label}-${script}-${style}`,
            ),
            rendered.construction.ringCentres,
            cellLayout.glyphs,
            rendered.construction.glyphBoxBeforeRings,
          );
      matrix.set(cellKey(name.label, script, style), {
        file,
        components: measured.components,
        jumpRings: rendered.construction.jumpRings,
        ringPlacement: rendered.construction.ringPlacement,
        ringCarriers: rendered.construction.ringCentres.map(
          (centre) =>
            `${centre.glyphIndex}:${centre.contourIndex}@${centre.candidateIndex}`,
        ),
        ringHoleFloor: ringHoleFloor(rendered.construction),
        ringHolesFound: ring.ringHoles.filter((hole) => hole.found).length,
        ringHolesAbove: ring.ringHoles.filter(
          (hole) => hole.found && hole.aboveAnchor,
        ).length,
        ringHoleSizes: ring.ringHoles.map((hole) => hole.size),
        holesAboveGlyphTop: ring.holesAboveGlyphTop,
        measuredPunchedByRings: metal.punched,
        measuredWeldedIntoRingMetal: metal.welded,
        claimedPunchedByRings: rendered.construction.glyphPixelsPunchedByRings,
        claimedWeldedIntoRingMetal:
          rendered.construction.glyphPixelsUnderRingMetal,
        foreignUnderFillet: metal.foreignUnderFillet,
        ringSpan: ringSpanRatioOf(ring.ringHoles, measured.bbox).span,
        ringSpanRatio: ringSpanRatioOf(ring.ringHoles, measured.bbox).ratio,
        pinholes: countPinholes(decodedCell),
        seatSearchSteps: rendered.construction.seatSearchSteps,
        ringLift: Math.max(
          0,
          ...rendered.construction.ringCentres.map(
            (centre) => centre.anchorY - centre.y,
          ),
        ),
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
      console.log(
        `CELL ${file.padEnd(34)}` +
          `${rendered.construction.ringPlacement.padEnd(7)}` +
          `carrier ${rendered.construction.ringCentres
            .map(
              (centre) =>
                `${centre.glyphIndex}:${centre.contourIndex}@${centre.candidateIndex}`,
            )
            .join(",")
            .padEnd(14)}` +
          `anchor ${rendered.construction.ringCentres
            .map((centre) => `${centre.anchorX},${centre.anchorY}`)
            .join(" ")
            .padEnd(20)}` +
          `ring ${rendered.construction.ringCentres
            .map((centre) => `${centre.x},${centre.y}`)
            .join(" ")
            .padEnd(20)}` +
          `punched ${metal.punched} welded ${metal.welded} foreign ${metal.foreignUnderFillet} ` +
          `span ${ringSpanRatioOf(ring.ringHoles, measured.bbox).ratio.toFixed(2)} ` +
          `pin ${countPinholes(decodedCell)} steps ${rendered.construction.seatSearchSteps}  ` +
          `holes [${ring.ringHoles.map((hole) => hole.size).join(" ")}] ` +
          `floor ${Math.round(ringHoleFloor(rendered.construction))}`,
      );
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
    cell.measuredPunchedByRings === 0 &&
    cell.measuredWeldedIntoRingMetal === 0,
).length;
const welded = matrixCells.filter(
  (cell) => cell.measuredWeldedIntoRingMetal > 0,
);
console.log(
  `MATRIX WELDED-GLYPH ${welded.length}/${matrixCells.length} cells have ink welded into ring metal` +
    (welded.length
      ? `, worst ${welded
          .slice()
          .sort(
            (left, right) =>
              right.measuredWeldedIntoRingMetal -
              left.measuredWeldedIntoRingMetal,
          )
          .slice(0, 5)
          .map((cell) => `${cell.file}:${cell.measuredWeldedIntoRingMetal}`)
          .join(" ")}`
      : ""),
);
// Blocker 2: the measured separation of the two ring holes over the whole
// matrix, so the floor is set from the corpus and the collapse cases are
// visible as numbers rather than as a description.
const spanCells = matrixCells.filter((cell) => cell.ringSpanRatio > 0);
if (spanCells.length) {
  const ratios = spanCells
    .slice()
    .sort((left, right) => left.ringSpanRatio - right.ringSpanRatio);
  const values = ratios.map((cell) => cell.ringSpanRatio);
  const quantile = (fraction: number) =>
    (values[
      Math.min(values.length - 1, Math.floor(fraction * values.length))
    ] as number).toFixed(3);
  console.log(
    `MATRIX RING SPAN RATIO min ${quantile(0)} p05 ${quantile(0.05)} p50 ${quantile(0.5)} max ${(values[values.length - 1] as number).toFixed(3)} over ${values.length} cells`,
  );
  console.log(
    `MATRIX RING SPAN RATIO smallest 12: ${ratios
      .slice(0, 12)
      .map((cell) => `${cell.file}:${cell.ringSpanRatio.toFixed(3)}`)
      .join(" ")}`,
  );
}
const foreign = matrixCells.filter((cell) => cell.foreignUnderFillet > 0);
console.log(
  `MATRIX FILLET-FOREIGN ${foreign.length}/${matrixCells.length} cells have pre-ring ink of another contour under a weld fillet` +
    (foreign.length
      ? `: ${foreign
          .map((cell) => `${cell.file}:${cell.foreignUnderFillet}`)
          .join(" ")}`
      : ""),
);
const pinholed = matrixCells.filter((cell) => cell.pinholes > 0);
console.log(
  `MATRIX PINHOLES ${pinholed.length}/${matrixCells.length} cells carry an enclosed region of ${PINHOLE_MAX_AREA} px or less` +
    (pinholed.length
      ? `: ${pinholed.map((cell) => `${cell.file}:${cell.pinholes}`).join(" ")}`
      : ""),
);
for (const cell of pinholed) process.exitCode = 1;
const steps = matrixCells.map((cell) => cell.seatSearchSteps);
const lifts = matrixCells.map((cell) => cell.ringLift);
console.log(
  `MATRIX SEAT-SEARCH steps min ${Math.min(...steps)} max ${Math.max(...steps)} mean ${Math.round(steps.reduce((total, value) => total + value, 0) / steps.length)}; deepest accepted lift ${Math.max(...lifts)} rows (${(matrixCells.find((cell) => cell.ringLift === Math.max(...lifts)) as MatrixCell).file})`,
);
const barCells = matrixCells.filter((cell) => cell.ringPlacement === "bar");
console.log(
  `MATRIX BAR-FALLBACK ${barCells.length}/${matrixCells.length}` +
    (barCells.length
      ? `: ${barCells.map((cell) => cell.file).join(" ")}`
      : " cells needed the bar suspension"),
);
const undersized = matrixCells.filter((cell) =>
  cell.ringHoleSizes.some((size) => size < cell.ringHoleFloor),
);
console.log(
  `MATRIX RING HOLE FLOOR ${matrixCells.length - undersized.length}/${matrixCells.length} cells have every ring hole at or above ${Math.round(IDENTITY_RING_HOLE_MIN_AREA_FRACTION * 100)}% of the ideal area`,
);
for (const cell of undersized) {
  console.log(
    `GATE FAILED: matrix/${cell.file} ring hole ${cell.ringHoleSizes.join(", ")} below the floor ${Math.round(cell.ringHoleFloor)}`,
  );
  process.exitCode = 1;
}
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
    cell.measuredPunchedByRings === 0 &&
    cell.measuredWeldedIntoRingMetal === 0
  )
    continue;
  console.log(
    `GATE FAILED: matrix/${cell.file} rings=${cell.jumpRings} holesFound=${cell.ringHolesFound} above=${cell.ringHolesAbove} holesAboveGlyphTop=${cell.holesAboveGlyphTop} punched=${cell.measuredPunchedByRings} welded=${cell.measuredWeldedIntoRingMetal}`,
  );
  process.exitCode = 1;
}

writeFileSync(
  join(matrixDirectory, "matrix-report.json"),
  `${JSON.stringify(matrixCells, null, 2)}\n`,
);
