import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { POST } from "./route";
import { GET } from "./[id]/route";

const SUPABASE = "https://project.supabase.test";
const PRINCIPAL = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const REQUEST_ID = "33333333-3333-4333-8333-333333333333";
const REQUEST_KEY = "44444444-4444-4444-8444-444444444444";

const specification = {
  script: "Arabic",
  names: ["أسماء"],
  construction: "Diamond rails",
  lettering: "Kufi",
  gold: { karat: "18K", color: "Rose gold" },
  stones: { coverage: "Accent", gemstone: "Lab diamond" },
  pendantWidthMm: 32,
  chainStyle: "Rolo",
};

const body = (overrides: Record<string, unknown> = {}) => ({
  locale: "ar",
  specification,
  contact: { channel: "whatsapp", value: "+971 50 123 4567", name: "Asma" },
  sampleReference: {
    manifestId: "sample-assets-v9",
    sampleId: "akr-white-none-Studio-v9",
    view: "Studio",
    assetPath: "/atelier/arabic-kufi-rails-white-none-studio.png",
  },
  ...overrides,
});

function storedRow(overrides: Record<string, unknown> = {}) {
  return {
    id: REQUEST_ID,
    status: "new",
    locale: "ar",
    specification,
    sample_reference: {
      role: "illustrative-reference-only",
      manifestId: "sample-assets-v9",
      sampleId: "akr-white-none-Studio-v9",
      view: "Studio",
      assetPath: "/atelier/arabic-kufi-rails-white-none-studio.png",
    },
    design_id: null,
    design_revision_id: null,
    generation_run_id: null,
    created_at: "2026-09-07T22:00:00.000Z",
    updated_at: "2026-09-07T22:00:00.000Z",
    contacted_at: null,
    ...overrides,
  };
}

interface Recorded {
  method: string;
  url: string;
  body?: Record<string, unknown>;
}

/** Minimal Supabase REST double: `/auth/v1/user` plus one owner-scoped table. */
function stubSupabase(options: {
  user?: string | null;
  existing?: Array<Record<string, unknown>>;
  insert?: () => Response;
}) {
  const calls: Recorded[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      const parsed = init?.body
        ? (JSON.parse(String(init.body)) as Record<string, unknown>)
        : undefined;
      calls.push({ method: init?.method ?? "GET", url, body: parsed });
      if (url.endsWith("/auth/v1/user"))
        return options.user
          ? Response.json({ id: options.user })
          : new Response(JSON.stringify({ message: "invalid claim" }), {
              status: 401,
            });
      if ((init?.method ?? "GET") === "GET")
        return Response.json(options.existing ?? []);
      return options.insert
        ? options.insert()
        : Response.json([storedRow()], { status: 201 });
    }),
  );
  return calls;
}

const post = (payload: unknown, bearer = "customer-token") =>
  POST(
    new Request("https://caleums.test/api/preview-requests", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
      },
      body: JSON.stringify(payload),
    }),
  );

beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", SUPABASE);
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-test-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("POST /api/preview-requests", () => {
  it("requires a bearer token before reading the body", async () => {
    const calls = stubSupabase({ user: PRINCIPAL });
    const response = await POST(
      new Request("https://caleums.test/api/preview-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body()),
      }),
    );
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      code: "unauthenticated",
    });
    expect(calls).toHaveLength(0);
  });

  it("stores the capture for the authenticated principal and answers 201", async () => {
    const calls = stubSupabase({ user: PRINCIPAL });
    const response = await post(body({ requestKey: REQUEST_KEY }));
    expect(response.status).toBe(201);
    const insert = calls.find((call) => call.method === "POST");
    expect(insert?.body).toMatchObject({
      principal_id: PRINCIPAL,
      locale: "ar",
      request_key: REQUEST_KEY,
      // The phone number is normalized before it is stored.
      contact: { channel: "whatsapp", value: "+971501234567", name: "Asma" },
    });
    // Status is the database default; a client can never choose it.
    expect(insert?.body).not.toHaveProperty("status");
    await expect(response.json()).resolves.toMatchObject({
      id: REQUEST_ID,
      status: "new",
    });
  });

  it("never lets a client set the owner or the operator note", async () => {
    stubSupabase({ user: PRINCIPAL });
    for (const payload of [
      body({ principalId: OTHER }),
      body({ operatorNote: "already handled" }),
      body({ status: "fulfilled" }),
    ]) {
      const response = await post(payload);
      expect(response.status).toBe(422);
      await expect(response.json()).resolves.toMatchObject({
        code: "invalid_input",
      });
    }
  });

  it("rejects an unusable contact and a malformed specification with 422", async () => {
    stubSupabase({ user: PRINCIPAL });
    const badContact = await post(
      body({ contact: { channel: "whatsapp", value: "12345" } }),
    );
    expect(badContact.status).toBe(422);
    await expect(badContact.json()).resolves.toMatchObject({
      code: "invalid_input",
      error: expect.stringContaining("contact"),
    });
    const badSpecification = await post(
      body({ specification: { ...specification, names: [] } }),
    );
    expect(badSpecification.status).toBe(422);
  });

  it("rejects a malformed body with 422 and no write", async () => {
    const calls = stubSupabase({ user: PRINCIPAL });
    const response = await POST(
      new Request("https://caleums.test/api/preview-requests", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer customer-token",
        },
        body: "{not json",
      }),
    );
    expect(response.status).toBe(422);
    expect(calls.some((call) => call.method === "POST")).toBe(false);
  });

  it("returns the first row for a repeated request key instead of writing twice", async () => {
    const calls = stubSupabase({
      user: PRINCIPAL,
      existing: [storedRow()],
    });
    const response = await post(body({ requestKey: REQUEST_KEY }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ id: REQUEST_ID });
    expect(calls.some((call) => call.method === "POST")).toBe(false);
  });

  it("resolves a racing double submit through the unique index", async () => {
    let inserts = 0;
    const calls = stubSupabase({
      user: PRINCIPAL,
      // The pre-check finds nothing; the recovery select finds the winner.
      get existing() {
        return inserts === 0 ? [] : [storedRow()];
      },
      insert: () => {
        inserts += 1;
        return new Response(
          JSON.stringify({ code: "23505", message: "duplicate key value" }),
          { status: 409 },
        );
      },
    } as Parameters<typeof stubSupabase>[0]);
    const response = await post(body({ requestKey: REQUEST_KEY }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ id: REQUEST_ID });
    expect(calls.filter((call) => call.method === "POST")).toHaveLength(1);
  });
});

describe("GET /api/preview-requests/[id]", () => {
  const read = (id: string, bearer = "customer-token") =>
    GET(
      new Request(`https://caleums.test/api/preview-requests/${id}`, {
        headers: { authorization: `Bearer ${bearer}` },
      }),
      { params: Promise.resolve({ id }) },
    );

  it("returns the owner's row without the operator note", async () => {
    stubSupabase({
      user: PRINCIPAL,
      existing: [storedRow({ operator_note: "called at 10:00" })],
    });
    const response = await read(REQUEST_ID);
    expect(response.status).toBe(200);
    const payload = (await response.json()) as Record<string, unknown>;
    expect(payload).toMatchObject({ id: REQUEST_ID, status: "new" });
    expect(payload).not.toHaveProperty("operatorNote");
    expect(payload).not.toHaveProperty("contact");
  });

  it("answers 404 when RLS hides another principal's row", async () => {
    stubSupabase({ user: OTHER, existing: [] });
    const response = await read(REQUEST_ID);
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      code: "not_found",
    });
  });

  it("requires authentication", async () => {
    stubSupabase({ user: null });
    const response = await read(REQUEST_ID, "expired-token");
    expect(response.status).toBe(401);
  });
});
