/**
 * HarfBuzz shaping against the pinned font bytes.
 *
 * The engine used to ask a rendering library for a font *family name*. sharp's
 * bundled Pango never consults fontconfig on macOS, so "Playfair Display"
 * silently became the system sans and "Noto Kufi Arabic" and "Noto Naskh
 * Arabic" resolved to the same fallback face - Kufi and Naskh produced
 * byte-identical stencils. Here the caller hands us the bytes of one pinned
 * file, we hash exactly those bytes, and HarfBuzz shapes with them. Joining
 * forms, marks and ligatures come from the font's own GSUB/GPOS tables, so the
 * spelling is the font's, never a fallback's and never the model's.
 *
 * The module is deliberately free of sharp and of any rasteriser: it returns
 * glyph outlines as SVG path data in font units, and (P1-3) lays those outlines
 * out on the stencil canvas as a path-only SVG. Painting that SVG is the
 * caller's job, behind the `IdentityRasterizer` port.
 *
 * Node-only imports are limited to `node:crypto` (already used by the solver).
 * Font bytes are read by the caller; `identityFontUrl` resolves the pinned
 * fonts directory from `import.meta.url` so nothing depends on `process.cwd()`.
 */
import { createHash } from "node:crypto";
import type * as HarfBuzzModule from "harfbuzzjs";

import { IdentitySolverError } from "./errors";

/**
 * Directory that holds the pinned font files, under `packages/identity/engines`.
 * The release identifier moved to `caleums-identity-v4` (D-019); the on-disk
 * fonts directory keeps its original name so no font file has to move.
 *
 * `IDENTITY_FONT_URLS` below repeats this name as a literal on purpose - a
 * bundler cannot follow an interpolated asset path - so any rename must change
 * both.
 */
export const CALEUMS_IDENTITY_FONT_DIRECTORY = "caleums-arabic-v3" as const;

/**
 * Every pinned font file, each as its own literal `new URL(..., import.meta.url)`.
 *
 * This map used to be one template literal with the file name interpolated.
 * Under plain Node that is correct, but a bundler cannot follow an interpolated
 * asset URL: Next/Turbopack emitted all ten faces into `.next/server/assets`
 * and then handed back the *first* of them for every request, so a deployed
 * shape of "Asma" with Playfair and of "أسماء" with Naskh and with Kufi all
 * returned byte-identical Amiri glyphs (measured by the `P1-2b` diagnostics
 * route, three identical `fontSha256Measured` values). That is the exact
 * silent-fallback failure this module exists to prevent, so the reference is
 * static per file and the bundler resolves each one on its own.
 */
const IDENTITY_FONT_URLS: Readonly<Record<string, URL>> = {
  "Amiri-Regular.ttf": new URL(
    "../engines/caleums-arabic-v3/fonts/Amiri-Regular.ttf",
    import.meta.url,
  ),
  "ArefRuqaa-Regular.ttf": new URL(
    "../engines/caleums-arabic-v3/fonts/ArefRuqaa-Regular.ttf",
    import.meta.url,
  ),
  "cairo.ttf": new URL(
    "../engines/caleums-arabic-v3/fonts/cairo.ttf",
    import.meta.url,
  ),
  "GreatVibes-Regular.ttf": new URL(
    "../engines/caleums-arabic-v3/fonts/GreatVibes-Regular.ttf",
    import.meta.url,
  ),
  "NotoKufiArabic-Regular.ttf": new URL(
    "../engines/caleums-arabic-v3/fonts/NotoKufiArabic-Regular.ttf",
    import.meta.url,
  ),
  "NotoNaskhArabic-Regular.ttf": new URL(
    "../engines/caleums-arabic-v3/fonts/NotoNaskhArabic-Regular.ttf",
    import.meta.url,
  ),
  "PlayfairDisplay-SemiBold.ttf": new URL(
    "../engines/caleums-arabic-v3/fonts/PlayfairDisplay-SemiBold.ttf",
    import.meta.url,
  ),
  "rakkas.ttf": new URL(
    "../engines/caleums-arabic-v3/fonts/rakkas.ttf",
    import.meta.url,
  ),
  "reemkufi.ttf": new URL(
    "../engines/caleums-arabic-v3/fonts/reemkufi.ttf",
    import.meta.url,
  ),
  "ScheherazadeNew-Regular.ttf": new URL(
    "../engines/caleums-arabic-v3/fonts/ScheherazadeNew-Regular.ttf",
    import.meta.url,
  ),
};

/** File names of the pinned fonts, in the order the manifest lists them. */
export const IDENTITY_FONT_FILES = Object.freeze(
  Object.keys(IDENTITY_FONT_URLS),
);

/**
 * URL of a pinned font file, resolved relative to this module rather than to
 * the working directory, so the deployed Node buildpack finds the same bytes
 * the laptop does. An unknown file name throws instead of resolving to some
 * other face: a wrong face is a wrong pendant.
 */
export function identityFontUrl(file: string): URL {
  const url = IDENTITY_FONT_URLS[file];
  if (!url)
    throw new Error(
      `Unknown pinned identity font: ${file}. Known: ${IDENTITY_FONT_FILES.join(", ")}`,
    );
  return url;
}

/** Scripts the identity engine shapes. */
export type IdentityScript = "ar" | "en";

interface ScriptProperties {
  /** ISO 15924 script tag HarfBuzz expects. */
  readonly script: string;
  /** BCP 47 language tag. */
  readonly language: string;
  /** HarfBuzz direction constant: 4 is LTR, 5 is RTL. */
  readonly direction: 4 | 5;
}

const SCRIPT_PROPERTIES: Readonly<Record<IdentityScript, ScriptProperties>> = {
  ar: { script: "Arab", language: "ar", direction: 5 },
  en: { script: "Latn", language: "en", direction: 4 },
};

/** One shaped glyph, in font units (`upem` per em, y up). */
export interface ShapedGlyph {
  /** Glyph id in the pinned font. Zero is `.notdef`. */
  readonly gid: number;
  /** Index of the first NFC code point this glyph belongs to. */
  readonly cluster: number;
  /**
   * The font's own GDEF glyph class: 1 base, 2 ligature, 3 mark, 4 component,
   * 0 unclassified. D-020 chooses ring carriers from this rather than from the
   * shape of a blob in the raster: a dot, a tittle, a hamza, a tanwin or a
   * shadda is a mark because the font says so, and no pixel heuristic has to
   * guess it.
   */
  readonly glyphClass: number;
  readonly xAdvance: number;
  readonly yAdvance: number;
  readonly xOffset: number;
  readonly yOffset: number;
  /** SVG path data for the outline, in font units. Empty for blank glyphs. */
  readonly path: string;
}

/**
 * What shaping measured. Every field is read back out of HarfBuzz or computed
 * from the bytes; nothing here is asserted by the caller.
 */
export interface ShapingMeasurement {
  /** SHA-256 of the font bytes that were actually loaded and shaped with. */
  readonly fontSha256Measured: string;
  /** Units per em of the loaded face. */
  readonly upem: number;
  /** Number of shaped glyphs. */
  readonly glyphCount: number;
  /** Shaped glyphs whose id is zero, that is `.notdef` boxes. */
  readonly notdefGlyphs: number;
  /** NFC code points the font has no glyph for, or no cluster covered. */
  readonly uncoveredCodePoints: readonly number[];
  /**
   * Index into the NFC code points of every uncovered one, in input order.
   * Positions only, never characters: this number rides in reports and error
   * detail, and the customer's name never may.
   */
  readonly uncoveredIndices: readonly number[];
  /**
   * No glyph id 0 in the shaped buffer and every NFC code point is covered by
   * a cluster. This is the measurement the report used to assert as a literal.
   */
  readonly exactCharactersPreserved: boolean;
  /** HarfBuzz version string, for the shaping provenance record. */
  readonly harfbuzzVersion: string;
}

