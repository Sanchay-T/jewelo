/**
 * The independent geometry ruler.
 *
 * This is a faithful port of `docs/goals/overnight-launch/lab/verify_stencil.py`
 * (`ink_mask` and `report`, lines 18-44): 4-connected ink components, enclosed
 * holes (background regions that never reach the image border) with their sizes,
 * the ink bounding box and the ink pixel count.
 *
 * The module is deliberately pure: no sharp, no node-only imports, no access to
 * the renderer's in-memory mask. It measures a decoded PNG and nothing else, so
 * the report can never agree with the renderer by construction. Decoding lives
 * in `apps/jobs/src/decode-mask.ts`, which owns the native dependency.
 */

/** Alpha above this value is ink, for images that carry an alpha channel. */
export const INK_ALPHA_THRESHOLD = 96;

/** Luminance below this value is ink, for images without an alpha channel. */
export const INK_LUMINANCE_THRESHOLD = 128;

/** The Python reports at most this many hole sizes, largest first. */
export const MAX_REPORTED_HOLE_SIZES = 8;

/** A decoded binary mask: one byte per pixel, non-zero means ink. */
export interface MaskGeometryInput {
  readonly width: number;
  readonly height: number;
  readonly ink: Uint8Array;
}

/**
 * Which of the two ink branches the decoder took. Declared here, beside the
 * ruler, because the solver's report carries it (P1-6) and `packages/identity`
 * must not import the decoder, which owns sharp.
 */
export type MaskInkRule = "alpha" | "luminance";

/** A decoded mask plus the branch that decided it: what `decodePng` returns. */
export interface DecodedMaskGeometryInput extends MaskGeometryInput {
  readonly rule: MaskInkRule;
}

/** `[minX, minY, maxX, maxY]`, inclusive, in pixels. */
export type MaskBoundingBox = readonly [number, number, number, number];

/** One enclosed background region: how big it is and where its centroid is. */
export interface MaskHole {
  readonly size: number;
  readonly centreX: number;
  readonly centreY: number;
}

/**
 * Every enclosed hole in a mask, plus a lookup that answers "which hole, if
 * any, contains this pixel". The lookup is what turns "there are five holes"
 * into "the two ring holes are still open": a ring centre that lands in no hole
 * is a ring that was filled in.
 */
export interface MaskHoleGeometry {
  readonly holes: readonly MaskHole[];
  /** Index into `holes`, or -1 when the pixel is ink or an open region. */
  readonly regionAt: (x: number, y: number) => number;
}

export interface MaskGeometryReport {
  readonly width: number;
  readonly height: number;
  /** Number of ink pixels. */
  readonly inkPixels: number;
  /** 4-connected ink components. */
  readonly components: number;
  /** Enclosed background regions (4-connected) that do not touch the border. */
  readonly holes: number;
  /** The largest hole sizes in pixels, descending, capped at eight entries. */
  readonly holeSizes: readonly number[];
  /** Bounding box of the ink, or null when the mask is empty. */
  readonly bbox: MaskBoundingBox | null;
}

/** The result of `label4`: a label per pixel, and how many labels there are. */
export interface Label4Result {
  /** One label per pixel; 0 means the pixel is not part of any region. */
  readonly labels: Int32Array;
  /** Number of regions found; labels run from 1 to this value. */
  readonly count: number;
}

/**
 * Labels 4-connected regions of `pixels` where `predicate(value)` holds.
 * Returns the label image (0 means "not part of a region") and the label count.
 *
 * Exported because the solver's island detection (P1-4) must use the same
 * labeller the ruler uses: two implementations of "one piece" would eventually
 * disagree, and the disagreement would ship as a broken pendant.
 */
