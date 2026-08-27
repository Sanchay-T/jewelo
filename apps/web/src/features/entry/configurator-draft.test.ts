import { describe, expect, it } from "vitest";
import {
  CONSTRUCTION_STAGES,
  CONFIGURATOR_DRAFT_KEY,
  configuratorReviewSummary,
  isNameStageValid,
  navigationSequence,
  readConfiguratorDraft,
  writeConfiguratorDraft,
  type ConfiguratorDraftV1,
} from "./configurator-draft";

const draft: ConfiguratorDraftV1 = {
  version: 1,
  stage: "metal",
  nameCount: 2,
  nameOne: "Omran",
  nameTwo: "Mariam",
  language: "ar",
  arabicOne: "عمران",
  arabicTwo: "مريم",
  arabicStyle: "minimal",
  layout: "stacked-heart",
  metal: "rose",
  coverage: "partial-pave",
  gemstone: "ruby",
  size: "classic",
  chain: "rolo",
  chainLength: 50,
};

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  } as unknown as Storage;
}

describe("configurator draft and stage model", () => {
  it("keeps six numbered construction stages", () => {
    expect(CONSTRUCTION_STAGES.map((stage) => stage.id)).toEqual([
      "name-language",
      "arabic-style",
      "names-layout",
      "metal",
      "stones",
      "size-chain",
    ]);
  });

  it("skips Arabic style for English without renumbering the model", () => {
    expect(navigationSequence("en")).toEqual([
      "name-language",
      "names-layout",
      "metal",
      "stones",
      "size-chain",
      "review",
    ]);
    expect(navigationSequence("ar")).toHaveLength(7);
  });

  it("invalidates empty names and their required Arabic spelling", () => {
    expect(
      isNameStageValid({ ...draft, nameOne: "", arabicOne: "عمران" }),
    ).toBe(false);
    expect(isNameStageValid({ ...draft, nameTwo: "", arabicTwo: "مريم" })).toBe(
      false,
    );
    expect(isNameStageValid({ ...draft, arabicTwo: "" })).toBe(false);
    expect(isNameStageValid(draft)).toBe(true);
  });

  it("restores the exact versioned unsubmitted draft", () => {
    const storage = memoryStorage();
    writeConfiguratorDraft(storage, draft);
    expect(storage.getItem(CONFIGURATOR_DRAFT_KEY)).toContain("stacked-heart");
    expect(readConfiguratorDraft(storage)).toEqual(draft);
  });

  it("builds the exact review summary from the carried draft", () => {
    expect(configuratorReviewSummary(draft)).toEqual({
      names: "عمران ♡ مريم",
      script: "Arabic · Minimal",
      layout: "stacked heart",
      metal: "18K rose gold",
      stones: "partial pave · ruby",
      sizeAndChain: "classic (30 mm) · rolo · 50 cm",
    });
  });
});
