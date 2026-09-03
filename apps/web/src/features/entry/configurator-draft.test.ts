import { describe, expect, it } from "vitest";
import {
  CONFIGURATOR_DRAFT_KEY,
  DEFAULT_CONFIGURATOR_DRAFT,
  LEGACY_CONFIGURATOR_DRAFT_KEY,
  SECONDARY_LAYOUTS,
  clearConfiguratorDraft,
  configuratorReviewSummary,
  isIdentityValid,
  normalizeConfiguratorDraft,
  readConfiguratorDraft,
  writeConfiguratorDraft,
  type ConfiguratorDraftV2,
} from "./configurator-draft";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => void map.delete(key),
    setItem: (key, value) => void map.set(key, value),
  };
}

const v1Draft = {
  version: 1,
  stage: "size-chain",
  nameCount: 2,
  nameOne: "Layla",
  nameTwo: "Mariam",
  language: "ar",
  arabicOne: "ليلى",
  arabicTwo: "مريم",
  arabicOneStatus: "edited",
  arabicStyle: "kufi",
  layout: "infinity",
  metal: "rose",
  coverage: "full-pave",
  gemstone: "ruby",
  size: "statement",
  chain: "box",
  chainLength: 55,
};

describe("configurator draft migration", () => {
  it("reads a v2 draft from the current store", () => {
    const local = memoryStorage();
    const draft: ConfiguratorDraftV2 = {
      ...DEFAULT_CONFIGURATOR_DRAFT,
      nameOne: "Asma",
      language: "ar",
      arabicOne: "أسماء",
    };
    writeConfiguratorDraft(local, draft);
    expect(readConfiguratorDraft(local, memoryStorage())).toEqual(draft);
  });

  it("migrates a v1 draft out of sessionStorage, where v1 actually wrote it", () => {
    const local = memoryStorage();
    const session = memoryStorage();
    session.setItem(LEGACY_CONFIGURATOR_DRAFT_KEY, JSON.stringify(v1Draft));

    const migrated = readConfiguratorDraft(local, session);

    expect(migrated).toMatchObject({
      version: 2,
      nameCount: 2,
      nameOne: "Layla",
      nameTwo: "Mariam",
      language: "ar",
      arabicOne: "ليلى",
      arabicTwo: "مريم",
      arabicOneStatus: "edited",
      arabicStyle: "kufi",
      layout: "infinity",
      metal: "rose",
      coverage: "full-pave",
      gemstone: "ruby",
      size: "statement",
      chain: "box",
      chainLength: 55,
    });
    // The wizard stage has no meaning on a single page.
    expect(migrated).not.toHaveProperty("stage");
  });

  it("migrates a v1 draft that an intermediate build left in localStorage", () => {
    const local = memoryStorage();
    local.setItem(LEGACY_CONFIGURATOR_DRAFT_KEY, JSON.stringify(v1Draft));
    expect(readConfiguratorDraft(local)?.nameOne).toBe("Layla");
  });

  it("prefers the v2 draft when both versions are present", () => {
    const local = memoryStorage();
    const session = memoryStorage();
    session.setItem(LEGACY_CONFIGURATOR_DRAFT_KEY, JSON.stringify(v1Draft));
    writeConfiguratorDraft(local, {
      ...DEFAULT_CONFIGURATOR_DRAFT,
      nameOne: "Noor",
    });
    expect(readConfiguratorDraft(local, session)?.nameOne).toBe("Noor");
  });

  it("carries a hidden layout through migration so the disclosure can open for it", () => {
    const local = memoryStorage();
    const session = memoryStorage();
    session.setItem(LEGACY_CONFIGURATOR_DRAFT_KEY, JSON.stringify(v1Draft));
    const migrated = readConfiguratorDraft(local, session)!;
    expect(SECONDARY_LAYOUTS).toContain(migrated.layout);
  });

  it("returns null rather than throwing on corrupt JSON", () => {
    const local = memoryStorage();
    const session = memoryStorage();
    local.setItem(CONFIGURATOR_DRAFT_KEY, "{not json");
    session.setItem(LEGACY_CONFIGURATOR_DRAFT_KEY, "also not json");
    expect(readConfiguratorDraft(local, session)).toBeNull();
  });

  it("ignores a payload with an unknown version", () => {
    const local = memoryStorage();
    local.setItem(CONFIGURATOR_DRAFT_KEY, JSON.stringify({ version: 99 }));
    expect(readConfiguratorDraft(local)).toBeNull();
  });

  it("clears both keys from both stores so a name does not outlive its design", () => {
    const local = memoryStorage();
    const session = memoryStorage();
    writeConfiguratorDraft(local, DEFAULT_CONFIGURATOR_DRAFT);
    local.setItem(LEGACY_CONFIGURATOR_DRAFT_KEY, JSON.stringify(v1Draft));
    session.setItem(LEGACY_CONFIGURATOR_DRAFT_KEY, JSON.stringify(v1Draft));

    clearConfiguratorDraft(local, session);

    expect(local.length).toBe(0);
    expect(session.length).toBe(0);
    expect(readConfiguratorDraft(local, session)).toBeNull();
  });
});

