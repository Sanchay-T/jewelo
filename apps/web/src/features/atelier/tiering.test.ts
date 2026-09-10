import { describe, expect, it } from "vitest";
import {
  buildFamilyIndex,
  hasExactSample,
  lookKey,
  manifest,
  resolveIllustration,
  resolveOptionFamily,
  samples,
  tier1Combinations,
  tier1Differences,
  tier1Key,
  tier2Fields,
  type Sample,
} from "./catalogue";
import {
  chains,
  coverages,
  emptyDraft,
  gems,
  metals,
  views,
  visualFields,
  type Draft,
} from "./model";

const tier2Values: { [K in (typeof tier2Fields)[number]]: readonly Draft[K][] } =
  {
    metal: metals,
    coverage: coverages,
    gem: gems,
    size: [22, 32],
    chain: chains,
  };
/** Every Tier 2 combination a shopper can click: 3 x 4 x 6 x 2 x 4. */
function* tier2Combinations(): Generator<Pick<Draft, (typeof tier2Fields)[number]>> {
  for (const metal of metals)
    for (const coverage of coverages)
      for (const gem of gems)
        for (const size of [22, 32] as const)
          for (const chain of chains)
            yield { metal, coverage, gem, size, chain };
}
const shown = (draft: Draft) => {
  const family = resolveOptionFamily(draft);
  return {
    basis: family.basis,
    id: family.anchor.asset?.id,
    assets: family.assets.map((asset) => asset.id).join("|"),
  };
};

describe("two tiers", () => {
  it("keys the illustrated photograph on Tier 1 only", () => {
    const design = { ...emptyDraft, name: "Asma" };
    expect(tier1Key(design)).toBe(
      tier1Key({
        ...design,
        metal: "Rose gold",
        coverage: "Full pavé",
        gem: "Ruby",
        size: 22,
        chain: "Curb",
      }),
    );
    expect(tier1Key(design)).not.toBe(
      tier1Key({ ...design, construction: "Framed minimal" }),
    );
    expect(tier1Key(design)).not.toBe(tier1Key({ ...design, twoNames: true }));
    expect(tier1Key({ ...design, twoNames: true, layout: "Stacked" })).not.toBe(
      tier1Key({ ...design, twoNames: true, layout: "Infinity" }),
    );
    // An inactive layout cannot split one design in two.
    expect(tier1Key({ ...design, layout: "Stacked" })).toBe(tier1Key(design));
  });

  it("no gold, stone, gem, size or chain click can change the displayed design", () => {
    let checked = 0;
    for (const design of tier1Combinations()) {
      const baseline = shown(design);
      expect(baseline.assets.length).toBeGreaterThan(0);
      for (const field of tier2Fields)
        for (const value of tier2Values[field]) {
          expect(shown({ ...design, [field]: value })).toEqual(baseline);
          checked++;
        }
    }
    expect(checked).toBe(288 * 19);
  });

  it("holds for every whole Tier 2 configuration of every photographed design", () => {
    let checked = 0;
    for (const design of tier1Combinations()) {
      if (!hasExactSample(design)) continue;
      const baseline = shown(design);
      expect(baseline.basis).toBe("exact");
      for (const tier2 of tier2Combinations()) {
        expect(shown({ ...design, ...tier2 })).toEqual(baseline);
        checked++;
      }
    }
    // The 28 photographed Tier 1 designs times 576 Tier 2 configurations.
    expect(checked).toBe(28 * 576);
  }, 30000);

  it("is independent of click order and of the legacy focus field", () => {
    for (const design of tier1Combinations()) {
      const baseline = shown(design);
      for (const focus of visualFields) {
        const family = resolveOptionFamily(design, focus);
        expect({
          basis: family.basis,
          id: family.anchor.asset?.id,
          assets: family.assets.map((asset) => asset.id).join("|"),
        }).toEqual(baseline);
      }
      // Applying the same selections in the opposite order.
      const forwards = { ...emptyDraft } as Draft;
      const backwards = { ...emptyDraft } as Draft;
      const steps = [
        ["script", design.script],
        ["twoNames", design.twoNames],
        ["layout", design.layout],
        ["construction", design.construction],
        ["lettering", design.lettering],
        ["metal", "Rose gold"],
        ["coverage", "Full pavé"],
        ["chain", "Box"],
      ] as const;
      for (const [key, value] of steps)
        Object.assign(forwards, { [key]: value });
      for (const [key, value] of [...steps].reverse())
        Object.assign(backwards, { [key]: value });
      expect(shown(backwards)).toEqual(shown(forwards));
    }
  });
});

