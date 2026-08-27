import type {
  ApproveRevisionInput,
  AuditEvent,
  CreateDraftInput,
  DesignDraft,
  JewelrySpecification,
  Role,
  ScenarioId,
  TaskState,
  UpdateDraftInput,
} from "@jewelo/contracts";
import {
  createSupabaseDataClient,
  type RealtimeChannel,
  type SupabaseDataClient,
} from "@jewelo/data";
import type {
  Direction,
  LegacyAssetLineage,
  LegacyDesign,
  LegacyEstimate,
  LegacyGenerationRun,
  LegacyJeweloClient,
  LegacyRunListener,
  LegacySpikeState,
  Representation,
  RepresentationKind,
} from "./legacy-direction-compat";
import type { DesignInput } from "./types";
import { loadReferenceUrl } from "./reference-store";

interface Session {
  access_token: string;
  user: { id: string; is_anonymous?: boolean };
}

type Row = Record<string, unknown>;
interface StatePayload {
  role: Role;
  principalId: string;
  designs: Row[];
  design_drafts: Row[];
  design_revisions: Row[];
  generation_runs: Row[];
  generation_tasks: Row[];
  assets: Row[];
  estimates: Row[];
  quotes: Row[];
  orders: Row[];
  audit_events: Row[];
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function estimateFromSnapshot(row: Row, directionId: string): LegacyEstimate {
  return {
    id: text(row.id),
    revisionId: text(row.revision_id),
    directionId,
    currency: text(row.currency, "AED") as LegacyEstimate["currency"],
    low: Number(row.low_amount),
    high: Number(row.high_amount),
    confidence: text(row.confidence, "medium") as LegacyEstimate["confidence"],
    assumptions: Array.isArray(row.assumptions)
      ? (row.assumptions as string[])
      : [],
    goldPriceTimestamp: text(row.gold_price_timestamp),
    expiresAt: text(row.expires_at),
  };
}

function taskState(value: unknown): TaskState {
  const state = text(value, "queued") as TaskState;
  return [
    "queued",
    "generating",
    "verifying",
    "ready",
    "retrying",
    "failed",
    "blocked",
    "cancelled",
    "unavailable",
    "available_on_request",
  ].includes(state)
    ? state
    : "queued";
}

function emptyLineage(
  revisionId: string,
  runId: string,
  directionId: string,
  taskId: string,
): LegacyAssetLineage {
  return {
    revisionId,
    runId,
    directionId,
    taskId,
    provider: "pending",
    model: "server-selected",
    promptRelease: "studio-placeholder-v1",
    inputAssets: [],
    attempt: 0,
    verificationResult: {
      status: "pending",
      exactText: false,
      identityScore: null,
      notes: "Awaiting verified studio asset.",
    },
  };
}

function representation(
  kind: RepresentationKind,
  state: TaskState,
  lineage: LegacyAssetLineage,
  assetUrl?: string,
): Representation {
  return {
    id: `${lineage.directionId}-${kind}`,
    kind,
    state,
    assetUrl,
    alt:
      kind === "product"
        ? "Verified studio view of the approved pendant"
        : `${kind} view is not enabled`,
    lineage,
  };
}

function approvedName(specification: JewelrySpecification) {
  const arabic = specification.arabicStyle !== "none";
  return specification.names
    .map((name) =>
      arabic ? name.approvedArabicText : name.approvedEnglishText,
    )
    .filter(Boolean)
    .join(" & ");
}

export class SupabaseJeweloClient implements LegacyJeweloClient {
  #listeners = new Set<() => void>();
  #drafts = new Map<string, DesignDraft>();
  #session?: Session;
  #supabase?: SupabaseDataClient;
  #state: LegacySpikeState = {
    version: 1,
    engine: "jewelo-working-app",
    principal: { id: "pending-anonymous", name: "Guest", role: "customer" },
    scenario: "fast-all",
    designs: [],
  };

