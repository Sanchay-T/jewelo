/**
 * P2-2. The pendant mask for a real photograph, and the similarity
 * registration that puts the deterministic stencil on top of it.
 *
 * Why it is built the way it is. The recipe Phase 2 originally proposed -
 * Sobel, one Otsu cut on the gradient, close at radius 3, fill holes, keep the
 * largest component, open at 1.5% of the width - was prototyped over the
 * corpus by the plan reviewer and does not find the pendant: the gradient
 * shatters into 84 to 4,263 components, the largest filled component covers
 * 0.4% to 24% of the frame, and the opening empties two masks outright while
 * being wider than a Playfair hairline (`docs/goals/road-to-gold/reviews/
 * phase2-plan-review.md`, B1). So:
 *
 * - hysteresis on the gradient, seeded at a measured percentile, instead of a
 *   single global cut, so a weak stretch of outline survives by touching a
 *   strong one rather than by being above a number;
 * - a close radius derived from the stroke width this image actually has,
 *   measured in a first pass and applied in a second, instead of a literal 3;
 * - no opening at any radius. A chain running through a ring is what a passing
 *   ring looks like (`VIEWER-RUBRIC.md:41`); an opening that strips the chain
 *   strips the evidence. Speckle is removed by dropping whole components below
 *   a configured fraction of the frame, which never thins what it keeps.
 *
 * The mask is edge based: the edges segment the frame, and only then is each
 * region decided. That decision - metal, or a hole - compares the region's own
 * mean colour to the background colour measured on this frame's border. It is
 * not a global colour threshold: nothing here picks the pendant out of the
 * image by its brightness, and the reference is re-measured per image rather
 * than assumed. Counters and ring holes have to survive, because P2-3's ring
 * gate reads them.
 *
 * Every number lives in `packages/config` (`photoMaskFields`) with a schema
 * floor. sharp is the only vendor here and it is already the raster port; the
 * pure geometry comes from `@jewelo/identity`.
 */
import type { PhotoMaskConfig } from "@jewelo/config";
import {
  dilateSquare,
  erodeSquare,
  label4,
  maskMoments,
  type MaskGeometryInput,
} from "@jewelo/identity";
import sharp from "sharp";

/** A pendant mask measured on a photograph, at the working resolution. */
export interface PhotoPendantMask extends MaskGeometryInput {
  readonly ink: Uint8Array;
  /** Ink pixels over frame pixels. */
  readonly coverage: number;
  /** 4-connected components kept after the speckle rule. */
  readonly components: number;
  /** The stroke width measured in pass one, in working pixels. */
  readonly strokeWidth: number;
  /** The close radius pass two used, in working pixels. */
  readonly closeRadius: number;
  /** Gradient magnitudes the hysteresis used, for the record. */
  readonly gradientHigh: number;
  readonly gradientLow: number;
  /** `masked`, or `mask_empty` when nothing survived. */
  readonly status: "masked" | "mask_empty";
  /**
   * Intermediates, present only when the caller asked for them. They exist so
   * a human can see which step lost the pendant instead of guessing from a
   * coverage number; nothing in the pipeline reads them.
   */
  readonly trace?: {
    readonly edges: Uint8Array;
    readonly closedEdges: Uint8Array;
    readonly firstPass: Uint8Array;
  };
}

/**
 * A similarity transform from stencil coordinates to photograph coordinates,
 * in units of each image's own width so it does not depend on either
 * resolution: `scale` 1 means the pendant fills the same fraction of the photo
 * that the name fills of the stencil.
 */
export interface SimilarityTransform {
  readonly scale: number;
  readonly rotationDegrees: number;
  /** Translation in photograph widths. */
  readonly translateX: number;
  readonly translateY: number;
}

export type RegistrationStatus = "registered" | "registration_failed";

export interface RegistrationResult {
  readonly transform: SimilarityTransform;
  /**
   * Intersection over union of the registered stencil and the photo mask.
   * Only meaningful when `status` is `registered`; when the transform left the
   * configured bounds the caller must report the failure, not this number.
   */
  readonly iou: number;
  readonly status: RegistrationStatus;
  /** Which bound was left, when the registration failed. */
  readonly reason: string | null;
  /** How far the mapped stencil centre sits from the photo centre, in widths. */
  readonly centreOffset: number;
}