/** A shaped run: the glyphs plus the measurement that judges them. */
export interface ShapedText extends ShapingMeasurement {
  /** The NFC text that was shaped. */
  readonly text: string;
  readonly script: IdentityScript;
  readonly glyphs: readonly ShapedGlyph[];
  /** Sum of the glyph x advances, in font units. */
  readonly advanceWidth: number;
}

export interface ShapeTextInput {
  /** Bytes of one pinned font file, read by the caller. */
  readonly fontBytes: Uint8Array;
  /** Text to shape. Normalised to NFC here, so callers cannot skip it. */
  readonly text: string;
  readonly script: IdentityScript;
}

type HarfBuzz = typeof HarfBuzzModule;

let harfbuzz: Promise<HarfBuzz> | undefined;

/**
 * Loads the HarfBuzz WASM once per process. `harfbuzzjs` resolves its own
 * `.wasm` next to its module URL, so this works under a bundler and in the
 * deployed buildpack without a `process.cwd()` lookup.
 */
async function loadHarfBuzz(): Promise<HarfBuzz> {
  harfbuzz ??= import("harfbuzzjs");
  return harfbuzz;
}

interface LoadedFace {
  readonly font: InstanceType<HarfBuzz["Font"]>;
  /** Kept because GDEF glyph classes are a face property, not a font one. */
  readonly face: InstanceType<HarfBuzz["Face"]>;
  readonly upem: number;
  readonly sha256: string;
}

const faceCache = new Map<string, LoadedFace>();

async function loadFace(fontBytes: Uint8Array): Promise<LoadedFace> {
  const sha256 = createHash("sha256").update(fontBytes).digest("hex");
  const cached = faceCache.get(sha256);
  if (cached) return cached;
  const hb = await loadHarfBuzz();
  const blob = new hb.Blob(fontBytes);
  const face = new hb.Face(blob);
  const font = new hb.Font(face);
  // hb_font_create leaves the scale at the face upem, so advances, offsets and
  // outlines all come back in font units and the caller owns the scaling.
  const loaded: LoadedFace = { font, face, upem: face.upem, sha256 };
  faceCache.set(sha256, loaded);
  return loaded;
}

/**
 * HarfBuzz cluster level CHARACTERS (`hb_buffer_cluster_level_t` value 2): no
 * cluster merging at all, so every glyph reports the index of the character it
 * came from and a character that lost its glyph leaves a hole in the cluster
 * set. The default level merges clusters, which is what made the old coverage
 * check unable to see a mark dropped in the middle of a name.
 */
const CLUSTER_LEVEL_CHARACTERS = 2 as const;

/** One shaping pass at the fixed cluster level; the buffer never escapes. */
function shapeBuffer(
  hb: HarfBuzz,
  font: InstanceType<HarfBuzz["Font"]>,
  properties: ScriptProperties,
  codePoints: number[],
): ReturnType<InstanceType<HarfBuzz["Buffer"]>["getGlyphInfosAndPositions"]> {
  const buffer = new hb.Buffer();
  buffer.addCodePoints(codePoints);
  buffer.setDirection(properties.direction);
  buffer.setScript(properties.script);
  buffer.setLanguage(properties.language);
  buffer.setClusterLevel(CLUSTER_LEVEL_CHARACTERS);
  hb.shape(font, buffer);
  return buffer.getGlyphInfosAndPositions();
}

/**
 * Whether the code point at `index` changed the glyphs the font produced.
 *
 * Only asked about an index no glyph claims. A ligature component or a
 * combining accent that composed into a precomposed glyph still changes the
 * glyph ids when it is taken away, so it is present in the metal; a character
 * the font deleted changes nothing, so the piece would be missing it.
 */
function contributesToShaping(
  hb: HarfBuzz,
  font: InstanceType<HarfBuzz["Font"]>,
  properties: ScriptProperties,
  codePoints: number[],
  index: number,
): boolean {
  const withCharacter = shapeBuffer(hb, font, properties, codePoints)
    .map((glyph) => glyph.codepoint)
    .join(",");
  const withoutCharacter = shapeBuffer(
    hb,
    font,
    properties,
    codePoints.filter((_, position) => position !== index),
  )
    .map((glyph) => glyph.codepoint)
    .join(",");
  return withCharacter !== withoutCharacter;
}

/**
 * Shapes `text` with the given font bytes and returns per-glyph outlines and
 * the measurement of whether the spelling survived.
 */
export async function shapeText(input: ShapeTextInput): Promise<ShapedText> {
  const hb = await loadHarfBuzz();
  const { font, face, upem, sha256 } = await loadFace(input.fontBytes);
  const properties = SCRIPT_PROPERTIES[input.script];
  const text = input.text.normalize("NFC");
  const codePoints = [...text].map(
    (character) => character.codePointAt(0) ?? 0,
  );

  const shaped = shapeBuffer(hb, font, properties, codePoints);

  const glyphs: ShapedGlyph[] = shaped.map((glyph) => ({
    gid: glyph.codepoint,
    cluster: glyph.cluster,
    xAdvance: glyph.xAdvance ?? 0,
    yAdvance: glyph.yAdvance ?? 0,
    xOffset: glyph.xOffset ?? 0,
    yOffset: glyph.yOffset ?? 0,
    // A face with no GDEF table classifies nothing, which HarfBuzz reports as
    // UNCLASSIFIED (0). That is not "this is a mark", so the carrier rule only
    // ever reads class 3 as "mark" and decides everything else on the contour
    // geometry.
    //
    // Adversarial review 4, major 4, measured over the 48-name matrix on every
    // live face: `NotoNaskhArabic` and `NotoKufiArabic` classify 85 of 286
    // shaped glyphs as class 3, so on `classic`, `diwani`, `signature` and
    // Arabic `kufi` the font's own answer does the work. `cairo` (the English
    // face of `kufi`) returns class 0 for all 259, `rakkas`
    // (`thuluth-inspired`) returns class 3 for none of 196 and draws the nuqta
    // inside the base contour, and `ScheherazadeNew` (`minimal`) classifies
    // only 7 of 207 for the same reason; `PlayfairDisplay` classifies every
    // glyph as class 1 because a Latin name shapes no separate mark. On those
    // faces the whole of the exclusion is geometry: the carrier is the largest
    // contour of the glyph, which a dot never is, and the two fractions below
    // hold a glyph out when its largest contour is not letter-like.
    glyphClass: face.getGlyphClass(glyph.codepoint) as number,
    path: font.glyphToPath(glyph.codepoint),
  }));

  // A code point is covered when the shaped buffer really carries it and the
  // font has a real glyph for it. The old check compared the first and last
  // cluster to the ends of the text, which any run passes, so a code point lost
  // in the middle of a name went unnoticed; the buffer is now shaped at cluster
  // level CHARACTERS, where HarfBuzz merges nothing, and every index is asked
  // for its own glyph.
  const claimedByGlyph = new Set(glyphs.map((glyph) => glyph.cluster));
  const claimedByRealGlyph = new Set(
    glyphs.filter((glyph) => glyph.gid !== 0).map((glyph) => glyph.cluster),
  );
  const uncoveredCodePoints: number[] = [];
  const uncoveredIndices: number[] = [];
  for (let index = 0; index < codePoints.length; index += 1) {
    const codePoint = codePoints[index] ?? 0;
    const covered =
      claimedByRealGlyph.has(index) ||
      // No glyph claims this index at all. Under CHARACTERS clustering that is
      // either a ligature or composition that swallowed the character (لا, the
      // Allah ligature, a Latin base plus a combining accent) or a character
      // the font's GSUB deleted. The two are told apart by measurement, not by
      // assumption: shape the run again without this code point, and if the
      // glyph ids come back identical the character contributed nothing to the
      // piece, which is the dropped-mark case that must fail the gate.
      (!claimedByGlyph.has(index) &&
        contributesToShaping(hb, font, properties, codePoints, index));
    if (!covered || font.nominalGlyph(codePoint) === undefined) {
      uncoveredCodePoints.push(codePoint);
      uncoveredIndices.push(index);
    }
  }
  const notdefGlyphs = glyphs.filter((glyph) => glyph.gid === 0).length;

  return {
    text,
    script: input.script,
    glyphs,
    advanceWidth: glyphs.reduce((total, glyph) => total + glyph.xAdvance, 0),
    fontSha256Measured: sha256,
    upem,
    glyphCount: glyphs.length,
    notdefGlyphs,
    uncoveredCodePoints,
    uncoveredIndices,
    exactCharactersPreserved:
      glyphs.length > 0 &&
      notdefGlyphs === 0 &&
      uncoveredCodePoints.length === 0,
    harfbuzzVersion: hb.versionString(),
  };
}

