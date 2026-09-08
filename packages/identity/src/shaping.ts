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
  const loaded: LoadedFace = { font, upem: face.upem, sha256 };
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
  const { font, upem, sha256 } = await loadFace(input.fontBytes);
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
 * metal before a ring is anchored (`np.ones((11, 11), bool)`). A dot, a hamza
 * or a hairline serif does not survive it, so it can never carry the chain.
 */
export const IDENTITY_RING_ANCHOR_EROSION = 11;

/**
 * Fractions of the name's width searched for the anchor, widening until the
 * eroded body has a pixel in the band (`for frac in (0.18, 0.32, 0.50)`).
 */
export const IDENTITY_RING_ANCHOR_SPANS: readonly number[] = Object.freeze([
  0.18, 0.32, 0.5,
]);

/**
 * How far outward of the anchor the ring centre sits, as a fraction of the
 * outer radius (`int(RING_OUTER * 0.75)`). Outward means away from the middle
 * of the name, so the ring never buries the dot or serif that carries the
 * spelling.
 */
export const IDENTITY_RING_OUTWARD_FRACTION = 0.75;

/** Smallest gap kept between the ring's top edge and the canvas top edge. */
export const IDENTITY_RING_TOP_CLEARANCE = 2;

/** Where the weld fillet starts below the ring hole (`cy + RING_INNER + 4`). */
export const IDENTITY_RING_WELD_START_GAP = 4;

/** How far into the stroke the weld fillet ends (`ay + 14`). */
export const IDENTITY_RING_WELD_ANCHOR_DEPTH = 14;

/**
 * How far the ring may be lifted above the position `add_rings` computes, in
 * pixels, to keep the ring hole clear of the name's own ink.
 *
 * The lab stops at one position, so on a name whose hairline rises above the
 * load-bearing anchor the hole clips a few dozen pixels off that hairline. The
 * fit already reserves `IDENTITY_RING_BAND` of empty canvas above the lettering
 * for exactly this, so the solver spends it: it lifts the ring, one pixel at a
 * time, until nothing of the name lies inside the hole.
 */
export const IDENTITY_RING_MAX_LIFT = IDENTITY_RING_BAND;

/**
 * Radius of the weld zone around a ring's anchor pixel, in pixels.
 *
 * Adversarial finding 2: `drawDisk(..., IDENTITY_RING_OUTER, 1)` only adds ink,
 * so a ring that lands on top of a floating dot or a hairline fuses it into the
 * ring metal - a different letter, with every other gate still green. The weld
 * is the one place the ring is *meant* to touch the name: the body sinks
 * `IDENTITY_RING_WELD_OVERLAP` into the stroke and the fillet is
 * `IDENTITY_RING_STEM_WIDTH` wide, so metal within that reach of the anchor is
 * the joint. Anything the ring covers further out than this is a letter under
 * the metal, and `identity_ring_welded_to_glyph` refuses it.
 */
export const IDENTITY_RING_WELD_ZONE =
  IDENTITY_RING_STEM_WIDTH + IDENTITY_RING_WELD_OVERLAP;

/**
 * How far outward of its computed centre a ring may be pushed, in pixels, when
 * lifting alone cannot get the annulus off the lettering. Outward is away from
 * the middle of the name, and the ring still has to stay inside the canvas, so
 * this is capped at one ring diameter's worth of travel.
 */
export const IDENTITY_RING_MAX_OUTWARD_SHIFT = IDENTITY_RING_OUTER;

/** Weld fillet width in pixels (`int(STEM_W * 1.3)`). */
export const IDENTITY_RING_WELD_WIDTH = Math.trunc(
  IDENTITY_RING_STEM_WIDTH * 1.3,
);

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

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
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
    throw new Error(
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
    round3(width) > IDENTITY_BODY_WIDTH ||
    round3(height) > IDENTITY_BODY_HEIGHT
  )
    throw new Error(
      `identity_fit_overflow:width=${round3(width)},height=${round3(height)},box=${IDENTITY_BODY_WIDTH}x${IDENTITY_BODY_HEIGHT},size=${fontSize}`,
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
        `<path transform="translate(${round3(placed.x)} ${round3(placed.y)})" d="${placed.glyph.path}"/>`,
    )
    .join("");

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${IDENTITY_CANVAS}" height="${IDENTITY_CANVAS}" viewBox="0 0 ${IDENTITY_CANVAS} ${IDENTITY_CANVAS}">` +
    `<rect width="${IDENTITY_CANVAS}" height="${IDENTITY_CANVAS}" fill="#ffffff"/>` +
    `<g transform="translate(${round3(translateX)} ${round3(translateY)}) scale(${round3(scale)} ${round3(-scale)})" fill="#000000" fill-rule="nonzero">` +
    paths +
    `</g></svg>`;

  return {
    svg,
    fontSize,
    inkBox: {
      x: left,
      y: top,
      width: round3(width),
      height: round3(height),
    },
    advances: shaped.glyphs.map((glyph) => round3(glyph.xAdvance * scale)),
  };
}
