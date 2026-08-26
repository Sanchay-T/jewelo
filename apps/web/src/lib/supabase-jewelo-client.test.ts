import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JewelrySpecification } from "@jewelo/contracts";

const { channel, createSupabaseDataClient } = vi.hoisted(() => {
  const channel = { on: vi.fn(), subscribe: vi.fn() };
  channel.on.mockReturnValue(channel);
  channel.subscribe.mockReturnValue(channel);
  const session = {
    access_token: "anonymous-access-token",
    refresh_token: "anonymous-refresh-token",
    user: { id: "anonymous-user", is_anonymous: true },
  };
  const supabase = {
    auth: {
      getSession: vi.fn(async () => ({ data: { session } })),
      signInAnonymously: vi.fn(async () => ({ data: { session } })),
    },
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(async () => "ok"),
  };
  return {
    channel,
    createSupabaseDataClient: vi.fn(() => supabase),
    supabase,
  };
});

vi.mock("@jewelo/data", () => ({ createSupabaseDataClient }));

import { SupabaseJeweloClient } from "./supabase-jewelo-client";

const specification: JewelrySpecification = {
  jewelryType: "name-pendant",
  nameCount: 1,
  names: [{ approvedEnglishText: "Layla", approvedArabicText: null }],
  arabicStyle: "none",
  layout: "single-name",
  source: "fresh",
  metalKarat: "18K",
  metalColor: "yellow",
  finish: "polished",
  stoneCoverage: "none",
  gemstone: "none",
  connector: "none",
  sizeProfile: "classic",
  dimensions: { widthMm: 30, heightMm: 10, thicknessMm: 1 },
  chain: { style: "cable", lengthCm: 45 },
  complexity: 1,
  spellingConfirmed: true,
};

function emptyState() {
  return {
    role: "customer",
    principalId: "anonymous-user",
    designs: [] as Array<Record<string, unknown>>,
    design_drafts: [] as Array<Record<string, unknown>>,
    design_revisions: [] as Array<Record<string, unknown>>,
    generation_runs: [] as Array<Record<string, unknown>>,
    generation_tasks: [] as Array<Record<string, unknown>>,
    assets: [] as Array<Record<string, unknown>>,
    quotes: [] as Array<Record<string, unknown>>,
    orders: [] as Array<Record<string, unknown>>,
    audit_events: [] as Array<Record<string, unknown>>,
  };
}

