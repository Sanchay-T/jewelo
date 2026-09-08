import { readFileSync } from "node:fs";
import {
  identityFontUrl,
  identityStencilSvg,
  INK_LUMINANCE_THRESHOLD,
  shapeText,
  solveIdentity,
  type IdentityConstructionMeasurement,
  type IdentityFontFile,
  type IdentityRasterizer,
  type IdentityScript,
  type IdentityValidationReport,
  type RasterMask,
  type TypesetResult,
} from "@jewelo/identity";
import sharp from "sharp";

interface IdentityAnchor {
  approvedText: string;
  language: "en" | "ar";
  typography: string;
  fingerprint: string;
}

export interface RenderedIdentityAnchor {
  svg?: Buffer;
  png: Buffer;
  pngSha256: string;
  fingerprint: string;
  report: IdentityValidationReport | Readonly<Record<string, unknown>>;
  /**
   * What the solver measured while it built the piece (P1-4): islands, bridges,
   * the ink-preservation counts and the re-centring transform. It rides beside
   * the report until P1-6 folds it in.
   */
  construction: IdentityConstructionMeasurement;
}

/**
 * Renders the identity stencil for one approved name.
 *
 * Both scripts go through the same solver since P1-3: the pinned bytes are
 * shaped with HarfBuzz, the outlines become a path-only 1024x1024 SVG, and the
 * solver bridges, thickens and welds the rings on that raster. No `<text>`
 * element and no font family name is involved anywhere, so no renderer and no
 * system font can change the spelling.
 */
export async function renderIdentityAnchor(
  anchor: IdentityAnchor,
  specification: Readonly<Record<string, unknown>>,
  pipelineRelease = "caleums-final-media-v1",
): Promise<RenderedIdentityAnchor> {
  const artifact = await solveIdentity(
    {
      approvedNames: approvedNames(anchor, specification),
      language: anchor.language,
      style: styleFor(anchor, specification),
      layout: String(specification.layout ?? "single-name"),
      connector: String(specification.connector ?? "none"),
      dimensions: dimensions(specification.dimensions),
      pipelineRelease,
    },
    new SharpIdentityRasterizer(),
  );
  return {
    png: Buffer.from(artifact.png),
    pngSha256: artifact.pngSha256,
    fingerprint: artifact.fingerprint,
    report: artifact.report,
    construction: artifact.construction,
  };
}

/**
 * The style the solver renders in. Arabic keeps `arabicStyle` (with the frozen
 * `contemporary` alias for `classic`); English reads the customer's `lettering`
 * choice, which is the field that carries it for the Latin script, and falls
 * back to `classic`.
 */
function styleFor(
  anchor: IdentityAnchor,
  specification: Readonly<Record<string, unknown>>,
): string {
  if (anchor.language === "ar") {
    const requested = String(specification.arabicStyle ?? "");
    return requested === "contemporary" ? "classic" : requested;
  }
  const lettering = String(specification.lettering ?? "");
  return lettering || "classic";
}

/**
 * The approved characters, exactly as the revision recorded them. Arabic reads
 * the per-name approved text; English keeps the whole anchor text as one run so
 * a two-name English pendant still renders as one piece.
 */
function approvedNames(
  anchor: IdentityAnchor,
  specification: Readonly<Record<string, unknown>>,
): string[] {
  if (anchor.language !== "ar") return [anchor.approvedText.trim()];
  const names = Array.isArray(specification.names)
    ? specification.names
        .map((value) =>
          value && typeof value === "object"
            ? String(
                (value as Record<string, unknown>).approvedArabicText ?? "",
              ).trim()
            : "",
        )
        .filter(Boolean)
    : anchor.approvedText.split(" & ").map((value) => value.trim());
  return names;
}

/**
 * The one rasteriser, for both scripts. It shapes the pinned bytes, turns the
 * outlines into a path-only SVG (`identityStencilSvg`) and paints that with
 * sharp. There is no `<text>` element and no font family name, so librsvg,
 * Pango and fontconfig cannot substitute a face; the raster is flattened onto
 * white and reduced to one channel, so the PNG carries no alpha and the
 * geometry ruler reads it under the luminance rule, exactly like the lab.
 */
class SharpIdentityRasterizer implements IdentityRasterizer {
  async typeset(input: {
    approvedText: string;
    fontFile: IdentityFontFile;
    script: IdentityScript;
  }): Promise<TypesetResult> {
    const shaped = await shapeText({
      fontBytes: fontBytes(input.fontFile),
      text: input.approvedText,
      script: input.script,
    });
    const { svg } = identityStencilSvg(shaped);
    const { data, info } = await sharp(Buffer.from(svg))
      .flatten({ background: "#ffffff" })
      .toColourspace("b-w")
      .raw()
      .toBuffer({ resolveWithObject: true });
    const ink = Uint8Array.from(data, (value) =>
      value < INK_LUMINANCE_THRESHOLD ? 1 : 0,
    );
    return {
      mask: { width: info.width, height: info.height, ink },
      shaping: shaped,
    };
  }

  async encodePng(mask: RasterMask): Promise<Uint8Array> {
    const pixels = Uint8Array.from(mask.ink, (value) => (value ? 0 : 255));
    return new Uint8Array(
      await sharp(pixels, {
        raw: { width: mask.width, height: mask.height, channels: 1 },
      })
        .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
        .toBuffer(),
    );
  }

  /**
   * Only the versions that actually touched this raster. Pango, FriBidi,
   * FreeType and sharp's own HarfBuzz no longer take part: shaping is
   * `@jewelo/identity`'s HarfBuzz WASM and it reports itself as
   * `harfbuzzShaper`. Listing them here would claim provenance we do not have.
   */
  shapingVersions(): Readonly<Record<string, string>> {
    return {
      sharp: sharp.versions.sharp ?? "unknown",
      libvips: sharp.versions.vips ?? "unknown",
    };
  }
}

const fontBytesCache = new Map<string, Uint8Array>();

/**
 * Bytes of a pinned font file. The URL is resolved from the identity package's
 * own module URL, never from `process.cwd()`, so the deployed Node buildpack
 * reads the same file the laptop does whatever directory it was started in.
 */
function fontBytes(file: string): Uint8Array {
  const cached = fontBytesCache.get(file);
  if (cached) return cached;
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(readFileSync(identityFontUrl(file)));
  } catch {
    throw new Error(`identity_font_missing:${file}`);
  }
  fontBytesCache.set(file, bytes);
  return bytes;
}

function dimensions(value: unknown) {
  const source =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  return {
    widthMm: Number(source.widthMm ?? 0),
    heightMm: Number(source.heightMm ?? 0),
    thicknessMm: Number(source.thicknessMm ?? 0),
  };
}
