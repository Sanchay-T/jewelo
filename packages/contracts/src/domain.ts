import { z } from "zod";

export type Locale = "en" | "ar";
export type Role = "customer" | "operator";
export type ScenarioId =
  | "fast-all"
  | "slow-sibling"
  | "partial"
  | "quota-2"
  | "retry"
  | "resume"
  | "cancel";

export const PRESENTATION_VIEWS = [
  "studio",
  "on_skin",
  "close_up",
  "dark",
  "motion",
] as const;
export type PresentationView = (typeof PRESENTATION_VIEWS)[number];
export const ENABLED_PRESENTATION_VIEWS = [
  "studio",
  "on_skin",
  "close_up",
  "dark",
] as const;
export type EnabledPresentationView =
  (typeof ENABLED_PRESENTATION_VIEWS)[number];

export interface PresentationViewConfig {
  enabled: readonly PresentationView[];
}
export interface PresentationViewOverride {
  enabled?: readonly PresentationView[];
}
export function resolvePresentationViewConfig(
  override: PresentationViewOverride = {},
): PresentationViewConfig {
  return { enabled: override.enabled ?? ENABLED_PRESENTATION_VIEWS };
}

export type TaskState =
  | "queued"
  | "generating"
  | "verifying"
  | "ready"
  | "retrying"
  | "failed"
  | "blocked"
  | "cancelled"
  | "unavailable"
  | "available_on_request";
export interface Principal {
  id: string;
  name: string;
  role: Role;
}
export interface IdentityAnchor {
  approvedText: string;
  language: Locale;
  typography: string;
  fingerprint: string;
  geometryPath: string;
}
export interface VerificationResult {
  status: "passed" | "failed" | "pending";
  exactText: boolean;
  identityScore: number | null;
  /**
   * A line for the shopper, written by this application. It is never the
   * verifier's own prose: `/api/state` stops `notes` at its allowlist
   * (fix-2 review M5), because the verifier writes that field after being shown
   * the approved name and can repeat a misreading of it.
   */
  notes: string;
}
/**
 * The image providers whose output may be presented to a shopper as their own
 * photograph.
 *
 * Storyline review 1, M3. This used to be the other way round: the browser held
 * a denylist of one string (`mock`), so every provider name the denylist did not
 * happen to know - a new adapter, a fixture writer, a typo, a row written by a
 * future build - presented a picture as the customer's piece. An allowlist fails
 * the safe way: a provider nobody has certified is never presented, and adding
 * one is an edit here, in the contract, rather than an accident in a route.
 *
 * `openai` is the only entry because `gpt-image-2` is the only model that makes
 * a still this product will show (D-018, docs/CALEUMS-FINAL-E2E-CONTRACT.md);
 * `mock` writes real plumbing and a fake photograph and is deliberately absent.
 */
export const PRESENTABLE_PROVIDERS = ["openai"] as const;
export type PresentableProvider = (typeof PRESENTABLE_PROVIDERS)[number];

export interface AssetLineage {
  revisionId: string;
  runId: string;
  taskId: string;
  provider: string;
  model: string;
  promptRelease: string;
  inputAssets: string[];
  attempt: number;
  verificationResult: VerificationResult;
}
export interface PresentationAsset {
  id: string;
  view: PresentationView;
  state: TaskState;
  assetUrl?: string;
  posterUrl?: string;
  alt: string;
  lineage: AssetLineage;
}
export interface PresentationTask {
  id: string;
  view: PresentationView;
  state: TaskState;
  attempt: number;
  assetId?: string;
}
export interface GenerationRun {
  id: string;
  revisionId: string;
  label: string;
  createdAt: string;
  status: "running" | "partial" | "complete" | "cancelled";
  elapsedMs: number;
  tasks: PresentationTask[];
  assets: PresentationAsset[];
}

export type ArabicStyle =
  | "none"
  | "contemporary"
  | "diwani"
  | "thuluth-inspired"
  | "kufi"
  | "signature"
  | "minimal";
