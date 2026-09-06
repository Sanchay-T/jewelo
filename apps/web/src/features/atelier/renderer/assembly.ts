import { specification, type Draft } from "../model";

export type AssemblySpec = ReturnType<typeof assemblySpec>;
/** Customer text is deliberately excluded: this renderer uses fixed Asma/Fatima exemplars. */
export function assemblySpec(draft: Draft) {
  const d = specification(draft);
  const language = d.script === "Arabic" ? "arabic" : "english";
  const style = (
    {
      Classic: "classic",
      Minimal: "minimal",
      Diwani: "diwani",
      Kufi: "kufi",
      Signature: "signature",
      "Thuluth inspired": "thuluth",
    } as const
  )[d.lettering];
  return {
    version: 1 as const,
    script: d.script,
    construction: d.construction,
    lettering: d.lettering,
    twoNames: d.twoNames,
    layout: d.twoNames ? d.layout : null,
    metal: d.metal,
    coverage: d.coverage,
    gem: d.coverage === "No stones" ? null : d.gem,
    size: d.size,
    chain: d.chain,
    outlines: [
      `/atelier/geometry/v1/${language}-${style}-asma.svg`,
      ...(d.twoNames
        ? [`/atelier/geometry/v1/${language}-${style}-fatima.svg`]
        : []),
    ],
  };
}
export function assemblyKey(draft: Draft): string {
  return JSON.stringify(assemblySpec(draft));
}

export type Point2 = { x: number; y: number };
/** Incenter and radius of an inscribed disk, guaranteed inside this filled triangle. */
export function triangleSeat(a: Point2, b: Point2, c: Point2) {
  const ab = Math.hypot(a.x - b.x, a.y - b.y),
    bc = Math.hypot(b.x - c.x, b.y - c.y),
    ca = Math.hypot(c.x - a.x, c.y - a.y);
  const perimeter = ab + bc + ca;
  if (perimeter < 1e-10) return { x: a.x, y: a.y, radius: 0 };
  return {
    x: (bc * a.x + ca * b.x + ab * c.x) / perimeter,
    y: (bc * a.y + ca * b.y + ab * c.y) / perimeter,
    radius:
      Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) /
      perimeter,
  };
}
/** Selection tiers share one ordered placement set; every accent is also partial/full. */
export function stoneIndices(
  count: number,
  coverage: "No stones" | "Accent" | "Partial pavé" | "Full pavé",
) {
  if (coverage === "No stones" || count === 0) return [];
  if (coverage === "Accent") return [0];
  return Array.from({ length: count }, (_, i) => i).filter(
    (i) => coverage === "Full pavé" || i < Math.ceil(count / 3),
  );
}
/** Piecewise planar fold; x/y contours and counters remain untouched. */
export function foldedDepth(x: number) {
  const phase = (((x / 2.3) % 2) + 2) % 2;
  return (phase <= 1 ? phase : 2 - phase) * 0.42 - 0.21;
}
/** Gentle torso profile used for every camera's identical assembled chain. */
export function torsoDepth(x: number, radius = 100) {
  return Math.sqrt(Math.max(0, radius * radius - x * x)) - radius;
}

export type FilledContour = { outer: Point2[]; holes: Point2[][] };
function inPolygon(point: Point2, polygon: Point2[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!,
      b = polygon[j]!;
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}
function edgeDistance(point: Point2, polygon: Point2[]) {
  let distance = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!,
      b = polygon[(i + 1) % polygon.length]!,
      dx = b.x - a.x,
      dy = b.y - a.y;
    const t = Math.max(
      0,
      Math.min(
        1,
        ((point.x - a.x) * dx + (point.y - a.y) * dy) /
          (dx * dx + dy * dy || 1),
      ),
    );
    distance = Math.min(
      distance,
      Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy),
    );
  }
  return distance;
}
/** Signed usable clearance to both the metal silhouette and every counter. */
export function surfaceClearance(point: Point2, contour: FilledContour) {
  if (
    !inPolygon(point, contour.outer) ||
    contour.holes.some((hole) => inPolygon(point, hole))
  )
    return -1;
  return Math.min(
    edgeDistance(point, contour.outer),
    ...contour.holes.map((hole) => edgeDistance(point, hole)),
  );
}
/** Dense deterministic circle packing across filled strokes, independent of triangulation. */
export function packedStoneSeats(
  contours: FilledContour[],
  minRadius = 0.115,
  maxRadius = 0.18,
) {
  const points = contours.flatMap((c) => c.outer);
  if (!points.length) return [];
  const minX = Math.min(...points.map((p) => p.x)),
    maxX = Math.max(...points.map((p) => p.x)),
    minY = Math.min(...points.map((p) => p.y)),
    maxY = Math.max(...points.map((p) => p.y));
  const step = minRadius * 0.8,
    candidates: { x: number; y: number; radius: number }[] = [];
  let row = 0;
  for (let y = minY + step / 2; y < maxY; y += (step * Math.sqrt(3)) / 2, row++)
    for (
      let x = minX + step / 2 + ((row % 2) * step) / 2;
      x < maxX;
      x += step
    ) {
      const clearance = contours.reduce(
        (best, contour) => Math.max(best, surfaceClearance({ x, y }, contour)),
        -1,
      );
      const radius = Math.min(maxRadius, clearance - 0.025);
      if (radius >= minRadius) candidates.push({ x, y, radius });
    }
  candidates.sort((a, b) => b.radius - a.radius || a.x - b.x || a.y - b.y);
  const seats: typeof candidates = [];
  for (const seat of candidates)
    if (
      !seats.some(
        (other) =>
          (seat.x - other.x) ** 2 + (seat.y - other.y) ** 2 <
          (seat.radius + other.radius + 0.008) ** 2,
      )
    )
      seats.push(seat);
  seats.sort((a, b) => a.x - b.x || a.y - b.y);
  // An intentional accent is the largest seat within the first paved region.
  const partial = Math.max(1, Math.ceil(seats.length / 3));
  let accent = 0;
  for (let i = 1; i < partial; i++)
    if (seats[i]!.radius > seats[accent]!.radius) accent = i;
  if (seats.length) [seats[0], seats[accent]] = [seats[accent]!, seats[0]!];
  return seats;
}
