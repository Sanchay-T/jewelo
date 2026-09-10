import { afterEach, describe, expect, it, vi } from "vitest";

import { handleTransliteration } from "./route";

const authenticated = async () => ({ user: { id: "principal-1" } });
const transliterator = {
  transliterate: vi.fn(async (name: string) => ({
    arabicText: `${name}:ليلى`,
    model: "test-model",
  })),
};

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://caleums.test/api/transliterate", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  transliterator.transliterate.mockClear();
});

describe("POST /api/transliterate", () => {
  it("refuses an unauthenticated caller before any provider work", async () => {
    vi.stubEnv("PROVIDER_MODE", "real");
    // The default authenticator: no bearer, no principal, no spend.
    const response = await handleTransliteration(post({ name: "Layla" }));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "Unauthorized",
      code: "unauthenticated",
    });
  });

  it("refuses outside real provider mode even for an authenticated principal", async () => {
    vi.stubEnv("PROVIDER_MODE", "mock");
    const response = await handleTransliteration(
      post({ name: "Layla" }),
      () => transliterator,
      authenticated,
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Arabic name refinement is unavailable here.",
      code: "transliteration_unavailable",
    });
    expect(transliterator.transliterate).not.toHaveBeenCalled();
  });

  it("refuses when the provider mode is unset", async () => {
    vi.stubEnv("PROVIDER_MODE", "");
    const response = await handleTransliteration(
      post({ name: "Layla" }),
      () => transliterator,
      authenticated,
    );
    expect(response.status).toBe(503);
    expect(transliterator.transliterate).not.toHaveBeenCalled();
  });

  it("still rejects an invalid name before the provider-mode gate", async () => {
    vi.stubEnv("PROVIDER_MODE", "mock");
    const response = await handleTransliteration(
      post({ name: "Layla".repeat(20) }),
      () => transliterator,
      authenticated,
    );
    expect(response.status).toBe(422);
    expect((await response.json()).code).toBe("invalid_input");
  });

  it("transliterates for an authenticated principal in real mode", async () => {
    vi.stubEnv("PROVIDER_MODE", "real");
    const response = await handleTransliteration(
      post({ name: "Layla" }),
      () => transliterator,
      authenticated,
    );
    expect(response.status).toBe(200);
    expect((await response.json()).arabicText).toBe("Layla:ليلى");
  });

  it("rejects a cross-site caller before authenticating it", async () => {
    vi.stubEnv("PROVIDER_MODE", "real");
    const response = await handleTransliteration(
      post({ name: "Layla" }, { "sec-fetch-site": "cross-site" }),
      () => transliterator,
      async () => {
        throw new Error("authentication must not run for a cross-site call");
      },
    );
    expect(response.status).toBe(403);
  });
});