export type PendantLayout =
  | "single-name"
  | "side-by-side"
  | "connected-heart"
  | "stacked"
  | "stacked-heart"
  | "infinity"
  | "interlocked";
export type MetalColor = "yellow" | "white" | "rose";
export type StoneCoverage = "none" | "accent" | "partial-pave" | "full-pave";
export type Gemstone =
  | "none"
  | "lab-diamond"
  | "natural-diamond"
  | "ruby"
  | "emerald"
  | "blue-sapphire"
  | "pink-sapphire";
export type ConnectorStyle =
  "none" | "heart" | "infinity" | "plain" | "interlocked";
/**
 * Pendant construction and lettering are customer choices the atelier has always
 * shown but the backend specification could not carry, so they were dropped on
 * the way to a design revision. They are additive and optional: every existing
 * revision, the `approve_and_start_studio` RPC and the fixed prompt-variable set
 * keep working untouched. They are deliberately NOT threaded into
 * `prompt_releases` - `create_prompt_release` pins an exact 14-variable set in
 * the database, so widening it is a migration, not a UI change. Until then these
 * ride on the draft and the immutable revision only, which is enough to keep the
 * approved specification a faithful record of what the customer chose.
 */
export type PendantConstruction =
  | "classical"
  | "origami-ribbon"
  | "framed-minimal"
  | "diamond-rails";
export type LetteringStyle =
  | "classic"
  | "minimal"
  | "diwani"
  | "kufi"
  | "signature"
  | "thuluth-inspired";
/** Which customer surface produced the draft. Lineage only; never a provider input. */
export type SpecificationOrigin = "caleums-atelier";
export type SizeProfile = "delicate" | "classic" | "statement" | "custom";
export type ChainStyle = "cable" | "curb" | "rolo" | "box";
export interface ApprovedName {
  approvedEnglishText: string | null;
  approvedArabicText: string | null;
}
export interface ReferenceAssetInput {
  id: string;
  fileName?: string;
}
export interface PendantDimensions {
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
}
export interface ChainSpecification {
  style: ChainStyle;
  lengthCm: 40 | 45 | 50 | 55;
}

export interface JewelrySpecification {
  jewelryType: "name-pendant";
  nameCount: 1 | 2;
  names: readonly [ApprovedName] | readonly [ApprovedName, ApprovedName];
  arabicStyle: ArabicStyle;
  layout: PendantLayout;
  source: "fresh" | "inspiration" | "upload";
  referenceAsset?: ReferenceAssetInput;
  metalKarat: "18K";
  metalColor: MetalColor;
  finish: "polished" | "matte" | "satin";
  stoneCoverage: StoneCoverage;
  gemstone: Gemstone;
  /**
   * Every stone the piece is set with, when it is set with more than one.
   * Optional and additive: `gemstone` stays the first of them, so a revision
   * approved before 22 September 2026 reads back unchanged.
   */
  gemstones?: readonly Gemstone[];
  connector: ConnectorStyle;
  /** Optional: absent on every revision approved before 7 September 2026. */
  construction?: PendantConstruction;
  /** The chosen lettering for either script. `arabicStyle` stays the Arabic
   * identity-engine selector; this records the customer's choice for English,
   * where the backend had no field at all. */
  lettering?: LetteringStyle;
  origin?: SpecificationOrigin;
  sizeProfile: SizeProfile;
  dimensions: PendantDimensions;
  chain: ChainSpecification;
  complexity: number;
  occasion?: string;
  notes?: string;
  spellingConfirmed: true;
}
export type DesignInput = JewelrySpecification;
export type JewelryDraftSpecification = Omit<
  JewelrySpecification,
  "spellingConfirmed"
> & { spellingConfirmed: boolean };
export type CreateDraftInput = Omit<
  JewelryDraftSpecification,
  "spellingConfirmed"
