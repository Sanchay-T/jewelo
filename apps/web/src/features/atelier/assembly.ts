import { specification, type Draft } from "./model";

export type AssemblySpec = ReturnType<typeof assemblySpec>;
/**
 * Canonical identity of the *displayed* design: every visible selection, and
 * nothing the customer typed. The `outlines` entries are stable identifiers for
 * the shaped Asma/Fatima exemplars, not fetched assets; the customer preview is
 * photographic and never requests these paths. They stay in the key so that
 * pieces already saved in a shopper's local bag keep matching their snapshot.
 */
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
