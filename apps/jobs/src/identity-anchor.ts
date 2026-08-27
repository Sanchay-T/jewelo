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
  const fontSize = Math.max(
    84,
    Math.min(190, 720 / Math.max(4, [...anchor.approvedText].length)),
  );
  const direction = anchor.language === "ar" ? "rtl" : "ltr";
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600" viewBox="0 0 1200 600">`,
    `<metadata>${xml(JSON.stringify({ fingerprint: anchor.fingerprint, layout, connector }))}</metadata>`,
    `<rect width="1200" height="600" fill="transparent"/>`,
    `<path d="M40 300 H255 M945 300 H1160" stroke="#111" stroke-width="10" fill="none"/>`,
    `<circle cx="255" cy="300" r="16" fill="none" stroke="#111" stroke-width="8"/>`,
    `<circle cx="945" cy="300" r="16" fill="none" stroke="#111" stroke-width="8"/>`,
    `<text x="600" y="330" text-anchor="middle" direction="${direction}" unicode-bidi="bidi-override" font-family="${xml(anchor.typography)}, DejaVu Sans" font-size="${fontSize}" font-weight="500" fill="#111">${xml(anchor.approvedText)}</text>`,
    `<text x="600" y="540" text-anchor="middle" font-family="DejaVu Sans" font-size="20" fill="#111">${xml(`${layout}|${connector}|${anchor.fingerprint}`)}</text>`,
    `</svg>`,
  ].join("");
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
    const text = sharp({
      text: {
        text: `<span font_family="${input.fontFile.startsWith("Amiri") ? "Amiri" : "Scheherazade New"}" size="${input.fontSize * 1024}">${xml(input.approvedText)}</span>`,
        fontfile: fontPath(input.fontFile),
        width: 6000,
        wrap: "none",
        align: "centre",
        rgba: true,
        dpi: 72,
      },
    });
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