/** A 3x3 binomial blur, the one smoothing pass before the gradient. */
const GAUSSIAN_3X3 = {
  width: 3,
  height: 3,
  kernel: [1, 2, 1, 2, 4, 2, 1, 2, 1],
  scale: 16,
  offset: 0,
} as const;

/** ITU-R 601-2 luma, the same transform `decode-mask.ts` uses. */
function luma601(red: number, green: number, blue: number): number {
  return (red * 299 + green * 587 + blue * 114) / 1000;
}

interface WorkingImage {
  readonly width: number;
  readonly height: number;
  /** Interleaved RGB at the working resolution. */
  readonly rgb: Uint8Array;
  readonly luma: Float32Array;
}

/**
 * Decode, downscale and smooth. sharp's `convolve` does the smoothing because
 * it is unsigned and clamping is harmless there; the Sobel that follows is
 * computed here instead, because `convolve` clamps its output to the channel
 * depth and would destroy the sign of the derivative.
 */
async function loadWorkingImage(
  bytes: Uint8Array | Buffer,
  workWidth: number,
): Promise<WorkingImage> {
  const { data, info } = await sharp(bytes, { failOn: "error" })
    .removeAlpha()
    .resize({ width: workWidth, height: workWidth, fit: "inside" })
    .toColourspace("srgb")
    .convolve(GAUSSIAN_3X3)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  if (channels !== 3)
    throw new Error(
      `photo-mask: expected 3 raw channels, received ${String(channels)}`,
    );
  const rgb = new Uint8Array(data.buffer, data.byteOffset, width * height * 3);
  const luma = new Float32Array(width * height);
  for (let pixel = 0; pixel < luma.length; pixel += 1) {
    const offset = pixel * 3;
    luma[pixel] = luma601(
      rgb[offset] as number,
      rgb[offset + 1] as number,
      rgb[offset + 2] as number,
    );
  }
  return { width, height, rgb, luma };
}

/**
 * Sobel gradient magnitude of the smoothed luminance.
 *
 * Deliberately without non-maximum suppression. Thinning the ridge to one
 * pixel was tried and measured: it turns the letters from solid to hollow, and
 * the mask then depends entirely on the colour of the interior region, which
 * collapses on white gold photographed on white marble - on
 * `framed-minimal-noor-en-a1` the mask came back as a bare outline and the
 * studio pass median fell from 0.335 to 0.240. Polished gold carries enough
 * internal shading that the un-thinned gradient fills the piece, which is what
 * makes this mask edge based rather than colour based: the piece is found by
 * the fact that it has structure, not by the fact that it is yellow.
 */
function gradientMagnitude(image: WorkingImage): Float32Array {
  const { width, height, luma } = image;
  const magnitude = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      const nw = luma[index - width - 1] as number;
      const n = luma[index - width] as number;
      const ne = luma[index - width + 1] as number;
      const w = luma[index - 1] as number;
      const e = luma[index + 1] as number;
      const sw = luma[index + width - 1] as number;
      const s = luma[index + width] as number;
      const se = luma[index + width + 1] as number;
      const gx = ne + 2 * e + se - (nw + 2 * w + sw);
      const gy = sw + 2 * s + se - (nw + 2 * n + ne);
      magnitude[index] = Math.hypot(gx, gy);
    }
  }
  return magnitude;
}

/**
 * The value at `fraction` of the gradient distribution, via a 1024-bin
 * histogram over the ridge pixels only.
 *
 * Only the non-zero magnitudes count. The one pixel border the Sobel cannot
 * reach is zero and must not be allowed to shift the percentile, and the rule
 * keeps holding if a later change ever thins the ridge.
 */