/* -------------------------------------------------------------------------
 * Stencil layout: the shaped outlines become a path-only SVG.
 *
 * P1-3. Nothing below draws an SVG `<text>` element or names a font family:
 * the geometry is the outlines HarfBuzz read out of the pinned bytes above, so
 * no renderer, no fontconfig and no system fallback can change the spelling.
 * The numbers mirror `docs/goals/overnight-launch/lab/make_stencil.py` exactly,
 * which is the construction the image lab proved.
 * ---------------------------------------------------------------------- */

/** Stencil canvas, square, in pixels (`make_stencil.py` CANVAS). */
export const IDENTITY_CANVAS = 1024;

/** Clear space kept around the whole piece, in pixels (MARGIN). */
export const IDENTITY_MARGIN = 56;

/** Vertical room reserved above the lettering for the jump rings (RING_BAND). */
export const IDENTITY_RING_BAND = 110;

/** Bridge capsule width in pixels, about 1.0 mm at a 32 mm pendant (BRIDGE_W). */
export const IDENTITY_BRIDGE_WIDTH = 24;

/** Dilation passes that kill hairlines without closing counters (THICKEN). */
export const IDENTITY_THICKEN_PASSES = 2;

/**
 * How many bridges the connector may draw before it gives up
 * (`make_stencil.py:121`, `for _ in range(64)`). One bridge removes at least
 * one island, so a run that needs more than this is not converging.
 */
export const IDENTITY_MAX_BRIDGES = 64;

/**
 * The square box the finished piece is centred inside (`make_stencil.py:186`,
 * `box = CANVAS - 2 * MARGIN`). Only a piece larger than this is downscaled.
 */
export const IDENTITY_RECENTRE_BOX = IDENTITY_CANVAS - 2 * IDENTITY_MARGIN;

/**
 * Smallest downscale `recentre` accepts (`make_stencil.py:189`). Below this the
 * assembly is so far outside the canvas that shrinking it would thin the metal,
 * so the solver fails instead of quietly shipping a hairline.
 */
export const IDENTITY_MIN_RECENTRE_SCALE = 0.8;

/**
 * Luminance above which a downscaled pixel counts as ink again
 * (`make_stencil.py:193`, `np.array(img) > 110` on a 0/255 mask).
 */
export const IDENTITY_RESAMPLE_INK_THRESHOLD = 110;

/** Lanczos window, in output pixels (`Image.LANCZOS` is a=3 in Pillow). */
export const IDENTITY_LANCZOS_SUPPORT = 3;

/** Jump ring outer radius in pixels (RING_OUTER). */
export const IDENTITY_RING_OUTER = 42;

/** Jump ring inner radius in pixels (RING_INNER). */
export const IDENTITY_RING_INNER = 24;

/** Ring weld fillet width in pixels (STEM_W). */
export const IDENTITY_RING_STEM_WIDTH = 30;

/** How far the ring body sinks into the stroke it sits on (WELD_OVERLAP). */
export const IDENTITY_RING_WELD_OVERLAP = 16;

/**
 * The rings the solver welds on: one over each end of the name
 * (`add_rings`, `make_stencil.py:143-178`).
 */
export const IDENTITY_RING_COUNT = 2;

/**
 * Side of the square erosion window that decides what counts as load-bearing
 * metal before a ring is anchored (`np.ones((11, 11), bool)`).
 *
 * This answers one question only: is the metal thick enough to hold a chain.
 * The lab's comment claimed it also removed dots and hamzas, and adversarial
 * review 2 showed that is false - a Kufi dot is a solid square that survives it
 * with room to spare. Since D-020 nothing in the raster answers "is this a
 * mark": the carrier is a contour of a base glyph, chosen from the font's own
 * outlines and GDEF classes before this raster exists, and the erosion only
 * narrows that contour's pixels down to the part thick enough to weld to.
 */
export const IDENTITY_RING_ANCHOR_EROSION = 11;

/**
 * How far outward of the anchor the ring centre sits, as a fraction of the
 * outer radius (`int(RING_OUTER * 0.75)`). Outward means away from the middle
 * of the name, so the ring never buries the dot or serif that carries the
 * spelling.
 */
export const IDENTITY_RING_OUTWARD_FRACTION = 0.75;

/** Smallest gap kept between the ring's top edge and the canvas top edge. */
export const IDENTITY_RING_TOP_CLEARANCE = 2;

/** How far into the stroke the weld fillet ends (`ay + 14`). */
export const IDENTITY_RING_WELD_ANCHOR_DEPTH = 14;

/**
 * How far the ring may be lifted above the position `add_rings` computes, in
 * pixels, to keep the ring hole clear of the name's own ink.
 *
 * The lab stops at one position, so on a name whose hairline rises above the
 * load-bearing anchor the hole clips a few dozen pixels off that hairline. The
 * solver spends the room above instead: it lifts the ring one pixel at a time
 * until nothing of the name lies inside the hole.
 *
 * Package review finding 1: this used to be `IDENTITY_RING_BAND` (110), on the
 * reasoning that the fit reserves exactly that much empty canvas above the
 * lettering. It does, but the lift is measured from the *anchor pixel*, which
 * sits inside the letter, not from the letter top - so `Zoe` with a diaeresis
 * needed 123 px of lift, the cap refused at 110, and all six styles died with
 * `identity_ring_welded_to_glyph`. The real bound is the canvas: a ring lifted
 * past the top edge would have a clipped annulus and no enclosed hole, and the
 * `lowest` clamp in the search already refuses that, so this cap only has to be
 * large enough never to bind before the clamp does.
 *
 * Adversarial review 4, minor 4: `IDENTITY_CANVAS` made it unbounded in
 * practice - the search is O(lift x columns x fillet box), about 1.9e8 pixel
 * tests per ring at that cap. The lift a seat actually needs is bounded by the
 * ring band the fit reserves plus the depth of the anchor pixel inside its own
 * stroke; measured over the 576-cell matrix of fix pass 5 the deepest lift any
 * accepted seat used was 144 rows (`zoe-en-kufi`), and 320 is that with more
 * than twice the head-room while still cutting the worst case by two thirds. A
 * seat that would need more lift than this is a seat above the top of the
 * canvas, which the `lowest` clamp refuses anyway. The search reports what it
 * actually spent as `seatSearchSteps`: over the same matrix, 4 to 216080 seats
 * per piece with a mean of 5793.
 */
export const IDENTITY_RING_MAX_LIFT = 320;

