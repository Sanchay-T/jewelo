import type {
  ApproveRevisionInput,
  CreateDraftInput,
  DesignDraft,
  DesignInput,
  DesignRevision,
  IdentityAnchor,
  PresentationView,
  Role,
  ScenarioId,
  TaskState,
  UpdateDraftInput,
} from "./types";
import type {
  Direction,
  LegacyAssetLineage,
  LegacyDesign as Design,
  LegacyGenerationRun as GenerationRun,
  LegacyJeweloClient,
  LegacyRunListener as RunListener,
  LegacySpikeState as SpikeState,
  RepresentationKind,
} from "./legacy-direction-compat";

const STORAGE_KEY = "jewelo-ui-spike:v1";
const NOW = "2026-08-26T10:00:00.000Z";
const IDENTITY_INPUT = "canonical://layla-script-v1";

const PRODUCT_ASSETS = [
  "/fixtures/layla-direction-1-product.png",
  "/fixtures/layla-direction-2-product.png",
  "/fixtures/layla-direction-3-product.png",
  "/fixtures/layla-direction-4-product.png",
];
const WORN_ASSETS = [
  "/fixtures/layla-direction-1-worn.png",
  "/fixtures/layla-direction-2-worn.png",
  "/fixtures/layla-direction-3-worn.png",
  "/fixtures/layla-direction-4-worn.png",
];
const MOTION_ASSET = "/fixtures/edit/layla-direction-1-motion.mp4";

function hashText(value: string): string {
  let hash = 2166136261;
  for (const character of value.normalize("NFKC")) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `jw-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function createCanonicalIdentity(
  text: string,
  language: "en" | "ar",
): IdentityAnchor {
  const approvedText = text.normalize("NFKC").trim();
  const typography =
    language === "ar" ? "Noto Naskh Arabic" : "Playfair Display Italic";
  return {
    approvedText,
    language,
    typography,
    fingerprint: hashText(
      `${language}|${typography}|${approvedText.toLocaleLowerCase()}`,
    ),
    geometryPath: `canonical-name:${language}:${approvedText
      .split("")
      .map((char) => char.codePointAt(0)?.toString(16))
      .join("-")}`,
  };
}

function lineage(
  revisionId: string,
  runId: string,
  directionId: string,
  taskId: string,
  attempt = 1,
): LegacyAssetLineage {
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
    assetUrl: state === "ready" ? assetUrl : undefined,
    posterUrl:
      kind === "motion"
        ? "/fixtures/layla-direction-1-motion-poster.jpg"
        : undefined,
    alt: `${kind} representation of the approved Layla yellow-gold pendant, ${directionId}`,
    lineage: lineage(revisionId, runId, directionId, taskId, attempt),
  };
}

function presentationView(kind: RepresentationKind): PresentationView {
  if (kind === "product") return "studio";
  if (kind === "worn") return "on_skin";
  return "motion";
}

function projectPresentationAssets(directions: Direction[]) {
  return directions.flatMap((item) =>
    Object.values(item.representations).map((rep) => ({
      id: rep.id,
      view: presentationView(rep.kind),
      state: rep.state,
      assetUrl: rep.assetUrl,
      posterUrl: rep.posterUrl,
      alt: rep.alt,
      lineage: rep.lineage,
    })),
  );
}

function direction(
  revisionId: string,
  runId: string,
  index: number,
  states: [TaskState, TaskState, TaskState],
): Direction {
  const id = `${runId}-direction-${index}`;
  return {
    id,
    label: `Direction ${index}`,
    brief: [
      "Fine-line signature",
      "Botanical frame",
      "Diamond rhythm",
      "Gallery minimal",
    ][index - 1]!,
    identityFingerprint: hashText("en|Playfair Display Italic|layla"),
    representations: {
      product: representation(
        revisionId,
        runId,
        id,
        "product",
        states[0],
        PRODUCT_ASSETS[index - 1],
      ),
      worn: representation(
        revisionId,
        runId,
        id,
        "worn",
        states[1],
        WORN_ASSETS[index - 1],
      ),
      motion: representation(
        revisionId,
        runId,
        id,
        "motion",
        states[2],
        index === 1 ? MOTION_ASSET : undefined,
      ),
    },
  };
}

function buildRun(
  designId: string,
  revision: DesignRevision,
  scenario: ScenarioId,
  ordinal = 1,
): GenerationRun {
  const revisionId = revision.id;
  const runId = `${designId}-run-${ordinal}`;
  const initial: [TaskState, TaskState, TaskState] = [
    "generating",
    "queued",
    "queued",
  ];
  const stateSetsByScenario: Record<
    ScenarioId,
    Array<[TaskState, TaskState, TaskState]>
  > = {
    "fast-all": [initial, initial, initial, initial],
    "slow-sibling": [initial, initial, initial, initial],
    partial: [initial, initial, initial, initial],
    "quota-2": [initial, initial, initial, initial],
    retry: [initial, initial, initial, initial],
    resume: [
      ["ready", "ready", "ready"],
      ["ready", "generating", "queued"],
      ["verifying", "queued", "queued"],
      initial,
    ],
    cancel: [
      ["ready", "generating", "generating"],
      ["verifying", "queued", "queued"],
      initial,
      initial,
    ],
  };
  const stateSets = stateSetsByScenario[scenario];
  const directions = stateSets.map((states, index) =>
    direction(revisionId, runId, index + 1, states),
  );
  const fixtureCompatible =
    revision.identityAnchor.language === "en" &&
    revision.identityAnchor.approvedText.toLocaleLowerCase() === "layla";
  for (const item of directions) {
    item.identityFingerprint = revision.identityAnchor.fingerprint;
    for (const rep of Object.values(item.representations)) {
      rep.lineage.inputAssets = [
        `canonical://${revision.identityAnchor.fingerprint}`,
      ];
      if (!fixtureCompatible) {
        rep.state = "unavailable";
        rep.assetUrl = undefined;
        rep.posterUrl = undefined;
        rep.lineage.verificationResult = {
          status: "failed",
          exactText: false,
          identityScore: 0,
          notes:
            "No approved local fixture exists for this canonical identity.",
        };
      }
    }
  }
  return {
    id: runId,
    revisionId,
    label: ordinal === 1 ? "Original directions" : `Fresh run ${ordinal}`,
    createdAt: NOW,
    status: "running",
    elapsedMs: scenario === "resume" ? 1_600 : scenario === "cancel" ? 800 : 0,
    assets: projectPresentationAssets(directions),
    directions,
    tasks: directions.flatMap((item) =>
      Object.values(item.representations).map((rep) => ({
        id: rep.lineage.taskId,
        view: presentationView(rep.kind),
        assetId: rep.id,
        directionId: item.id,
        kind: rep.kind,
        state: rep.state,
        attempt: rep.lineage.attempt,
      })),
    ),
  };
}