function magnitudePercentile(
  magnitude: Float32Array,
  fraction: number,
): number {
  let peak = 0;
  let ridge = 0;
  for (const value of magnitude)
    if (value > 0) {
      ridge += 1;
      if (value > peak) peak = value;
    }
  if (peak <= 0 || ridge === 0) return 0;
  const bins = 1024;
  const histogram = new Int32Array(bins);
  for (const value of magnitude) {
    if (value <= 0) continue;
    const bin = Math.min(bins - 1, Math.floor((value / peak) * bins));
    histogram[bin] = (histogram[bin] as number) + 1;
  }
  const wanted = fraction * ridge;
  let seen = 0;
  for (let bin = 0; bin < bins; bin += 1) {
    seen += histogram[bin] as number;
    if (seen >= wanted) return ((bin + 1) / bins) * peak;
  }
  return peak;
}

/**
 * Canny's hysteresis without the thinning: every pixel above `high` is an
 * edge, and every pixel above `low` that is 8-connected to one becomes an edge
 * too. The thinning is deliberately skipped - a two pixel wide outline is what
 * the close is sized against, and a one pixel skeleton breaks more often.
 */
function hysteresisEdges(
  width: number,
  height: number,
  magnitude: Float32Array,
  high: number,
  low: number,
): Uint8Array {
  const edges = new Uint8Array(width * height);
  const stack = new Int32Array(width * height);
  let top = 0;
  for (let index = 0; index < edges.length; index += 1) {
    if ((magnitude[index] as number) < high) continue;
    edges[index] = 1;
    stack[top] = index;
    top += 1;
  }
  while (top > 0) {
    top -= 1;
    const index = stack[top] as number;
    const x = index % width;
    const y = (index - x) / width;
    for (let dy = -1; dy <= 1; dy += 1) {
      const ny = y + dy;
      if (ny < 0 || ny >= height) continue;
      for (let dx = -1; dx <= 1; dx += 1) {
        const nx = x + dx;
        if (nx < 0 || nx >= width) continue;
        const neighbour = ny * width + nx;
        if (edges[neighbour] === 1) continue;
        if ((magnitude[neighbour] as number) < low) continue;
        edges[neighbour] = 1;
        stack[top] = neighbour;
        top += 1;
      }
    }
  }
  return edges;
}

/** Closing: dilate then erode by the same square, leaving the frame border alone. */
function closeMask(
  width: number,
  height: number,
  ink: Uint8Array,
  radius: number,
): Uint8Array {
  if (radius <= 0) return ink.slice();
  return erodeSquare(
    width,
    height,
    dilateSquare(width, height, ink, radius),
    radius,
    1,
  );
}

/**
 * Turn a closed edge map into a pendant mask.
 *
 * The edges cut the frame into regions. The region that owns most of the frame
 * border is the background, and its mean colour is the reference. Every other
 * region whose mean colour sits within `tolerance` of that reference is a hole
 * - a counter, a ring hole, a gap the piece does not fill - and everything
 * else is metal. Edge pixels themselves are metal, because the outline sits on
 * the boundary of the piece - and on these packshots polished gold carries so
 * much internal shading that the hysteresis fills the letters solid rather
 * than tracing them, which is why an "only regions count" rule was tried and
 * discarded: it dropped every letter on `classical-en-a1`, whose entire
 * pendant is edge and whose only regions are the backdrop and the counters.
 */