/**
 * Largest enclosed background region, in pixels of the finished PNG, that is a
 * casting pinhole rather than a hole anyone asked for.
 *
 * Adversarial review 4, minor 2: `muhammad-en-classic` measured hole sizes
 * `[..., 609, 600, 1]` and `muhammad-en-kufi` `[..., 722, 709, 2]`, and the
 * capped list of eight sizes hid how many more there were. A one to fifteen
 * pixel enclosed region is a tenth of a millimetre across on a 32 mm pendant:
 * it is not a counter and not a ring hole.
 *
 * Measured per pass, the cause is the ring pass alone, not thickening and not
 * bridging: over the names of the fix pass 5 probe the raster carries none
 * after bridging and one to seven after the rings are drawn, where the fillet
 * meets the stroke it welds to. `fillPinholes` therefore runs on the finished
 * raster, after the recentre, which is the one point at which every pass that
 * can make a void has already run, and `identity_stencil_pinhole` refuses any
 * that survive into the encoded bytes.
 *
 * The floor is set at the gap in the corpus rather than chosen. Over the
 * 576-cell matrix the finished pieces carry 2270 enclosed regions; the sizes
 * run 9, 10, 11 ... 15 and then jump to 23, with nothing in between, so 16
 * closes every void on the low side of that gap and leaves the smallest
 * legitimate region 44% above it. A ring hole is 1810 px and the smallest
 * letter counter of the corpus is 23 px.
 */
export const IDENTITY_STENCIL_PINHOLE_MAX_AREA = 16;

/**
 * Smallest distance the two ring holes may sit apart, as a fraction of the
 * finished piece's ink width, both measured on the decoded PNG.
 *
 * Adversarial review 4, blocker 2: on 18 of 576 cells both rings landed on the
 * same letter stroke 81 to 150 px apart - `علي` and `أمير` hung from two rings
 * a centimetre apart at one corner of the pendant and would rotate to near
 * vertical on a chain - and nothing measured ring separation at all. This is
 * that measurement, taken on the bytes rather than on the solver's intention.
 *
 * The fraction is set from the corpus rather than chosen. Measured over the
 * 576-cell matrix after the carrier fix, the smallest ratio any accepted piece
 * reaches is 0.307 (`taim-ar-thuluth-inspired`: Rakkas climbs to the right, so
 * both glyph tops sit near the middle of the piece even with the rings on
 * different letters), the fifth percentile is 0.505 and the median 0.846; the
 * leading- and trailing-punctuation case the review calls out, `-Ali-`,
 * measures 0.480. The same measurement over the 576 cells of the pass this
 * gate answers ran from 0.091, and 19 of those cells sat below 0.30.
 *
 * At 0.25 the gate clears the smallest legitimate cell by 5.7 points - 19% of
 * its own value - and still refuses 17 of the 19 collapsed cells outright. It
 * is a backstop and not the fix: what prevents the collapse is the placement
 * rule (the two rings may not share a glyph while another eligible base glyph
 * exists, and the left glyph must sit left of the right glyph). This is the
 * measurement on the encoded bytes that says so, and no cell of the corpus
 * reaches it.
 */
export const IDENTITY_RING_MIN_SPAN_FRACTION = 0.25;

/**
 * How much of its own scaled area an enclosed region must still have for
 * `fillPinholes` to treat it as the letter's counter rather than as a pinhole.
 *
 * Adversarial review 5, minor 1: a small enclosed region in the finished raster
 * is either a counter the piece has shrunk or a void the construction made, and
 * the two want opposite answers - a counter must survive to be gated, a void
 * must be welded shut. Tracing the region back through the recentre transform
 * to the raster as the rasteriser painted it tells them apart by area.
 *
 * Measured, the two populations are an order of magnitude apart. Thirty `e` in
 * Kufi: the counter is 114 px as the rasteriser paints it and 13 to 29 px in
 * the finished piece, because `IDENTITY_THICKEN_PASSES` takes a two-pixel band
 * off a counter only twelve pixels across - 0.11 to 0.25 of its own area, and
 * every one of them is still visibly the eye of an `e`. The one-pixel region
 * left in `إبراهيم` in `classic`, where the thickening closed a counter
 * outright, is 0.0005 of the 2380 px it came from. At 0.05 the rule keeps every
 * counter of the Kufi row - so `identity_stencil_pinhole` refuses that piece
 * with `count=4`, which is the honest answer, a 13 px counter is a letter that
 * did not cast - and fills the sliver, which is what a caster does with it.
 */
export const IDENTITY_STENCIL_COUNTER_REMNANT_FRACTION = 0.05;

/**
 * How far outward of its computed centre a ring may be pushed, in pixels, when
 * lifting alone cannot get the annulus off the lettering. Outward is away from
 * the middle of the name, and the ring still has to stay inside the canvas, so
 * this is capped at one ring diameter's worth of travel.
 */
export const IDENTITY_RING_MAX_OUTWARD_SHIFT = IDENTITY_RING_OUTER;

/**
 * How far *inward* of its computed centre a ring may be pushed, in pixels.
 *
 * Adversarial review 3, finding 3: a ring whose seat is already against the
 * canvas edge has no outward room left, so before this the search had one
 * column of candidates and, when none of them was clean, the solver kept the
 * least-bad seat and the measured gate refused the whole piece - `Maji` in
 * Kufi, `أمير` in Kufi and `قق` in three styles all died that way while a clean
 * seat existed a few pixels the other side. Inward is toward the middle of the
 * name, so it is tried only after every outward candidate has failed, and it is
 * held to half the outward travel: the ring must stay over the end of the name,
 * not wander into the middle of it.
 */
export const IDENTITY_RING_MAX_INWARD_SHIFT = Math.trunc(
  IDENTITY_RING_OUTER / 2,
);

/**
 * How many carrier glyphs the placement search may try on one side before it
 * gives up and the whole piece falls back to the bar construction.
 *
 * The first candidate is the outermost base glyph on that side, which is what
 * the lab picked and what a jeweller would pick. When no seat above its carrier
 * contour is clean the search steps one glyph inward rather than refusing the
 * name. Six is longer than any name in the union corpus needs; the bound exists
 * so a pathological piece cannot turn the search into a scan of every glyph.
 */
export const IDENTITY_RING_ANCHOR_CANDIDATES = 6;

/** Weld fillet width in pixels (`int(STEM_W * 1.3)`). */
export const IDENTITY_RING_WELD_WIDTH = Math.trunc(
  IDENTITY_RING_STEM_WIDTH * 1.3,
);

/**
 * Where the weld fillet starts below the ring hole.
 *
 * The lab wrote `cy + RING_INNER + 4`, and the fillet is a capsule of radius
 * `IDENTITY_RING_WELD_WIDTH / 2` (19.5 px) around a segment that starts there,
 * so its top cap reached 15.5 px *inside* the hole. Package review finding 5
 * measured the result: ring holes came out at 1186 to 1424 px against an ideal
 * `pi * 24^2 = 1810`, up to 34% of the hole filled with metal, and nothing
 * gated it - a chain has to pass through that hole. Starting the segment a full
 * capsule radius below the hole puts the cap exactly on the hole boundary, so
 * the fillet can touch the hole and never enter it.
 */
export const IDENTITY_RING_WELD_START_GAP = IDENTITY_RING_WELD_WIDTH / 2;

/**
 * GDEF glyph class 3, `HB_OT_LAYOUT_GLYPH_CLASS_MARK`.
 *
 * D-020: a mark glyph never carries a jump ring. This is the font's own answer
 * to "is this a dot, a tittle, a hamza, a tanwin, a shadda", read out of the
 * GDEF table by HarfBuzz, and it replaces three passes of raster heuristics
 * (erosion size, island-area ratio, blob compactness) each of which was
 * falsified by a name outside its tuning corpus.
 */