describe("remote one-view client flow", () => {
  const storage = new Map<string, string>();
  let state = emptyState();
  let fetcher: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    state = emptyState();
    storage.clear();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-test-key");
    vi.stubGlobal("window", {
      setInterval: globalThis.setInterval,
      clearInterval: globalThis.clearInterval,
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    });
    fetcher = vi.fn(
      async (input: string | URL | Request, init?: RequestInit) => {
        const path = String(input);
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        if (path === "/api/state") return Response.json(state);
        if (path === "/api/designs/drafts" && init?.method === "POST") {
          const row = {
            id: "draft-1",
            owner_principal_id: "anonymous-user",
            locale: "en",
            specification: body.specification,
            spelling_confirmed: false,
            created_at: "2026-08-27T00:00:00Z",
            updated_at: "2026-08-27T00:00:00Z",
          };
          state.design_drafts = [row];
          return Response.json(row, { status: 201 });
        }
        if (path === "/api/designs/drafts/draft-1") {
          const row = {
            ...state.design_drafts[0],
            specification: body.specification,
            spelling_confirmed: true,
          };
          state.design_drafts = [row];
          return Response.json(row);
        }
        if (path === "/api/revisions/approve") {
          if (!state.designs.length) {
            state.designs.push({
              id: "design-1",
              name: "Layla",
              resume_path: "/en/studio/design-1",
              created_at: "2026-08-27T00:00:00Z",
              updated_at: "2026-08-27T00:00:00Z",
            });
            state.design_revisions.push({
              id: "revision-1",
              design_id: "design-1",
              revision_number: 1,
              specification,
              identity_anchor: {
                approvedText: "Layla",
                language: "en",
                typography: "Playfair Display Italic",
                fingerprint: "fingerprint-1",
                geometryPath: "canonical:single-name:none:fingerprint-1",
              },
              created_at: "2026-08-27T00:00:00Z",
              approved_at: "2026-08-27T00:00:00Z",
            });
            state.generation_runs.push({
              id: "run-1",
              design_id: "design-1",
              revision_id: "revision-1",
              status: "running",
              created_at: "2026-08-27T00:00:00Z",
            });
            state.generation_tasks.push({
              id: "task-1",
              run_id: "run-1",
              status: "queued",
              attempt: 0,
            });
            state.audit_events.push({
              id: 1,
              design_id: "design-1",
              actor_type: "customer",
              action: "revision.approved_run.started",
              detail: { outboxId: "outbox-1" },
              created_at: "2026-08-27T00:00:00Z",
            });
          }
          return Response.json(
            { approved_design_id: "design-1" },
            { status: 201 },
          );
        }
        if (path === "/api/operator/session" && init?.method === "POST") {
          state.role = "operator";
          state.principalId = "operator-session";
          return Response.json({ authenticated: true });
        }
        if (path === "/api/operator/session" && init?.method === "DELETE") {
          state.role = "customer";
          state.principalId = "anonymous-user";
          return Response.json({ authenticated: false });
        }
        if (path === "/api/operator/commands") {
          state.quotes[0]!.status = "issued";
          return Response.json(state.quotes[0]);
        }
        if (path === "/api/designs/design-1/commands") {
          if (body.command === "request_quote") {
            state.quotes = [
              {
                id: "quote-1",
                design_id: "design-1",
                revision_id: "revision-1",
                status: "requested",
                total: 2200,
                snapshot: body.estimate,
                expires_at: "2099-09-02T10:00:00Z",
                created_at: "2026-08-27T00:00:00Z",
              },
            ];
          } else if (body.command === "accept_quote") {
            state.quotes[0]!.status = "accepted";
          }
          return Response.json(state.quotes[0] ?? {});
        }
        if (path === "/api/checkout") {
          state.orders = [
            {
              id: "order-1",
              design_id: "design-1",
              revision_id: "revision-1",
              quote_id: "quote-1",
              status: "confirmed",
              accepted_total: 2200,
              accepted_at: "2026-08-27T00:00:00Z",
              created_at: "2026-08-27T00:00:00Z",
            },
          ];
          return Response.json({
            mode: "mock",
            checkoutUrl: "/en/commerce/design-1?checkout=mock",
          });
        }
        return Response.json({});
      },
    );
    vi.stubGlobal("fetch", fetcher);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    channel.on.mockReturnValue(channel);
    channel.subscribe.mockReturnValue(channel);
  });

  it("resumes, approves, receives status, completes commerce, and reloads", async () => {
    const client = new SupabaseJeweloClient();
    await expect(client.hydrate()).resolves.toMatchObject({
      principal: { id: "anonymous-user", role: "customer" },
      designs: [],
    });
    const { spellingConfirmed, ...draftInput } = specification;
    expect(spellingConfirmed).toBe(true);
    const draft = await client.createDraft(draftInput);
    await client.updateDraft(draft.id, { spellingConfirmed: true });
    const design = await client.approveRevision({
      draftId: draft.id,
      specification,
    });
    expect(design.runs[0]?.tasks[0]?.state).toBe("queued");
    expect(design.audit[0]?.detail).toContain("outbox-1");
    expect(storage.get("caleums:idempotency:v1:approve:draft-1")).toBeTruthy();

    const listener = vi.fn();
    const unsubscribe = client.subscribeToRun("run-1", listener);
    await vi.waitFor(() => expect(channel.subscribe).toHaveBeenCalled());
    state.generation_runs[0]!.status = "complete";
    state.generation_tasks[0]!.status = "ready";
    state.assets.push({
      id: "asset-1",
      run_id: "run-1",
      revision_id: "revision-1",
      task_id: "task-1",
      provider: "mock",
      model: "mock-studio-v1",
      prompt_release: "studio-placeholder-v1",
      input_asset_ids: [],
      attempt: 1,
      signed_url: "https://signed.example/asset.png",
      verification_result: {
        status: "passed",
        exactText: true,
        identityScore: 1,
        notes: "mock",
      },
    });
    const realtimeRefresh = channel.on.mock.calls[0]?.[2] as () => void;
    realtimeRefresh();
    await vi.waitFor(() =>
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ status: "complete" }),
      ),
    );
    unsubscribe();

    await client.selectDirection("design-1", "run-1:studio");
    await client.calculateEstimate("design-1");
    await client.requestQuote("design-1");
    await client.loginOperator("operator@example.com", "passphrase");
    expect(client.getState().principal.role).toBe("operator");
    await client.issueQuote("design-1");
    await client.setRole("customer");
    await client.acceptQuote("design-1");
    await client.createOrder("design-1");
    expect(client.getDesign("design-1")?.order?.id).toBe("order-1");
    expect(storage.get("caleums:idempotency:v1:checkout:quote-1")).toBeTruthy();

    const reloaded = new SupabaseJeweloClient();
    await reloaded.hydrate();
    expect(reloaded.getState()).toMatchObject({
      activeDesignId: "design-1",
      resumePath: "/en/studio/design-1",
      designs: [{ id: "design-1", order: { id: "order-1" } }],
    });
    expect(createSupabaseDataClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "publishable-test-key",
    );
  });
});
