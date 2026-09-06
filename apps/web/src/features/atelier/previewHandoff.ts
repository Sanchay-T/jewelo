import type { CreateDraftInput, Locale } from "@jewelo/contracts";
import type { Sample } from "./catalogue";
import { initialState, restore, specification, validate, views, type Draft, type View } from "./model";
import type { Capture } from "./renderer/usePiece";

type DeepReadonly<T> = T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;
function freeze<T>(value: T): DeepReadonly<T> {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value as DeepReadonly<T>;
}
function normalized(input: Draft, validateCustomerNames = true): Draft {
  // Reuse the local version/enum/bounds guard without reading or writing storage.
  const checked = restore(JSON.stringify({ ...initialState(), draft: input })).draft;
  const errors = validate(checked);
  if (validateCustomerNames && Object.keys(errors).length) throw new Error(Object.values(errors).join(" "));
  return specification(checked);
}
function customerSpecification(d: Draft) {
  return {
    names: d.twoNames ? [d.name, d.secondName] : [d.name],
    script: d.script,
    construction: d.construction,
    lettering: d.lettering,
    ...(d.twoNames ? { layout: d.layout } : {}),
    gold: { karat: "18K" as const, color: d.metal },
    stones: d.coverage === "No stones"
      ? { coverage: "No stones" as const }
      : { coverage: d.coverage, gemstone: d.gem },
    pendantWidthMm: d.size,
    chainStyle: d.chain,
    ...(d.engraving.trim() ? { engraving: d.engraving.trim() } : {}),
    ...(d.requests.trim() ? { specialRequests: d.requests.trim() } : {}),
  };
}
export type PersonalizedPreviewRequest = DeepReadonly<{
  version: 1;
  kind: "personalized-preview";
  id: string;
  locale: Locale;
  specification: ReturnType<typeof customerSpecification>;
  reference: {
    role: "illustrative-reference-only";
    sampleId: string;
    view: View;
    assetPath: string;
    depictedSpecification: ReturnType<typeof customerSpecification>;
    instruction: "Use only presentation and styling inspiration. Customer specification controls names and all selected details; never copy the reference name as customer identity.";
  };
  requestedViews: View[];
  spellingConfirmed: false;
}>;
/** A copied, frozen handoff; customer fields are never derived from the displayed example. */
export function buildPersonalizedPreviewRequest(draft: Draft, sample: Sample, options: { id: string; locale: Locale }): PersonalizedPreviewRequest {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(options.id)) throw new Error("A valid preview request ID is required.");
  if (!["en", "ar"].includes(options.locale)) throw new Error("Unsupported interface locale.");
  if (!/^\/atelier\/[a-zA-Z0-9_./ -]+$/.test(sample.src) || sample.src.includes("..") || !views.includes(sample.view))
    throw new Error("Preview references must be local catalogue assets.");
  const actual = normalized(draft);
  const depicted = normalized(sample.draft, false);
  return freeze({
    version: 1 as const, kind: "personalized-preview" as const, id: options.id, locale: options.locale,
    specification: customerSpecification(actual),
    reference: { role: "illustrative-reference-only" as const, sampleId: sample.id, view: sample.view,
      assetPath: sample.src, depictedSpecification: customerSpecification(depicted),
      instruction: "Use only presentation and styling inspiration. Customer specification controls names and all selected details; never copy the reference name as customer identity." as const },
    requestedViews: [...views], spellingConfirmed: false as const,
  });
}
export type BackendGap = { field: string; reason: string };
export type BackendDraftProjection = Partial<Omit<CreateDraftInput, "chain" | "dimensions">> & {
  chain: Pick<CreateDraftInput["chain"], "style">;
  dimensions: Pick<CreateDraftInput["dimensions"], "widthMm">;
};
/** Existing backend contract projection only. Missing manufacturing data is never invented. */
export function prepareBackendDraft(request: PersonalizedPreviewRequest): DeepReadonly<{
  dispatchable: false;
  specification: BackendDraftProjection;
  unresolved: BackendGap[];
}> {
  const d = request.specification;
  const names = d.names.map((name) => ({ approvedEnglishText: d.script === "English" ? name : null, approvedArabicText: d.script === "Arabic" ? name : null }));
  const layout = !d.layout ? "single-name" : ({ "Side by side": "side-by-side", "Connected heart": "connected-heart", Stacked: "stacked", Infinity: "infinity", Interlocked: "interlocked" } as const)[d.layout];
  const result: BackendDraftProjection = {
    dimensions: { widthMm: d.pendantWidthMm },
    chain: { style: ({ Cable: "cable", Rolo: "rolo", Box: "box", Curb: "curb" } as const)[d.chainStyle] },
    jewelryType: "name-pendant", nameCount: names.length as 1 | 2,
    names: names as [typeof names[number]] | [typeof names[number], typeof names[number]],
    layout, metalKarat: "18K",
    metalColor: ({ "Yellow gold": "yellow", "White gold": "white", "Rose gold": "rose" } as const)[d.gold.color],
    stoneCoverage: ({ "No stones": "none", Accent: "accent", "Partial pavé": "partial-pave", "Full pavé": "full-pave" } as const)[d.stones.coverage],
    gemstone: !d.stones.gemstone ? "none" : ({ "Lab diamond": "lab-diamond", "Natural diamond": "natural-diamond", Ruby: "ruby", Emerald: "emerald", "Blue sapphire": "blue-sapphire", "Pink sapphire": "pink-sapphire" } as const)[d.stones.gemstone],
    spellingConfirmed: false,
    ...(d.specialRequests ? { notes: d.specialRequests } : {}),
  };
  if (d.script === "English") result.arabicStyle = "none";
  else if (d.lettering !== "Classic") result.arabicStyle = ({ Minimal: "minimal", Diwani: "diwani", Kufi: "kufi", Signature: "signature", "Thuluth inspired": "thuluth-inspired" } as const)[d.lettering];
  const unresolved: BackendGap[] = [
    { field: "construction", reason: "The existing JewelrySpecification has no pendant-construction field." },
    { field: "dimensions", reason: `Width is explicitly ${d.pendantWidthMm} mm; approved height and thickness are absent.` },
    { field: "chain", reason: `Chain style is ${d.chainStyle.toLowerCase()}; no current chain length is selected. Legacy hidden length is not a customer choice.` },
    { field: "finish", reason: "No surface finish is selected." },
    { field: "connector", reason: "Layout is mapped; separate connector geometry is not approved by the UI." },
    { field: "sizeProfile", reason: "Only width is selected; no backend size-profile mapping is assumed." },
    { field: "complexity", reason: "No approved complexity value exists in the customer form." },
    { field: "source", reason: "A local sample is not an uploaded or registered backend inspiration asset." },
  ];
  if (d.script === "English" || d.lettering === "Classic") unresolved.push({ field: "lettering", reason: d.script === "English" ? "The backend has no English lettering-style field." : "Classic is not an existing ArabicStyle enum; contemporary is not assumed." });
  if (d.engraving) unresolved.push({ field: "engraving", reason: "No dedicated engraving field exists in JewelrySpecification; it remains in the authoritative handoff." });
  return freeze({ dispatchable: false as const, specification: result, unresolved });
}
/** Explicit local adapter: existing photos remain references, never personalized output. */
export async function runMockPersonalizedPreview(request: PersonalizedPreviewRequest, captureReferences: () => Promise<Capture>) {
  const referenceCapture = await captureReferences();
  return { mode: "mock" as const, personalized: false as const, request,
    referenceCapture, backendPreparation: prepareBackendDraft(request) };
}
