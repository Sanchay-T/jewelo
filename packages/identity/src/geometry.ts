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

/** `[minX, minY, maxX, maxY]`, inclusive, in pixels. */
export type MaskBoundingBox = readonly [number, number, number, number];

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
  // `binary_fill_holes` fills. Label the background, then discard every region
  // that touches an edge pixel.
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
  const holeSizes = new Int32Array(background.count + 1);
  for (let index = 0; index < background.labels.length; index += 1) {
    const region = background.labels[index] as number;
    if (region === 0) continue;
    holeSizes[region] = (holeSizes[region] as number) + 1;
  }
  const enclosed: number[] = [];
  for (let region = 1; region <= background.count; region += 1) {
    if (touchesBorder[region] === 1) continue;
    enclosed.push(holeSizes[region] as number);
  }
  enclosed.sort((a, b) => b - a);

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
