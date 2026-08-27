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
  notes: string;
}
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
  connector: ConnectorStyle;
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
export interface Order {
  id: string;
  designId: string;
  quoteId: string;
  status: "confirmed" | "in-production" | "quality-check" | "ready";
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