function maskFromEdges(
  image: WorkingImage,
  closedEdges: Uint8Array,
  tolerance: number,
  minComponentFraction: number,
): { ink: Uint8Array; components: number } {
  const { width, height, rgb } = image;
  const regions = label4(width, height, closedEdges, (value) => value === 0);
  const borderVotes = new Int32Array(regions.count + 1);
  for (let x = 0; x < width; x += 1) {
    const top = regions.labels[x] as number;
    const bottom = regions.labels[(height - 1) * width + x] as number;
    borderVotes[top] = (borderVotes[top] as number) + 1;
    borderVotes[bottom] = (borderVotes[bottom] as number) + 1;
  }
  for (let y = 0; y < height; y += 1) {
    const left = regions.labels[y * width] as number;
    const right = regions.labels[y * width + width - 1] as number;
    borderVotes[left] = (borderVotes[left] as number) + 1;
    borderVotes[right] = (borderVotes[right] as number) + 1;
  }
  let background = 0;
  for (let region = 1; region <= regions.count; region += 1)
    if ((borderVotes[region] as number) > (borderVotes[background] as number))
      background = region;

  const sizes = new Float64Array(regions.count + 1);
  const sumR = new Float64Array(regions.count + 1);
  const sumG = new Float64Array(regions.count + 1);
  const sumB = new Float64Array(regions.count + 1);
  for (let index = 0; index < regions.labels.length; index += 1) {
    const region = regions.labels[index] as number;
    if (region === 0) continue;
    const offset = index * 3;
    sizes[region] = (sizes[region] as number) + 1;
    sumR[region] = (sumR[region] as number) + (rgb[offset] as number);
    sumG[region] = (sumG[region] as number) + (rgb[offset + 1] as number);
    sumB[region] = (sumB[region] as number) + (rgb[offset + 2] as number);
  }

  const isMetal = new Uint8Array(regions.count + 1);
  if (background === 0) {
    // No region at all: every pixel is edge. Nothing can be classified.
    return { ink: new Uint8Array(width * height), components: 0 };
  }
  const backgroundSize = sizes[background] as number;
  const referenceR = (sumR[background] as number) / backgroundSize;
  const referenceG = (sumG[background] as number) / backgroundSize;
  const referenceB = (sumB[background] as number) / backgroundSize;
  for (let region = 1; region <= regions.count; region += 1) {
    if (region === background) continue;
    const size = sizes[region] as number;
    const distance =
      (Math.abs((sumR[region] as number) / size - referenceR) +
        Math.abs((sumG[region] as number) / size - referenceG) +
        Math.abs((sumB[region] as number) / size - referenceB)) /
      3;
    isMetal[region] = distance > tolerance ? 1 : 0;
  }

  const candidate = new Uint8Array(width * height);
  for (let index = 0; index < candidate.length; index += 1) {
    const region = regions.labels[index] as number;
    candidate[index] = region === 0 || isMetal[region] === 1 ? 1 : 0;
  }

  // Drop whole components below the configured fraction of the frame. This is
  // the speckle rule and it is not an opening: it never thins a component it
  // keeps, so a hairline and a chain both survive it intact.
  const pieces = label4(width, height, candidate, (value) => value !== 0);
  const area = new Float64Array(pieces.count + 1);
  for (let index = 0; index < candidate.length; index += 1) {
    const piece = pieces.labels[index] as number;
    if (piece === 0) continue;
    area[piece] = (area[piece] as number) + 1;
  }
  const minimum = minComponentFraction * width * height;
  let components = 0;
  const keep = new Uint8Array(pieces.count + 1);
  for (let piece = 1; piece <= pieces.count; piece += 1) {
    if ((area[piece] as number) < minimum) continue;
    keep[piece] = 1;
    components += 1;
  }
  const ink = new Uint8Array(width * height);
  for (let index = 0; index < ink.length; index += 1) {
    const piece = pieces.labels[index] as number;
    ink[index] = piece !== 0 && keep[piece] === 1 ? 1 : 0;
  }
  return { ink, components };
}

/**
 * The stroke width of the piece, in working pixels: a low percentile of the
 * lengths of the ink runs that are bounded on both sides, taken along rows and
 * columns and capped at a quarter of the frame so a run down the length of a
 * bar cannot count.
 *
 * A low percentile, not the median and not the mode. Both of those land on the
 * stem - 15 px on a 384 px working copy of the lab's Playfair packshots - and
 * a close at half a stem merged `Asma` into one blob with its counters gone
 * (measured on `classical-en-a1`). The thinnest structural feature is what the
 * close must not swallow, so the percentile is configuration and its default
 * lands on the hairline.
 *
 * This is the number the close radius is derived from, which is the whole
 * point of measuring it: a literal 3 is a different physical size on every
 * image.
 */
