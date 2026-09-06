import { describe, expect, it } from "vitest";
import {
  assemblyKey,
  assemblySpec,
  triangleSeat,
  stoneIndices,
  foldedDepth,
  torsoDepth,
  packedStoneSeats,
  surfaceClearance,
} from "./assembly";
import {
  emptyDraft,
  constructions,
  letters,
  layouts,
  metals,
  coverages,
  gems,
  chains,
} from "../model";

describe("fixed exemplar assembly", () => {
  it("uses fixed shaped names while preserving all active visual selections", () => {
    const draft = {
      ...emptyDraft,
      script: "Arabic" as const,
      lettering: "Kufi" as const,
      twoNames: true,
      layout: "Stacked" as const,
      construction: "Diamond rails" as const,
      metal: "White gold" as const,
      coverage: "Full pavé" as const,
      gem: "Ruby" as const,
      size: 22 as const,
      chain: "Box" as const,
    };
    const spec = assemblySpec(draft);
    expect(spec.outlines).toEqual([
      "/atelier/geometry/v1/arabic-kufi-asma.svg",
      "/atelier/geometry/v1/arabic-kufi-fatima.svg",
    ]);
    for (const field of [
      "construction",
      "lettering",
      "twoNames",
      "layout",
      "metal",
      "coverage",
      "gem",
      "size",
      "chain",
    ] as const)
      expect(spec[field]).toBe(draft[field]);
    expect(
      assemblyKey({
        ...draft,
        name: "Different",
        secondName: "Customer",
        engraving: "Gift",
      }),
    ).toBe(assemblyKey(draft));
  });
  it("is independent of selection order and ignores only inactive visual choices", () => {
    const a = {
      ...emptyDraft,
      metal: "Rose gold" as const,
      construction: "Origami ribbon" as const,
    };
    const b = {
      ...emptyDraft,
      construction: "Origami ribbon" as const,
      metal: "Rose gold" as const,
    };
    expect(assemblyKey(a)).toBe(assemblyKey(b));
    expect(
      assemblyKey({
        ...emptyDraft,
        gem: "Ruby",
        layout: "Stacked",
        length: 55,
      }),
    ).toBe(assemblyKey(emptyDraft));
    expect(assemblyKey({ ...emptyDraft, size: 22 })).not.toBe(
      assemblyKey(emptyDraft),
    );
  });
  it("represents every selectable cumulative combination without collapsing active fields", () => {
    const keys = new Set<string>();
    for (const script of ["English", "Arabic"] as const)
      for (const construction of constructions)
        for (const lettering of letters)
          for (const layout of [null, ...layouts])
            for (const metal of metals)
              for (const coverage of coverages)
                for (const gem of coverage === "No stones" ? [gems[0]] : gems)
                  for (const size of [22, 32] as const)
                    for (const chain of chains) {
                      const key = assemblyKey({
                        ...emptyDraft,
                        script,
                        construction,
                        lettering,
                        twoNames: layout !== null,
                        layout: layout ?? "Connected heart",
                        metal,
                        coverage,
                        gem,
                        size,
                        chain,
                      });
                      if (keys.has(key))
                        throw new Error(`Duplicate assembly ${key}`);
                      keys.add(key);
                    }
    expect(keys.size).toBe(131328);
  });
});

describe("physical placement rules", () => {
  it("keeps every stone disk inside its filled triangle including narrow strokes", () => {
    for (const [a, b, c] of [
      [
        { x: 0, y: 0 },
        { x: 3, y: 0 },
        { x: 0, y: 4 },
      ],
      [
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 1, y: 0.12 },
      ],
      [
        { x: 4, y: 1 },
        { x: -2, y: 5 },
        { x: 3, y: -7 },
      ],
    ]) {
      const seat = triangleSeat(a!, b!, c!);
      expect(seat.radius).toBeGreaterThan(0);
      for (const [p, q] of [
        [a!, b!],
        [b!, c!],
        [c!, a!],
      ]) {
        const distance =
          Math.abs(
            (q!.x - p!.x) * (seat.y - p!.y) - (q!.y - p!.y) * (seat.x - p!.x),
          ) / Math.hypot(q!.x - p!.x, q!.y - p!.y);
        expect(distance).toBeCloseTo(seat.radius, 8);
      }
    }
    expect(
      triangleSeat({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }).radius,
    ).toBe(0);
  });
  it("adds stones without removing the preceding coverage tier", () => {
    for (let count = 0; count < 100; count++) {
      const accent = stoneIndices(count, "Accent"),
        partial = stoneIndices(count, "Partial pavé"),
        full = stoneIndices(count, "Full pavé");
      expect(accent.every((i) => partial.includes(i))).toBe(true);
      expect(partial.every((i) => full.includes(i))).toBe(true);
      expect(full).toHaveLength(count);
      expect(stoneIndices(count, "No stones")).toEqual([]);
    }
  });
  it("folds across both faces and drapes chains symmetrically", () => {
    expect(foldedDepth(0)).toBeCloseTo(-0.21);
    expect(foldedDepth(2.3)).toBeCloseTo(0.21);
    expect(foldedDepth(4.6)).toBeCloseTo(-0.21);
    expect(torsoDepth(0)).toBe(0);
    expect(torsoDepth(28)).toBeLessThan(torsoDepth(16));
    expect(torsoDepth(-28)).toBe(torsoDepth(28));
  });
});

describe("dense full pave packing", () => {
  it("fills broad strokes densely while respecting counters and metal edges", () => {
    const shape = {
      outer: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 2 },
        { x: 0, y: 2 },
      ],
      holes: [
        [
          { x: 4, y: 0.6 },
          { x: 6, y: 0.6 },
          { x: 6, y: 1.4 },
          { x: 4, y: 1.4 },
        ],
      ],
    };
    const seats = packedStoneSeats([shape]);
    expect(seats.length).toBeGreaterThan(90);
    expect(
      seats.reduce((area, seat) => area + Math.PI * seat.radius ** 2, 0) /
        (20 - 1.6),
    ).toBeGreaterThan(0.48);
    for (let i = 0; i < seats.length; i++) {
      const seat = seats[i]!;
      expect(seat.radius).toBeGreaterThanOrEqual(0.115);
      expect(surfaceClearance(seat, shape)).toBeGreaterThanOrEqual(
        seat.radius + 0.02499,
      );
      for (let j = 0; j < i; j++) {
        const other = seats[j]!;
        expect(
          Math.hypot(seat.x - other.x, seat.y - other.y),
        ).toBeGreaterThanOrEqual(seat.radius + other.radius + 0.00799);
      }
    }
    expect(packedStoneSeats([shape])).toEqual(seats);
  });
});
