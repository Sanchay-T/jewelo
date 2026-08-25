import type {
  AssetLineage,
  CanonicalIdentity,
  Design,
  DesignInput,
  DesignRevision,
  Direction,
  GenerationRun,
  JeweloClient,
  RepresentationKind,
  Role,
  RunListener,
  ScenarioId,
  SpikeState,
  TaskState,
} from "./types";

const STORAGE_KEY = "jewelo-ui-spike:v1";
const NOW = "2026-08-26T10:00:00.000Z";
const IDENTITY_INPUT = "canonical://layla-script-v1";

function hashText(value: string): string {
  let hash = 2166136261;
  for (const character of value.normalize("NFKC")) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `jw-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function createCanonicalIdentity(text: string, language: "en" | "ar"): CanonicalIdentity {
  const approvedText = text.normalize("NFKC").trim();
  const typography = language === "ar" ? "Noto Naskh Arabic" : "Playfair Display Italic";
  return {
    approvedText,
    language,
    typography,
    fingerprint: hashText(`${language}|${typography}|${approvedText.toLocaleLowerCase()}`),
    geometryPath: `canonical-name:${language}:${approvedText.split("").map((char) => char.codePointAt(0)?.toString(16)).join("-")}`,
  };
}

function lineage(
  revisionId: string,
  runId: string,
  directionId: string,
  taskId: string,
  attempt = 1,
): AssetLineage {
  return {
    revisionId,
    runId,
    directionId,
    taskId,
    provider: "fixture",
    model: "local-approved-fixture-v1",
    promptRelease: "spike-fixture-2026-08",
    inputAssets: [IDENTITY_INPUT],
    attempt,
    verificationResult: {
      status: "passed",
      exactText: true,
      identityScore: 0.98,
      notes: "Fixture approved for interaction testing only.",
    },
  };
}

function representation(
  revisionId: string,
  runId: string,
  directionId: string,
  kind: RepresentationKind,
  state: TaskState,
  assetUrl?: string,
  attempt = 1,
) {
  const taskId = `${runId}-${directionId}-${kind}`;
  return {
    id: `${directionId}-${kind}`,
    kind,
    state,
    assetUrl,
    posterUrl: kind === "motion" ? "/fixtures/layla-direction-1-motion-poster.jpg" : undefined,
    alt: `${kind} representation of the approved Layla yellow-gold pendant, ${directionId}`,
    lineage: lineage(revisionId, runId, directionId, taskId, attempt),
  };
}

function direction(
  revisionId: string,
  runId: string,
  index: number,
  states: [TaskState, TaskState, TaskState],
): Direction {
  const id = `${runId}-direction-${index}`;
  const products = [
    "/fixtures/layla-direction-1-product.png",
    "/fixtures/layla-direction-2-product.png",
    "/fixtures/layla-direction-3-product.png",
    "/fixtures/layla-direction-4-product.png",
  ];
  const worn = [
    "/fixtures/layla-direction-1-worn.png",
    "/fixtures/layla-direction-2-worn.png",
    "/fixtures/layla-direction-3-worn.png",
    "/fixtures/layla-direction-4-worn.png",
  ];
  return {
    id,
    label: `Direction ${index}`,
    brief: ["Fine-line signature", "Botanical frame", "Diamond rhythm", "Gallery minimal"][index - 1],
    identityFingerprint: hashText("en|Playfair Display Italic|layla"),
    representations: {
      product: representation(revisionId, runId, id, "product", states[0], products[index - 1]),
      worn: representation(
        revisionId,
        runId,
        id,
        "worn",
        states[1],
        worn[index - 1],
      ),
      motion: representation(
        revisionId,
        runId,
        id,
        "motion",
        states[2],
        index === 1 ? "/fixtures/edit/layla-direction-1-motion.mp4" : undefined,
      ),
    },
  };
}

function buildRun(designId: string, revision: DesignRevision, scenario: ScenarioId, ordinal = 1): GenerationRun {
  const revisionId = revision.id;
  const runId = `${designId}-run-${ordinal}`;
  const stateSetsByScenario: Record<ScenarioId, Array<[TaskState, TaskState, TaskState]>> = {
    happy: [["ready", "ready", "ready"], ["ready", "ready", "unavailable"], ["ready", "ready", "unavailable"], ["ready", "ready", "unavailable"]],
    partial: [["ready", "ready", "ready"], ["ready", "generating", "unavailable"], ["failed", "blocked", "blocked"], ["queued", "queued", "unavailable"]],
    "retry-success": [["ready", "ready", "ready"], ["ready", "ready", "unavailable"], ["failed", "blocked", "blocked"], ["queued", "queued", "unavailable"]],
    "retry-exhausted": [["ready", "ready", "ready"], ["ready", "failed", "unavailable"], ["failed", "blocked", "blocked"], ["blocked", "blocked", "unavailable"]],
    cancelled: [["ready", "cancelled", "cancelled"], ["cancelled", "blocked", "blocked"], ["queued", "blocked", "blocked"], ["queued", "blocked", "blocked"]],
    resume: [["ready", "ready", "ready"], ["ready", "generating", "unavailable"], ["generating", "blocked", "blocked"], ["queued", "queued", "unavailable"]],
    "quote-expired": [["ready", "ready", "ready"], ["ready", "ready", "unavailable"], ["ready", "ready", "unavailable"], ["ready", "ready", "unavailable"]],
    "operator-review": [["ready", "ready", "ready"], ["ready", "ready", "unavailable"], ["ready", "blocked", "blocked"], ["ready", "unavailable", "unavailable"]],
  };
  const stateSets = stateSetsByScenario[scenario];
  const directions = stateSets.map((states, index) => direction(revisionId, runId, index + 1, states));
  const fixtureCompatible = revision.identity.language === "en" && revision.identity.approvedText.toLocaleLowerCase() === "layla";
  for (const item of directions) {
    item.identityFingerprint = revision.identity.fingerprint;
    for (const rep of Object.values(item.representations)) {
      rep.lineage.inputAssets = [`canonical://${revision.identity.fingerprint}`];
      if (!fixtureCompatible) {
        rep.state = "unavailable";
        rep.assetUrl = undefined;
        rep.posterUrl = undefined;
        rep.lineage.verificationResult = {
          status: "failed",
          exactText: false,
          identityScore: 0,
          notes: "No approved local fixture exists for this canonical identity.",
        };
      }
    }
  }
  return {
    id: runId,
    revisionId,
    label: ordinal === 1 ? "Original directions" : `Fresh run ${ordinal}`,
    createdAt: NOW,
    status: scenario === "happy" ? "complete" : scenario === "cancelled" ? "cancelled" : "partial",
    directions,
    tasks: directions.flatMap((item) => Object.values(item.representations).map((rep) => ({
      id: rep.lineage.taskId,
      directionId: item.id,
      kind: rep.kind,
      state: rep.state,
      attempt: rep.lineage.attempt,
    }))),
  };
}

