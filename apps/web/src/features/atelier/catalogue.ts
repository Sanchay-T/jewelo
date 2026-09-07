import {
  chains,
  constructions,
  coverages,
  emptyDraft,
  gems,
  layouts,
  letters,
  metals,
  type Draft,
  type View,
  type Run,
  views,
  visualFields,
  type VisualField,
} from "./model";
import v2 from "./sample-assets.json";
import v3 from "./sample-assets-v3.json";
import v4 from "./sample-assets-v4.json";
import v5 from "./sample-assets-v5.json";
import v6 from "./sample-assets-v6.json";
import v8 from "./sample-assets-v8.json";
import v9 from "./sample-assets-v9.json";
// The image lab publishes new photographs as v10. The file ships empty so the
// shop-ready catalogue never depends on work that has not been reviewed yet;
// entries appear only after a viewer connects them.
import v10 from "./sample-assets-v10.json";
type ManifestEntry = {
  id: string;
  file: string;
  view: string;
  patch: Record<string, unknown>;
  /** A reviewer's reason for disconnecting this file. Never shown to a shopper. */
  rejected?: string;
};
/** A rejected file stays on disk for lineage and never reaches the catalogue. */
export function connected(entries: readonly ManifestEntry[], version: number) {
  return entries
    .filter((entry) => !entry.rejected)
    .map((entry) => ({ ...entry, version }));
}
/**
 * A later manifest may carry extra lineage fields (prompt, parent, checksum) and
 * may be written by a job that is still running. Unreadable or incomplete rows
 * are skipped instead of breaking the catalogue; extra fields are ignored.
 */