  async hydrate(): Promise<LegacySpikeState> {
    if (typeof window === "undefined") return this.getState();
    const supabase = this.#ensureSupabase();
    const existing = await supabase.auth.getSession();
    const session =
      existing.data.session ??
      (
        await supabase.auth.signInAnonymously({
          options: { data: { caleums_principal: "anonymous" } },
        })
      ).data.session;
    if (!session) throw new Error("Anonymous authentication failed");
    this.#session = {
      access_token: session.access_token,
      user: {
        id: session.user.id,
        is_anonymous: session.user.is_anonymous,
      },
    };
    await this.#loadState();
    return this.getState();
  }

  onChange(listener: () => void) {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  getState() {
    return structuredClone(this.#state);
  }

  async setResumePath(path: string) {
    this.#state.resumePath = path;
    if (this.#state.activeDesignId)
      await this.#request(
        `/api/designs/${this.#state.activeDesignId}/commands`,
        {
          method: "POST",
          body: JSON.stringify({
            command: "set_resume",
            resumePath: path,
          }),
        },
      );
    this.#emit();
    return this.getState();
  }

  async loginOperator(email: string, passphrase: string) {
    await this.#request(
      "/api/operator/session",
      { method: "POST", body: JSON.stringify({ email, passphrase }) },
      false,
    );
    await this.#loadState();
    return this.getState();
  }

  async setRole(role: Role) {
    if (role === "operator")
      throw new Error("Operator credentials are required");
    await this.#request("/api/operator/session", { method: "DELETE" }, false);
    await this.#loadState();
    return this.getState();
  }

  async setScenario(scenario: ScenarioId) {
    this.#state.scenario = scenario;
    this.#emit();
    return this.getState();
  }

  listDesigns() {
    return structuredClone(this.#state.designs);
  }

  getDesign(id: string) {
    const design = this.#state.designs.find((item) => item.id === id);
    return design ? structuredClone(design) : undefined;
  }

  async createDraft(input: CreateDraftInput): Promise<DesignDraft> {
    const row = await this.#request<Row>("/api/designs/drafts", {
      method: "POST",
      body: JSON.stringify({
        locale: input.names[0].approvedArabicText ? "ar" : "en",
        specification: input,
      }),
    });
    return this.#rememberDraft(row, {
      ...input,
      spellingConfirmed: false,
    });
  }

  async updateDraft(draftId: string, input: UpdateDraftInput) {
    const current = this.#drafts.get(draftId);
    if (!current) throw new Error("Draft not found");
    const specification = { ...current.specification, ...input };
    const row = await this.#request<Row>(`/api/designs/drafts/${draftId}`, {
      method: "PATCH",
      body: JSON.stringify({
        specification,
        spellingConfirmed: specification.spellingConfirmed,
      }),
    });
    return this.#rememberDraft(row, specification);
  }

  async createDesign(input: DesignInput) {
    const { spellingConfirmed, ...draftInput } = input;
    if (!spellingConfirmed) throw new Error("Spelling confirmation required");
    const created = await this.createDraft(draftInput);
    const draft = await this.updateDraft(created.id, {
      spellingConfirmed: true,
    });
    return this.approveRevision({ draftId: draft.id, specification: input });
  }

  async approveRevision(input: ApproveRevisionInput): Promise<LegacyDesign> {
    await this.#ensureReferenceUploaded(input.specification);
    const created = await this.#request<{ approved_design_id: string }>(
      "/api/revisions/approve",
      {
        method: "POST",
        body: JSON.stringify({
          draftId: input.draftId,
          specification: input.specification,
          idempotencyKey: this.#idempotency("approve", input.draftId),
        }),
      },
    );
    await this.#loadState(created.approved_design_id);
    return structuredClone(this.#requireDesign(created.approved_design_id));
  }

  async refineDesign(designId: string, note: string) {
    const latest = this.#requireDesign(designId).revisions.at(-1);
    if (!latest) throw new Error("Approved revision required");
    const specification = {
      ...latest.specification,
      notes: note || latest.specification.notes,
      spellingConfirmed: true as const,
    };
    const row = await this.#request<Row>("/api/designs/drafts", {
      method: "POST",
      body: JSON.stringify({
        designId,
        locale: specification.arabicStyle === "none" ? "en" : "ar",
        specification,
      }),
    });
    const draft = this.#rememberDraft(row, specification);
    await this.updateDraft(draft.id, { spellingConfirmed: true });
    return this.approveRevision({ draftId: draft.id, specification });
  }

  async startRun(designId: string) {
    await this.#loadState(designId);
    const design = this.#requireDesign(designId);
    const latestRevision = design.revisions.at(-1);
    const latestRun = design.runs.at(-1);
    if (
      latestRevision &&
      latestRun?.revisionId === latestRevision.id &&
      latestRun.status !== "complete" &&
      latestRun.status !== "cancelled"
    )
      return structuredClone(design);
    await this.#request(`/api/designs/${designId}/run`, {
      method: "POST",
      body: JSON.stringify({
        idempotencyKey: this.#idempotency(
          "run",
          `${designId}:${latestRevision?.id ?? "none"}:${design.runs.length + 1}`,
        ),
      }),
    });
    await this.#loadState(designId);
    return structuredClone(this.#requireDesign(designId));
  }

  subscribeToRun(runId: string, listener: LegacyRunListener) {
    let stopped = false;
    let channel: RealtimeChannel | undefined;
    const refresh = () => {
      if (stopped) return;
      void this.#loadState().then(() => {
        const run = this.#state.designs
          .flatMap((design) => design.runs)
          .find((item) => item.id === runId);
        if (run) listener(structuredClone(run));
      });
    };
    void this.#ensureSession().then(() => {
      if (stopped) return;
      channel = this.#ensureSupabase()
        .channel(`run:${runId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "generation_tasks",
            filter: `run_id=eq.${runId}`,
          },
          refresh,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "assets",
            filter: `run_id=eq.${runId}`,
          },
          refresh,
        )
        .subscribe();
      refresh();
    });
    const pollingFallback = window.setInterval(refresh, 3000);
    return () => {
      stopped = true;
      window.clearInterval(pollingFallback);
      if (channel) void this.#ensureSupabase().removeChannel(channel);
    };
  }

  async advanceRun(runId: string) {
    await this.#loadState();
    const run = this.#state.designs
      .flatMap((design) => design.runs)
      .find((item) => item.id === runId);
    if (!run) throw new Error("Run not found");
    return structuredClone(run);
  }

  async retryTask(designId: string, taskId: string) {
    await this.#request(`/api/tasks/${taskId}/retry`, {
      method: "POST",
      body: JSON.stringify({
        idempotencyKey: this.#idempotency("retry", taskId),
      }),
    });
    await this.#loadState(designId);
    return structuredClone(this.#requireDesign(designId));
  }

  async cancelTask(designId: string, taskId: string) {
    await this.#request(`/api/tasks/${taskId}/cancel`, { method: "POST" });
    await this.#loadState(designId);
    return structuredClone(this.#requireDesign(designId));
  }

  async selectDirection(designId: string, directionId: string) {
    const design = this.#requireDesign(designId);
    const direction = design.runs
      .at(-1)
      ?.directions.find((item) => item.id === directionId);
    if (direction?.representations.product.state !== "ready")
      throw new Error("Direction is not selectable");
    design.selectedDirectionId = directionId;
    design.estimate = undefined;
    design.quote = undefined;
    this.#emit();
    return structuredClone(design);
  }

  async calculateEstimate(designId: string) {
    const design = this.#requireDesign(designId);
    const revision = design.revisions.at(-1);
    if (!revision || !design.selectedDirectionId)
      throw new Error("Select a direction first");
    const snapshot = await this.#request<Row>(
      `/api/designs/${designId}/commands`,
      {
        method: "POST",
        body: JSON.stringify({ command: "estimate", revisionId: revision.id }),
      },
    );
    design.estimate = estimateFromSnapshot(snapshot, design.selectedDirectionId);
    this.#emit();
    return structuredClone(design);
  }

  async requestQuote(designId: string) {
    const design = this.#requireDesign(designId);
    if (!design.estimate) throw new Error("Estimate required");
    await this.#request(`/api/designs/${designId}/commands`, {
      method: "POST",
      body: JSON.stringify({
        command: "request_quote",
        revisionId: design.estimate.revisionId,
        idempotencyKey: this.#idempotency(
          "quote",
          `${designId}:${design.estimate.revisionId}`,
        ),
      }),
    });
    await this.#loadState(designId);
    return structuredClone(this.#requireDesign(designId));
  }

  async issueQuote(designId: string) {
    const design = this.#requireDesign(designId);
    const quote = design.quote;
    if (!quote || quote.status !== "requested")
      throw new Error("Quote request required");
    await this.#request("/api/operator/commands", {
      method: "POST",
      body: JSON.stringify({
        command: "issue_quote",
        designId,
        targetId: quote.id,
        idempotencyKey: this.#idempotency("issue-quote", quote.id),
        payload: {
          total: quote.total || 2290,
          expiresAt: new Date(Date.now() + 7 * 86400_000).toISOString(),
        },
      }),
    });
    await this.#loadState(designId);
    return structuredClone(this.#requireDesign(designId));
  }

  async acceptQuote(designId: string) {
    const quote = this.#requireDesign(designId).quote;
    if (!quote) throw new Error("Issued quote required");
    await this.#request(`/api/designs/${designId}/commands`, {
      method: "POST",
      body: JSON.stringify({
        command: "accept_quote",
        quoteId: quote.id,
        idempotencyKey: this.#idempotency("accept-quote", quote.id),
        checkoutIdempotencyKey: this.#idempotency("checkout", quote.id),
      }),
    });
    await this.#loadState(designId);
    return structuredClone(this.#requireDesign(designId));
  }

  async createOrder(designId: string) {
    const quote = this.#requireDesign(designId).quote;
    if (!quote || quote.status !== "accepted")
      throw new Error("Accepted quote required");
    await this.#request("/api/checkout", {
      method: "POST",
      body: JSON.stringify({
        quoteId: quote.id,
        idempotencyKey: this.#idempotency("checkout", quote.id),
      }),
    });
    await this.#loadState(designId);
    return structuredClone(this.#requireDesign(designId));
  }

  async updateFulfillment(designId: string) {
    const design = this.#requireDesign(designId);
    if (!design.order) throw new Error("Order required");
    const next = {
      confirmed: "in-production",
      "in-production": "quality-check",
      "quality-check": "ready",
      ready: "ready",
    } as const;
    await this.#request("/api/operator/commands", {
      method: "POST",
      body: JSON.stringify({
        command: "fulfillment_transition",
        designId,
        targetId: design.order.id,
        idempotencyKey: this.#idempotency(
          "fulfillment",
          `${design.order.id}:${design.order.status}`,
        ),
        payload: { status: next[design.order.status] },
      }),
    });
    await this.#loadState(designId);
    return structuredClone(this.#requireDesign(designId));
  }

  getAudit(designId: string): AuditEvent[] {
    return structuredClone(this.#requireDesign(designId).audit);
  }

  async reset() {
    await this.#request("/api/operator/session", { method: "DELETE" }, false);
    this.#state.designs = [];
    this.#state.activeDesignId = undefined;
    this.#drafts.clear();
    this.#emit();
    return this.getState();
  }

  async #loadState(activeDesignId = this.#state.activeDesignId) {
    const payload = await this.#request<StatePayload>("/api/state");
    this.#drafts.clear();
    for (const row of payload.design_drafts)
      this.#rememberDraft(
        row,
        row.specification as DesignDraft["specification"],
        false,
      );
    const revisionsByDesign = this.#group(
      payload.design_revisions,
      "design_id",
    );
    const runsByDesign = this.#group(payload.generation_runs, "design_id");
    const quoteByDesign = new Map(
      payload.quotes.map((quote) => [text(quote.design_id), quote]),
    );
    const estimateByRevision = new Map(
      (payload.estimates ?? []).map((row) => [text(row.revision_id), row]),
    );
    const orderByDesign = new Map(
      payload.orders.map((order) => [text(order.design_id), order]),
    );
    const designs = payload.designs.map((row) => {
      const id = text(row.id);
      const revisionRows = (revisionsByDesign.get(id) ?? []).sort(
        (left, right) =>
          Number(left.revision_number) - Number(right.revision_number),
      );
      const revisions = revisionRows.map((revision) => ({
        id: text(revision.id),
        number: Number(revision.revision_number),
        createdAt: text(revision.created_at),
        approvedAt: text(revision.approved_at),
        immutable: true as const,
        identityAnchor:
          revision.identity_anchor as LegacyDesign["revisions"][number]["identityAnchor"],
        specification: revision.specification as JewelrySpecification,
      }));
      const runs = (runsByDesign.get(id) ?? []).map((run) =>
        this.#mapRun(run, revisions, payload),
      );
      const quoteRow = quoteByDesign.get(id);
      const snapshot = quoteRow?.snapshot as LegacyEstimate | undefined;
      const quote = quoteRow
        ? {
            id: text(quoteRow.id),
            designId: id,
            estimateId:
              snapshot?.id ?? `estimate:${text(quoteRow.revision_id)}`,
            status: text(quoteRow.status) as
              "requested" | "issued" | "accepted" | "expired",
            total: Number(quoteRow.total),
            issuedAt: text(quoteRow.issued_at) || undefined,
            expiresAt: text(quoteRow.expires_at),
            snapshot: snapshot!,
          }
        : undefined;
      const orderRow = orderByDesign.get(id);
      const order = orderRow
        ? {
            id: text(orderRow.id),
            designId: id,
            quoteId: text(orderRow.quote_id),
            status: text(orderRow.status) as
              "confirmed" | "in-production" | "quality-check" | "ready",
            acceptedTotal: Number(orderRow.accepted_total),
            acceptedAt: text(orderRow.accepted_at),
            revisionId: text(orderRow.revision_id),
            directionId: snapshot?.directionId ?? `${runs.at(-1)?.id}:studio`,
          }
        : undefined;
      const audit = payload.audit_events
        .filter((event) => event.design_id === id)
        .map((event) => ({
          id: String(event.id),
          at: text(event.created_at),
          actor: text(event.actor_type, "system"),
          action: text(event.action),
          detail: JSON.stringify(event.detail ?? {}),
        }));
      const latestRun = runs.at(-1);
      const selectedDirectionId =
        snapshot?.directionId ??
        latestRun?.directions.find(
          (direction) => direction.representations.product.state === "ready",
        )?.id;
      const estimateRow = estimateByRevision.get(revisions.at(-1)?.id ?? "");
      const estimate = estimateRow
        ? estimateFromSnapshot(
            estimateRow,
            selectedDirectionId ?? snapshot?.directionId ?? "",
          )
        : snapshot;
      return {
        id,
        name:
          text(row.name) ||
          (revisions.at(-1)
            ? approvedName(revisions.at(-1)!.specification)
            : "Pendant"),
        createdAt: text(row.created_at),
        updatedAt: text(row.updated_at),
        revisions,
        runs,
        selectedDirectionId,
        estimate,
        quote,
        order,
        audit,
      } satisfies LegacyDesign;
    });
    const resumeDesign = designs.find((design) => design.id === activeDesignId);
    const persistedResume = payload.designs.find((row) =>
      Boolean(row.resume_path),
    );
    const selectedDesign =
      resumeDesign ??
      designs.find((design) => design.id === persistedResume?.id) ??
      designs.at(-1);
    this.#state = {
      ...this.#state,
      principal: {
        id: payload.principalId,
        name: payload.role === "operator" ? "Caleums Operator" : "Guest",
        role: payload.role,
      },
      designs,
      activeDesignId: selectedDesign?.id,
      resumePath:
        text(
          payload.designs.find((row) => row.id === selectedDesign?.id)
            ?.resume_path,
        ) || this.#state.resumePath,
    };
    this.#emit();
  }

  #mapRun(
    run: Row,
    revisions: LegacyDesign["revisions"],
    payload: StatePayload,
  ): LegacyGenerationRun {
    const id = text(run.id);
    const revisionId = text(run.revision_id);
    const directionId = `${id}:studio`;
    const taskRows = payload.generation_tasks.filter(
      (task) => task.run_id === id,
    );
    const assetRows = payload.assets.filter((asset) => asset.run_id === id);
    const taskFor = (view: string) =>
      taskRows.find((task) => text(task.presentation_view) === view);
    const assetFor = (view: string) =>
      assetRows.find((asset) => text(asset.presentation_view) === view) ??
      (view === "studio" && assetRows.length === 1 ? assetRows[0] : undefined);
    const lineage = (task: Row | undefined, asset: Row | undefined) => {
      const taskId = text(
        task?.id,
        `${id}:${text(task?.presentation_view)}:task`,
      );
      return asset
        ? ({
            revisionId,
            runId: id,
            directionId,
            taskId,
            provider: text(asset.provider),
            model: text(asset.model),
            promptRelease: text(asset.prompt_release),
            inputAssets: Array.isArray(asset.input_asset_ids)
              ? asset.input_asset_ids.map(String)
              : [],
            attempt: Number(asset.attempt),
            verificationResult:
              asset.verification_result as LegacyAssetLineage["verificationResult"],
          } satisfies LegacyAssetLineage)
        : emptyLineage(revisionId, id, directionId, taskId);
    };
    const mappedRepresentation = (kind: RepresentationKind, view: string) => {
      const task = taskFor(view);
      const asset = assetFor(view);
      return representation(
        kind,
        asset ? "ready" : task ? taskState(task.status) : "unavailable",
        lineage(task, asset),
        text(asset?.signed_url) || undefined,
      );
    };
    const product = mappedRepresentation("product", "studio");
    const worn = mappedRepresentation("worn", "on_skin");
    const motion = mappedRepresentation("motion", "motion_preview");
    const direction: Direction = {
      id: directionId,
      label: "Caleums views",
      brief:
        "Independent verified presentation views from one immutable identity",
      identityFingerprint:
        revisions.find((revision) => revision.id === revisionId)?.identityAnchor
          .fingerprint ?? "pending",
      representations: {
        product,
        worn,
        motion,
      },
    };
    return {
      id,
      revisionId,
      label: "Caleums presentation views",
      createdAt: text(run.created_at),
      status:
        run.status === "complete"
          ? "complete"
          : run.status === "cancelled"
            ? "cancelled"
            : run.status === "partial" || run.status === "operator_review"
              ? "partial"
              : "running",
      elapsedMs: 0,
      tasks: taskRows.map((task) => {
        const storedView = text(task.presentation_view);
        const view = publicPresentationView(storedView);
        const asset = assetFor(storedView);
        const kind: RepresentationKind =
          view === "on_skin"
            ? "worn"
            : view.startsWith("motion")
              ? "motion"
              : "product";
        return {
          id: text(task.id),
          view,
          state: taskState(task.status),
          attempt: Number(task.attempt ?? 0),
          assetId: asset ? text(asset.id) : undefined,
          directionId,
          kind,
        };
      }),
      assets: assetRows.map((asset) => {
        const storedView = text(asset.presentation_view);
        const view = publicPresentationView(storedView);
        const task = taskRows.find((row) => row.id === asset.task_id);
        return {
          id: text(asset.id),
          view,
          state: "ready" as const,
          assetUrl: text(asset.signed_url),
          alt: `Verified ${view.replaceAll("_", " ")} view of the approved pendant`,
          lineage: lineage(task, asset),
        };
      }),
      directions: [direction],
    };
  }

  #group(rows: Row[], key: string) {
    const grouped = new Map<string, Row[]>();
    for (const row of rows) {
      const value = text(row[key]);
      grouped.set(value, [...(grouped.get(value) ?? []), row]);
    }
    return grouped;
  }

  #rememberDraft(
    row: Row,
    specification: DesignDraft["specification"],
    emit = true,
  ) {
    const draft: DesignDraft = {
      id: text(row.id),
      ownerPrincipalId: text(row.owner_principal_id, this.#state.principal.id),
      locale: text(row.locale, "en") as "en" | "ar",
      specification,
      createdAt: text(row.created_at, new Date().toISOString()),
      updatedAt: text(row.updated_at, new Date().toISOString()),
    };
    this.#drafts.set(draft.id, draft);
    if (emit) this.#emit();
    return structuredClone(draft);
  }

  #idempotency(scope: string, entity: string) {
    const storageKey = `caleums:idempotency:v1:${scope}:${entity}`;
    const existing = window.localStorage.getItem(storageKey);
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.localStorage.setItem(storageKey, created);
    return created;
  }

  async #ensureSession() {
    if (!this.#session) await this.hydrate();
  }

  async #ensureReferenceUploaded(specification: JewelrySpecification) {
    const reference = specification.referenceAsset;
    if (!reference) return;
    await this.#ensureSession();
    const local = await loadReferenceUrl(reference.id);
    if (!local)
      throw new Error("Approved inspiration reference is unavailable");
    try {
      const blob = await fetch(local.url).then((response) => response.blob());
      const form = new FormData();
      form.set("referenceId", reference.id);
      form.set(
        "file",
        new File([blob], reference.fileName ?? "reference", {
          type: blob.type,
        }),
      );
      const current = await this.#ensureSupabase().auth.getSession();
      const response = await fetch("/api/references", {
        method: "POST",
        credentials: "same-origin",
        headers: current.data.session
          ? { authorization: `Bearer ${current.data.session.access_token}` }
          : {},
        body: form,
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(
          body.error ?? `Reference upload failed:${response.status}`,
        );
      }
    } finally {
      local.revoke();
    }
  }

  #ensureSupabase() {
    if (this.#supabase) return this.#supabase;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key)
      throw new Error("Remote Supabase browser configuration is missing");
    this.#supabase = createSupabaseDataClient(url, key);
    return this.#supabase;
  }

  #requireDesign(id: string) {
    const design = this.#state.designs.find((item) => item.id === id);
    if (!design) throw new Error("Design not found");
    return design;
  }

  #emit() {
    for (const listener of this.#listeners) listener();
  }

  async #request<T = unknown>(
    path: string,
    init: RequestInit = {},
    authenticated = true,
  ): Promise<T> {
    if (authenticated) {
      await this.#ensureSession();
      const current = await this.#ensureSupabase().auth.getSession();
      if (current.data.session)
        this.#session!.access_token = current.data.session.access_token;
    }
    const response = await fetch(path, {
      ...init,
      credentials: "same-origin",
      headers: {
        "content-type": "application/json",
        ...(authenticated && this.#session
          ? { authorization: `Bearer ${this.#session.access_token}` }
          : {}),
        ...init.headers,
      },
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
      };
      const failure = new Error(
        body.error ?? `Request failed:${response.status}`,
      ) as Error & { code?: string };
      if (body.code) failure.code = body.code;
      throw failure;
    }
    return response.json() as Promise<T>;
  }
}

function publicPresentationView(
  value: string,
): LegacyGenerationRun["tasks"][number]["view"] {
  if (value === "motion_preview" || value === "motion_final") return "motion";
  if (value === "studio_hero" || value === "billboard") return "studio";
  if (["studio", "on_skin", "close_up", "dark", "motion"].includes(value))
    return value as LegacyGenerationRun["tasks"][number]["view"];
  return "studio";
}
