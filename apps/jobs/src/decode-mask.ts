/**
 * PNG bytes -> binary ink mask, the decode half of the independent geometry
 * ruler. This module owns sharp so `packages/identity` stays free of native
 * dependencies; the measurement itself lives in `@jewelo/identity`'s
 * `measureMask`, which never sees the renderer's in-memory mask.
 *
 * Faithful port of `ink_mask` in `docs/goals/overnight-launch/lab/verify_stencil.py`
 * (lines 18-23): when the image carries alpha (RGBA, LA, or a palette with
 * transparency) a pixel is ink when alpha > 96; otherwise the image is
 * converted to greyscale and a pixel is ink when luminance < 128.
 */
import {
  INK_ALPHA_THRESHOLD,
  INK_LUMINANCE_THRESHOLD,
  type DecodedIdentityMask,
  type MaskInkRule,
} from "@jewelo/identity";
import sharp from "sharp";

/**
 * Which of the two Python branches decided the mask, and the decoded mask that
 * carries it. Both are declared in `@jewelo/identity` beside the ruler, because
 * the solver's rasteriser port returns this shape (P1-6); they are re-exported
 * here so the decoder still names its own result type.
 */
export type { MaskInkRule };
export type DecodedMask = DecodedIdentityMask;

/**
 * Who measured it. The solver copies this string into
 * `validation_report.measured.measuredBy` (adversarial finding 5), so the
 * stored report names the decoder that actually read the bytes - and the sharp
 * version it read them with - rather than a constant the engine wrote about
 * itself.
 */
const RULER_ID = `decodeMask@sharp${sharp.versions.sharp ?? "unknown"}`;

/**
 * PIL's `convert("L")` uses the ITU-R 601-2 luma transform with the integer
 * coefficients 299/587/114 and rounding. libvips' greyscale conversion uses
 * different (Rec. 709) coefficients, so the luminance is computed here rather
 * than delegated to sharp, otherwise the Node and Python gates would disagree
 * on borderline pixels.
 */
function luma601(red: number, green: number, blue: number): number {
  return Math.round((red * 299 + green * 587 + blue * 114) / 1000);
}

/** Decodes PNG (or any sharp-readable) bytes into a binary ink mask. */
export async function decodeMask(
  bytes: Uint8Array | Buffer,
): Promise<DecodedMask> {
  const image = sharp(bytes, { failOn: "error" });
  const metadata = await image.metadata();
  const hasAlpha = metadata.hasAlpha === true;
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  if (channels !== 4) {
    throw new Error(
      `decodeMask: expected 4 raw channels, received ${String(channels)}`,
    );
  }

  const ink = new Uint8Array(width * height);
  for (let pixel = 0; pixel < ink.length; pixel += 1) {
    const offset = pixel * 4;
    if (hasAlpha) {
      ink[pixel] = (data[offset + 3] as number) > INK_ALPHA_THRESHOLD ? 1 : 0;
      continue;
    }
    const luminance = luma601(
      data[offset] as number,
      data[offset + 1] as number,
      data[offset + 2] as number,
    );
    ink[pixel] = luminance < INK_LUMINANCE_THRESHOLD ? 1 : 0;
  }

  return {
    width,
    height,
    ink,
    rule: hasAlpha ? "alpha" : "luminance",
    rulerId: RULER_ID,
  };
}