function revealAsset(direction: Direction, kind: RepresentationKind): void {
  const index = Number(direction.label.replace("Direction ", "")) - 1;
  const representation = direction.representations[kind];
  representation.assetUrl =
    kind === "product"
      ? PRODUCT_ASSETS[index]
      : kind === "worn"
        ? WORN_ASSETS[index]
        : index === 0
          ? MOTION_ASSET
          : undefined;
}

function setRepresentationState(
  direction: Direction,
  kind: RepresentationKind,
  state: TaskState,
): void {
  const representation = direction.representations[kind];
  representation.state = state;
  if (state === "ready") revealAsset(direction, kind);
  else representation.assetUrl = undefined;
  representation.lineage.verificationResult.status =
    state === "verifying"
      ? "pending"
      : state === "failed"
        ? "failed"
        : "passed";
  representation.lineage.verificationResult.exactText = state !== "failed";
}

function phase(
  elapsedMs: number,
  verifyingAt: number,
  readyAt: number,
): TaskState {
  if (elapsedMs >= readyAt) return "ready";
  if (elapsedMs >= verifyingAt) return "verifying";
  return "generating";
}

function applyScenario(
  run: GenerationRun,
  scenario: ScenarioId,
  elapsedMs: number,
): void {
  const normalReady = [500, 700, 900, 1_100];
  const productReady =
    scenario === "slow-sibling" ? [500, 700, 900, 3_600] : normalReady;

  run.elapsedMs = elapsedMs;
  run.directions.forEach((direction, index) => {
    if (
      direction.representations.product.state === "unavailable" &&
      !direction.representations.product.lineage.verificationResult.exactText
    )
      return;
    let productState = phase(
      elapsedMs,
      productReady[index]! - 160,
      productReady[index]!,
    );
    if (scenario === "partial" && index === 2 && elapsedMs >= 900)
      productState = "failed";
    if (scenario === "retry" && index === 2) {
      if (elapsedMs >= 1_850) productState = "ready";
      else if (elapsedMs >= 1_550) productState = "verifying";
      else if (elapsedMs >= 1_150) productState = "generating";
      else if (elapsedMs >= 850) productState = "retrying";
    }
    setRepresentationState(direction, "product", productState);

    if (productState === "ready") {
      const productCompletedAt =
        scenario === "retry" && index === 2 ? 1_850 : productReady[index]!;
      setRepresentationState(
        direction,
        "worn",
        phase(elapsedMs, productCompletedAt + 320, productCompletedAt + 520),
      );

      if (scenario === "quota-2") {
        const motionStart =
          index < 2 ? productCompletedAt : productCompletedAt + 900;
        if (elapsedMs < motionStart)
          setRepresentationState(direction, "motion", "queued");
        else if (index === 0)
          setRepresentationState(
            direction,
            "motion",
            phase(elapsedMs, motionStart + 300, motionStart + 520),
          );
        else if (elapsedMs < motionStart + 520)
          setRepresentationState(direction, "motion", "generating");
        else
          setRepresentationState(direction, "motion", "available_on_request");
      } else if (index === 0) {
        setRepresentationState(
          direction,
          "motion",
          phase(elapsedMs, productCompletedAt + 300, productCompletedAt + 520),
        );
      } else {
        setRepresentationState(direction, "motion", "available_on_request");
      }
    } else if (productState === "failed") {
      setRepresentationState(direction, "worn", "blocked");
      setRepresentationState(direction, "motion", "blocked");
    } else {
      setRepresentationState(direction, "worn", "queued");
      setRepresentationState(direction, "motion", "queued");
    }
  });

  if (scenario === "cancel" && elapsedMs >= 1_000) {
    for (const direction of run.directions) {
      for (const kind of ["product", "worn", "motion"] as const) {
        if (direction.representations[kind].state !== "ready")
          setRepresentationState(direction, kind, "cancelled");
      }
    }
    run.status = "cancelled";
  }

  run.tasks = run.directions.flatMap((direction) =>
    Object.values(direction.representations).map((representation) => ({
      id: representation.lineage.taskId,
      view: presentationView(representation.kind),
      assetId: representation.id,
      directionId: direction.id,
      kind: representation.kind,
      state: representation.state,
      attempt: representation.lineage.attempt,
    })),
  );
  run.assets = projectPresentationAssets(run.directions);
  if (run.status !== "cancelled") {
    const terminal = new Set<TaskState>([
      "ready",
      "failed",
      "cancelled",
      "unavailable",
      "available_on_request",
      "blocked",
    ]);
    const done = run.tasks.every((task) => terminal.has(task.state));
    const failed = run.tasks.some((task) => task.state === "failed");
    run.status = done ? (failed ? "partial" : "complete") : "running";
  }
}

