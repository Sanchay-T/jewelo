import { createHash } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  CALEUMS_ARABIC_ENGINE_RELEASE,
  solveArabicIdentity,
  type ArabicIdentityRasterizer,
  type IdentityValidationReport,
  type RasterMask,
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
}

function xml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function identityAnchorSvg(
  anchor: IdentityAnchor,
  specification: Readonly<Record<string, unknown>>,
) {
  const layout = String(specification.layout ?? "single-name");
  const connector = String(specification.connector ?? "none");
  // Playfair Display is the pinned Latin face: a clean serif the image model can
  // reproduce and the name reader can read, unlike the retired Great Vibes
  // cursive. Weight 700 with -0.04em tracking fuses the glyphs into one pendant
  // body. Size the name to ~70% of the 1200px canvas from the font's own
  // bucketed advances, and cap it so a short name's 1.082em ascent and 0.251em
  // descent stay inside the 600px canvas.
  const characters = [...anchor.approvedText.trim()];
  const advanceEm =
    characters.reduce(
      (total, character) => total + latinAdvanceEm(character),
      0,
    ) -
    0.04 * Math.max(0, characters.length - 1);
  const fontSize = Math.max(90, Math.min(360, 840 / Math.max(0.5, advanceEm)));
  const baseline = Math.round(300 + fontSize * 0.3);
  const direction = anchor.language === "ar" ? "rtl" : "ltr";
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600" viewBox="0 0 1200 600">`,
    `<metadata>${xml(JSON.stringify({ fingerprint: anchor.fingerprint, layout, connector }))}</metadata>`,
    `<rect width="1200" height="600" fill="transparent"/>`,
    `<circle cx="255" cy="300" r="16" fill="none" stroke="#111" stroke-width="8"/>`,
    `<circle cx="945" cy="300" r="16" fill="none" stroke="#111" stroke-width="8"/>`,
    `<text x="600" y="${baseline}" text-anchor="middle" direction="${direction}" unicode-bidi="bidi-override" font-family="Playfair Display" font-weight="700" letter-spacing="-0.04em" font-size="${fontSize}" fill="#111">${xml(anchor.approvedText)}</text>`,
    `</svg>`,
  ].join("");
}

// Playfair Display hmtx advances scaled to the 700 instance, bucketed by glyph
// width so a name is sized from what it actually is rather than its length.
const LATIN_NARROW = new Set("IJfijlt");
const LATIN_WIDE = new Set("ADGHMNOQUVWmw");

function latinAdvanceEm(character: string): number {
  if (LATIN_NARROW.has(character)) return 0.31;
  if (LATIN_WIDE.has(character)) return 0.8;
  return character === character.toLowerCase() ? 0.52 : 0.66;
}

export async function renderIdentityAnchor(
  anchor: IdentityAnchor,
  specification: Readonly<Record<string, unknown>>,
  pipelineRelease = "caleums-final-media-v1",
): Promise<RenderedIdentityAnchor> {
  if (anchor.language === "ar") {
    const requestedStyle = String(specification.arabicStyle ?? "");
    const certifiedStyle =
      requestedStyle === "contemporary" ? "classic" : requestedStyle;
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
    const artifact = await solveArabicIdentity(
      {
        approvedNames: names,
        language: "ar",
        style: certifiedStyle,
        layout: String(specification.layout ?? "single-name"),
        connector: String(specification.connector ?? "none"),
        dimensions: dimensions(specification.dimensions),
        pipelineRelease,
      },
      new SharpArabicRasterizer(),
    );
    return {
      png: Buffer.from(artifact.png),
      pngSha256: artifact.pngSha256,
      fingerprint: artifact.fingerprint,
      report: artifact.report,
    };
  }

  // librsvg resolves "Playfair Display" only through the pinned fonts directory; the
  // deployed container has neither the customer typography nor DejaVu Sans, so
  // the unpinned stencil rendered blank.
  pinFontconfig();
  const svg = identityAnchorSvg(anchor, specification);
  const png = await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
    .toBuffer();
  return {
    svg: Buffer.from(svg),
    png,
    pngSha256: createHash("sha256").update(png).digest("hex"),
    fingerprint: anchor.fingerprint,
    report: {
      engineRelease: "caleums-latin-existing-v1",
      pipelineRelease,
      approvedCharacters: anchor.approvedText.normalize("NFC"),
      language: "en",
      jumpRingCount: 2,
      exactCharactersPreserved: true,
      passed: true,
    },
  };
}

