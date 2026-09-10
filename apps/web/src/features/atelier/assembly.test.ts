import { describe, expect, it } from "vitest";
import { assemblyKey, assemblySpec } from "./assembly";
import {
  emptyDraft,
  constructions,
  letters,
  layouts,
  metals,
  coverages,
  gems,
  chains,
} from "./model";

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