function seedState(): SpikeState {
  return {
    version: 1,
    engine: "jewelo-working-app",
    principal: {
      id: "principal-customer",
      name: "Layla Ahmed",
      role: "customer",
    },
    scenario: "partial",
    designs: [],
  };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class MockJeweloClient implements LegacyJeweloClient {
  private state: SpikeState;
  private drafts = new Map<string, DesignDraft>();
  private listeners = new Set<() => void>();
  private timers = new Map<string, ReturnType<typeof setInterval>>();

  constructor(initial?: SpikeState, loadStored = true) {
    this.state = initial
      ? clone(initial)
      : loadStored
        ? this.load()
        : seedState();
  }

  async hydrate() {
    this.state = this.load();
    this.listeners.forEach((listener) => listener());
    return this.getState();
  }

  onChange(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private load(): SpikeState {
    if (typeof window === "undefined") return seedState();
    try {
      const value = window.localStorage.getItem(STORAGE_KEY);
      if (!value) return seedState();
      const parsed = JSON.parse(value) as SpikeState;
      return parsed.version === 1 &&
        parsed.engine === "jewelo-working-app" &&
        Array.isArray(parsed.designs)
        ? parsed
        : seedState();
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

  getState() {
    return clone(this.state);
  }
  async setResumePath(path: string) {
    if (this.state.resumePath === path) return this.getState();
    return this.commit({ ...this.state, resumePath: path });
  }
  listDesigns() {
    return clone(this.state.designs);
  }
  getDesign(id: string) {
    return clone(this.state.designs.find((design) => design.id === id));
  }
  getAudit(id: string) {
    return clone(
      this.state.designs.find((design) => design.id === id)?.audit ?? [],
    );
  }

  async setRole(role: Role) {
    if (role === "customer")
      await fetch("/api/operator/session", {
        method: "DELETE",
        credentials: "same-origin",
      });
    return this.commit({
      ...this.state,
      principal:
        role === "customer"
          ? { id: "principal-customer", name: "Layla Ahmed", role }
          : { id: "principal-operator", name: "Jewelo Atelier", role },
    });
  }

  async loginOperator(email: string, passphrase: string) {
    const response = await fetch("/api/operator/session", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, passphrase }),
    });
    if (!response.ok) throw new Error("Invalid operator credentials");
    return this.setRole("operator");
  }

  async setScenario(scenario: ScenarioId) {
    return this.commit({ ...this.state, scenario });
  }

  async createDraft(input: CreateDraftInput) {
    const id = `draft-${this.drafts.size + 1}`;
    const draft: DesignDraft = {
      id,
      ownerPrincipalId: this.state.principal.id,
      locale: input.names[0].approvedArabicText ? "ar" : "en",
      specification: { ...clone(input), spellingConfirmed: false },
      createdAt: NOW,
      updatedAt: NOW,
    };
    this.drafts.set(id, clone(draft));
    return clone(draft);
  }

  async updateDraft(draftId: string, input: UpdateDraftInput) {
    const current = this.drafts.get(draftId);
    if (!current) throw new Error("Unknown draft");
    const draft: DesignDraft = {
      ...current,
      locale:
        (input.names?.[0].approvedArabicText ??
        current.specification.names[0].approvedArabicText)
          ? "ar"
          : "en",
      specification: { ...current.specification, ...clone(input) },
      updatedAt: NOW,
    };
    this.drafts.set(draftId, clone(draft));
    return clone(draft);
  }

  async createDesign(input: DesignInput) {
    const { spellingConfirmed, ...draftInput } = input;
    void spellingConfirmed;
    const draft = await this.createDraft(draftInput);
    await this.updateDraft(draft.id, { spellingConfirmed: true });
    return this.approveRevision({ draftId: draft.id, specification: input });
  }

  async approveRevision(approval: ApproveRevisionInput) {
    if (!this.drafts.has(approval.draftId)) throw new Error("Unknown draft");
    const input = approval.specification;
    const designId = `design-${this.state.designs.length + 1}`;
    const revisionId = `${designId}-revision-1`;
    const design: Design = {
      id: designId,
      name: `${input.names[0].approvedEnglishText ?? input.names[0].approvedArabicText} pendant`,
      createdAt: NOW,
      updatedAt: NOW,
      revisions: [
        {
          id: revisionId,
          number: 1,
          createdAt: NOW,
          approvedAt: NOW,
          immutable: true,
          identityAnchor: createCanonicalIdentity(
            input.names[0].approvedArabicText ??
              input.names[0].approvedEnglishText ??
              "",
            input.names[0].approvedArabicText ? "ar" : "en",
          ),
          specification: clone(input),
        },
      ],
      runs: [],
      audit: [
        {
          id: "event-1",
          at: NOW,
          actor: "Layla Ahmed",
          action: "Revision approved",
          detail: "Approved text and specification locked.",
        },
      ],
    };
    this.commit({
      ...this.state,
      designs: [...this.state.designs, design],
      activeDesignId: design.id,
      resumePath: `/${input.names[0].approvedArabicText ? "ar" : "en"}/design/new`,
    });
    return clone(design);
  }

  async refineDesign(designId: string, note: string) {
    return this.updateDesign(designId, (design) => {
      if (design.order)
        throw new Error(
          "Ordered designs are immutable. Start a new design to explore another revision.",
        );
      const previous = design.revisions.at(-1)!;
      const number = previous.number + 1;
      design.revisions.push({
        ...clone(previous),
        id: `${design.id}-revision-${number}`,
        number,
        createdAt: NOW,
        approvedAt: NOW,
      });
      design.selectedDirectionId = undefined;
      design.estimate = undefined;
      design.quote = undefined;
      this.record(
        design,
        "New revision approved",
        note ||
          "Refined selected direction; prior commercial draft invalidated.",
      );
      return design;
    });
  }

  async startRun(designId: string) {
    return this.updateDesign(designId, (design) => {
      if (design.order)
        throw new Error("Ordered designs cannot start another generation run.");
      const revision = design.revisions.at(-1)!;
      design.runs.push(
        buildRun(
          design.id,
          revision,
          this.state.scenario,
          design.runs.length + 1,
        ),
      );
      design.selectedDirectionId = undefined;
      design.estimate = undefined;
      design.quote = undefined;
      design.updatedAt = NOW;
      this.record(
        design,
        "Generation run created",
        "Four directions requested; prior unaccepted commercial draft invalidated.",
      );
      return design;
    });
  }

  subscribeToRun(runId: string, listener: RunListener) {
    const emit = () => {
      const run = this.state.designs
        .flatMap((design) => design.runs)
        .find((item) => item.id === runId);
      if (run) listener(clone(run));
    };
    emit();
    const unsubscribe = this.onChange(emit);
    const activeRun = this.state.designs
      .flatMap((design) => design.runs)
      .find((item) => item.id === runId);
    if (activeRun?.status === "running" && !this.timers.has(runId)) {
      const timer = setInterval(() => {
        void this.advanceRun(runId, 250).then((updated) => {
          if (updated.status === "running") return;
          clearInterval(timer);
          this.timers.delete(runId);
        });
      }, 250);
      this.timers.set(runId, timer);
    }
    return unsubscribe;
  }

  async advanceRun(runId: string, elapsedMs: number) {
    let changed: GenerationRun | undefined;
    const designs = this.state.designs.map((design) => {
      const run = design.runs.find((item) => item.id === runId);
      if (!run) return design;
      const next = clone(design);
      const nextRun = next.runs.find((item) => item.id === runId)!;
      applyScenario(
        nextRun,
        this.state.scenario,
        nextRun.elapsedMs + elapsedMs,
      );
      changed = nextRun;
      return next;
    });
    if (!changed) throw new Error("Unknown run");
    this.commit({ ...this.state, designs });
    return clone(changed);
  }

  async retryTask(designId: string, taskId: string) {
    return this.updateDesign(designId, (design) => {
      const run = design.runs.at(-1)!;
      const task = run.tasks.find((item) => item.id === taskId);
      if (!task) throw new Error("Unknown task");
      task.attempt += 1;
      task.state = "ready";
      const rep = run.directions.find((item) => item.id === task.directionId)
        ?.representations[task.kind];
      if (rep) {
        rep.state = task.state;
        rep.lineage.attempt = task.attempt;
        if (task.state === "ready")
          revealAsset(
            run.directions.find((item) => item.id === task.directionId)!,
            task.kind,
          );
      }
      run.status = run.tasks.every(
        (item) => item.state === "ready" || item.state === "unavailable",
      )
        ? "complete"
        : "partial";
      this.record(
        design,
        "Generation task retried",
        `${task.kind} · ${task.directionId} · attempt ${task.attempt} · ${task.state}`,
      );
      return design;
    });
  }

  async cancelTask(designId: string, taskId: string) {
    return this.updateDesign(designId, (design) => {
      const run = design.runs.at(-1)!;
      const task = run.tasks.find((item) => item.id === taskId);
      if (!task) throw new Error("Unknown task");
      task.state = "cancelled";
      const rep = run.directions.find((item) => item.id === task.directionId)
        ?.representations[task.kind];
      if (rep) rep.state = "cancelled";
      this.record(
        design,
        "Generation task cancelled",
        `${task.kind} · ${task.directionId}`,
      );
      return design;
    });
  }

  async selectDirection(designId: string, directionId: string) {
    return this.updateDesign(designId, (design) => {
      if (
        design.quote?.status === "issued" ||
        design.quote?.status === "accepted" ||
        design.order
      )
        throw new Error(
          "The quoted direction is locked. Start a new design to change it.",
        );
      const direction = design.runs
        .at(-1)
        ?.directions.find((item) => item.id === directionId);
      if (!direction || direction.representations.product.state !== "ready")
        throw new Error("Direction is not selectable");
      design.selectedDirectionId = directionId;
      design.estimate = undefined;
      design.quote = undefined;
      this.record(
        design,
        "Direction selected",
        `${direction.label}; prior estimate and quote draft invalidated.`,
      );
      return design;
    });
  }

  async calculateEstimate(designId: string) {
    return this.updateDesign(designId, (design) => {
      if (!design.selectedDirectionId)
        throw new Error("Select a direction first");
      const revision = design.revisions.at(-1)!;
      const currentRun = design.runs.at(-1);
      if (
        !currentRun?.directions.some(
          (item) => item.id === design.selectedDirectionId,
        )
      )
        throw new Error("Selection must belong to the current revision run");
      design.estimate = {
        id: `${design.id}-estimate-1`,
        revisionId: revision.id,
        directionId: design.selectedDirectionId,
        currency: "AED",
        low: 1950,
        high: 2450,
        confidence: "medium",
        assumptions: [
          "Modelled weight 5.2–6.1g",
          "21K yellow gold",
          "Final weight confirmed by jeweler",
        ],
        goldPriceTimestamp: NOW,
        expiresAt: "2026-08-29T10:00:00.000Z",
      };
      this.record(
        design,
        "Estimate calculated",
        `${design.estimate.currency} ${design.estimate.low}–${design.estimate.high}`,
      );
      return design;
    });
  }

  async requestQuote(designId: string) {
    return this.updateDesign(designId, (design) => {
      if (!design.estimate) throw new Error("Estimate required");
      design.quote = {
        id: `${design.id}-quote-1`,
        designId,
        estimateId: design.estimate.id,
        status: "requested",
        total: 2290,
        expiresAt: "2026-09-02T10:00:00.000Z",
        snapshot: clone(design.estimate),
      };
      this.record(design, "Quote requested", `Estimate ${design.estimate.id}`);
      return design;
    });
  }

  async issueQuote(designId: string) {
    return this.updateDesign(designId, (design) => {
      if (!design.quote) throw new Error("Quote request required");
      design.quote.status = "issued";
      design.quote.issuedAt = NOW;
      this.record(
        design,
        "Quote issued",
        `${design.quote.id} · AED ${design.quote.total}`,
      );
      return design;
    });
  }

  async acceptQuote(designId: string) {
    return this.updateDesign(designId, (design) => {
      if (!design.quote || design.quote.status !== "issued")
        throw new Error("Only a current issued quote can be accepted");
      design.quote.status = "accepted";
      this.record(
        design,
        "Quote accepted",
        `${design.quote.id} · AED ${design.quote.total}`,
      );
      return design;
    });
  }

  async createOrder(designId: string) {
    return this.updateDesign(designId, (design) => {
      if (!design.quote || design.quote.status !== "accepted")
        throw new Error("Accepted quote required");
      design.order = {
        id: `${design.id}-order-1`,
        designId,
        quoteId: design.quote.id,
        status: "confirmed",
        acceptedTotal: design.quote.total,
        acceptedAt: NOW,
        revisionId: design.quote.snapshot.revisionId,
        directionId: design.quote.snapshot.directionId,
      };
      this.record(
        design,
        "Order created",
        `${design.order.id} · revision and direction locked from accepted quote`,
      );
      return design;
    });
  }

  async updateFulfillment(designId: string) {
    const next = {
      confirmed: "in-production",
      "in-production": "quality-check",
      "quality-check": "ready",
      ready: "ready",
    } as const;
    return this.updateDesign(designId, (design) => {
      if (!design.order) throw new Error("Order required");
      design.order.status = next[design.order.status];
      this.record(design, "Fulfillment updated", design.order.status);
      return design;
    });
  }

  async reset() {
    if (typeof window !== "undefined")
      window.localStorage.removeItem(STORAGE_KEY);
    return this.commit(seedState());
  }
}