export const IDENTITY_GLYPH_CLASS_MARK = 3;

/**
 * Smallest area a contour may have and still carry a jump ring, as a fraction
 * of the largest contour of the same glyph.
 *
 * The carrier is the largest contour of a base glyph, so this test only ever
 * refuses a glyph whose largest contour is not meaningfully larger than its
 * others - which is the shape of a glyph that is all marks. It is a ratio
 * inside one glyph, never between glyphs: adversarial review 3 falsified the
 * between-glyph version, because in Latin every letter is its own island and
 * the tittle of the i was measured against whatever the biggest letter of the
 * name happened to be.
 */
export const IDENTITY_RING_CARRIER_MIN_CONTOUR_AREA_FRACTION = 0.5;

/**
 * Smallest height a carrier contour may have, as a fraction of the bounding box
 * of the glyph it belongs to.
 *
 * What actually keeps a ring off the tittle of an `i` or the nuqta of a Kufi
 * `n` is the tie-break: the carrier is the *largest contour by area* of the
 * glyph, and a dot is never that. This test does one narrower job - it refuses
 * a glyph whose largest contour is not letter-like against the glyph's own box,
 * so the search steps one glyph inward rather than hanging a chain off a lump.
 *
 * Adversarial review 4, major 4: measured over the 48-name matrix on all six
 * live faces, the smallest height fraction any real letter body reached was
 * 0.435 (`PlayfairDisplay-SemiBold`, the `w` of the longest stress name), so at
 * 0.4 a legitimate body cleared this by 3.5 points - thin enough that a font
 * update or a name outside the corpus could put a letter the wrong side of it,
 * and the cost of that is the ring stepping inward for no reason. It is 0.3
 * now: real bodies clear it by 13.5 points, and the tallest satellite contour
 * measured on the two faces where a dot is a contour of its own
 * (`cairo` 0.129, `NotoKufiArabic` 0.108) is still 17 points below it. A
 * standalone dot glyph is a different case and is held out by
 * `IDENTITY_RING_CARRIER_MIN_TALLEST_HEIGHT_FRACTION`, which measures against
 * the letters rather than against the dot's own box.
 */
export const IDENTITY_RING_CARRIER_MIN_CONTOUR_GLYPH_HEIGHT_FRACTION = 0.3;

/**
 * Smallest height a carrier contour may have, as a fraction of the height of
 * the tallest *base* glyph of the run.
 *
 * The test above is inside one glyph, so it cannot see a glyph that is a lump
 * all by itself - a standalone hamza at the end of `dua`, a Latin full stop.
 * This one measures the candidate against the letters it stands beside.
 *
 * Adversarial review 4, blocker 2: it used to be a fraction of the whole shaped
 * run's ink box, which includes the marks. A madda or a damma sitting above the
 * line raises that box, which raises this floor, which disqualifies the very
 * base letters the ring is supposed to hang from: `أمير` in `minimal` missed by
 * two pixels (261 against 263) while `امير` without the hamza passed, and the
 * candidate list collapsed to one glyph for both sides. The reference is the
 * tallest base glyph now, so a mark can never raise the floor above a letter,
 * and the two sides may not share a glyph while another eligible base glyph
 * exists (`carrierCandidates` builds the per-side list and `addRings` scores
 * the pairs). Adversarial review 5, minor 4: this used to cite `carrierSeats`,
 * a function that has never existed. Failing this test is still not a refusal:
 * the search steps one glyph inward.
 */
export const IDENTITY_RING_CARRIER_MIN_TALLEST_HEIGHT_FRACTION = 0.34;

/**
 * How many straight segments each Bezier of a carrier contour is flattened
 * into before it is filled.
 *
 * The contour is rasterised on its own only to find one pixel - the outer top
 * corner of the carrier stroke - and the result is intersected with the mask
 * the SVG rasteriser actually painted, so the flattening only has to be fine
 * enough that the polygon does not cut a corner the painter kept. Sixteen
 * segments on a 1024 px canvas puts the worst chord error well under a pixel
 * for a glyph that fills the canvas, and it is a fixed number so two machines
 * flatten identically.
 */
export const IDENTITY_CONTOUR_FLATTEN_SEGMENTS = 16;

/**
 * How far off horizontal the line through the two ring holes may sit, in
 * degrees, measured on the decoded PNG (`identity_ring_tilt_too_steep`).
 *
 * A pendant hangs from the two holes, so the line through them is the line the
 * chain makes: the piece rotates until that line is horizontal, and whatever
 * angle the letters make with it is the angle the name reads at on the neck. A
 * name more than about 15 degrees out reads as sideways rather than as tilted,
 * and that is what the number is: the angle at which the piece stops looking
 * like a name on a chain, not a value fitted to the corpus.
 *
 * Adversarial review 5, blocker 1: nothing measured this at all. Over the 547
 * welded cells of the 576-cell matrix at `2ad683c` the tilt was p50 4.7, p90
 * 15.3, p95 23.9, max 64.7 - `لي` in `minimal`, a live style, hung at 64.7
 * degrees with every gate green. The fix is the placement and not this number:
 * the seat search scores left-carrier x right-carrier pairs jointly, over the
 * rungs of both anchor ladders, and a clean seat stays clean as the ring rises
 * in its own column, so two rings can nearly always be brought to a common row.
 * Measured after that change over the same matrix, 568 pieces: p50 0.0, p90
 * 0.0, p95 0.0, max 11.7 (`li-en-kufi`, whose two letters are 230 px apart so
 * 47 rows of difference is already 11.7 degrees). The gate clears the largest
 * accepted value by 3.3 degrees and refuses one cell, `ij-en-kufi` at 18.1.
 */
export const IDENTITY_RING_MAX_TILT_DEGREES = 15;

/**
 * How much of the piece may hang outboard of the nearer ring on one side, as a
 * fraction of the measured ink width (`identity_ring_overhang_too_wide`).
 *
 * Adversarial review 5, blocker 2: `عائشة` in classic put both rings in the
 * right-hand third, so 66% of the piece was cantilevered off one corner and the
 * pendant hung nose-down. Span alone cannot see this - two rings 0.291 of the
 * width apart can sit anywhere along it - so each side is measured on its own:
 * the ink outside the nearer ring hole, over the ink width.
 *
 * A balanced piece measures the same small fraction on both sides, and that
 * fraction is not zero: the ring sits over the end letter, so a ring radius of
 * the piece always sticks out past the hole. Measured over the 568 pieces of
 * the matrix after the joint search: worst side p50 0.041, p90 0.102, p95
 * 0.134, max 0.288 (`jiji-en-kufi`, where the two `j` descenders put the usable
 * stroke well inside the piece). At 0.30 the gate clears that by 1.2 points of
 * width and it refuses the pass-5 shapes outright: `عائشة` 0.66, `آمنة` 0.636,
 * `موزة` 0.570, `آلاء` 0.564, `خالد` 0.426. One matrix cell fails it,
 * `salem-ar-thuluth-inspired` at 0.306, where Rakkas climbs so steeply that the
 * last letter offers no load-bearing metal near the end of the piece.
 */
export const IDENTITY_RING_MAX_OVERHANG_FRACTION = 0.3;