> & { spellingConfirmed?: false };
export type UpdateDraftInput = Partial<JewelryDraftSpecification>;
export interface ApproveRevisionInput {
  draftId: string;
  specification: JewelrySpecification;
}

export interface DesignDraft {
  id: string;
  ownerPrincipalId: string;
  locale: Locale;
  specification: JewelryDraftSpecification;
  createdAt: string;
  updatedAt: string;
}

export interface DesignRevision {
  id: string;
  number: number;
  createdAt: string;
  approvedAt: string;
  identityAnchor: IdentityAnchor;
  specification: JewelrySpecification;
  immutable: true;
}
export interface Estimate {
  id: string;
  revisionId: string;
  currency: "AED";
  low: number;
  high: number;
  confidence: "medium";
  assumptions: string[];
  goldPriceTimestamp: string;
  expiresAt: string;
}
export interface Quote {
  id: string;
  designId: string;
  estimateId: string;
  status: "requested" | "issued" | "accepted" | "expired";
  total: number;
  issuedAt?: string;
  expiresAt: string;
  snapshot: Estimate;
}
/**
 * The fulfillment states an order moves through, in shop order.
 *
 * The same four the `orders` check constraint accepts
 * (`supabase/migrations/20260827000000_caleums_one_view_backend.sql`). The
 * generated types in `packages/data/src/database.types.ts` carry the column as
 * plain `text`, so this list is the one vocabulary the code has and the
 * database is the one that refuses anything else.
 */
export const ORDER_FULFILLMENT_STATUSES = [
  "confirmed",
  "in-production",
  "quality-check",
  "ready",
] as const;
export type OrderFulfillmentStatus = (typeof ORDER_FULFILLMENT_STATUSES)[number];

/**
 * Fix review 3, MN-3. The four statuses are a line, not a set: an order is
 * confirmed, then in production, then at quality check, then ready. The command
 * used to accept any of the four from any of the four, so a mis-click could
 * send a piece that was already at quality check back to confirmed, and the
 * audit trail would record it as a legitimate move. Forward only, one step at a
 * time, and the terminal status has nowhere left to go.
 */
export const ORDER_FULFILLMENT_TRANSITIONS: Readonly<
  Record<OrderFulfillmentStatus, readonly OrderFulfillmentStatus[]>
> = {
  confirmed: ["in-production"],
  "in-production": ["quality-check"],
  "quality-check": ["ready"],
  ready: [],
};

/** The statuses an order in `from` may move to, empty when it is finished. */
export function allowedFulfillmentTransitions(
  from: string,
): readonly OrderFulfillmentStatus[] {
  return ORDER_FULFILLMENT_TRANSITIONS[from as OrderFulfillmentStatus] ?? [];
}

/**
 * Security review 2 M-4. The operator command that moves an order along used to
 * hand `payload.status` to PostgREST as it arrived and filter on the order id
 * alone, so any string the check constraint happened to accept could be written
 * to any order in the shop. The envelope is validated here, `designId` is
 * required, and the route puts it in the filter.
 */
export const fulfillmentTransitionCommandSchema = z.object({
  command: z.literal("fulfillment_transition"),
  designId: z.uuid(),
  targetId: z.uuid(),
  idempotencyKey: z.string().min(1).max(200),
  payload: z.object({ status: z.enum(ORDER_FULFILLMENT_STATUSES) }),
});
export type FulfillmentTransitionCommandInput = z.infer<
  typeof fulfillmentTransitionCommandSchema
>;

export interface Order {
  id: string;
  designId: string;
  quoteId: string;
  status: OrderFulfillmentStatus;
  acceptedTotal: number;
  acceptedAt: string;
  revisionId: string;
}
export interface AuditEvent {
  id: string;
  at: string;
  actor: string;
  action: string;
  detail: string;
}
export interface Design {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  revisions: DesignRevision[];
  runs: GenerationRun[];
  estimate?: Estimate;
  quote?: Quote;
  order?: Order;
  audit: AuditEvent[];
}
export interface SpikeState {
  version: 1;
  engine?: "jewelo-working-app";
  principal: Principal;
  scenario: ScenarioId;
  designs: Design[];
  activeDesignId?: string;
  resumePath?: string;
}
export type RunListener = (run: GenerationRun) => void;