function measureStrokeWidth(
  width: number,
  height: number,
  ink: Uint8Array,
  fraction: number,
): number {
  const cap = Math.max(2, Math.floor(width / 4));
  const runs: number[] = [];
  const scan = (
    outer: number,
    inner: number,
    at: (a: number, b: number) => number,
  ) => {
    for (let a = 0; a < outer; a += 1) {
      let run = 0;
      let bounded = false;
      for (let b = 0; b < inner; b += 1) {
        if (ink[at(a, b)] !== 0) {
          run += 1;
          continue;
        }
        if (run > 0 && bounded && run <= cap) runs.push(run);
        run = 0;
        bounded = true;
      }
    }
  };
  scan(height, width, (y, x) => y * width + x);
  scan(width, height, (x, y) => y * width + x);
  if (runs.length === 0) return 1;
  runs.sort((a, b) => a - b);
  return Math.max(
    1,
    runs[Math.floor(fraction * (runs.length - 1))] as number,
  );
}

/** Builds the pendant mask for one photograph. */
export async function buildPhotoPendantMask(
  bytes: Uint8Array | Buffer,
  config: PhotoMaskConfig,
  options: { readonly trace?: boolean } = {},
): Promise<PhotoPendantMask> {
  const image = await loadWorkingImage(bytes, config.PHOTO_MASK_WORK_WIDTH);
  const { width, height } = image;
  const magnitude = gradientMagnitude(image);
  const high = magnitudePercentile(
    magnitude,
    config.PHOTO_MASK_GRADIENT_HIGH_PERCENTILE,
  );
  const low = high * config.PHOTO_MASK_HYSTERESIS_LOW_RATIO;
  const edges = hysteresisEdges(width, height, magnitude, high, low);

  const seedRadius = Math.max(
    1,
    Math.round(config.PHOTO_MASK_SEED_CLOSE_FRACTION * width),
  );
  const seedClosed = closeMask(width, height, edges, seedRadius);
  const firstPass = maskFromEdges(
    image,
    seedClosed,
    config.PHOTO_MASK_BACKGROUND_TOLERANCE,
    config.PHOTO_MASK_MIN_COMPONENT_FRACTION,
  );
  const strokeWidth = measureStrokeWidth(
    width,
    height,
    firstPass.ink,
    config.PHOTO_MASK_STROKE_PERCENTILE,
  );
  const closeRadius = Math.min(
    Math.max(
      1,
      Math.round(config.PHOTO_MASK_CLOSE_STROKE_FACTOR * strokeWidth),
    ),
    Math.max(1, Math.round(config.PHOTO_MASK_CLOSE_RADIUS_MAX_FRACTION * width)),
  );
  const closed =
    closeRadius === seedRadius
      ? seedClosed
      : closeMask(width, height, edges, closeRadius);
  const secondPass =
    closeRadius === seedRadius
      ? firstPass
      : maskFromEdges(
          image,
          closed,
          config.PHOTO_MASK_BACKGROUND_TOLERANCE,
          config.PHOTO_MASK_MIN_COMPONENT_FRACTION,
        );

  let inkPixels = 0;
  for (const value of secondPass.ink) if (value !== 0) inkPixels += 1;
  return {
    width,
    height,
    ink: secondPass.ink,
    coverage: inkPixels / (width * height),
    components: secondPass.components,
    strokeWidth,
    closeRadius,
    gradientHigh: high,
    gradientLow: low,
    status: inkPixels === 0 ? "mask_empty" : "masked",
    ...(options.trace === true
      ? { trace: { edges, closedEdges: closed, firstPass: firstPass.ink } }
      : {}),
  };
}

/** Nearest-neighbour downsample of a binary mask onto a grid `width` wide. */
function resampleMask(
  input: MaskGeometryInput,
  width: number,
): MaskGeometryInput {
  if (input.width <= width) return input;
  const height = Math.max(1, Math.round((input.height * width) / input.width));
  const ink = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(
      input.height - 1,
      Math.floor(((y + 0.5) * input.height) / height),
    );
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(
        input.width - 1,
        Math.floor(((x + 0.5) * input.width) / width),
      );
      ink[y * width + x] = input.ink[sourceY * input.width + sourceX] as number;
    }
  }
  return { width, height, ink };
}