export function manifest(raw: unknown, version: number) {
  if (!Array.isArray(raw)) return [];
  const usable = raw.filter((entry): entry is ManifestEntry => {
    if (!entry || typeof entry !== "object") return false;
    const row = entry as Partial<ManifestEntry>;
    return (
      typeof row.id === "string" &&
      typeof row.file === "string" &&
      (views as readonly string[]).includes(row.view as string) &&
      !!row.patch &&
      typeof row.patch === "object" &&
      (row.rejected === undefined || typeof row.rejected === "string")
    );
  });
  return connected(usable, version);
}
const generated = [
  ...manifest(v10, 10),
  ...manifest(v9, 9),
  ...manifest(v8, 8),
  ...manifest(v6, 6),
  ...manifest(v4, 4),
  ...manifest(v5, 5),
  ...manifest(v2, 2),
  ...manifest(v3, 3),
];
export { visualFields, type VisualField } from "./model";
export type Sample = { id: string; src: string; view: View; draft: Draft };
/** Sample identity excludes customer text and inactive options, never bag specifications. */
export function sampleKey(d: Draft, view: View): string {
  return JSON.stringify([
    d.script,
    d.twoNames,
    d.construction,
    d.lettering,
    d.twoNames ? d.layout : null,
    d.metal,
    d.coverage,
    d.coverage === "No stones" ? null : d.gem,
    d.size,
    d.chain,
    view,
  ]);
}
const base = { ...emptyDraft, name: "Asma" };
export const samples: Sample[] = [
  ...(["Studio", "On skin", "Close-up", "Dark"] as const).map((view) => ({
    id: "classic-" + view,
    view,
    draft: base,
    src:
      "/atelier/v1/asma-" +
      (view === "Studio"
        ? "studio"
        : view === "On skin"
          ? "worn"
          : view === "Close-up"
            ? "close"
            : "dark") +
      ".png",
  })),
  {
    id: "arabic",
    view: "Studio",
    draft: { ...base, script: "Arabic", name: "أسماء" },
    src: "/atelier/v1/asma-arabic.png",
  },
  ...generated.map((entry) => ({
    id: entry.id,
    view: entry.view as View,
    draft: { ...base, ...entry.patch,
      name: (entry.patch as Partial<Draft>).script === "Arabic" ? "أسماء" : "Asma",
      secondName: (entry.patch as Partial<Draft>).script === "Arabic" ? "فاطمة" : "Fatima",
    } as Draft,
    src: `/atelier/v${entry.version}/` + entry.file,
  })),
];
const exact = new Map(
  samples.map((sample) => [sampleKey(sample.draft, sample.view), sample]),
);
export function differences(a: Draft, b: Draft): VisualField[] {
  return visualFields.filter((field) => {
    if (field === "layout" && !a.twoNames && !b.twoNames) return false;
    if (
      field === "gem" &&
      a.coverage === "No stones" &&
      b.coverage === "No stones"
    )
      return false;
    return a[field] !== b[field];
  });
}
/** Missing combinations use an explicitly described example, never an exact-match claim. */
export function resolveSample(d: Draft, view: View, focus?: VisualField) {
  const matched = exact.get(sampleKey(d, view));
  if (matched)
    return { asset: matched, exact: true, differences: [] as VisualField[] };
  // Legacy focus is accepted for saved drafts but never changes photographic identity.
  void focus;
  const candidates = samples.filter((sample) => sample.view === view);
  const weight: Partial<Record<VisualField, number>> = {
    script: 1e9,
    twoNames: 1e8,
    layout: 1e7,
    construction: 1e6,
    lettering: 1e5,
    metal: 1e4,
    coverage: 1e3,
    gem: 100,
    size: 10,
    chain: 1,
  };
  const score = (sample: Sample) =>
    differences(d, sample.draft).reduce((n, f) => n + (weight[f] ?? 2), 0);
  const asset = candidates.reduce((best, candidate) =>
    score(candidate) < score(best) ? candidate : best,
  );
  return { asset, exact: false, differences: differences(d, asset.draft) };
}
/** All selectable categorical combinations; no invented compatibility exclusions. */
export function* configurations(): Generator<Draft> {
  for (const script of ["English", "Arabic"] as const)
    for (const construction of constructions)
      for (const lettering of letters)
        for (const arrangement of [null, ...layouts])
          for (const metal of metals)
            for (const coverage of coverages)
              for (const gem of coverage === "No stones" ? [gems[0]] : gems)
                for (const size of [22, 32] as const)
                  for (const chain of chains)
                    yield {
                      ...base,
                      script,
                      name: script === "Arabic" ? "أسماء" : "Asma",
                      secondName: script === "Arabic" ? "فاطمة" : "Fatima",
                      construction,
                      lettering,
                      twoNames: arrangement !== null,
                      layout: arrangement ?? "Connected heart",
                      metal,
                      coverage,
                      gem,
                      size,
                      chain,
                    };
}
export function catalogueCoverage() {
  let configurationsCount = 0,
    exactImages = 0;
  const byView = { Studio: 0, "On skin": 0, "Close-up": 0, Dark: 0 };
  for (const draft of configurations()) {
    configurationsCount++;
    for (const view of Object.keys(byView) as View[]) {
      if (exact.has(sampleKey(draft, view))) {
        exactImages++;
        byView[view]++;
      }
    }
  }
  return {
    configurations: configurationsCount,
    requiredImages: configurationsCount * 4,
    catalogueImages: samples.length,
    exactImages,
    missingImages: configurationsCount * 4 - exactImages,
    byView,
  };
}

/** Keep all camera views in the same photographic configuration family. */
export function sampleFamily(draft: Draft, focus?: VisualField) {
  const anchor = resolveSample(draft, "Studio", focus);
  return {
    anchor,
    assets: (["Studio", "On skin", "Close-up", "Dark"] as View[])
      .map((view) => exact.get(sampleKey(anchor.asset.draft, view)))
      .filter((asset): asset is Sample => !!asset),
  };
}

export function readySample(
  draft: Draft,
  run: Run | undefined,
  activeView: View,
  failedImages: readonly string[],
  focus?: VisualField,
): Sample | undefined {
  const ready = run?.slots.filter((slot) => slot.status === "ready") ?? [];
  const ordered = [
    ...ready.filter((slot) => slot.view === activeView),
    ...ready.filter((slot) => slot.view !== activeView),
  ];
  return ordered
    .map((slot) =>
      sampleFamily(draft, focus).assets.find(
        (asset) => asset.view === slot.view,
      ),
    )
    .find((asset) => !!asset && !failedImages.includes(asset.src));
}

/* ------------------------------------------------------------------ *
 * Two tiers.
 *
 * Tier 1 is the design itself. It is illustrated live from the catalogue and
 * the photograph must show it exactly: script, one or two names with their
 * layout, construction and lettering.
 *
 * Tier 2 is the material and hardware the customer's own piece is made in:
 * gold colour, stones, gemstone, pendant width and chain. It is applied to the
 * personalized preview, so it never selects, changes or invalidates the
 * illustrated photograph. That is the invariant the unit tests protect.
 * ------------------------------------------------------------------ */