/**
 * How many anchor points the seat search may try on one carrier contour.
 *
 * Every rung is a column of the carrier's load-bearing metal and the top of
 * that column, where a weld fillet can land from above. The first is the outer
 * edge of the stroke, and the rest walk inward one
 * `IDENTITY_RING_ANCHOR_SHOULDER_STEP` at a time; the lab's own anchor, the
 * topmost row of the contour, is a rung too.
 *
 * Adversarial review 5, blocker 2: with one anchor - the lab's - a letter that
 * carries dots directly above it (the ta marbuta of `عائشة` and `موزة`, the
 * final qaf, the shin of `شمس`) had no clean corridor from a ring down to that
 * one point, because the ring is seated a little outward of the anchor and the
 * fillet then runs back under the dots. The search's only move was to walk
 * inward to the next letter, and with both sides doing that the two rings ended
 * up in one corner with two thirds of the piece cantilevered. On a bowl the
 * outer column's top is most of a letter-height below the topmost row and out
 * from under the dots: the ring lifts above them and the fillet comes down
 * beside them onto the letter's outer shoulder.
 *
 * Six rungs at 14 px covers 84 px of stroke, wider than any nuqta pair the six
 * faces draw at the probe size, and it is a fixed count so the search cost stays
 * bounded. `addRings` scores the rungs against each other rather than taking
 * the outermost that works, and asks for them one at a time: measured over the
 * 576-cell matrix the median cell is settled by the first rung of the first
 * carrier on each side.
 */
export const IDENTITY_RING_ANCHOR_SHOULDER_STEPS = 6;

/** Column step between two anchors of the shoulder ladder, in pixels. */
export const IDENTITY_RING_ANCHOR_SHOULDER_STEP = 14;

/**
 * The span floor for the one shape where both rings may sit on the same glyph:
 * a one-letter name, where there is no second letter to move to.
 *
 * Adversarial review 5, minor 2: `م` in `minimal` measured 0.257 against the
 * general 0.25 floor, a 2.8% margin, and that floor was justified against
 * multi-letter pieces (smallest legitimate 0.307 there). The two populations are
 * different shapes and now have their own numbers. Measured over 102 one-letter
 * cells - `ا ب م ن ه و ي ع س ق` and `A B e i M O Z`, six styles each - after
 * the joint search: every one is welded on its single glyph, the smallest span
 * ratio is 0.617 (`ا` in `kufi`, then `i` in `kufi` at 0.644 and `ا` in
 * `minimal` at 0.647), the largest 0.917, and the worst tilt 9.5 degrees (`ع`
 * in `classic`).
 * At 0.45 the floor clears the smallest one-letter piece by 27% of its own
 * value and still refuses the collapsed pairs of pass 4, which sat at 0.091 to
 * 0.19. A one-letter name that cannot reach it is not silently shipped: it
 * raises `identity_no_ring_seat` like any other unseatable name.
 */
export const IDENTITY_RING_SHARED_GLYPH_MIN_SPAN_FRACTION = 0.45;

/**
 * Smallest ring hole area the gate accepts, as a fraction of the ideal
 * `pi * IDENTITY_RING_INNER^2` after the recentre scale on each axis.
 *
 * A hole is what the chain goes through, so a hole half filled by the weld is a
 * pendant that cannot be worn. Package review finding 5: the fillet used to
 * start `IDENTITY_RING_WELD_START_GAP` at 4 px below the hole and reach 15.5 px
 * into it, measured holes came out at 1186 to 1424 px against an ideal 1810 -
 * 66% to 79% of the hole - and nothing gated it.
 *
 * With the fillet started a full capsule radius below the hole the only loss
 * left is the rasterised circle's own quantisation and the Lanczos downscale.
 * Measured over the 576-cell union corpus of this pass, 1152 holes: the
 * smallest is 96.4% of its cell's ideal (`iman-ar-kufi`) and the largest is
 * 101.0%. Ninety per cent sits below that with 6.4 points of margin and far
 * above the case the finding found.
 */
export const IDENTITY_RING_HOLE_MIN_AREA_FRACTION = 0.9;

/** Font size the fit probe is measured at (`make_stencil.py:211`). */
export const IDENTITY_PROBE_FONT_SIZE = 200;

/** Fit bounds, in pixels (`make_stencil.py:213`). */
export const IDENTITY_MIN_FONT_SIZE = 40;
export const IDENTITY_MAX_FONT_SIZE = 900;

/**
 * Head-room the fit leaves for the growth that thickening and bridging add
 * (`make_stencil.py:208-209`). The name occupies the width between the margins
 * and the height below the reserved ring band.
 */
export const IDENTITY_BODY_WIDTH =
  IDENTITY_CANVAS -
  2 * IDENTITY_MARGIN -
  2 * (IDENTITY_THICKEN_PASSES + Math.floor(IDENTITY_BRIDGE_WIDTH / 2));

export const IDENTITY_BODY_HEIGHT =
  IDENTITY_CANVAS -
  2 * IDENTITY_MARGIN -
  IDENTITY_RING_BAND -
  2 * (IDENTITY_THICKEN_PASSES + Math.floor(IDENTITY_BRIDGE_WIDTH / 2));

/** An axis-aligned box. `width`/`height` are inclusive of both extremes. */
export interface StencilBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface StencilSvg {
  /** A path-only SVG: white background, black outlines, no `<text>`. */
  readonly svg: string;
  /** Pixel size the outlines are drawn at, after the fit-by-probe pass. */
  readonly fontSize: number;
  /** Where the outline bounding box lands on the canvas, in pixels. */
  readonly inkBox: StencilBox;
  /** Per-glyph x advances at `fontSize`, in pixels, in visual order. */
  readonly advances: readonly number[];
  /**
   * Every glyph of the run as closed polygons on the stencil canvas, in the
   * same pixel coordinates the painted mask uses.
   *
   * D-020: this is what the jump-ring carrier is chosen from. The old rule
   * looked at the finished raster and tried to tell a dot from a letter by how
   * big or how round its blob was, and three fix passes each found a name where
   * that guessed wrong. A contour of a base glyph is a fact of the font, known
   * before anything is painted.
   */
  readonly glyphs: readonly StencilGlyphOutline[];
}

/**
 * One closed contour of one glyph, flattened onto the stencil canvas.
 *
 * `points` is x, y pairs in canvas pixels, y down, in path order, without a
 * repeated closing point. `area` is the absolute polygon area in square pixels:
 * a counter (the hole of an `o`, the eye of an `e`) is wound the other way, and
 * only the magnitude matters when asking which contour is the stroke.
 */
export interface StencilContour {
  readonly points: readonly number[];
  readonly area: number;
  readonly box: StencilBox;
}

/** One shaped glyph, placed, with its contours in canvas pixels. */
export interface StencilGlyphOutline {
  /** Position in the shaped buffer, which HarfBuzz returns in visual order. */
  readonly index: number;
  readonly gid: number;
  readonly cluster: number;
  /** GDEF class; `IDENTITY_GLYPH_CLASS_MARK` is never a ring carrier. */
  readonly glyphClass: number;
  /** Union of the contour boxes. Empty glyphs (a space) have no contours. */
  readonly box: StencilBox;
  readonly contours: readonly StencilContour[];
}

