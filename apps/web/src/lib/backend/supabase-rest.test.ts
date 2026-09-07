import { afterEach, describe, expect, it, vi } from "vitest";
import { supabaseRequest } from "./supabase-rest";

const config = { url: "https://example.supabase.co", key: "service-key" };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("supabaseRequest", () => {
  it("parses successful JSON responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ id: "quote-1" }), { status: 201 }),
      ),
    );

    await expect(
      supabaseRequest<{ id: string }>(config, "/rest/v1/quotes"),
    ).resolves.toEqual({ id: "quote-1" });
  });

  it.each([
    [201, ""],
    [200, "   \n"],
    [204, ""],
  ])("accepts an empty successful %s response", async (status, body) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(status === 204 ? null : body, { status })),
    );

    await expect(
      supabaseRequest<undefined>(config, "/rest/v1/audit_events"),
    ).resolves.toBeUndefined();
  });

  it("preserves Supabase error details", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("policy denied", { status: 403 })),
    );

    await expect(
      supabaseRequest(config, "/rest/v1/audit_events"),
    ).rejects.toThrow("Supabase 403: policy denied");
  });

  it("rejects malformed non-empty success bodies", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("not-json", { status: 200 })),
    );

    await expect(supabaseRequest(config, "/rest/v1/quotes")).rejects.toThrow(
      SyntaxError,
    );
  });
});
