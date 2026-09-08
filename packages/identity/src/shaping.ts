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
 * glyph outlines as SVG path data in font units. `P1-3` fills those paths.
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

  const buffer = new hb.Buffer();
  buffer.addCodePoints(codePoints);
  buffer.setDirection(properties.direction);
  buffer.setScript(properties.script);
  buffer.setLanguage(properties.language);
  hb.shape(font, buffer);
  const shaped = buffer.getGlyphInfosAndPositions();

  const glyphs: ShapedGlyph[] = shaped.map((glyph) => ({
    gid: glyph.codepoint,
    cluster: glyph.cluster,
    xAdvance: glyph.xAdvance ?? 0,
    yAdvance: glyph.yAdvance ?? 0,
    xOffset: glyph.xOffset ?? 0,
    yOffset: glyph.yOffset ?? 0,
    path: font.glyphToPath(glyph.codepoint),
  }));

  // A code point is covered when some cluster claims its index and the font has
  // a real glyph for it. The cluster check catches a code point HarfBuzz
  // dropped; the nominal-glyph check catches one the font never had, which is
  // the tofu case that used to reach a customer as a wrong pendant.
  const clusters = glyphs.map((glyph) => glyph.cluster);
  // Cluster values partition the input: the run starts at the smallest cluster
  // and every later index falls inside the range opened by some cluster, so an
  // index is claimed when a cluster starts at or before it and no cluster
  // points past the end of the text.
  const firstCluster = clusters.length ? Math.min(...clusters) : 1;
  const lastCluster = clusters.length ? Math.max(...clusters) : -1;
  const clustersInRange = lastCluster < codePoints.length;
  const uncoveredCodePoints: number[] = [];
  for (let index = 0; index < codePoints.length; index += 1) {
    const codePoint = codePoints[index] ?? 0;
    const claimed = clustersInRange && index >= firstCluster;
    if (!claimed || font.nominalGlyph(codePoint) === undefined)
      uncoveredCodePoints.push(codePoint);
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
    exactCharactersPreserved:
      glyphs.length > 0 &&
      notdefGlyphs === 0 &&
      uncoveredCodePoints.length === 0,
    harfbuzzVersion: hb.versionString(),
  };
}