export const tier1Fields = [
  "script",
  "twoNames",
  "layout",
  "construction",
  "lettering",
] as const;
export const tier2Fields = [
  "metal",
  "coverage",
  "gem",
  "size",
  "chain",
] as const;
export type Tier1Field = (typeof tier1Fields)[number];
export type Tier2Field = (typeof tier2Fields)[number];
/** The identity of a displayed design. Order of clicks cannot affect it. */
export function tier1Key(d: Draft): string {
  return JSON.stringify([
    d.script,
    d.twoNames,
    d.twoNames ? d.layout : null,
    d.construction,
    d.lettering,
  ]);
}
/** A look is one construction in one script: the boundary a sample may not cross. */
export function lookKey(d: Pick<Draft, "script" | "construction">): string {
  return `${d.script}|${d.construction}`;
}
export function tier1Differences(a: Draft, b: Draft): Tier1Field[] {
  return tier1Fields.filter((field) =>
    field === "layout"
      ? a.twoNames && b.twoNames && a.layout !== b.layout
      : a[field] !== b[field],
  );
}
/** Every photograph of one complete specification, Studio first. */
export type Family = {
  /** The Studio photograph's id: the stable identity of the displayed design. */
  id: string;
  tier1: string;
  look: string;
  /** The specification these photographs actually depict, including its Tier 2. */
  draft: Draft;
  assets: Sample[];
};
/** Distance from the way sample photography is described in the preview panel. */
function tier2Distance(d: Draft): number {
  return (
    (d.metal === emptyDraft.metal ? 0 : 8) +
    (d.coverage === emptyDraft.coverage ? 0 : 4) +
    (d.size === emptyDraft.size ? 0 : 2) +
    (d.chain === emptyDraft.chain ? 0 : 1)
  );
}
function compare(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const difference = (a[i] ?? 0) - (b[i] ?? 0);
    if (difference) return difference;
  }
  return 0;
}
/** The most continuous family wins; ties prefer the plainest photograph. */
function familyRank(family: Family): number[] {
  return [-family.assets.length, tier2Distance(family.draft)];
}
export function buildFamilies(list: readonly Sample[]): Family[] {
  const groups = new Map<string, Sample[]>();
  for (const sample of list) {
    const key = sampleKey(sample.draft, "Studio");
    groups.set(key, [...(groups.get(key) ?? []), sample]);
  }
  const families: Family[] = [];
  for (const members of groups.values()) {
    // Studio is the design itself. A group that cannot show it is never
    // illustrated, so the camera rail can always open on Studio.
    const studio = members.find((sample) => sample.view === "Studio");
    if (!studio) continue;
    families.push({
      id: studio.id,
      tier1: tier1Key(studio.draft),
      look: lookKey(studio.draft),
      draft: studio.draft,
      assets: views
        .map((view) => members.find((sample) => sample.view === view))
        .filter((sample): sample is Sample => !!sample),
    });
  }
  return families.sort(
    (a, b) => compare(familyRank(a), familyRank(b)) || a.id.localeCompare(b.id),
  );
}
export type FamilyIndex = {
  families: Family[];
  /** The one family illustrated for a Tier 1 design. */
  byTier1: Map<string, Family>;
  /** Ranked families for one script and construction. */
  byLook: Map<string, Family[]>;
};
export function buildFamilyIndex(list: readonly Sample[]): FamilyIndex {
  const families = buildFamilies(list);
  const byTier1 = new Map<string, Family>();
  const byLook = new Map<string, Family[]>();
  for (const family of families) {
    if (!byTier1.has(family.tier1)) byTier1.set(family.tier1, family);
    byLook.set(family.look, [...(byLook.get(family.look) ?? []), family]);
  }
  // One family per Tier 1 design inside each look, so a substitute is never a
  // second photograph of a design that is already illustrated elsewhere.
  for (const [look, ranked] of byLook)
    byLook.set(
      look,
      ranked.filter((family) => byTier1.get(family.tier1) === family),
    );
  return { families, byTier1, byLook };
}
/** Nearest sibling of the SAME look: same arrangement first, then plain lettering. */
function siblingRank(draft: Draft, family: Family): number[] {
  return [
    family.draft.twoNames === draft.twoNames ? 0 : 1,
    !draft.twoNames ||
    !family.draft.twoNames ||
    family.draft.layout === draft.layout
      ? 0
      : 1,
    letters.indexOf(family.draft.lettering),
    ...familyRank(family),
  ];
}
function bestSibling(draft: Draft, list: readonly Family[]): Family | undefined {
  return [...list].sort(
    (a, b) =>
      compare(siblingRank(draft, a), siblingRank(draft, b)) ||
      a.id.localeCompare(b.id),
  )[0];
}
const defaultIndex = buildFamilyIndex(samples);
export type IllustrationBasis = "exact" | "sibling" | "script" | "none";
export type Illustration = {
  /**
   * `exact`   this design is photographed;
   * `sibling` a labelled photograph of the same look in the same script;
   * `script`  a labelled photograph of the same construction in the other script;
   * `none`    no photograph of this construction exists yet.
   */
  basis: IllustrationBasis;
  family?: Family;
  assets: Sample[];
  /** What the shown photograph does not match, for the on-screen label. */
  differences: Tier1Field[];
  exact: boolean;
  /** No photograph of this exact design yet: the option reads "sample coming". */
  missing: boolean;
  tier1: string;
};
/**
 * Keyed on Tier 1 only, exact-match and order-independent. A missing design is
 * never illustrated with another look: the substitute keeps the construction and
 * is labelled on screen. It is never the rejected nearest-image fallback.
 */
