import { describe, expect, it, vi } from "vitest";
import { handleTransliteration } from "./route";

function request(body: unknown) {
  return new Request("http://localhost/api/transliterate", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      host: "localhost",
      origin: "http://localhost",
      "x-forwarded-for": crypto.randomUUID(),
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/transliterate", () => {
  it("returns a server-side refined Arabic name", async () => {
    const transliterate = vi.fn(async () => ({
      arabicText: "سارة",
      model: "gpt-5.6-luna",
    }));
    const response = await handleTransliteration(
      request({ name: "Sarah" }),
      () => ({
        transliterate,
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      arabicText: "سارة",
      model: "gpt-5.6-luna",
    });
    expect(transliterate).toHaveBeenCalledWith("Sarah");
  });

  it("rejects invalid and cross-origin requests before provider use", async () => {
    const create = vi.fn();
    const invalid = await handleTransliteration(
      request({ name: "<script>" }),
      create,
    );
    expect(invalid.status).toBe(400);

    const crossOrigin = new Request("http://localhost/api/transliterate", {
      method: "POST",
      headers: { host: "localhost", origin: "https://evil.example" },
      body: JSON.stringify({ name: "Sarah" }),
    });
    const rejected = await handleTransliteration(crossOrigin, create);
    expect(rejected.status).toBe(403);
    expect(create).not.toHaveBeenCalled();
  });
});
