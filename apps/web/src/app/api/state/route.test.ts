import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

/**
 * The state read is the only route that hands durable rows straight to a
 * browser, so what it does NOT return is the contract under test: private
 * storage locations and operator lineage stay on this server.
 */
const ASSET_ROW = {
  id: "asset-1",
  design_id: "design-1",
  run_id: "run-1",
  task_id: "task-1",
  owner_principal_id: "principal-1",
  presentation_view: "studio",
  provider: "openai",
  model: "gpt-image-2-2026-04-21",
  prompt_release: "image.studio@v3",
  input_asset_ids: ["identity-1"],
  attempt: 1,
  mime_type: "image/png",
  created_at: "2026-09-07T00:00:00Z",
  bucket_id: "generated-assets",
  object_path: "principal/principal-1/design/design-1/studio/attempt-1.png",
  verification_result: {
    passed: true,
    notes: "ok",
    rejectedObjectPaths: ["principal/principal-1/rejected/attempt-2.png"],
  },
  checksum_sha256: "not-requested",
};

const AUDIT_ROW = {
  id: "audit-1",
  design_id: "design-1",
  actor_type: "customer",
  action: "revision.approved_run.started",
  created_at: "2026-09-07T00:00:00Z",
  principal_id: "principal-1",
  detail: { outboxId: "outbox-1", reservationCents: 80 },
};

const requested: string[] = [];

function stubFetch() {
  return vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    requested.push(url);
    if (url.includes("/auth/v1/user"))
      return Response.json({ id: "principal-1" });
    if (url.includes("/storage/v1/object/sign/"))
      return Response.json({ signedURL: "/object/sign/generated-assets/x?t=1" });
    if (url.includes("/rest/v1/assets?")) return Response.json([ASSET_ROW]);
    if (url.includes("/rest/v1/audit_events?")) return Response.json([AUDIT_ROW]);
    void init;
    return Response.json([]);
  });
}

const read = () =>
  GET(
    new Request("https://caleums.test/api/state?designId=design-1", {
      headers: { authorization: "Bearer anon-token" },
    }),
  );

beforeEach(() => {
  requested.length = 0;
  vi.stubEnv("SUPABASE_URL", "https://project.supabase.test");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-test-key");
  vi.stubGlobal("fetch", stubFetch());
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("GET /api/state", () => {
  it("keeps the private storage location out of the response", async () => {
    const body = (await (await read()).json()) as {
      assets: Array<Record<string, unknown>>;
    };
    const asset = body.assets[0]!;
    expect(asset.bucket_id).toBeUndefined();
    expect(asset.object_path).toBeUndefined();
    expect(asset.owner_principal_id).toBeUndefined();
    expect(asset.checksum_sha256).toBeUndefined();
    expect(asset.signed_url).toBe(
      "https://project.supabase.test/storage/v1/object/sign/generated-assets/x?t=1",
    );
  });

  it("returns every asset column the browser actually reads", async () => {
    const body = (await (await read()).json()) as {
      assets: Array<Record<string, unknown>>;
    };
    expect(Object.keys(body.assets[0]!).sort()).toEqual(
      [
        "attempt",
        "created_at",
        "id",
        "input_asset_ids",
        "mime_type",
        "model",
        "presentation_view",
        "prompt_release",
        "provider",
        "run_id",
        "signed_url",
        "task_id",
        "verification_result",
      ].sort(),
    );
  });

  it("strips the rejected attempts' private paths from the verifier record", async () => {
    const body = (await (await read()).json()) as {
      assets: Array<Record<string, unknown>>;
    };
    expect(body.assets[0]!.verification_result).toEqual({
      passed: true,
      notes: "ok",
    });
  });

  it("projects audit events to what happened, never the operator detail", async () => {
    const body = (await (await read()).json()) as {
      audit_events: Array<Record<string, unknown>>;
    };
    expect(body.audit_events[0]).toEqual({
      id: "audit-1",
      design_id: "design-1",
      actor_type: "customer",
      action: "revision.approved_run.started",
      created_at: "2026-09-07T00:00:00Z",
    });
  });

  it("asks PostgREST for an explicit column list, never `select=*`", async () => {
    await read();
    const assets = requested.find((url) => url.includes("/rest/v1/assets?"))!;
    const audit = requested.find((url) =>
      url.includes("/rest/v1/audit_events?"),
    )!;
    expect(assets).not.toContain("select=*");
    expect(assets).toContain("select=id,run_id,task_id");
    expect(audit).toContain("select=id,design_id,actor_type,action,created_at");
  });

  it("keeps the top-level response shape", async () => {
    const body = (await (await read()).json()) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(
      [
        "role",
        "principalId",
        "designs",
        "design_drafts",
        "design_revisions",
        "generation_runs",
        "generation_tasks",
        "quotes",
        "orders",
        "audit_events",
        "estimates",
        "assets",
      ].sort(),
    );
    expect(body.role).toBe("customer");
    expect(body.principalId).toBe("principal-1");
  });
});