interface Candidate {
  scale: number;
  rotation: number;
  translateX: number;
  translateY: number;
}

/**
 * IoU of the stencil, mapped by `candidate`, against the photo mask. Both
 * coordinate systems are normalised by their own width, so `scale` is the same
 * number whatever resolution either image is held at.
 */
function scoreCandidate(
  stencil: MaskGeometryInput,
  photo: MaskGeometryInput,
  candidate: Candidate,
): number {
  const { scale, rotation, translateX, translateY } = candidate;
  if (!(scale > 0)) return 0;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const photoWidth = photo.width;
  const stencilWidth = stencil.width;
  // Photo pixel -> normalised photo -> normalised stencil -> stencil pixel.
  const a = (cos / scale) * (stencilWidth / photoWidth);
  const b = (sin / scale) * (stencilWidth / photoWidth);
  const shiftX = translateX * photoWidth;
  const shiftY = translateY * photoWidth;
  let intersection = 0;
  let union = 0;
  for (let y = 0; y < photo.height; y += 1) {
    const dy = y - shiftY;
    for (let x = 0; x < photo.width; x += 1) {
      const dx = x - shiftX;
      const u = Math.round(a * dx + b * dy);
      const v = Math.round(-b * dx + a * dy);
      const inStencil =
        u >= 0 &&
        v >= 0 &&
        u < stencil.width &&
        v < stencil.height &&
        stencil.ink[v * stencil.width + u] !== 0;
      const inPhoto = photo.ink[y * photo.width + x] !== 0;
      if (inStencil && inPhoto) intersection += 1;
      if (inStencil || inPhoto) union += 1;
    }
  }
  return union === 0 ? 0 : intersection / union;
}

/** Where the stencil centre lands, in photo widths from the photo centre. */
function centreOffsetOf(
  stencil: MaskGeometryInput,
  photo: MaskGeometryInput,
  candidate: Candidate,
): number {
  const stencilMoments = maskMoments(stencil);
  const cos = Math.cos(candidate.rotation);
  const sin = Math.sin(candidate.rotation);
  const u = stencilMoments.centreX / stencil.width;
  const v = stencilMoments.centreY / stencil.width;
  const x = candidate.scale * (cos * u - sin * v) + candidate.translateX;
  const y = candidate.scale * (sin * u + cos * v) + candidate.translateY;
  const centreX = 0.5;
  const centreY = photo.height / photo.width / 2;
  return Math.hypot(x - centreX, y - centreY);
}

/**
 * Registers the stencil onto the photo mask with a similarity transform -
 * uniform scale, in-plane rotation, translation, and nothing else, because
 * nothing else is physically available to a packshot of a flat piece.
 *
 * The start comes from image moments: the square root of the area ratio is the
 * scale, the difference of the principal axes is the rotation (both the axis
 * and its opposite are tried, since a second-moment axis has no direction, and
 * an upright start is tried as well), and matching the centroids gives the
 * translation. It is then refined by coordinate descent with a halving step,
 * scored by IoU on a grid whose width is configuration.
 *
 * If the winning transform leaves the configured bounds the result is
 * `registration_failed` with the bound it left. That is not the same event as
 * a low IoU and the caller must not read it as one: a low IoU says the
 * photograph shows a different shape, a failed registration says the search
 * never found a placement worth scoring.
 */