interface Extents {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const EMPTY_EXTENTS = (): Extents => ({
  minX: Number.POSITIVE_INFINITY,
  minY: Number.POSITIVE_INFINITY,
  maxX: Number.NEGATIVE_INFINITY,
  maxY: Number.NEGATIVE_INFINITY,
});

function includePoint(box: Extents, x: number, y: number): void {
  if (x < box.minX) box.minX = x;
  if (x > box.maxX) box.maxX = x;
  if (y < box.minY) box.minY = y;
  if (y > box.maxY) box.maxY = y;
}

/** Value of a quadratic Bezier at `t`. */
function quadraticAt(p0: number, p1: number, p2: number, t: number): number {
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * p1 + t * t * p2;
}

/** Value of a cubic Bezier at `t`. */
function cubicAt(
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  t: number,
): number {
  const u = 1 - t;
  return (
    u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3
  );
}

/** Parameter in (0,1) where a quadratic Bezier reaches its extreme, if any. */
function quadraticExtreme(
  p0: number,
  p1: number,
  p2: number,
): number | undefined {
  const denominator = p0 - 2 * p1 + p2;
  if (denominator === 0) return undefined;
  const t = (p0 - p1) / denominator;
  return t > 0 && t < 1 ? t : undefined;
}

/**
 * Exact bounding box of one glyph outline in font units, offset by the pen
 * position. Curve extremes are solved rather than approximated by the control
 * hull, so the fit uses the ink the rasteriser will actually paint.
 */
function includePath(box: Extents, path: string, dx: number, dy: number): void {
  const tokens = path.match(/[MLQCZmlqcz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g);
  if (!tokens) return;
  let index = 0;
  let currentX = 0;
  let currentY = 0;
  let startX = 0;
  let startY = 0;
  const number = () => Number(tokens[index++] ?? 0);
  while (index < tokens.length) {
    const command = tokens[index++];
    switch (command) {
      case "M": {
        currentX = number() + dx;
        currentY = number() + dy;
        startX = currentX;
        startY = currentY;
        includePoint(box, currentX, currentY);
        break;
      }
      case "L": {
        currentX = number() + dx;
        currentY = number() + dy;
        includePoint(box, currentX, currentY);
        break;
      }
      case "Q": {
        const cx = number() + dx;
        const cy = number() + dy;
        const x = number() + dx;
        const y = number() + dy;
        includePoint(box, x, y);
        const tx = quadraticExtreme(currentX, cx, x);
        if (tx !== undefined)
          includePoint(box, quadraticAt(currentX, cx, x, tx), currentY);
        const ty = quadraticExtreme(currentY, cy, y);
        if (ty !== undefined)
          includePoint(box, currentX, quadraticAt(currentY, cy, y, ty));
        currentX = x;
        currentY = y;
        break;
      }
      case "C": {
        const c1x = number() + dx;
        const c1y = number() + dy;
        const c2x = number() + dx;
        const c2y = number() + dy;
        const x = number() + dx;
        const y = number() + dy;
        includePoint(box, x, y);
        for (const t of cubicExtremes(currentX, c1x, c2x, x))
          includePoint(box, cubicAt(currentX, c1x, c2x, x, t), currentY);
        for (const t of cubicExtremes(currentY, c1y, c2y, y))
          includePoint(box, currentX, cubicAt(currentY, c1y, c2y, y, t));
        currentX = x;
        currentY = y;
        break;
      }
      case "Z":
      case "z": {
        currentX = startX;
        currentY = startY;
        break;
      }
      default:
        // hb-js emits only absolute M, L, Q, C and Z; anything else is skipped
        // rather than silently mis-measured.
        break;
    }
  }
}

/** Parameters in (0,1) where a cubic Bezier reaches an extreme on one axis. */
function cubicExtremes(
  p0: number,
  p1: number,
  p2: number,
  p3: number,
): number[] {
  const a = -p0 + 3 * p1 - 3 * p2 + p3;
  const b = 2 * (p0 - 2 * p1 + p2);
  const c = p1 - p0;
  const roots: number[] = [];
  if (Math.abs(a) < 1e-9) {
    if (Math.abs(b) > 1e-9) roots.push(-c / b);
  } else {
    const discriminant = b * b - 4 * a * c;
    if (discriminant >= 0) {
      const root = Math.sqrt(discriminant);
      roots.push((-b + root) / (2 * a), (-b - root) / (2 * a));
    }
  }
  return roots.filter((t) => t > 0 && t < 1);
}

/** Pen position of every glyph in the run, in font units, y up. */
function penPositions(
  shaped: ShapedText,
): { x: number; y: number; glyph: ShapedGlyph }[] {
  let penX = 0;
  let penY = 0;
  const placed = shaped.glyphs.map((glyph) => {
    const position = {
      x: penX + glyph.xOffset,
      y: penY + glyph.yOffset,
      glyph,
    };
    penX += glyph.xAdvance;
    penY += glyph.yAdvance;
    return position;
  });
  return placed;
}

/**
 * Bounding box of the whole shaped run in font units. HarfBuzz returns the
 * buffer in visual order for both directions, so the pen advances left to right
 * for Arabic exactly as it does for Latin.
 */
function runExtents(shaped: ShapedText): Extents {
  const box = EMPTY_EXTENTS();
  for (const placed of penPositions(shaped))
    if (placed.glyph.path)
      includePath(box, placed.glyph.path, placed.x, placed.y);
  return box;
}

/**
 * Decimal places every coordinate the SVG carries is rounded to.
 *
 * Review finding 6: this was three, and three is lossless only because every
 * pinned face happens to be 1000 units per em, so `fontSize / upem` lands on a
 * short decimal. A face at 2048 upem - the normal value for a TrueType font -
 * would have the group scale rounded away and the fit slack, measured at 0.1 px
 * on classic `Asma`, would grow with the name. Six places is below a
 * ten-thousandth of a pixel at this canvas for any upem a font can declare.
 */
const IDENTITY_SVG_PRECISION = 6;

const PRECISION_FACTOR = 10 ** IDENTITY_SVG_PRECISION;

function rounded(value: number): number {
  return Math.round(value * PRECISION_FACTOR) / PRECISION_FACTOR;
}

/**
 * Builds the stencil SVG for one shaped run.
 *
 * Sizing is the lab's fit-by-probe (`make_stencil.py:207-219`): measure the run
 * at the probe size, scale it into the body box, then one refinement pass so a
 * long name lands inside the box. The run is centred horizontally and centred
 * vertically inside the body box, which starts below the reserved ring band.
 */
export function identityStencilSvg(shaped: ShapedText): StencilSvg {
  const extents = runExtents(shaped);
  // The text itself is never in an error message: these messages are stored in
  // category columns (`p_error_class`, `terminal_error_code`, `p_reason`), and
  // a customer's name has no business in one.
  if (!Number.isFinite(extents.minX) || !Number.isFinite(extents.minY))
    throw new IdentitySolverError(
      "identity_stencil_empty_outline",
      `identity_stencil_empty_outline:glyphs=${shaped.glyphs.length}`,
    );

  const unitWidth = extents.maxX - extents.minX;
  const unitHeight = extents.maxY - extents.minY;
  const clamp = (size: number) =>
    Math.max(
      IDENTITY_MIN_FONT_SIZE,
      Math.min(IDENTITY_MAX_FONT_SIZE, Math.trunc(size)),
    );
  const fitScale = (size: number) =>
    Math.min(
      IDENTITY_BODY_WIDTH / ((unitWidth * size) / shaped.upem),
      IDENTITY_BODY_HEIGHT / ((unitHeight * size) / shaped.upem),
    );

  let fontSize = clamp(
    IDENTITY_PROBE_FONT_SIZE * fitScale(IDENTITY_PROBE_FONT_SIZE),
  );
  const refinement = fitScale(fontSize);
  if (refinement < 0.97 || refinement > 1.03)
    fontSize = clamp(fontSize * refinement);

  const scale = fontSize / shaped.upem;
  const width = unitWidth * scale;
  const height = unitHeight * scale;
  // `clamp` stops at `IDENTITY_MIN_FONT_SIZE`, so a run long enough to need a
  // smaller size than that does not fit the body box at all. Drawing it anyway
  // pushed the ends of the name off the canvas and the customer got a clipped
  // pendant; the fit refuses instead, and the caller's gate turns that into
  // operator review.
  if (
    rounded(width) > IDENTITY_BODY_WIDTH ||
    rounded(height) > IDENTITY_BODY_HEIGHT
  )
    throw new IdentitySolverError(
      "identity_fit_overflow",
      `identity_fit_overflow:width=${rounded(width)},height=${rounded(height)},box=${IDENTITY_BODY_WIDTH}x${IDENTITY_BODY_HEIGHT},size=${fontSize}`,
    );
  const left = Math.floor((IDENTITY_CANVAS - width) / 2);
  const top =
    IDENTITY_MARGIN +
    IDENTITY_RING_BAND +
    Math.floor((IDENTITY_BODY_HEIGHT - height) / 2);

  // The group flips the y axis: inside it the coordinates are the font's own
  // units with y up, so each glyph is placed by its pen position untouched.
  const translateX = left - scale * extents.minX;
  const translateY = top + scale * extents.maxY;

  const paths = penPositions(shaped)
    .filter((placed) => placed.glyph.path)
    .map(
      (placed) =>
        `<path transform="translate(${rounded(placed.x)} ${rounded(placed.y)})" d="${placed.glyph.path}"/>`,
    )
    .join("");

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${IDENTITY_CANVAS}" height="${IDENTITY_CANVAS}" viewBox="0 0 ${IDENTITY_CANVAS} ${IDENTITY_CANVAS}">` +
    `<rect width="${IDENTITY_CANVAS}" height="${IDENTITY_CANVAS}" fill="#ffffff"/>` +
    `<g transform="translate(${rounded(translateX)} ${rounded(translateY)}) scale(${rounded(scale)} ${rounded(-scale)})" fill="#000000" fill-rule="nonzero">` +
    paths +
    `</g></svg>`;

  return {
    svg,
    fontSize,
    inkBox: {
      x: left,
      y: top,
      width: rounded(width),
      height: rounded(height),
    },
    advances: shaped.glyphs.map((glyph) => rounded(glyph.xAdvance * scale)),
    glyphs: stencilOutlines(shaped, scale, translateX, translateY),
  };
}

/* -------------------------------------------------------------------------
 * D-020: the outlines, flattened onto the stencil canvas.
 *
 * Everything below turns the same glyph paths the SVG carries into closed
 * polygons in canvas pixels. It exists so the solver can pick the metal a jump
 * ring hangs from before anything is painted: the largest contour of a base
 * glyph is a stroke, and a mark is a mark because the font's GDEF table says
 * so. Nothing here rasterises; the solver does that for the one contour it
 * chose.
 * ---------------------------------------------------------------------- */

/** One flattened contour while it is still being collected. */
interface ContourPoints {
  readonly points: number[];
}

/**
 * Flattens one glyph path into closed contours, in canvas pixels.
 *
 * The path is HarfBuzz's own `glyphToPath` output - absolute `M`, `L`, `Q`, `C`
 * and `Z` and nothing else - in font units with y up. `toCanvas` applies the
 * pen position, the fitted scale and the y flip, exactly the transform the SVG
 * group applies, so a point here is the pixel the painter paints.
 */
function flattenGlyphPath(
  path: string,
  toCanvasX: (value: number) => number,
  toCanvasY: (value: number) => number,
): ContourPoints[] {
  const tokens = path.match(/[MLQCZmlqcz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g);
  if (!tokens) return [];
  let index = 0;
  const number = () => Number(tokens[index++] ?? 0);
  const contours: ContourPoints[] = [];
  let current: ContourPoints | undefined;
  let currentX = 0;
  let currentY = 0;
  const emit = (x: number, y: number) => {
    if (!current) return;
    const px = toCanvasX(x);
    const py = toCanvasY(y);
    const length = current.points.length;
    // A flattened curve can land on the pixel it started from; a repeated
    // vertex is harmless to the fill but noise in the polygon, so it is dropped
    // here rather than in every consumer.
    if (
      length >= 2 &&
      current.points[length - 2] === px &&
      current.points[length - 1] === py
    )
      return;
    current.points.push(px, py);
  };
  while (index < tokens.length) {
    const command = tokens[index++];
    switch (command) {
      case "M": {
        currentX = number();
        currentY = number();
        current = { points: [] };
        contours.push(current);
        emit(currentX, currentY);
        break;
      }
      case "L": {
        currentX = number();
        currentY = number();
        emit(currentX, currentY);
        break;
      }
      case "Q": {
        const cx = number();
        const cy = number();
        const x = number();
        const y = number();
        for (
          let step = 1;
          step <= IDENTITY_CONTOUR_FLATTEN_SEGMENTS;
          step += 1
        ) {
          const t = step / IDENTITY_CONTOUR_FLATTEN_SEGMENTS;
          emit(
            quadraticAt(currentX, cx, x, t),
            quadraticAt(currentY, cy, y, t),
          );
        }
        currentX = x;
        currentY = y;
        break;
      }
      case "C": {
        const c1x = number();
        const c1y = number();
        const c2x = number();
        const c2y = number();
        const x = number();
        const y = number();
        for (
          let step = 1;
          step <= IDENTITY_CONTOUR_FLATTEN_SEGMENTS;
          step += 1
        ) {
          const t = step / IDENTITY_CONTOUR_FLATTEN_SEGMENTS;
          emit(
            cubicAt(currentX, c1x, c2x, x, t),
            cubicAt(currentY, c1y, c2y, y, t),
          );
        }
        currentX = x;
        currentY = y;
        break;
      }
      case "Z":
      case "z": {
        current = undefined;
        break;
      }
      default:
        break;
    }
  }
  return contours.filter((contour) => contour.points.length >= 6);
}

/** Absolute polygon area, by the shoelace sum. */
function polygonArea(points: readonly number[]): number {
  let twice = 0;
  for (let index = 0; index < points.length; index += 2) {
    const nextIndex = (index + 2) % points.length;
    twice +=
      (points[index] as number) * (points[nextIndex + 1] as number) -
      (points[nextIndex] as number) * (points[index + 1] as number);
  }
  return Math.abs(twice) / 2;
}

function polygonBox(points: readonly number[]): StencilBox {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < points.length; index += 2) {
    const x = points[index] as number;
    const y = points[index + 1] as number;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function unionBox(boxes: readonly StencilBox[]): StencilBox {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const box of boxes) {
    if (box.x < minX) minX = box.x;
    if (box.y < minY) minY = box.y;
    if (box.x + box.width > maxX) maxX = box.x + box.width;
    if (box.y + box.height > maxY) maxY = box.y + box.height;
  }
  if (!Number.isFinite(minX)) return { x: 0, y: 0, width: 0, height: 0 };
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Every glyph of the run, placed, with its contours on the canvas. Glyph order
 * is the shaped buffer's, which HarfBuzz returns in visual order for both
 * directions, so index 0 is the leftmost glyph in Arabic as well as in Latin.
 * The solver does not rely on that: it sorts by the measured box.
 */
function stencilOutlines(
  shaped: ShapedText,
  scale: number,
  translateX: number,
  translateY: number,
): StencilGlyphOutline[] {
  return penPositions(shaped).map((placed, index) => {
    const toCanvasX = (value: number) =>
      translateX + scale * (value + placed.x);
    const toCanvasY = (value: number) =>
      translateY - scale * (value + placed.y);
    const contours: StencilContour[] = flattenGlyphPath(
      placed.glyph.path,
      toCanvasX,
      toCanvasY,
    ).map((contour) => ({
      points: contour.points,
      area: polygonArea(contour.points),
      box: polygonBox(contour.points),
    }));
    return {
      index,
      gid: placed.glyph.gid,
      cluster: placed.glyph.cluster,
      glyphClass: placed.glyph.glyphClass,
      box: unionBox(contours.map((contour) => contour.box)),
      contours,
    };
  });
}