function seedState(): SpikeState {
  return {
    version: 1,
    principal: { id: "principal-customer", name: "Layla Ahmed", role: "customer" },
    scenario: "partial",
    designs: [],
  };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class MockJeweloClient implements JeweloClient {
  private state: SpikeState;
  private listeners = new Set<() => void>();

  constructor(initial?: SpikeState, loadStored = true) {
    this.state = initial ? clone(initial) : loadStored ? this.load() : seedState();
  }

  hydrate() {
    this.state = this.load();
    this.listeners.forEach((listener) => listener());
    return this.getState();
  }

  onChange(listener: () => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private load(): SpikeState {
    if (typeof window === "undefined") return seedState();
    try {
      const value = window.localStorage.getItem(STORAGE_KEY);
      if (!value) return seedState();
      const parsed = JSON.parse(value) as SpikeState;
      return parsed.version === 1 && Array.isArray(parsed.designs) ? parsed : seedState();
    } catch {
      return seedState();
    }
  }

  private commit(state: SpikeState) {
    this.state = clone(state);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch {
        // The spike remains usable in-memory if storage is unavailable or full.
      }
    }
    this.listeners.forEach((listener) => listener());
    return this.getState();
  }

  private updateDesign(id: string, update: (design: Design) => Design): Design {
    let changed: Design | undefined;
    const designs = this.state.designs.map((design) => {
      if (design.id !== id) return design;
      changed = update(clone(design));
      return changed;
    });
    if (!changed) throw new Error("Unknown design");
    this.commit({ ...this.state, designs, activeDesignId: id });
    return clone(changed);
  }

  private record(design: Design, action: string, detail: string) {
    design.audit.unshift({
      id: `${design.id}-event-${design.audit.length + 1}`,
      at: NOW,
      actor: this.state.principal.name,
      action,
      detail,
    });
  }

  getState() { return clone(this.state); }
  setResumePath(path: string) {
    if (this.state.resumePath === path) return this.getState();
    return this.commit({ ...this.state, resumePath: path });
  }
  listDesigns() { return clone(this.state.designs); }
  getDesign(id: string) { return clone(this.state.designs.find((design) => design.id === id)); }
  getAudit(id: string) { return clone(this.state.designs.find((design) => design.id === id)?.audit ?? []); }

  setRole(role: Role) {
    return this.commit({
      ...this.state,
      principal: role === "customer"
        ? { id: "principal-customer", name: "Layla Ahmed", role }
        : { id: "principal-operator", name: "Jewelo Atelier", role },
    });
  }

  setScenario(scenario: ScenarioId) {
    return this.commit({ ...this.state, scenario });
  }

  createDesign(input: DesignInput) {
    return this.approveRevision(input);
  }

  approveRevision(input: DesignInput) {
    const designId = `design-${this.state.designs.length + 1}`;
    const revisionId = `${designId}-revision-1`;
    const design: Design = {
      id: designId,
      name: `${input.approvedText} pendant`,
      createdAt: NOW,
      updatedAt: NOW,
      revisions: [{
        id: revisionId,
        number: 1,
        createdAt: NOW,
        approvedAt: NOW,
        immutable: true,
        identity: createCanonicalIdentity(input.approvedText, input.language),
        specification: {
          jewelryType: "name-pendant",
          metal: "21K yellow gold",
          finish: "high polish",
          stones: input.stones,
          widthMm: 20,
          complexity: input.complexity,
          source: input.source,
          referenceName: input.referenceName,
        },
      }],
      runs: [],
      audit: [{ id: "event-1", at: NOW, actor: "Layla Ahmed", action: "Revision approved", detail: "Approved text and specification locked." }],
    };
    this.commit({
      ...this.state,
      designs: [...this.state.designs, design],
      activeDesignId: design.id,
      resumePath: `/en/studio/${design.id}`,
    });
    return clone(design);
  }

  refineDesign(designId: string, note: string) {
    return this.updateDesign(designId, (design) => {
      if (design.order) throw new Error("Ordered designs are immutable. Start a new design to explore another revision.");
      const previous = design.revisions.at(-1)!;
      const number = previous.number + 1;
      design.revisions.push({ ...clone(previous), id: `${design.id}-revision-${number}`, number, createdAt: NOW, approvedAt: NOW });
      design.selectedDirectionId = undefined;
      design.estimate = undefined;
      design.quote = undefined;
      this.record(design, "New revision approved", note || "Refined selected direction; prior commercial draft invalidated.");
      return design;
    });
  }

  startRun(designId: string) {
    return this.updateDesign(designId, (design) => {
      if (design.order) throw new Error("Ordered designs cannot start another generation run.");
      const revision = design.revisions.at(-1)!;
      design.runs.push(buildRun(design.id, revision, this.state.scenario, design.runs.length + 1));
      design.selectedDirectionId = undefined;
      design.estimate = undefined;
      design.quote = undefined;
      design.updatedAt = NOW;
      this.record(design, "Generation run created", "Four directions requested; prior unaccepted commercial draft invalidated.");
      return design;
    });
  }

  subscribeToRun(runId: string, listener: RunListener) {
    const emit = () => {
      const run = this.state.designs.flatMap((design) => design.runs).find((item) => item.id === runId);
      if (run) listener(clone(run));
    };
    emit();
    const unsubscribe = this.onChange(emit);
    return unsubscribe;
  }

  retryTask(designId: string, taskId: string) {
    return this.updateDesign(designId, (design) => {
      const run = design.runs.at(-1)!;
      const task = run.tasks.find((item) => item.id === taskId);
      if (!task) throw new Error("Unknown task");
      task.attempt += 1;
      task.state = this.state.scenario === "retry-exhausted" ? "failed" : "ready";
      const rep = run.directions.find((item) => item.id === task.directionId)?.representations[task.kind];
      if (rep) {
        rep.state = task.state;
        rep.lineage.attempt = task.attempt;
        if (task.kind === "product" && task.state === "ready") rep.assetUrl = "/fixtures/layla-direction-2-product.png";
      }
      run.status = run.tasks.every((item) => item.state === "ready" || item.state === "unavailable") ? "complete" : "partial";
      this.record(design, "Generation task retried", `${task.kind} · ${task.directionId} · attempt ${task.attempt} · ${task.state}`);
      return design;
    });
  }

  cancelTask(designId: string, taskId: string) {
    return this.updateDesign(designId, (design) => {
      const run = design.runs.at(-1)!;
      const task = run.tasks.find((item) => item.id === taskId);
      if (!task) throw new Error("Unknown task");
      task.state = "cancelled";
      const rep = run.directions.find((item) => item.id === task.directionId)?.representations[task.kind];
      if (rep) rep.state = "cancelled";
      this.record(design, "Generation task cancelled", `${task.kind} · ${task.directionId}`);
      return design;
    });
  }

  selectDirection(designId: string, directionId: string) {
    return this.updateDesign(designId, (design) => {
      if (design.quote?.status === "issued" || design.quote?.status === "accepted" || design.order) throw new Error("The quoted direction is locked. Start a new design to change it.");
      const direction = design.runs.at(-1)?.directions.find((item) => item.id === directionId);
      if (!direction || direction.representations.product.state !== "ready") throw new Error("Direction is not selectable");
      design.selectedDirectionId = directionId;
      design.estimate = undefined;
      design.quote = undefined;
      this.record(design, "Direction selected", `${direction.label}; prior estimate and quote draft invalidated.`);
      return design;
    });
  }

  calculateEstimate(designId: string) {
    return this.updateDesign(designId, (design) => {
      if (!design.selectedDirectionId) throw new Error("Select a direction first");
      const revision = design.revisions.at(-1)!;
      const currentRun = design.runs.at(-1);
      if (!currentRun?.directions.some((item) => item.id === design.selectedDirectionId)) throw new Error("Selection must belong to the current revision run");
      design.estimate = {
        id: `${design.id}-estimate-1`, revisionId: revision.id, directionId: design.selectedDirectionId,
        currency: "AED", low: 1950, high: 2450, confidence: "medium",
        assumptions: ["Modelled weight 5.2–6.1g", "21K yellow gold", "Final weight confirmed by jeweler"],
        goldPriceTimestamp: NOW, expiresAt: "2026-08-29T10:00:00.000Z",
      };
      this.record(design, "Estimate calculated", `${design.estimate.currency} ${design.estimate.low}–${design.estimate.high}`);
      return design;
    });
  }

  requestQuote(designId: string) {
    return this.updateDesign(designId, (design) => {
      if (!design.estimate) throw new Error("Estimate required");
      design.quote = {
        id: `${design.id}-quote-1`, designId, estimateId: design.estimate.id, status: "requested", total: 2290,
        expiresAt: this.state.scenario === "quote-expired" ? "2026-08-25T10:00:00.000Z" : "2026-09-02T10:00:00.000Z",
        snapshot: clone(design.estimate),
      };
      this.record(design, "Quote requested", `Estimate ${design.estimate.id}`);
      return design;
    });
  }

  issueQuote(designId: string) {
    return this.updateDesign(designId, (design) => {
      if (!design.quote) throw new Error("Quote request required");
      design.quote.status = this.state.scenario === "quote-expired" ? "expired" : "issued";
      design.quote.issuedAt = NOW;
      this.record(design, design.quote.status === "expired" ? "Quote expired" : "Quote issued", `${design.quote.id} · AED ${design.quote.total}`);
      return design;
    });
  }

  acceptQuote(designId: string) {
    return this.updateDesign(designId, (design) => {
      if (!design.quote || design.quote.status !== "issued") throw new Error("Only a current issued quote can be accepted");
      design.quote.status = "accepted";
      this.record(design, "Quote accepted", `${design.quote.id} · AED ${design.quote.total}`);
      return design;
    });
  }

  createOrder(designId: string) {
    return this.updateDesign(designId, (design) => {
      if (!design.quote || design.quote.status !== "accepted") throw new Error("Accepted quote required");
      design.order = {
        id: `${design.id}-order-1`, designId, quoteId: design.quote.id, status: "confirmed",
        acceptedTotal: design.quote.total, acceptedAt: NOW, revisionId: design.quote.snapshot.revisionId, directionId: design.quote.snapshot.directionId,
      };
      this.record(design, "Order created", `${design.order.id} · revision and direction locked from accepted quote`);
      return design;
    });
  }

  updateFulfillment(designId: string) {
    const next = { confirmed: "in-production", "in-production": "quality-check", "quality-check": "ready", ready: "ready" } as const;
    return this.updateDesign(designId, (design) => {
      if (!design.order) throw new Error("Order required");
      design.order.status = next[design.order.status];
      this.record(design, "Fulfillment updated", design.order.status);
      return design;
    });
  }

  reset() {
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
    return this.commit(seedState());
  }
}
