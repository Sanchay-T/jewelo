import type {
  ApproveRevisionInput,
  AuditEvent,
  CreateDraftInput,
  Design,
  DesignDraft,
  GenerationRun,
  JeweloClient,
  Role,
  RunListener,
  ScenarioId,
  SpikeState,
  UpdateDraftInput,
} from "@jewelo/contracts";
import {
  createSupabaseDataClient,
  type RealtimeChannel,
  type SupabaseDataClient,
} from "@jewelo/data";

interface Session {
  access_token: string;
  refresh_token?: string;
  user: { id: string; is_anonymous?: boolean };
}

function now() {
  return new Date().toISOString();
}

export class SupabaseJeweloClient implements JeweloClient {
  #listeners = new Set<() => void>();
  #drafts = new Map<string, DesignDraft>();
  #session?: Session;
  #supabase?: SupabaseDataClient;
  #state: SpikeState = {
    version: 1,
    engine: "jewelo-working-app",
    principal: { id: "pending-anonymous", name: "Guest", role: "customer" },
    scenario: "fast-all",
    designs: [],
  };

  async hydrate(): Promise<SpikeState> {
    if (typeof window === "undefined") return this.#state;
    const supabase = this.#ensureSupabase();
    const existing = await supabase.auth.getSession();
    const session =
      existing.data.session ??
      (
        await supabase.auth.signInAnonymously({
          options: { data: { jewelo_principal: "anonymous" } },
        })
      ).data.session;
    if (!session) throw new Error("Anonymous authentication failed");
    this.#session = {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      user: {
        id: session.user.id,
        is_anonymous: session.user.is_anonymous,
      },
    };
    this.#state.principal = {
      id: this.#session.user.id,
      name: "Guest",
      role: "customer",
    };
    this.#emit();
    return this.#state;
  }

  onChange(listener: () => void) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }
  getState() {
    return structuredClone(this.#state);
  }
  async setResumePath(path: string) {
    this.#state.resumePath = path;
    this.#emit();
    return this.getState();
  }
  async setRole(role: Role) {
    this.#state.principal.role = role;
    this.#emit();
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
    await this.#ensureSession();
    const row = await this.#request<Record<string, unknown>>(
      "/api/designs/drafts",
      {
        method: "POST",
        body: JSON.stringify({
          locale: input.names[0].approvedArabicText ? "ar" : "en",
          specification: input,
        }),
      },
    );
    const draft: DesignDraft = {
      id: String(row.id),
      ownerPrincipalId: this.#state.principal.id,
      locale: input.names[0].approvedArabicText ? "ar" : "en",
      specification: { ...input, spellingConfirmed: false },
      createdAt: String(row.created_at ?? now()),
      updatedAt: String(row.updated_at ?? now()),
    };
    this.#drafts.set(draft.id, draft);
    return structuredClone(draft);
  }

  async updateDraft(
    draftId: string,
    input: UpdateDraftInput,
  ): Promise<DesignDraft> {
    const current = this.#drafts.get(draftId);
    if (!current) throw new Error("Draft not found");
    const specification = { ...current.specification, ...input };
    const row = await this.#request<Record<string, unknown>>(
      `/api/designs/drafts/${draftId}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          specification,
          spellingConfirmed: specification.spellingConfirmed,
        }),
      },
    );
    const draft = {
      ...current,
      specification,
      updatedAt: String(row.updated_at ?? now()),
    };
    this.#drafts.set(draftId, draft);
    return structuredClone(draft);
  }

  async approveRevision(input: ApproveRevisionInput): Promise<Design> {
    const draft = this.#drafts.get(input.draftId);
    if (!draft) throw new Error("Draft not found");
    const approvedText = input.specification.names
      .map((item) => item.approvedEnglishText ?? item.approvedArabicText ?? "")
      .join(" & ");
    const idempotencyKey = crypto.randomUUID();
    const created = await this.#request<{
      approved_design_id: string;
      revision_id: string;
      run_id: string;
      task_id: string;
      canonical_identity_anchor: Design["revisions"][number]["identityAnchor"];
    }>("/api/revisions/approve", {
      method: "POST",
      body: JSON.stringify({
        draftId: input.draftId,
        specification: input.specification,
        idempotencyKey,
      }),
    });
    const run: GenerationRun = {
      id: created.run_id,
      revisionId: created.revision_id,
      label: "Studio view",
      createdAt: now(),
      status: "running",
      elapsedMs: 0,
      tasks: [
        { id: created.task_id, view: "studio", state: "queued", attempt: 0 },
      ],
      assets: [],
    };
    const design: Design = {
      id: created.approved_design_id,
      name: approvedText || "Pendant",
      createdAt: draft.createdAt,
      updatedAt: now(),
      revisions: [
        {
          id: created.revision_id,
          number: 1,
          createdAt: now(),
          approvedAt: now(),
          identityAnchor: created.canonical_identity_anchor,
          specification: input.specification,
          immutable: true,
        },
      ],
      runs: [run],
      audit: [
        {
          id: crypto.randomUUID(),
          at: now(),
          actor: this.#state.principal.id,
          action: "revision.approved_run.started",
          detail: created.run_id,
        },
      ],
    };
    this.#state.designs.push(design);
    this.#state.activeDesignId = design.id;
    this.#emit();
    return structuredClone(design);
  }

  async refineDesign(designId: string, note: string) {
    const design = this.#requireDesign(designId);
    design.audit.push(this.#audit("design.refine_requested", note));
    this.#emit();
    return structuredClone(design);
  }
  async startRun(designId: string) {
    return structuredClone(this.#requireDesign(designId));
  }
  subscribeToRun(runId: string, listener: RunListener) {
    let stopped = false;
    let channel: RealtimeChannel | undefined;
    const refresh = () => {
      if (!stopped) void this.#refreshRun(runId, listener);
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
    const run = this.#state.designs
      .flatMap((item) => item.runs)
      .find((item) => item.id === runId);
    if (!run) throw new Error("Run not found");
    return structuredClone(run);
  }
  async retryTask(designId: string, taskId: string) {
    await this.#request(`/api/tasks/${taskId}/retry`, {
      method: "POST",
      body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }),
    });
    return structuredClone(this.#requireDesign(designId));
  }
  async cancelTask(designId: string, taskId: string) {
    await this.#request(`/api/tasks/${taskId}/cancel`, { method: "POST" });
    return structuredClone(this.#requireDesign(designId));
  }
  async calculateEstimate(designId: string) {
    return structuredClone(this.#requireDesign(designId));
  }
  async requestQuote(designId: string) {
    return structuredClone(this.#requireDesign(designId));
  }
  async issueQuote(designId: string) {
    return structuredClone(this.#requireDesign(designId));
  }
  async acceptQuote(designId: string) {
    return structuredClone(this.#requireDesign(designId));
  }
  async createOrder(designId: string) {
    return structuredClone(this.#requireDesign(designId));
  }
  async updateFulfillment(designId: string) {
    return structuredClone(this.#requireDesign(designId));
  }
  getAudit(designId: string): AuditEvent[] {
    return structuredClone(this.#requireDesign(designId).audit);
  }
  async reset() {
    this.#state.designs = [];
    this.#state.activeDesignId = undefined;
    this.#drafts.clear();
    this.#emit();
    return this.getState();
  }

  async #ensureSession() {
    if (!this.#session) await this.hydrate();
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
  async #refreshRun(runId: string, listener: RunListener) {
    try {
      const payload = await this.#request<{
        run: Record<string, unknown>;
        tasks: Array<Record<string, unknown>>;
        assets: Array<Record<string, unknown>>;
      }>(`/api/runs/${runId}`);
      const run = this.#state.designs
        .flatMap((item) => item.runs)
        .find((item) => item.id === runId);
      if (!run) return;
      run.status =
        payload.run.status === "complete"
          ? "complete"
          : payload.run.status === "cancelled"
            ? "cancelled"
            : payload.run.status === "partial"
              ? "partial"
              : "running";
      run.tasks = payload.tasks.map((task) => ({
        id: String(task.id),
        view: String(task.presentation_view) as "studio",
        state: String(task.status) as GenerationRun["tasks"][number]["state"],
        attempt: Number(task.attempt),
      }));
      run.assets = payload.assets.map((asset) => ({
        id: String(asset.id),
        view: String(asset.presentation_view) as "studio",
        state: "ready",
        assetUrl: String(asset.signed_url),
        alt: "Studio view of the approved pendant",
        lineage: {
          revisionId: String(asset.revision_id),
          runId: String(asset.run_id),
          taskId: String(asset.task_id),
          provider: String(asset.provider),
          model: String(asset.model),
          promptRelease: String(asset.prompt_release),
          inputAssets: Array.isArray(asset.input_asset_ids)
            ? asset.input_asset_ids.map(String)
            : [],
          attempt: Number(asset.attempt),
          verificationResult:
            asset.verification_result as GenerationRun["assets"][number]["lineage"]["verificationResult"],
        },
      }));
      listener(structuredClone(run));
      this.#emit();
    } catch {
      /* Realtime and polling retry without exposing session details. */
    }
  }
  #requireDesign(id: string) {
    const design = this.#state.designs.find((item) => item.id === id);
    if (!design) throw new Error("Design not found");
    return design;
  }
  #audit(action: string, detail: string): AuditEvent {
    return {
      id: crypto.randomUUID(),
      at: now(),
      actor: this.#state.principal.id,
      action,
      detail,
    };
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
      };
      throw new Error(body.error ?? `Request failed:${response.status}`);
    }
    return response.json() as Promise<T>;
  }
}
