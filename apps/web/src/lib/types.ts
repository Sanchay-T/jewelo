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

export type RepresentationKind = "product" | "worn" | "motion";

export interface Principal {
  id: string;
  name: string;
  role: Role;
}

export interface CanonicalIdentity {
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
  directionId: string;
  taskId: string;
  provider: string;
  model: string;
  promptRelease: string;
  inputAssets: string[];
  attempt: number;
  verificationResult: VerificationResult;
}

export interface Representation {
  id: string;
  kind: RepresentationKind;
  state: TaskState;
  assetUrl?: string;
  posterUrl?: string;
  alt: string;
  lineage: AssetLineage;
}

export interface Direction {
  id: string;
  label: string;
  brief: string;
  identityFingerprint: string;
  representations: Record<RepresentationKind, Representation>;
}

export interface GenerationTask {
  id: string;
  directionId: string;
  kind: RepresentationKind;
  state: TaskState;
  attempt: number;
}

export interface GenerationRun {
  id: string;
  revisionId: string;
  label: string;
  createdAt: string;
  status: "running" | "partial" | "complete" | "cancelled";
  elapsedMs: number;
  tasks: GenerationTask[];
  directions: Direction[];
}

export interface JewelrySpecification {
  jewelryType: "name-pendant";
  category?: string;
  metal: string;
  finish: string;
  stones: "diamond accents" | "none";
  gemstones?: string[];
  fontStyle?: string;
  goldType?: string;
  karat?: string;
  size?: string;
  lengthMm?: number;
  decoration?: string;
  widthMm: number;
  complexity: number;
  source: "fresh" | "inspiration" | "upload";
  referenceName?: string;
  occasion?: string;
  notes?: string;
}

export interface DesignRevision {
  id: string;
  number: number;
  createdAt: string;
  approvedAt: string;
  identity: CanonicalIdentity;
  specification: JewelrySpecification;
  immutable: true;
}

export interface Estimate {
  id: string;
  revisionId: string;
  directionId: string;
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
  directionId: string;
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
  selectedDirectionId?: string;
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

export interface DesignInput {
  approvedText: string;
  language: Locale;
  source: JewelrySpecification["source"];
  referenceName?: string;
  complexity: number;
  stones: JewelrySpecification["stones"];
  category?: string;
  fontStyle?: string;
  goldType?: string;
  karat?: string;
  size?: string;
  lengthMm?: number;
  gemstones?: string[];
  decoration?: string;
  metalFinish?: string;
  occasion?: string;
  notes?: string;
}

export type RunListener = (run: GenerationRun) => void;

export interface JeweloClient {
  hydrate(): SpikeState;
  onChange(listener: () => void): () => void;
  getState(): SpikeState;
  setResumePath(path: string): SpikeState;
  setRole(role: Role): SpikeState;
  setScenario(scenario: ScenarioId): SpikeState;
  listDesigns(): Design[];
  getDesign(id: string): Design | undefined;
  createDesign(input: DesignInput): Design;
  approveRevision(input: DesignInput): Design;
  refineDesign(designId: string, note: string): Design;
  startRun(designId: string): Design;
  subscribeToRun(runId: string, listener: RunListener): () => void;
  advanceRun(runId: string, elapsedMs: number): GenerationRun;
  retryTask(designId: string, taskId: string): Design;
  cancelTask(designId: string, taskId: string): Design;
  selectDirection(designId: string, directionId: string): Design;
  calculateEstimate(designId: string): Design;
  requestQuote(designId: string): Design;
  issueQuote(designId: string): Design;
  acceptQuote(designId: string): Design;
  createOrder(designId: string): Design;
  updateFulfillment(designId: string): Design;
  getAudit(designId: string): AuditEvent[];
  reset(): SpikeState;
}
