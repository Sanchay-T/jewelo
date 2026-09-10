import type {
  CreateDraftInput,
  JewelrySpecification,
  Locale,
} from "@jewelo/contracts";
import type { Sample } from "./catalogue";
import { initialState, restore, specification, validate, views, type Draft, type View } from "./model";
import type { Capture } from "./capture";

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
  /**
   * The labelled illustrated sample the shopper was looking at, when one exists.
   * A combination with no continuous family still previews: the customer's
   * specification is the whole request, and the reference is optional context.
   */
  reference?: {
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
export function buildPersonalizedPreviewRequest(draft: Draft, sample: Sample | undefined, options: { id: string; locale: Locale }): PersonalizedPreviewRequest {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(options.id)) throw new Error("A valid preview request ID is required.");
  if (!["en", "ar"].includes(options.locale)) throw new Error("Unsupported interface locale.");
  if (sample && (!/^\/atelier\/[a-zA-Z0-9_./ -]+$/.test(sample.src) || sample.src.includes("..") || !views.includes(sample.view)))
    throw new Error("Preview references must be local catalogue assets.");
  const actual = normalized(draft);
  const depicted = sample ? normalized(sample.draft, false) : undefined;
  return freeze({
    version: 1 as const, kind: "personalized-preview" as const, id: options.id, locale: options.locale,
    specification: customerSpecification(actual),
    ...(sample && depicted ? { reference: { role: "illustrative-reference-only" as const, sampleId: sample.id, view: sample.view,
      assetPath: sample.src, depictedSpecification: customerSpecification(depicted),
      instruction: "Use only presentation and styling inspiration. Customer specification controls names and all selected details; never copy the reference name as customer identity." as const } } : {}),
    requestedViews: [...views], spellingConfirmed: false as const,
  });
}
/**
 * The complete backend draft for one personalized run.
 *
 * Every field the atelier does not ask for is an explicit, named product default
 * rather than an invention: each one is commented with what it is and why it is
 * defensible. Nothing here is derived from the illustrated sample on screen.
 *
 * `construction`, `lettering` and `origin` are optional additions to
 * `JewelrySpecification`; they are stored on the draft and the immutable revision
 * so the approved record is faithful, and they are deliberately not threaded into
 * the prompt registry, whose 14-variable set is pinned in the database.
 */

/** 22 mm is the delicate profile, 32 mm the classic one: the atelier offers no other width. */
const SIZE_PROFILE = { 22: "delicate", 32: "classic" } as const;
/**
 * The customer chooses a width, never a cast height or thickness. These are the
 * atelier's standard proportions for a single-piece cast name pendant: height is
 * the seeded reference ratio (30 x 18 mm), thickness the 1.2 mm minimum the
 * casting rule requires for a connected letter run.
 */
const PENDANT_HEIGHT_MM = { 22: 12, 32: 18 } as const;
const PENDANT_THICKNESS_MM = 1.2;
/** No chain-length control exists in the atelier. 45 cm is the standard adult length. */
const DEFAULT_CHAIN_LENGTH_CM = 45 as const;
/** Every catalogue photograph and every published look is high-polished 18K. */
const DEFAULT_FINISH = "polished" as const;
/**
 * Manufacturing complexity, driven by the only thing the customer selects that
 * changes the bench work: how much of the piece is set with stones.
 */
const COMPLEXITY_BY_COVERAGE = {
  "No stones": 1,
  Accent: 2,
  "Partial pavé": 3,
  "Full pavé": 4,
} as const;
const CONSTRUCTION = {
  Classical: "classical",
  "Origami ribbon": "origami-ribbon",
  "Framed minimal": "framed-minimal",
  "Diamond rails": "diamond-rails",
} as const;
const LETTERING = {
  Classic: "classic",
  Minimal: "minimal",
  Diwani: "diwani",
  Kufi: "kufi",
  Signature: "signature",
  "Thuluth inspired": "thuluth-inspired",
} as const;
/**
 * `contemporary` is the frozen Caleums alias for the certified `classic` Arabic
 * engine (docs/CALEUMS-FINAL-E2E-CONTRACT.md; identity-anchor.ts and
 * prompt-registry.ts both resolve contemporary -> classic). The approve RPC also
 * reads a non-`none` arabicStyle as "this run is Arabic", so an Arabic name must
 * always carry one. Styles the identity engine has not certified stay mapped to
 * themselves and fail closed at the pre-spend gate; they are never silently
 * downgraded to a style that would spell the name differently.
 */
const ARABIC_STYLE = {
  Classic: "contemporary",
  Minimal: "minimal",
  Diwani: "diwani",
  Kufi: "kufi",
  Signature: "signature",
  "Thuluth inspired": "thuluth-inspired",
} as const;
const LAYOUT = {
  "Side by side": "side-by-side",
  "Connected heart": "connected-heart",
  Stacked: "stacked",
  Infinity: "infinity",
  Interlocked: "interlocked",
} as const;
/**
 * The jump rings are integral to the pendant body for every construction, so
 * they are never a connector choice. `connector` describes only how two names
 * are joined; a single name has none.
 */