export function label4(
  width: number,
  height: number,
  pixels: Uint8Array,
  wanted: (value: number) => boolean,
): Label4Result {
  const labels = new Int32Array(width * height);
  const stack = new Int32Array(width * height);
  let count = 0;

  for (let seed = 0; seed < labels.length; seed += 1) {
    if (labels[seed] !== 0 || !wanted(pixels[seed] as number)) continue;
    count += 1;
    let top = 0;
    stack[top] = seed;
    top += 1;
    labels[seed] = count;
    while (top > 0) {
      top -= 1;
      const index = stack[top] as number;
      const x = index % width;
      const y = (index - x) / width;
      if (x > 0) {
        const left = index - 1;
        if (labels[left] === 0 && wanted(pixels[left] as number)) {
          labels[left] = count;
          stack[top] = left;
          top += 1;
        }
      }
      if (x + 1 < width) {
        const right = index + 1;
        if (labels[right] === 0 && wanted(pixels[right] as number)) {
          labels[right] = count;
          stack[top] = right;
          top += 1;
        }
      }
      if (y > 0) {
        const up = index - width;
        if (labels[up] === 0 && wanted(pixels[up] as number)) {
          labels[up] = count;
          stack[top] = up;
          top += 1;
        }
      }
      if (y + 1 < height) {
        const down = index + width;
        if (labels[down] === 0 && wanted(pixels[down] as number)) {
          labels[down] = count;
          stack[top] = down;
          top += 1;
        }
      }
    }
  }

  return { labels, count };
}

const isInk = (value: number) => value !== 0;
const isBackground = (value: number) => value === 0;

/**
 * Finds every enclosed background region (4-connected) that does not reach the
 * border - exactly what `binary_fill_holes` would fill - with its size, its
 * centroid and a pixel lookup. `measureMask` reports the same regions; this is
 * the detailed view a ring gate needs.
 */
export function findMaskHoles(input: MaskGeometryInput): MaskHoleGeometry {
  const { width, height, ink } = input;
  const background = label4(width, height, ink, isBackground);
  const touchesBorder = new Uint8Array(background.count + 1);
  for (let x = 0; x < width; x += 1) {
    touchesBorder[background.labels[x] as number] = 1;
    touchesBorder[background.labels[(height - 1) * width + x] as number] = 1;
  }
  for (let y = 0; y < height; y += 1) {
    touchesBorder[background.labels[y * width] as number] = 1;
    touchesBorder[background.labels[y * width + width - 1] as number] = 1;
  }

  const sizes = new Float64Array(background.count + 1);
  const sumX = new Float64Array(background.count + 1);
  const sumY = new Float64Array(background.count + 1);
  for (let index = 0; index < background.labels.length; index += 1) {
    const region = background.labels[index] as number;
    if (region === 0 || touchesBorder[region] === 1) continue;
    const x = index % width;
    sizes[region] = (sizes[region] as number) + 1;
    sumX[region] = (sumX[region] as number) + x;
    sumY[region] = (sumY[region] as number) + (index - x) / width;
  }

  const order = new Int32Array(background.count + 1).fill(-1);
  const holes: MaskHole[] = [];
  for (let region = 1; region <= background.count; region += 1) {
    if (touchesBorder[region] === 1) continue;
    order[region] = holes.length;
    holes.push({
      size: sizes[region] as number,
      centreX: (sumX[region] as number) / (sizes[region] as number),
      centreY: (sumY[region] as number) / (sizes[region] as number),
    });
  }

  return {
    holes,
    regionAt: (x, y) => {
      if (
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        x < 0 ||
        y < 0 ||
        x >= width ||
        y >= height
      )
        return -1;
      const region = background.labels[y * width + x] as number;
      if (region === 0 || touchesBorder[region] === 1) return -1;
      return order[region] as number;
    },
  };
}

/**
 * Measures a decoded mask. Equivalent to `report()` in `verify_stencil.py`:
 * `ndimage.label` with the 4-connected structure over the ink, then
 * `binary_fill_holes` minus the ink, labelled the same way, for the holes.
 */