export function resolveIllustration(
  draft: Draft,
  index: FamilyIndex = defaultIndex,
): Illustration {
  const tier1 = tier1Key(draft);
  const found = (basis: IllustrationBasis, family: Family): Illustration => ({
    basis,
    family,
    assets: family.assets,
    differences: tier1Differences(draft, family.draft),
    exact: basis === "exact",
    missing: basis !== "exact",
    tier1,
  });
  const exactFamily = index.byTier1.get(tier1);
  if (exactFamily) return found("exact", exactFamily);
  const sibling = bestSibling(draft, index.byLook.get(lookKey(draft)) ?? []);
  if (sibling) return found("sibling", sibling);
  const other = bestSibling(
    draft,
    index.byLook.get(
      lookKey({
        script: draft.script === "Arabic" ? "English" : "Arabic",
        construction: draft.construction,
      }),
    ) ?? [],
  );
  if (other) return found("script", other);
  return {
    basis: "none",
    assets: [],
    differences: [],
    exact: false,
    missing: true,
    tier1,
  };
}
/** True when this exact design is photographed; false marks it "sample coming". */
export function hasExactSample(draft: Draft, index: FamilyIndex = defaultIndex) {
  return index.byTier1.has(tier1Key(draft));
}
/** Every Tier 1 design a shopper can select. Tier 2 is deliberately absent. */
export function* tier1Combinations(): Generator<Draft> {
  for (const script of ["English", "Arabic"] as const)
    for (const construction of constructions)
      for (const lettering of letters)
        for (const arrangement of [null, ...layouts])
          yield {
            ...emptyDraft,
            script,
            name: script === "Arabic" ? "أسماء" : "Asma",
            secondName: script === "Arabic" ? "فاطمة" : "Fatima",
            construction,
            lettering,
            twoNames: arrangement !== null,
            layout: arrangement ?? emptyDraft.layout,
          };
}
/**
 * The illustrated design for the current selection. Tier 2 selections are carried
 * for the customer's own preview and never reach this resolver's key.
 */
export function resolveOptionFamily(
  draft: Draft,
  focus?: VisualField,
  index: FamilyIndex = defaultIndex,
) {
  void focus; // Click order must not change the displayed identity.
  const illustration = resolveIllustration(draft, index);
  const asset = illustration.assets.find((sample) => sample.view === "Studio");
  return {
    anchor: {
      asset,
      exact: illustration.exact,
      differences: asset ? differences(draft, asset.draft) : [],
    },
    assets: illustration.assets,
    missing: illustration.missing,
    basis: illustration.basis,
    /** The specification the photograph actually shows, for honest labelling. */
    shown: asset?.draft,
    tier1Differences: illustration.differences,
    configurationKey: sampleKey(draft, "Studio"),
    tier1Key: illustration.tier1,
  };
}