describe("normalizeConfiguratorDraft", () => {
  it("replaces values that are not contract members with defaults", () => {
    const normalized = normalizeConfiguratorDraft({
      version: 1,
      language: "fr",
      arabicStyle: "art-deco",
      layout: "frame",
      metal: "platinum",
      coverage: "encrusted",
      gemstone: "moissanite",
      size: "enormous",
      chain: "chunky",
      chainLength: 200,
      nameCount: 7,
    });

    expect(normalized).toMatchObject({
      language: "en",
      arabicStyle: DEFAULT_CONFIGURATOR_DRAFT.arabicStyle,
      // `frame` and `square` are Omran's vocabulary, not PendantLayout members.
      layout: DEFAULT_CONFIGURATOR_DRAFT.layout,
      metal: "yellow",
      coverage: "none",
      gemstone: "none",
      size: "classic",
      chain: "cable",
      chainLength: 45,
      nameCount: 1,
    });
  });

  it("defaults an empty payload to a blank English form with no stones", () => {
    expect(normalizeConfiguratorDraft(null)).toEqual({
      ...DEFAULT_CONFIGURATOR_DRAFT,
      arabicOneStatus: undefined,
      arabicTwoStatus: undefined,
    });
  });

  it("drops a reflection status it does not recognise", () => {
    expect(
      normalizeConfiguratorDraft({ arabicOneStatus: "refining" })
        .arabicOneStatus,
    ).toBeUndefined();
  });
});

describe("isIdentityValid", () => {
  const base = {
    language: "en" as const,
    nameCount: 1 as const,
    nameOne: "Asma",
    nameTwo: "",
    arabicOne: "",
    arabicTwo: "",
  };

  it("rejects an empty first name", () => {
    expect(isIdentityValid({ ...base, nameOne: "  " })).toBe(false);
  });

  it("accepts one English name", () => {
    expect(isIdentityValid(base)).toBe(true);
  });

  it("requires a second name once it has been added", () => {
    expect(isIdentityValid({ ...base, nameCount: 2 })).toBe(false);
  });

  it("requires an approved Arabic spelling for every Arabic name", () => {
    expect(isIdentityValid({ ...base, language: "ar" })).toBe(false);
    expect(
      isIdentityValid({ ...base, language: "ar", arabicOne: "أسماء" }),
    ).toBe(true);
    expect(
      isIdentityValid({
        ...base,
        language: "ar",
        nameCount: 2,
        nameTwo: "Noor",
        arabicOne: "أسماء",
      }),
    ).toBe(false);
  });
});

describe("configuratorReviewSummary", () => {
  it("reads the defaulted details as plain language rather than enum members", () => {
    const summary = configuratorReviewSummary({
      ...DEFAULT_CONFIGURATOR_DRAFT,
      nameOne: "Asma",
    });
    expect(summary.names).toBe("Asma");
    expect(summary.script).toBe("English · connected script");
    expect(summary.layout).toBe("Single name");
    expect(summary.stones).toBe("No stones");
    expect(summary.sizeAndChain).toBe("Classic (30 mm) · cable · 45 cm");
  });

  it("labels a hidden layout so the summary never names an unlabelled value", () => {
    const summary = configuratorReviewSummary({
      ...DEFAULT_CONFIGURATOR_DRAFT,
      nameCount: 2,
      nameOne: "Asma",
      nameTwo: "Noor",
      layout: "infinity",
    });
    expect(summary.layout).toBe("Joined with an infinity");
    expect(summary.names).toBe("Asma ∞ Noor");
  });
});