export function measureMask(input: MaskGeometryInput): MaskGeometryReport {
  const { width, height, ink } = input;
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new Error(
      `measureMask: invalid mask size ${String(width)}x${String(height)}`,
    );
  }
  if (ink.length !== width * height) {
    throw new Error(
      `measureMask: mask length ${String(ink.length)} does not match ${String(width)}x${String(height)}`,
    );
  }

  const inkComponents = label4(width, height, ink, isInk);

  let inkPixels = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let index = 0; index < ink.length; index += 1) {
    if (ink[index] === 0) continue;
    inkPixels += 1;
    const x = index % width;
    const y = (index - x) / width;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  // A hole is a background region that never reaches the border, which is what
  // `binary_fill_holes` fills. `findMaskHoles` labels the background and drops
  // every region that touches an edge pixel; one implementation serves both the
  // count reported here and the per-hole lookup the ring gate uses.
  const enclosed = findMaskHoles(input)
    .holes.map((hole) => hole.size)
    .sort((a, b) => b - a);

  return {
    width,
    height,
    inkPixels,
    components: inkComponents.count,
    holes: enclosed.length,
    holeSizes: enclosed.slice(0, MAX_REPORTED_HOLE_SIZES),
    bbox: maxX < 0 ? null : [minX, minY, maxX, maxY],
  };
}

/**
 * Dilation by a square of ones with an odd side of `2 * radius + 1`, with the
 * outside of the canvas treated as background. Separable: one horizontal pass
 * over a running window count and then one vertical pass, so it is O(width *
 * height) whatever the radius is.
 *
 * `caleums-arabic-v3.ts` carries its own `dilate` and `erodeSquare`. Those are
 * private to the stencil solver, fixed at the ring-anchor erosion side and at
 * scipy's `border_value=0`, and one of them mutates a `RasterMask` in place.
 * These two are the generic pair the photo mask needs: any radius, either
 * border value, a plain `Uint8Array` in and a new one out. Merging the four
 * into one pair means editing the solver, which P2-2 may not touch; it is
 * recorded as a follow-up rather than done half way.
 */
export function dilateSquare(
  width: number,
  height: number,
  ink: Uint8Array,
  radius: number,
): Uint8Array {
  if (radius <= 0) return ink.slice();
  const horizontal = new Uint8Array(ink.length);
  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    let inWindow = 0;
    for (let x = 0; x <= radius && x < width; x += 1)
      if (ink[row + x] !== 0) inWindow += 1;
    for (let x = 0; x < width; x += 1) {
      horizontal[row + x] = inWindow > 0 ? 1 : 0;
      const leaving = x - radius;
      if (leaving >= 0 && ink[row + leaving] !== 0) inWindow -= 1;
      const entering = x + radius + 1;
      if (entering < width && ink[row + entering] !== 0) inWindow += 1;
    }
  }
  const dilated = new Uint8Array(ink.length);
  for (let x = 0; x < width; x += 1) {
    let inWindow = 0;
    for (let y = 0; y <= radius && y < height; y += 1)
      if (horizontal[y * width + x] !== 0) inWindow += 1;
    for (let y = 0; y < height; y += 1) {
      dilated[y * width + x] = inWindow > 0 ? 1 : 0;
      const leaving = y - radius;
      if (leaving >= 0 && horizontal[leaving * width + x] !== 0) inWindow -= 1;
      const entering = y + radius + 1;
      if (entering < height && horizontal[entering * width + x] !== 0)
        inWindow += 1;
    }
  }
  return dilated;
}

/**
 * Erosion by the same square. `outside` says what lies beyond the canvas: 0 is
 * scipy's default and eats a border of `radius` pixels, 1 leaves the border
 * alone. A closing built from `dilateSquare` then `erodeSquare(outside = 1)`
 * therefore seals gaps without shaving anything that runs off the frame - a
 * chain leaving the top of a packshot, for instance.
 */