export interface JeweloClient {
  hydrate(): Promise<SpikeState>;
  onChange(listener: () => void): () => void;
  getState(): SpikeState;
  setResumePath(path: string): Promise<SpikeState>;
  setRole(role: Role): Promise<SpikeState>;
  setScenario(scenario: ScenarioId): Promise<SpikeState>;
  listDesigns(): Design[];
  getDesign(id: string): Design | undefined;
  createDraft(input: CreateDraftInput): Promise<DesignDraft>;
  updateDraft(draftId: string, input: UpdateDraftInput): Promise<DesignDraft>;
  approveRevision(input: ApproveRevisionInput): Promise<Design>;
  refineDesign(designId: string, note: string): Promise<Design>;
  startRun(designId: string): Promise<Design>;
  subscribeToRun(runId: string, listener: RunListener): () => void;
  advanceRun(runId: string, elapsedMs: number): Promise<GenerationRun>;
  retryTask(designId: string, taskId: string): Promise<Design>;
  cancelTask(designId: string, taskId: string): Promise<Design>;
  calculateEstimate(designId: string): Promise<Design>;
  requestQuote(designId: string): Promise<Design>;
  issueQuote(designId: string): Promise<Design>;
  acceptQuote(designId: string): Promise<Design>;
  createOrder(designId: string): Promise<Design>;
  updateFulfillment(designId: string): Promise<Design>;
  getAudit(designId: string): AuditEvent[];
  reset(): Promise<SpikeState>;
}

/* ------------------------------------------------------------------------- */
/* Runtime validation of a customer specification.                            */
/*                                                                            */
/* Everything above is a compile-time shape only: the drafts, draft-patch and  */
/* approve routes used to hand an arbitrary JSON object straight to Postgres,  */
/* to the HarfBuzz shaper and to a paid prompt. This schema is the runtime     */
/* gate. It normalises names to NFC before storage, so the SQL fingerprint and */
/* the renderer agree on the same bytes, caps their length, restricts them to  */
/* one script, refuses invisible formatting characters, and constrains         */
/* `referenceAsset.id` to the same alphabet the storage path builder expects.  */
/*                                                                            */
/* Nested objects are `.strict()`. The specification object itself strips      */
/* unknown keys instead: a revision approved before a field existed is read    */
/* back and re-posted verbatim by `refineDesign`, and a stored legacy key must */
/* degrade to being dropped rather than to a 4xx on a returning customer.      */
/* ------------------------------------------------------------------------- */

export const NAME_MAX = 30;
/**
 * How many different stones one pendant may be set with. The shop asked for
 * several stones on one piece (Omran, 22 September 2026) and named three as the
 * most a single name pendant carries without the setting losing its reading.
 */
export const GEMSTONE_MAX = 3;
/**
 * How many Latin characters the identity engine can actually cast as one
 * pendant, measured rather than guessed.
 *
 * Measured on 2026-09-08 by shaping candidate strings with
 * `shapeText` + `identityStencilSvg` (`packages/identity/src/shaping.ts`)
 * against the pinned Latin face `PlayfairDisplay-SemiBold.ttf` and reading
 * where the fit throws `identity_fit_overflow`. The fit scales the run down to
 * `IDENTITY_MIN_FONT_SIZE` (40 px) inside the body box `IDENTITY_BODY_WIDTH` x
 * `IDENTITY_BODY_HEIGHT` (884 x 774 px) and refuses anything still wider:
 *
 * - `"n"` repeated: 37 fit, 38 overflow (width 905.68 > 884).
 * - `"Mohammed Abdulrahman & Fatima Alzahra"` (37): fits.
 * - a mixed-case realistic run reaches 48 before it overflows.
 * - `"W"` repeated: 24 fit, 25 overflow, so a wide 30-character name can still
 *   overflow below this cap; the engine's own fit refuses those and the run
 *   fails closed into operator review rather than casting a clipped pendant.
 *
 * 37 is therefore the honest preflight ceiling: it is the point below which a
 * name of ordinary letterforms fits, and it is what lets the shop refuse two
 * 30-character names (63 characters joined) in words, before any spend.
 */