export function registerStencilToPhoto(
  stencilMask: MaskGeometryInput,
  photoMask: MaskGeometryInput,
  config: PhotoMaskConfig,
): RegistrationResult {
  const photo = resampleMask(photoMask, config.PHOTO_REGISTRATION_SCORE_WIDTH);
  // The stencil is sampled at its own resolution: the scoring loop already
  // subsamples it once, and downscaling it first would drop a hairline twice.
  const stencil = stencilMask;
  const photoMoments = maskMoments(photo);
  const stencilMoments = maskMoments(stencil);
  const empty: SimilarityTransform = {
    scale: 0,
    rotationDegrees: 0,
    translateX: 0,
    translateY: 0,
  };
  if (photoMoments.area === 0 || stencilMoments.area === 0)
    return {
      transform: empty,
      iou: 0,
      status: "registration_failed",
      reason: photoMoments.area === 0 ? "photo mask empty" : "stencil empty",
      centreOffset: 0,
    };

  // Areas are pixel counts on each grid; normalising both by the square of the
  // grid width turns the ratio into the scale in width units.
  const photoArea = photoMoments.area / (photo.width * photo.width);
  const stencilArea = stencilMoments.area / (stencil.width * stencil.width);
  const startScale = Math.sqrt(photoArea / stencilArea);
  const startRotations = [
    photoMoments.angle - stencilMoments.angle,
    photoMoments.angle - stencilMoments.angle + Math.PI,
    0,
  ];

  // The bounds are enforced inside the search, which is what "a bounded
  // search" means: a candidate outside them is never scored, so the winner can
  // never be an upside-down placement that happened to overlap a symmetric
  // frame slightly better. Measured: without this, 6 of the studio rows came
  // back at 176 to 179 degrees because `framed-minimal`'s rectangle is nearly
  // symmetric under a half turn.
  const photoCentreX = 0.5;
  const photoCentreY = photo.height / photo.width / 2;
  const stencilCentreU = stencilMoments.centreX / stencil.width;
  const stencilCentreV = stencilMoments.centreY / stencil.width;
  const withinBounds = (candidate: Candidate): boolean => {
    if (
      candidate.scale < config.PHOTO_REGISTRATION_SCALE_MIN ||
      candidate.scale > config.PHOTO_REGISTRATION_SCALE_MAX
    )
      return false;
    let degrees = (candidate.rotation * 180) / Math.PI;
    degrees = ((((degrees + 180) % 360) + 360) % 360) - 180;
    if (Math.abs(degrees) > config.PHOTO_REGISTRATION_ROTATION_MAX_DEGREES)
      return false;
    const cos = Math.cos(candidate.rotation);
    const sin = Math.sin(candidate.rotation);
    const x =
      candidate.scale * (cos * stencilCentreU - sin * stencilCentreV) +
      candidate.translateX;
    const y =
      candidate.scale * (sin * stencilCentreU + cos * stencilCentreV) +
      candidate.translateY;
    return (
      Math.hypot(x - photoCentreX, y - photoCentreY) <=
      config.PHOTO_REGISTRATION_TRANSLATION_MAX_FRACTION
    );
  };

  const translationFor = (scale: number, rotation: number): Candidate => {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const u = stencilMoments.centreX / stencil.width;
    const v = stencilMoments.centreY / stencil.width;
    return {
      scale,
      rotation,
      translateX: photoMoments.centreX / photo.width - scale * (cos * u - sin * v),
      translateY: photoMoments.centreY / photo.width - scale * (sin * u + cos * v),
    };
  };

  /**
   * One coordinate descent: try both directions on each of the four
   * parameters at the current step, take any improvement, and halve every step
   * when no move helps. Bounded by construction - the steps only shrink - and
   * scored by IoU, which is the only thing that decides.
   */
  const descend = (
    grid: MaskGeometryInput,
    start: Candidate,
    rounds: number,
  ): { candidate: Candidate; score: number } => {
    let current = { ...start };
    let score = withinBounds(current) ? scoreCandidate(stencil, grid, current) : -1;
    let scaleStep = 0.12;
    let rotationStep = (8 * Math.PI) / 180;
    let translationStep = 0.04;
    for (let round = 0; round < rounds; round += 1) {
      let improved = true;
      while (improved) {
        improved = false;
        const moves: Candidate[] = [
          { ...current, scale: current.scale * (1 + scaleStep) },
          { ...current, scale: current.scale * (1 - scaleStep) },
          { ...current, rotation: current.rotation + rotationStep },
          { ...current, rotation: current.rotation - rotationStep },
          { ...current, translateX: current.translateX + translationStep },
          { ...current, translateX: current.translateX - translationStep },
          { ...current, translateY: current.translateY + translationStep },
          { ...current, translateY: current.translateY - translationStep },
        ];
        for (const move of moves) {
          if (!withinBounds(move)) continue;
          const moveScore = scoreCandidate(stencil, grid, move);
          if (moveScore > score) {
            score = moveScore;
            current = move;
            improved = true;
          }
        }
      }
      scaleStep /= 2;
      rotationStep /= 2;
      translationStep /= 2;
    }
    return { candidate: current, score };
  };

  // Triage every start on a coarse grid, then refine only the winner.
  const coarse = resampleMask(photo, config.PHOTO_REGISTRATION_COARSE_WIDTH);
  const starts = config.PHOTO_REGISTRATION_SCALE_STARTS;
  const span = config.PHOTO_REGISTRATION_SCALE_SPAN;
  let coarseBest: Candidate | null = null;
  let coarseScore = -1;
  for (const rotation of startRotations) {
    for (let step = 0; step < starts; step += 1) {
      const exponent =
        starts === 1 ? 0 : (2 * step) / (starts - 1) - 1; // -1 .. 1
      const scale = startScale * Math.pow(span, exponent);
      const { candidate, score } = descend(coarse, translationFor(scale, rotation), 4);
      if (score > 0 && score > coarseScore) {
        coarseScore = score;
        coarseBest = candidate;
      }
    }
  }
  let best: Candidate | null = null;
  let bestScore = -1;
  if (coarseBest !== null) {
    const refined = descend(
      photo,
      coarseBest,
      config.PHOTO_REGISTRATION_REFINE_ROUNDS,
    );
    best = refined.candidate;
    bestScore = refined.score;
  }
  if (best === null)
    return {
      transform: empty,
      iou: 0,
      status: "registration_failed",
      reason: "no candidate",
      centreOffset: 0,
    };

  // Fold the rotation into (-180, 180] before it is judged against the bound.
  let rotationDegrees = (best.rotation * 180) / Math.PI;
  rotationDegrees = ((((rotationDegrees + 180) % 360) + 360) % 360) - 180;
  const transform: SimilarityTransform = {
    scale: best.scale,
    rotationDegrees,
    translateX: best.translateX,
    translateY: best.translateY,
  };
  const centreOffset = centreOffsetOf(stencil, photo, best);

  // The search could not leave the bounds, so the only way to fail here is for
  // no bounded placement to have touched the mask at all. That is a different
  // event from a low IoU and is reported as one: a low IoU says the photograph
  // shows a different shape in the right place, `registration_failed` says
  // there was no placement inside the bounds worth scoring.
  const reason =
    bestScore > 0
      ? null
      : `no similarity transform inside the configured bounds overlaps the mask (moment scale ${startScale.toFixed(3)}, centre offset ${centreOffset.toFixed(3)})`;

  return {
    transform,
    iou: reason === null ? bestScore : 0,
    status: reason === null ? "registered" : "registration_failed",
    reason,
    centreOffset,
  };
}