const CONNECTOR = {
  "Side by side": "plain",
  "Connected heart": "heart",
  Stacked: "plain",
  Infinity: "infinity",
  Interlocked: "interlocked",
} as const;
const METAL = {
  "Yellow gold": "yellow",
  "White gold": "white",
  "Rose gold": "rose",
} as const;
const COVERAGE = {
  "No stones": "none",
  Accent: "accent",
  "Partial pavé": "partial-pave",
  "Full pavé": "full-pave",
} as const;
const GEMSTONE = {
  "Lab diamond": "lab-diamond",
  "Natural diamond": "natural-diamond",
  Ruby: "ruby",
  Emerald: "emerald",
  "Blue sapphire": "blue-sapphire",
  "Pink sapphire": "pink-sapphire",
} as const;
const CHAIN = { Cable: "cable", Rolo: "rolo", Box: "box", Curb: "curb" } as const;

/** Engraving has no dedicated column, so it is labelled inside the notes the bench reads. */
function notes(engraving?: string, specialRequests?: string) {
  const lines = [
    ...(engraving ? [`Engraving: ${engraving}`] : []),
    ...(specialRequests ? [`Customer request: ${specialRequests}`] : []),
  ];
  return lines.length ? lines.join("\n") : undefined;
}

export function backendSpecification(
  request: PersonalizedPreviewRequest,
): CreateDraftInput {
  const d = request.specification;
  const arabic = d.script === "Arabic";
  const names = d.names.map((name) => ({
    approvedEnglishText: arabic ? null : name,
    approvedArabicText: arabic ? name : null,
  }));
  const note = notes(d.engraving, d.specialRequests);
  return {
    jewelryType: "name-pendant",
    nameCount: names.length as 1 | 2,
    names: names as
      | [(typeof names)[number]]
      | [(typeof names)[number], (typeof names)[number]],
    arabicStyle: arabic ? ARABIC_STYLE[d.lettering] : "none",
    lettering: LETTERING[d.lettering],
    construction: CONSTRUCTION[d.construction],
    layout: d.layout ? LAYOUT[d.layout] : "single-name",
    connector: d.layout ? CONNECTOR[d.layout] : "none",
    // Nothing was uploaded or registered: the labelled photograph on screen is an
    // illustration of the look, never a backend inspiration asset.
    source: "fresh",
    origin: "caleums-atelier",
    metalKarat: "18K",
    metalColor: METAL[d.gold.color],
    finish: DEFAULT_FINISH,
    stoneCoverage: COVERAGE[d.stones.coverage],
    gemstone: d.stones.gemstone ? GEMSTONE[d.stones.gemstone] : "none",
    sizeProfile: SIZE_PROFILE[d.pendantWidthMm],
    dimensions: {
      widthMm: d.pendantWidthMm,
      heightMm: PENDANT_HEIGHT_MM[d.pendantWidthMm],
      thicknessMm: PENDANT_THICKNESS_MM,
    },
    chain: { style: CHAIN[d.chainStyle], lengthCm: DEFAULT_CHAIN_LENGTH_CM },
    complexity: COMPLEXITY_BY_COVERAGE[d.stones.coverage],
    ...(note ? { notes: note } : {}),
  };
}

/**
 * The immutable specification approved for a revision. `spellingConfirmed` is
 * the customer's own confirmation of their name; the approval RPC refuses to
 * start a run without it, and this code never sets it for them.
 */
export function approvedSpecification(
  request: PersonalizedPreviewRequest,
  spellingConfirmed: boolean,
): JewelrySpecification {
  if (!spellingConfirmed)
    throw new Error("Spelling confirmation is required before approval.");
  return { ...backendSpecification(request), spellingConfirmed: true };
}

/** The draft POST body; the locale is the interface language the shopper is in. */
export function backendDraftBody(request: PersonalizedPreviewRequest) {
  return {
    locale: request.locale,
    specification: backendSpecification(request),
  };
}

/**
 * The honest-degrade capture body. It carries the customer vocabulary the shopper
 * actually chose and the labelled sample they were actually shown, so the
 * operator reads back exactly what was on screen.
 */
export function previewRequestBody(input: {
  request: PersonalizedPreviewRequest;
  contact: { channel: "whatsapp" | "phone" | "email"; value: string; name?: string };
  requestKey: string;
  manifestId: string;
  sampleShown: boolean;
  designId?: string;
  designRevisionId?: string;
  generationRunId?: string;
}) {
  const { request, contact } = input;
  return {
    locale: request.locale,
    specification: { ...request.specification },
    contact: {
      channel: contact.channel,
      value: contact.value,
      ...(contact.name?.trim() ? { name: contact.name.trim() } : {}),
    },
    ...(input.sampleShown && request.reference
      ? {
          sampleReference: {
            role: "illustrative-reference-only" as const,
            manifestId: input.manifestId,
            sampleId: request.reference.sampleId,
            view: request.reference.view,
            assetPath: request.reference.assetPath,
          },
        }
      : {}),
    ...(input.designId ? { designId: input.designId } : {}),
    ...(input.designRevisionId
      ? { designRevisionId: input.designRevisionId }
      : {}),
    ...(input.generationRunId
      ? { generationRunId: input.generationRunId }
      : {}),
    requestKey: input.requestKey,
  };
}
/** Explicit local adapter: existing photos remain references, never personalized output. */
export async function runMockPersonalizedPreview(request: PersonalizedPreviewRequest, captureReferences: () => Promise<Capture>) {
  const referenceCapture = await captureReferences();
  return { mode: "mock" as const, personalized: false as const, request,
    referenceCapture, backendPreparation: backendSpecification(request) };
}