export function erodeSquare(
  width: number,
  height: number,
  ink: Uint8Array,
  radius: number,
  outside: 0 | 1,
): Uint8Array {
  if (radius <= 0) return ink.slice();
  const horizontal = new Uint8Array(ink.length);
  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    let set = 0;
    for (let x = 0; x <= radius && x < width; x += 1)
      if (ink[row + x] !== 0) set += 1;
    for (let x = 0; x < width; x += 1) {
      const from = x - radius;
      const to = x + radius;
      const clipped = Math.max(0, -from) + Math.max(0, to - (width - 1));
      const inside = to - from + 1 - clipped;
      horizontal[row + x] =
        set === inside && (outside === 1 || clipped === 0) ? 1 : 0;
      if (from >= 0 && ink[row + from] !== 0) set -= 1;
      const entering = to + 1;
      if (entering < width && ink[row + entering] !== 0) set += 1;
    }
  }
  const eroded = new Uint8Array(ink.length);
  for (let x = 0; x < width; x += 1) {
    let set = 0;
    for (let y = 0; y <= radius && y < height; y += 1)
      if (horizontal[y * width + x] !== 0) set += 1;
    for (let y = 0; y < height; y += 1) {
      const from = y - radius;
      const to = y + radius;
      const clipped = Math.max(0, -from) + Math.max(0, to - (height - 1));
      const inside = to - from + 1 - clipped;
      eroded[y * width + x] =
        set === inside && (outside === 1 || clipped === 0) ? 1 : 0;
      if (from >= 0 && horizontal[from * width + x] !== 0) set -= 1;
      const entering = to + 1;
      if (entering < height && horizontal[entering * width + x] !== 0) set += 1;
    }
  }
  return eroded;
}

/**
 * Zeroth, first and second image moments of a binary mask: the ink area, the
 * centroid, the central second moments and the angle of the principal axis.
 *
 * This is what initialises a similarity registration (P2-2): the centroid
 * gives the translation, the square root of the area ratio gives the uniform
 * scale, and the difference of the two principal angles gives the in-plane
 * rotation. The angle is in radians, in the half-open range [-pi/2, pi/2),
 * because a second-moment axis has no direction - the caller resolves the
 * 180 degree ambiguity by scoring both hypotheses.
 */
export interface MaskMoments {
  readonly area: number;
  readonly centreX: number;
  readonly centreY: number;
  /** Central second moments, normalised by the area. */
  readonly mu20: number;
  readonly mu11: number;
  readonly mu02: number;
  /** Principal axis angle in radians, or 0 for an empty or isotropic mask. */
  readonly angle: number;
}

export function maskMoments(input: MaskGeometryInput): MaskMoments {
  const { width, ink } = input;
  let area = 0;
  let sumX = 0;
  let sumY = 0;
  for (let index = 0; index < ink.length; index += 1) {
    if (ink[index] === 0) continue;
    const x = index % width;
    area += 1;
    sumX += x;
    sumY += (index - x) / width;
  }
  if (area === 0)
    return { area: 0, centreX: 0, centreY: 0, mu20: 0, mu11: 0, mu02: 0, angle: 0 };
  const centreX = sumX / area;
  const centreY = sumY / area;
  let mu20 = 0;
  let mu11 = 0;
  let mu02 = 0;
  for (let index = 0; index < ink.length; index += 1) {
    if (ink[index] === 0) continue;
    const x = index % width;
    const dx = x - centreX;
    const dy = (index - x) / width - centreY;
    mu20 += dx * dx;
    mu11 += dx * dy;
    mu02 += dy * dy;
  }
  mu20 /= area;
  mu11 /= area;
  mu02 /= area;
  const angle =
    mu20 === mu02 && mu11 === 0 ? 0 : 0.5 * Math.atan2(2 * mu11, mu20 - mu02);
  return { area, centreX, centreY, mu20, mu11, mu02, angle };
}