export const NAME_FIT_MAX_LATIN_CHARACTERS = 37;
/**
 * How the approved Latin text for a two-name pendant is assembled. This is the
 * same joiner the database uses when it builds the anchor text
 * (`string_agg(..., ' & ' order by ordinal)` in `create_prompt_release`), and
 * `apps/jobs/src/identity-anchor.ts` shapes that whole string as one run.
 */
export const LATIN_NAME_JOINER = " & ";
/**
 * True when the Latin names, joined the way the pendant is actually cast, are
 * longer than the identity engine can fit. Arabic is solved one name at a time,
 * so it is never joined and never measured here.
 */
export function exceedsLatinNameFit(names: readonly string[]): boolean {
  return (
    names.filter(Boolean).join(LATIN_NAME_JOINER).length >
    NAME_FIT_MAX_LATIN_CHARACTERS
  );
}
/** Zero-width joiners, bidi overrides, soft hyphen and BOM: invisible in the
 * shop, meaningful to a shaper and to anything that later renders the name. */
const INVISIBLE =
  /[\u00AD\u061C\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF]/u;
/**
 * The allowed alphabets.
 *
 * A name is written, not typed into a database key, so the Latin form carries
 * the marks real names carry: combining marks (`\p{M}`, Yoruba `ẹ́mọ` after NFC
 * still ends in a combining acute) and modifier letters (`\p{Lm}`, the Hawaiian
 * ʻokina in `Hoʻoku`). The atelier accepts both, and the server refusing them
 * with a 422 while the shop's own screen accepted them is the worse failure.
 * Digits are in neither form: Arabic-Indic digits are `Script=Arabic`, so they
 * are excluded by a separate rule rather than by the alphabet.
 */