describe("a missing design never borrows another look", () => {
  it("keeps the construction, and only crosses script with a label", () => {
    let siblings = 0;
    let across = 0;
    for (const design of tier1Combinations()) {
      const family = resolveOptionFamily(design);
      const photographed = family.shown;
      expect(photographed).toBeDefined();
      // The construction is never substituted, in any basis.
      expect(photographed!.construction).toBe(design.construction);
      if (family.basis === "exact") {
        expect(family.tier1Differences).toEqual([]);
        expect(tier1Key(photographed!)).toBe(tier1Key(design));
        continue;
      }
      expect(family.missing).toBe(true);
      expect(family.tier1Differences.length).toBeGreaterThan(0);
      expect(family.tier1Differences).toEqual(
        tier1Differences(design, photographed!),
      );
      if (family.basis === "sibling") {
        siblings++;
        expect(photographed!.script).toBe(design.script);
        expect(lookKey(photographed!)).toBe(lookKey(design));
        expect(family.tier1Differences).not.toContain("script");
      } else {
        across++;
        expect(family.basis).toBe("script");
        expect(photographed!.script).not.toBe(design.script);
        expect(family.tier1Differences).toContain("script");
      }
    }
    expect(siblings).toBeGreaterThan(0);
    // Today every construction is photographed in both scripts.
    expect(across).toBe(0);
  });

  it("falls back to the other script, then to a labelled placeholder", () => {
    const only = samples.filter(
      (sample) =>
        sample.draft.script === "English" &&
        sample.draft.construction === "Classical" &&
        sample.draft.lettering === "Classic" &&
        !sample.draft.twoNames &&
        sample.draft.metal === "Yellow gold" &&
        sample.draft.coverage === "No stones" &&
        sample.draft.chain === "Cable" &&
        sample.draft.size === 32,
    );
    expect(only.length).toBe(4);
    const index = buildFamilyIndex(only);
    const english = { ...emptyDraft, name: "Asma" };
    expect(resolveIllustration(english, index).basis).toBe("exact");
    // Same look, different lettering: a labelled sibling.
    const kufi = resolveIllustration({ ...english, lettering: "Kufi" }, index);
    expect(kufi.basis).toBe("sibling");
    expect(kufi.family?.id).toBe("classic-Studio");
    expect(kufi.differences).toEqual(["lettering"]);
    // Same construction, other script: labelled as shown in English.
    const arabic = resolveIllustration(
      { ...english, script: "Arabic", name: "أسماء" },
      index,
    );
    expect(arabic.basis).toBe("script");
    expect(arabic.family?.draft.script).toBe("English");
    expect(arabic.differences).toContain("script");
    // No photograph of this construction in either script: sample coming.
    const none = resolveIllustration(
      { ...english, construction: "Framed minimal" },
      index,
    );
    expect(none.basis).toBe("none");
    expect(none.assets).toEqual([]);
    expect(none.missing).toBe(true);
    expect(none.differences).toEqual([]);
    expect(resolveOptionFamily(english, undefined, index).anchor.asset).toBeDefined();
    expect(
      resolveOptionFamily({ ...english, construction: "Framed minimal" }, undefined, index)
        .anchor.asset,
    ).toBeUndefined();
  });

  it("marks an unphotographed design as sample coming without hiding the option", () => {
    const arabicDiwani = {
      ...emptyDraft,
      script: "Arabic" as const,
      name: "أسماء",
      lettering: "Diwani" as const,
    };
    expect(hasExactSample(arabicDiwani)).toBe(false);
    const family = resolveOptionFamily(arabicDiwani);
    expect(family.missing).toBe(true);
    expect(family.basis).toBe("sibling");
    expect(family.shown!.script).toBe("Arabic");
    expect(family.shown!.construction).toBe("Classical");
    expect(family.shown!.lettering).not.toBe("Diwani");
    expect(family.assets.length).toBeGreaterThan(0);
    // The rejected misspelled Diwani photographs stay disconnected.
    for (const asset of family.assets)
      expect(asset.src).not.toContain("diwani-v2");
  });
});

describe("camera tiles", () => {
  it("always opens on Studio and never claims a view it cannot show", () => {
    for (const design of tier1Combinations()) {
      const family = resolveOptionFamily(design);
      const available = family.assets.map((asset) => asset.view);
      expect(available[0]).toBe("Studio");
      expect(new Set(available).size).toBe(available.length);
      for (const view of available) expect(views).toContain(view);
      // Every shown photograph belongs to one specification.
      for (const asset of family.assets)
        expect(tier1Key(asset.draft)).toBe(tier1Key(family.shown!));
    }
  });
});

describe("catalogue sources", () => {
  it("shows only reviewed, connected files", () => {
    const connectedSources = new Set(samples.map((sample) => sample.src));
    for (const design of tier1Combinations())
      for (const asset of resolveOptionFamily(design).assets) {
        expect(connectedSources.has(asset.src)).toBe(true);
        expect(asset.src).toMatch(/^\/atelier\/v\d+\//);
      }
  });

  it("tolerates a later manifest that is absent, empty, malformed or extended", () => {
    expect(manifest(undefined, 10)).toEqual([]);
    expect(manifest([], 10)).toEqual([]);
    expect(manifest({ entries: [] }, 10)).toEqual([]);
    const extended = manifest(
      [
        {
          id: "v10-studio",
          file: "asma-studio.png",
          view: "Studio",
          patch: { construction: "Framed minimal" },
          prompt: "caleums-universal-v4",
          parent: null,
          sha256: "abc",
          review: "passed",
        },
        { id: "broken", file: "x.png", view: "Hologram", patch: {} },
        { id: "no-patch", file: "y.png", view: "Studio" },
        null,
        {
          id: "rejected",
          file: "z.png",
          view: "Studio",
          patch: {},
          rejected: "wrong-spelling on a word-by-word read",
        },
      ],
      10,
    );
    expect(extended.map((entry) => entry.id)).toEqual(["v10-studio"]);
    expect(extended[0]).toMatchObject({ version: 10, view: "Studio" });
    // A new manifest builds families through the same reviewed path.
    const index = buildFamilyIndex([
      ...samples,
      {
        id: "v10-studio",
        src: "/atelier/v10/asma-studio.png",
        view: "Studio",
        draft: { ...emptyDraft, construction: "Framed minimal", lettering: "Minimal" },
      } satisfies Sample,
    ]);
    expect(
      resolveIllustration(
        { ...emptyDraft, construction: "Framed minimal", lettering: "Minimal" },
        index,
      ).family?.id,
    ).toBe("v10-studio");
  });
});
