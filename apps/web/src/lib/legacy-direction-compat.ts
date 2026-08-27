import type {
  AssetLineage,
  ApproveRevisionInput,
  Design,
  DesignInput,
  DesignRevision,
  Estimate,
  GenerationRun,
  JeweloClient,
  Order,
  PresentationAsset,
  PresentationTask,
  Quote,
  Role,
  ScenarioId,
  SpikeState,
  TaskState,
} from "@jewelo/contracts";

// Temporary Goal 02 bridge for the working app's four-direction fixture.
// Delete this file when the final integration moves the UI to presentation views.

export type RepresentationKind = "product" | "worn" | "motion";
export interface LegacyAssetLineage extends AssetLineage {
  directionId: string;
}
export interface Representation {
  id: string;
  kind: RepresentationKind;
  state: TaskState;
  assetUrl?: string;
  posterUrl?: string;
  alt: string;
  lineage: LegacyAssetLineage;
}
export interface Direction {
  id: string;
  label: string;
  brief: string;
  identityFingerprint: string;
  representations: Record<RepresentationKind, Representation>;
}
export interface LegacyGenerationTask extends PresentationTask {
  directionId: string;
  kind: RepresentationKind;
}
export interface LegacyGenerationRun extends GenerationRun {
  tasks: LegacyGenerationTask[];
  directions: Direction[];
  assets: PresentationAsset[];
}
export interface LegacyEstimate extends Estimate {
  directionId: string;
}
export interface LegacyQuote extends Omit<Quote, "snapshot"> {
  snapshot: LegacyEstimate;
}
export interface LegacyOrder extends Order {
  directionId: string;
}
export interface LegacyDesign extends Design {
  revisions: DesignRevision[];
  runs: LegacyGenerationRun[];
  selectedDirectionId?: string;
  estimate?: LegacyEstimate;
  quote?: LegacyQuote;
  order?: LegacyOrder;
}
export interface LegacySpikeState extends SpikeState {
  designs: LegacyDesign[];
}
export type LegacyRunListener = (run: LegacyGenerationRun) => void;

export interface LegacyJeweloClient extends Omit<
  JeweloClient,
  "subscribeToRun"
> {
  hydrate(): Promise<LegacySpikeState>;
  getState(): LegacySpikeState;
  setResumePath(path: string): Promise<LegacySpikeState>;
  setRole(role: Role): Promise<LegacySpikeState>;
  loginOperator(email: string, passphrase: string): Promise<LegacySpikeState>;
  setScenario(scenario: ScenarioId): Promise<LegacySpikeState>;
  listDesigns(): LegacyDesign[];
  getDesign(id: string): LegacyDesign | undefined;
  createDesign(input: DesignInput): Promise<LegacyDesign>;
  approveRevision(input: ApproveRevisionInput): Promise<LegacyDesign>;
  refineDesign(designId: string, note: string): Promise<LegacyDesign>;
  startRun(designId: string): Promise<LegacyDesign>;
  subscribeToRun(runId: string, listener: LegacyRunListener): () => void;
  advanceRun(runId: string, elapsedMs: number): Promise<LegacyGenerationRun>;
  retryTask(designId: string, taskId: string): Promise<LegacyDesign>;
  cancelTask(designId: string, taskId: string): Promise<LegacyDesign>;
  selectDirection(designId: string, directionId: string): Promise<LegacyDesign>;
  calculateEstimate(designId: string): Promise<LegacyDesign>;
  requestQuote(designId: string): Promise<LegacyDesign>;
  issueQuote(designId: string): Promise<LegacyDesign>;
  acceptQuote(designId: string): Promise<LegacyDesign>;
  createOrder(designId: string): Promise<LegacyDesign>;
  updateFulfillment(designId: string): Promise<LegacyDesign>;
  reset(): Promise<LegacySpikeState>;
}
