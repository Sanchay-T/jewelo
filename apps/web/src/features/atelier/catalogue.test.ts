import { describe, expect, it } from "vitest";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  catalogueCoverage,
  configurations,
  hasExactSample,
  sampleKey,
  samples,
  connected,
  resolveOptionFamily,
} from "./catalogue";
import v2Manifest from "./sample-assets.json";
import v6Manifest from "./sample-assets-v6.json";
import { emptyDraft, views } from "./model";

/** Every design that is actually photographed, by its exact-match key. */
const photographed = new Set(
  samples.map((sample) => sampleKey(sample.draft, sample.view)),
);

describe("pre-generated sample catalogue", () => {
  it("exhaustively checks all selectable combinations and reports actual coverage", () => {
    const keys = new Set<string>();
    const failures: string[] = [];
    const nextBatch: unknown[] = [];
    let count = 0;
    for (const draft of configurations()) {
      for (const view of views) {
        const key = sampleKey(draft, view);
        if (keys.has(key)) failures.push("Duplicate: " + key);
        keys.add(key);
        if (!photographed.has(key) && nextBatch.length < 32)
          nextBatch.push({ key, draft, view, status: "missing" });
        count++;
      }
    }
    expect(failures).toEqual([]);
    expect(count).toBe(525312);
    expect(keys.size).toBe(count);
    const coverage = catalogueCoverage();
    expect(coverage.requiredImages).toBe(count);
    expect(coverage.missingImages + coverage.exactImages).toBe(count);
    expect(coverage.exactImages).toBe(samples.length);
    if (process.env.ATELIER_CATALOGUE_REPORT === "1") {
      const dir = resolve("../../docs/proof/responsive-atelier/catalogue-v2");
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        resolve(dir, "coverage.json"),
        JSON.stringify(
          {
            ...coverage,
            resolverCasesPassed: count,
            visualReview:
              "Per-asset review recorded in v2 manifest; enumeration is not visual verification",
            generatedAt: new Date().toISOString(),
          },
          null,
          2,
        ),
      );
      writeFileSync(
        resolve(dir, "next-batch.json"),
        JSON.stringify(nextBatch, null, 2),
      );
    }
  }, 30000);
  it("ignores only free text and inactive options in photographic identity", () => {
    const key = sampleKey(emptyDraft, "Studio");
    expect(
      sampleKey(
        {
          ...emptyDraft,
          name: "ABC",
          secondName: "Different",
          engraving: "Gift",
          requests: "Custom",
          length: 40,
          layout: "Stacked",
          gem: "Ruby",
        },
        "Studio",
      ),
    ).toBe(key);
    expect(
      sampleKey({ ...emptyDraft, coverage: "Accent", gem: "Ruby" }, "Studio"),
    ).not.toBe(key);
    expect(
      sampleKey({ ...emptyDraft, twoNames: true, layout: "Stacked" }, "Studio"),
    ).not.toBe(key);
  });
  it("serves real local files and resolves them independently of click order", () => {
    for (const asset of samples) {
      expect(existsSync(resolve("public", "." + asset.src))).toBe(true);
      expect(photographed.has(sampleKey(asset.draft, asset.view))).toBe(true);
    }
    const multi = {
      ...emptyDraft,
      construction: "Origami ribbon" as const,
      metal: "White gold" as const,
    };
    const metalLast = resolveOptionFamily(multi, "metal");
    const constructionLast = resolveOptionFamily(multi, "construction");
    expect(metalLast.anchor.asset?.id).toBe(constructionLast.anchor.asset?.id);
    // The look is never substituted, whatever the shopper clicked last.
    expect(metalLast.shown?.construction).toBe("Origami ribbon");
    expect(metalLast.basis).toBe(constructionLast.basis);
  });
});

describe("reviewer-rejected files stay disconnected", () => {
  // The Diwani master and its three dependent views spell أسمك ("your name"),
  // not the exemplar name أسماء. A word-by-word read on 7 September 2026
  // disconnected them. The files stay on disk for lineage; a shopper who picks
  // Arabic + Diwani must see "no photo", never a misspelled pendant.
  const rejectedFiles = [
    "/atelier/v2/arabic-diwani-v2.png",
    "/atelier/v6/arabic-diwani-v2-worn.png",
    "/atelier/v6/arabic-diwani-v2-close.png",
    "/atelier/v6/arabic-diwani-v2-dark.png",
  ];
  it("keeps every rejected manifest entry out of the displayable catalogue", () => {
    for (const manifest of [v2Manifest, v6Manifest]) {
      for (const entry of manifest) {
        if (!entry.rejected) continue;
        expect(entry.rejected.length).toBeGreaterThan(20);
        expect(samples.some((sample) => sample.src.endsWith(entry.file))).toBe(false);
      }
    }
    for (const file of rejectedFiles) {
      expect(existsSync(new URL("../../../public" + file, import.meta.url))).toBe(true);
      expect(samples.map((sample) => sample.src)).not.toContain(file);
    }
  });
  it("shows a labelled Arabic sibling for Arabic Diwani, never the misspelled files", () => {
    const draft = { ...emptyDraft, script: "Arabic" as const, name: "أسماء", lettering: "Diwani" as const };
    const family = resolveOptionFamily(draft);
    // The option stays selectable and is marked "sample coming"; the preview
    // keeps a photograph of the same look in the same script, clearly labelled.
    expect(family.missing).toBe(true);
    expect(family.basis).toBe("sibling");
    expect(family.assets.length).toBeGreaterThan(0);
    expect(family.tier1Differences).toEqual(["lettering"]);
    for (const photo of family.assets) {
      expect(photo.src).not.toContain("diwani");
      expect(photo.draft.script).toBe("Arabic");
      expect(photo.draft.construction).toBe("Classical");
      expect(photo.draft.lettering).not.toBe("Diwani");
    }
    expect(hasExactSample(draft)).toBe(false);
    for (const view of views)
      expect(photographed.has(sampleKey(draft, view))).toBe(false);
  });
  it("drops rejected entries and keeps reviewed ones", () => {
    expect(connected([{ id: "a", file: "a.png", view: "Studio", patch: {} }], 2))
      .toEqual([{ id: "a", file: "a.png", view: "Studio", patch: {}, version: 2 }]);
    expect(connected([{ id: "b", file: "b.png", view: "Studio", patch: {}, rejected: "wrong-spelling" }], 2))
      .toEqual([]);
  });
});
