import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { operatorSessionCookie } from "../../../../lib/backend/operator-session";
import { GET } from "./route";
import { POST as command } from "../commands/route";

const SUPABASE = "https://project.supabase.test";
const REQUEST_ID = "33333333-3333-4333-8333-333333333333";

const storedRow = (overrides: Record<string, unknown> = {}) => ({
  id: REQUEST_ID,
  status: "new",
  locale: "ar",
  specification: {
    script: "Arabic",
    names: ["أسماء"],
    construction: "Diamond rails",
    lettering: "Kufi",
    gold: { karat: "18K", color: "Rose gold" },
    stones: { coverage: "Accent", gemstone: "Lab diamond" },
    pendantWidthMm: 32,
    chainStyle: "Rolo",
  },
  sample_reference: null,
  design_id: null,
  design_revision_id: null,
  generation_run_id: null,
  created_at: "2026-09-07T22:00:00.000Z",
  updated_at: "2026-09-07T22:00:00.000Z",
  contacted_at: null,
  contact: { channel: "whatsapp", value: "+971501234567" },
  operator_note: null,
  ...overrides,
});

interface Recorded {
  method: string;
  url: string;
  body?: Record<string, unknown>;
}

function stubSupabase(rows: Array<Record<string, unknown>> = [storedRow()]) {
  const calls: Recorded[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      calls.push({
        method: init?.method ?? "GET",
        url,
        body: init?.body
          ? (JSON.parse(String(init.body)) as Record<string, unknown>)
          : undefined,
      });
      if (url.includes("/rest/v1/audit_events")) return new Response(null, {
        status: 201,
      });
      return Response.json(rows);
    }),
  );
  return calls;
}

const session = () => ({ cookie: operatorSessionCookie().split(";")[0] ?? "" });

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_JEWELO_DATA_MODE", "mock");
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("SUPABASE_URL", SUPABASE);
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-test-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const list = (query = "", headers: Record<string, string> = session()) =>
  GET(
    new Request(
      `https://caleums.test/api/operator/preview-requests${query}`,
      { headers },
    ),
  );

describe("GET /api/operator/preview-requests", () => {
  it("requires the HTTP-only operator session", async () => {
    const calls = stubSupabase();
    const response = await list("", {});
    expect(response.status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it("returns newest-first captures with a readable summary and the contact", async () => {
    const calls = stubSupabase();
    const response = await list();
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      previewRequests: Array<Record<string, unknown>>;
    };
    expect(payload.previewRequests[0]).toMatchObject({
      id: REQUEST_ID,
      status: "new",
      summary:
        "أسماء · Arabic · Diamond rails · Kufi · 18K rose gold · accent lab diamond · 32 mm · rolo chain",
      contact: { channel: "whatsapp", value: "+971501234567" },
    });
    expect(calls[0]?.url).toContain("order=created_at.desc");
  });

  it("keeps the queue readable when a stored specification predates the contract", async () => {
    stubSupabase([storedRow({ specification: { legacy: true } })]);
    const payload = (await (await list()).json()) as {
      previewRequests: Array<{ summary: string }>;
    };
    expect(payload.previewRequests[0]?.summary).toBe(
      "Specification needs review",
    );
  });

  it("passes a known status filter through and rejects an unknown one", async () => {
    const calls = stubSupabase();
    await list("?status=contacted");
    expect(calls[0]?.url).toContain("status=eq.contacted");
    const rejected = await list("?status=archived");
    expect(rejected.status).toBe(422);
  });

  it("clamps the page size", async () => {
    const calls = stubSupabase();
    await list("?limit=5000");
    expect(calls[0]?.url).toContain("limit=200");
    await list("?limit=abc");
    expect(calls[1]?.url).toContain("limit=50");
  });
});

describe("operator command preview_request.mark_contacted", () => {
  const mark = (
    payload: Record<string, unknown>,
    headers: Record<string, string> = session(),
  ) =>
    command(
      new Request("https://caleums.test/api/operator/commands", {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify(payload),
      }),
    );

  it("requires the operator session", async () => {
    const calls = stubSupabase();
    const response = await mark(
      {
        command: "preview_request.mark_contacted",
        targetId: REQUEST_ID,
        idempotencyKey: "key-1",
      },
      {},
    );
    expect(response.status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it("transitions only a new capture and records contacted_at", async () => {
    const calls = stubSupabase([storedRow({ status: "contacted" })]);
    const response = await mark({
      command: "preview_request.mark_contacted",
      targetId: REQUEST_ID,
      idempotencyKey: "key-1",
      payload: { note: "Called on WhatsApp" },
    });
    expect(response.status).toBe(200);
    const patch = calls.find((call) => call.method === "PATCH");
    expect(patch?.url).toContain("status=eq.new");
    expect(patch?.body).toMatchObject({
      status: "contacted",
      operator_note: "Called on WhatsApp",
    });
    expect(typeof patch?.body?.contacted_at).toBe("string");
    expect(
      calls.find((call) => call.url.includes("/rest/v1/audit_events"))?.body,
    ).toMatchObject({
      action: "operator.preview_request.mark_contacted",
      actor_type: "operator",
    });
  });

  it("works without a designId, which a degraded capture may not have", async () => {
    stubSupabase();
    const response = await mark({
      command: "preview_request.mark_contacted",
      targetId: REQUEST_ID,
      idempotencyKey: "key-2",
    });
    expect(response.status).toBe(200);
  });

  it("still requires a designId for the design-scoped commands", async () => {
    const calls = stubSupabase();
    const response = await mark({
      command: "issue_quote",
      targetId: REQUEST_ID,
      idempotencyKey: "key-3",
    });
    expect(response.status).toBe(422);
    expect(calls).toHaveLength(0);
  });
});