/**
 * Rasterises the stencil under a transform onto a grid the size of the photo
 * mask. The contact sheet draws the outline of this; P2-3's ring gate will
 * read anchors through the same mapping, so it lives beside the registration
 * rather than in the script.
 */
export function projectStencil(
  stencilMask: MaskGeometryInput,
  photoMask: MaskGeometryInput,
  transform: SimilarityTransform,
): Uint8Array {
  const { width, height } = photoMask;
  const projected = new Uint8Array(width * height);
  if (!(transform.scale > 0)) return projected;
  const rotation = (transform.rotationDegrees * Math.PI) / 180;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const a = (cos / transform.scale) * (stencilMask.width / width);
  const b = (sin / transform.scale) * (stencilMask.width / width);
  const shiftX = transform.translateX * width;
  const shiftY = transform.translateY * width;
  for (let y = 0; y < height; y += 1) {
    const dy = y - shiftY;
    for (let x = 0; x < width; x += 1) {
      const dx = x - shiftX;
      const u = Math.round(a * dx + b * dy);
      const v = Math.round(-b * dx + a * dy);
      if (u < 0 || v < 0 || u >= stencilMask.width || v >= stencilMask.height)
        continue;
      projected[y * width + x] = stencilMask.ink[v * stencilMask.width + u] as number;
    }
  }
  return projected;
}