class SharpArabicRasterizer implements ArabicIdentityRasterizer {
  async typeset(input: {
    approvedText: string;
    fontFile: "Amiri-Regular.ttf" | "ScheherazadeNew-Regular.ttf";
    fontSize: number;
    padding: number;
  }): Promise<RasterMask> {
    // Pango/HarfBuzz/FriBidi shaping through sharp's text input with an explicit
    // font file: librsvg ignores data-URI @font-face in the deployed container
    // and rendered a blank raster.
    pinFontconfig();
    // librsvg text layout (Pango without the lam-ya stacking libvips' text
    // input applies); the pinned fontconfig makes the family resolve to the
    // bundled file in every environment.
    const family = FONT_FAMILIES[input.fontFile] ?? "Noto Naskh Arabic";
    const text = sharp(
      Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="6000" height="1400"><rect width="6000" height="1400" fill="white"/><text x="3000" y="900" text-anchor="middle" direction="rtl" unicode-bidi="plaintext" lang="ar" font-family="${family}" font-size="${input.fontSize}" fill="black">${xml(input.approvedText)}</text></svg>`,
      ),
    );
    const { data, info } = await text
      .flatten({ background: "white" })
      .trim({ background: "white", threshold: 1 })
      .extend({
        top: input.padding,
        bottom: input.padding,
        left: input.padding,
        right: input.padding,
        background: "white",
      })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const ink = Uint8Array.from(data, (value) => (value < 128 ? 1 : 0));
    return { width: info.width, height: info.height, ink };
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

  shapingVersions(): Readonly<Record<string, string>> {
    return {
      sharp: sharp.versions.sharp ?? "unknown",
      libvips: sharp.versions.vips ?? "unknown",
      pango: sharp.versions.pango ?? "unknown",
      fribidi: sharp.versions.fribidi ?? "unknown",
      harfbuzz: sharp.versions.harfbuzz ?? "unknown",
      freetype: sharp.versions.freetype ?? "unknown",
    };
  }
}

// The deployed container ships system Arabic fonts; fontconfig would resolve
// "Amiri" to those instead of the pinned file. Point fontconfig at our fonts
// directory only, before the first render initialises it.
function pinFontconfig(): void {
  if (process.env.CALEUMS_FONTCONFIG_PINNED) return;
  const dir = dirname(fontPath("Amiri-Regular.ttf"));
  const conf = join(tmpdir(), "caleums-fonts.conf");
  writeFileSync(
    conf,
    `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>${dir}</dir><cachedir>${tmpdir()}/caleums-fc-cache</cachedir></fontconfig>`,
  );
  process.env.FONTCONFIG_FILE = conf;
  process.env.CALEUMS_FONTCONFIG_PINNED = "1";
}

const FONT_FAMILIES: Record<string, string> = {
  "NotoNaskhArabic-Regular.ttf": "Noto Naskh Arabic",
  "Amiri-Regular.ttf": "Amiri",
  "ScheherazadeNew-Regular.ttf": "Scheherazade New",
  "ArefRuqaa-Regular.ttf": "Aref Ruqaa",
  "NotoKufiArabic-Regular.ttf": "Noto Kufi Arabic",
  "rakkas.ttf": "Rakkas",
  "PlayfairDisplay-SemiBold.ttf": "Playfair Display",
};

function fontPath(file: string): string {
  const relative = `packages/identity/engines/${CALEUMS_ARABIC_ENGINE_RELEASE}/fonts/${file}`;
  const candidates = [
    resolve(process.cwd(), relative),
    resolve(process.cwd(), "../..", relative),
    resolve(process.cwd(), "..", relative),
  ];
  const found = candidates.find(existsSync);
  if (!found) throw new Error(`identity_font_missing:${file}`);
  return found;
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
