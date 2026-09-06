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
const generated = [
  ...v9.map((entry) => ({ ...entry, version: 9 })),
  ...v8.map((entry) => ({ ...entry, version: 8 })),
  ...v6.map((entry) => ({ ...entry, version: 6 })),
  ...v4.map((entry) => ({ ...entry, version: 4 })),
  ...v5.map((entry) => ({ ...entry, version: 5 })),
  ...v2.map((entry) => ({ ...entry, version: 2 })),
  ...v3.map((entry) => ({ ...entry, version: 3 })),
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

/** Exact cumulative matching. A missing photo is never substituted with another design.
 * The diagnostic anchor is retained for reference metadata; only assets may be displayed.
 */
export function resolveOptionFamily(draft: Draft, focus?: VisualField) {
  void focus; // Click order must not change the displayed identity.
  const matched = exact.get(sampleKey(draft, "Studio"));
  const asset = matched ?? resolveSample(draft, "Studio").asset;
  const anchor = { asset, exact: !!matched, differences: differences(draft, asset.draft) };
  const assets = matched ? (["Studio", "On skin", "Close-up", "Dark"] as View[])
    .map(view => exact.get(sampleKey(draft, view)))
    .filter((photo): photo is Sample => !!photo) : [];
  return { anchor, assets, missing: !matched, configurationKey: sampleKey(draft, "Studio") };
}