const LATIN_NAME = /^[\p{Script=Latin}\p{M}\p{Lm}'’\- ]+$/u;
const ARABIC_NAME = /^[\p{Script=Arabic}\p{M}\p{Lm} ]+$/u;
/** Any Unicode space separator, plus the ASCII control whitespace. */
const WHITESPACE = /[\p{Zs}\t\n\r\f\v]+/gu;
const DIGIT = /\p{Nd}/u;
export const REFERENCE_ASSET_ID = /^[a-zA-Z0-9_-]{1,128}$/;

/**
 * At least one real letter of the expected script.
 *
 * `'''`, `- - -`, a bare string of harakat and `٠١` are all letterless: the
 * atelier refuses them, and before this the server did not, so the shaper and a
 * paid still were handed punctuation to render as gold. Modifier letters are
 * `\p{L}` but are not a name on their own, so the test is per character and
 * demands the script as well.
 */
const hasScriptLetter = (value: string, script: RegExp) =>
  Array.from(value).some(
    (character) => /\p{L}/u.test(character) && script.test(character),
  );

export type NameScript = "latin" | "arabic";
/** What is wrong with one name, in the order the shopper should hear it. */
export type NameProblem =
  | "empty"
  | "too_long"
  | "invisible"
  | "alphabet"
  | "digits"
  | "no_letter";

/**
 * The name exactly as this schema stores it: NFC, every run of whitespace
 * collapsed to one space, trimmed. Measure the length of this, never of the raw
 * field, or a pasted non-breaking space counts against the cap.
 */
export function normalizeName(value: string): string {
  return value.normalize("NFC").replace(WHITESPACE, " ").trim();
}

/**
 * The one implementation of the name rules. The schema below and the atelier's
 * own client-side check both call it, so the shop's screen and the server can
 * never disagree about whether a name is acceptable.
 *
 * `value` must already be normalised with `normalizeName`.
 */
export function nameProblem(
  value: string,
  script: NameScript,
): NameProblem | undefined {
  if (!value.length) return "empty";
  if (value.length > NAME_MAX) return "too_long";
  if (INVISIBLE.test(value)) return "invisible";
  if (!(script === "latin" ? LATIN_NAME : ARABIC_NAME).test(value))
    return "alphabet";
  if (script !== "latin" && DIGIT.test(value)) return "digits";
  if (
    !hasScriptLetter(
      value,
      script === "latin" ? /\p{Script=Latin}/u : /\p{Script=Arabic}/u,
    )
  )
    return "no_letter";
  return undefined;
}

/** One sentence per problem, saying what to do rather than what failed. */
export function nameProblemMessage(
  problem: NameProblem,
  script: NameScript,
): string {
  const alphabet =
    script === "latin"
      ? "Use Latin letters, spaces, apostrophes or hyphens."
      : "Use Arabic letters and spaces.";
  return {
    empty: "Enter a name.",
    too_long: `Use at most ${NAME_MAX} characters.`,
    invisible: "Remove invisible formatting characters.",
    alphabet,
    digits: alphabet,
    no_letter:
      script === "latin"
        ? "Enter a name containing Latin letters."
        : "Enter a name containing Arabic letters.",
  }[problem];
}

const nameText = (script: NameScript) =>
  z
    .string()
    .max(NAME_MAX * 4)
    // Collapse first, then measure: a pasted non-breaking space or a run of
    // spaces is one space, so the length cap and the alphabet both see the
    // name the customer meant to write.
    .transform(normalizeName)
    .superRefine((value, ctx) => {
      const problem = nameProblem(value, script);
      if (problem)
        ctx.addIssue({
          code: "custom",
          message: nameProblemMessage(problem, script),
        });
    });

export const approvedNameSchema = z
  .strictObject({
    approvedEnglishText: nameText("latin").nullable(),
    approvedArabicText: nameText("arabic").nullable(),
  })
  .refine(
    (value) =>
      Boolean(value.approvedEnglishText) !== Boolean(value.approvedArabicText),
    "Give exactly one script per name.",
  );

export const referenceAssetSchema = z.strictObject({
  id: z.string().regex(REFERENCE_ASSET_ID, "Invalid reference ID."),
  fileName: z.string().max(255).optional(),
});

const arabicStyleSchema = z.enum([
  "none",
  "contemporary",
  "diwani",
  "thuluth-inspired",
  "kufi",
  "signature",
  "minimal",
]);
const layoutSchema = z.enum([
  "single-name",
  "side-by-side",
  "connected-heart",
  "stacked",
  "stacked-heart",
  "infinity",
  "interlocked",
]);
const connectorSchema = z.enum([
  "none",
  "heart",
  "infinity",
  "plain",
  "interlocked",
]);
const constructionSchema = z.enum([
  "classical",
  "origami-ribbon",
  "framed-minimal",
  "diamond-rails",
]);
const letteringSchema = z.enum([
  "classic",
  "minimal",
  "diwani",
  "kufi",
  "signature",
  "thuluth-inspired",
]);
const gemstoneSchema = z.enum([
  "none",
  "lab-diamond",
  "natural-diamond",
  "ruby",
  "emerald",
  "blue-sapphire",
  "pink-sapphire",
]);

const specificationShape = {
  jewelryType: z.literal("name-pendant"),
  nameCount: z.union([z.literal(1), z.literal(2)]),
  names: z.union([
    z.tuple([approvedNameSchema]),
    z.tuple([approvedNameSchema, approvedNameSchema]),
  ]),
  arabicStyle: arabicStyleSchema,
  layout: layoutSchema,
  source: z.enum(["fresh", "inspiration", "upload"]),
  referenceAsset: referenceAssetSchema.optional(),
  metalKarat: z.literal("18K"),
  metalColor: z.enum(["yellow", "white", "rose"]),
  finish: z.enum(["polished", "matte", "satin"]),
  stoneCoverage: z.enum(["none", "accent", "partial-pave", "full-pave"]),
  gemstone: gemstoneSchema,
  gemstones: z.array(gemstoneSchema).min(1).max(GEMSTONE_MAX).optional(),
  connector: connectorSchema,
  construction: constructionSchema.optional(),
  lettering: letteringSchema.optional(),
  origin: z.literal("caleums-atelier").optional(),
  sizeProfile: z.enum(["delicate", "classic", "statement", "custom"]),
  dimensions: z.strictObject({
    widthMm: z.number().min(5).max(120),
    heightMm: z.number().min(5).max(120),
    thicknessMm: z.number().min(0.5).max(10),
  }),
  chain: z.strictObject({
    style: z.enum(["cable", "curb", "rolo", "box"]),
    lengthCm: z.union([
      z.literal(40),
      z.literal(45),
      z.literal(50),
      z.literal(55),
    ]),
  }),
  complexity: z.number().min(0).max(10),
  occasion: z.string().max(120).optional(),
  notes: z.string().max(2000).optional(),
} as const;

const withNameCount = <T extends { nameCount: number; names: unknown[] }>(
  value: T,
) => value.nameCount === value.names.length;

/**
 * `gemstone` is the first of the chosen stones, exactly as the preview request
 * requires, so the single-stone field and the list can never name two different
 * first stones.
 */
const withFirstGemstone = <
  T extends { gemstone: string; gemstones?: readonly string[] },
>(
  value: T,
) => value.gemstones === undefined || value.gemstones[0] === value.gemstone;

/** The draft specification: the shopper has not confirmed the spelling yet. */
export const jewelryDraftSpecificationSchema = z
  .object({
    ...specificationShape,
    spellingConfirmed: z.boolean().optional(),
  })
  .refine(withNameCount, "nameCount must match the number of names.")
  .refine(withFirstGemstone, "The first chosen stone must be the gemstone.");

/** The approved specification a revision is cut from; spelling is confirmed. */
export const jewelrySpecificationSchema = z
  .object({
    ...specificationShape,
    spellingConfirmed: z.literal(true),
  })
  .refine(withNameCount, "nameCount must match the number of names.")
  .refine(withFirstGemstone, "The first chosen stone must be the gemstone.");

/* ------------------------------------------------------------------------- */
/* Storyline review 1 M7. The refusals that will never change their mind.     */
/*                                                                           */
/* A stopped task carries the head of an error class in `terminal_error_code`. */
/* Some of those are about the moment - the provider timed out, a worker died, */
/* an upload failed - and running the piece again is exactly right. These are  */
/* not: each one is a property of the name, the specification or the published */
/* recipe, decided before any money is spent, and the same dispatch decides it */
/* the same way every time. "Photograph it again" on one of these is a         */
/* guaranteed no-op that tells the shop the piece was sent back when nothing   */
/* moved, which is why the operator queue offers to make it by hand instead.   */
/*                                                                           */
/* The list lives here, not in the queue component, because it is a fact about */
/* the pipeline's refusals rather than about one screen.                      */
/* ------------------------------------------------------------------------- */

export const DETERMINISTIC_REFUSAL_CODES = [
  "identity_no_ring_seat",
  "identity_ring_tilt_too_steep",
  "identity_ring_overhang_too_wide",
  "identity_ring_span_too_narrow",
  "identity_ring_post_too_long",
  "identity_shaping_gate_failed",
  "identity_component_gate_failed",
  "identity_bar_fallback",
  // The studio stencil was drawn in lettering the construction no longer uses,
  // so every view that reuses it is refused again; the request has to restart.
  "identity_reuse_lettering_mismatch",
  "prompt_compile_failed",
  "studio_only_policy",
  // Every paid try is used; the database refuses another.
  "provider_attempt_budget_exhausted",
  // A stored photograph with no attempt row cannot be settled or resumed.
  "provider_attempt_checkpoint_missing",
  // The tool release this task is pinned to is not the one running.
  "identity_pipeline_release_mismatch",
  // Properties of the name or the stored rows: the same dispatch decides them
  // the same way every time.
  "approved_text_missing",
  "identity_carrier_moved_ink",
  "identity_carrier_no_room",
  "identity_recentre_too_large",
  "identity_label4_size",
  "identity_raster_channels",
  "decodemask",
  "measuremask",
  "identity_artifact_lineage_missing",
  "identity_reuse_artifact_mismatch",
  "identity_reuse_fingerprint_mismatch",
  "identity_reuse_font_mismatch",
  "identity_reuse_png_format_mismatch",
  "identity_reuse_png_mismatch",
  "identity_reuse_report_mismatch",
  "identity_reuse_revision_mismatch",
  "identity_reuse_source_asset_mismatch",
  "identity_reuse_source_task_mismatch",
  "identity_reuse_unsupported_input",
  // SP-2e1: a view recorded on another route than its studio photograph.
  "identity_reuse_route_mismatch",
  // SP-2e1: the compiled recipe and the images the request carries disagree
  // about the route. A property of the snapshot and the release, so the same
  // dispatch decides it the same way every time.
  "still_free_route_carries_stencil",
  "still_stencil_required",
  // An immutable snapshot or a pinned release that does not line up with its task never will.
  "prompt_snapshot_lineage_mismatch",
  "task_prompt_release_mismatch",
  "inspiration_reference_invalid",
  "prompt_snapshot_compiler_stale",
  "prompt_snapshot_rejected",
  "signed_storage_path_invalid",
  // SP-2e1g: `task_not_found`, `run_not_found` and `revision_not_found` used to
  // sit here. They are thrown by `SupabasePresentationRepository.load()`, which
  // runs at the top of `executePresentationTask` before any gate and outside
  // every try, so the throw escapes to Inngest (retries: 0) and nothing ever
  // writes them to `terminal_error_code`. A list entry for a code no row can
  // hold is a claim the queue cannot honour, so they are gone.
  // The studio photograph was cancelled, so this view has nothing to copy.
  // `dependency_blocked` and `dependency_failed` are not here: once the studio
  // photograph is retried and ready, retrying the view is what moves it.
  "dependency_cancelled",
  // Configuration codes (`spend_ceiling_not_set`, `runtime_policy_missing`,
  // `look_reference_missing`, `look_reference_checksum_mismatch`,
  // `unknown_pinned_identity_font`) are not here either: each is checked again
  // on every dispatch, so once a person fixes the setting a retry works.
  // `prompt_release_not_found` used to be named in that sentence as if a retry
  // would work; it is thrown by `load()` on the same escaping path as the three
  // above, so no row can carry it and there is nothing to retry (SP-2e1g).
] as const;

export type DeterministicRefusalCode =
  (typeof DETERMINISTIC_REFUSAL_CODES)[number];

const DETERMINISTIC_REFUSALS: ReadonlySet<string> = new Set(
  DETERMINISTIC_REFUSAL_CODES,
);

/**
 * True when a stored error code can only ever be refused again.
 *
 * The stored value carries measurements (`identity_no_ring_seat:left=6,right=6`)
 * and can compose two classes with `|`, so the head - what stands before the
 * first `:` or `|` - is what is matched, exactly as the operator queue's own
 * vocabulary matches it.
 */
export function isDeterministicRefusal(code: string | undefined): boolean {
  if (!code) return false;
  return DETERMINISTIC_REFUSALS.has(code.split("|")[0]?.split(":")[0] ?? "");
}
