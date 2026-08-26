import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { operatorSessionCookie } from "../../../../lib/backend/operator-session";
import { GET, POST } from "./route";

function authenticatedHeaders() {
  return {
    cookie: operatorSessionCookie().split(";")[0]!,
    origin: "https://caleums.test",
    "sec-fetch-site": "same-origin",
    "content-type": "application/json",
  };
}

describe("operator prompt boundary", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_JEWELO_DATA_MODE", "mock");
    vi.stubEnv("NODE_ENV", "development");
  });

  it("requires the HTTP-only operator session", async () => {
    const response = await GET(
      new Request(
        "https://caleums.test/api/operator/prompts?profile=image.studio",
      ),
    );
    expect(response.status).toBe(401);
  });

  it("returns bounded profile history only after authentication", async () => {
    const response = await GET(
      new Request(
        "https://caleums.test/api/operator/prompts?profile=image.studio",
        { headers: authenticatedHeaders() },
      ),
    );
    const body = (await response.json()) as {
      releases: unknown[];
      activeReleaseId: string;
    };
    expect(response.status).toBe(200);
    expect(body.releases).toHaveLength(1);
    expect(body.activeReleaseId).toBeTruthy();
  });

  it("rejects cross-origin mutation before parsing the action", async () => {
    const headers = authenticatedHeaders();
    headers.origin = "https://attacker.invalid";
    const response = await POST(
      new Request("https://caleums.test/api/operator/prompts", {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "publish" }),
      }),
    );
    expect(response.status).toBe(403);
  });

  it("returns shared server validation errors for unknown variables", async () => {
    const baseline = await GET(
      new Request(
        "https://caleums.test/api/operator/prompts?profile=image.studio",
        { headers: authenticatedHeaders() },
      ),
    );
    const library = (await baseline.json()) as {
      releases: Array<{ template: string }>;
    };
    const response = await POST(
      new Request("https://caleums.test/api/operator/prompts", {
        method: "POST",
        headers: authenticatedHeaders(),
        body: JSON.stringify({
          action: "create",
          profile: "image.studio",
          template: library.releases[0]!.template.replace(
            "{{approved_name}}",
            "{{customer_notes}}",
          ),
          changeNote: "Invalid free-form notes",
        }),
      }),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("Unknown prompt variable"),
    });
  });

  it("rejects a stale publication after an atomic publish", async () => {
    const headers = authenticatedHeaders();
    const baselineResponse = await GET(
      new Request(
        "https://caleums.test/api/operator/prompts?profile=image.studio",
        { headers },
      ),
    );
    const baseline = (await baselineResponse.json()) as {
      activeReleaseId: string;
      releases: Array<{ id: string; template: string }>;
    };
    const createdResponse = await POST(
      new Request("https://caleums.test/api/operator/prompts", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "create",
          profile: "image.studio",
          template: `${baseline.releases[0]!.template} Keep lighting neutral.`,
          changeNote: "Neutral lighting",
        }),
      }),
    );
    const created = (await createdResponse.json()) as { id: string };
    const published = await POST(
      new Request("https://caleums.test/api/operator/prompts", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "publish",
          releaseId: created.id,
          expectedCurrentReleaseId: baseline.activeReleaseId,
        }),
      }),
    );
    expect(published.status).toBe(200);

    const stale = await POST(
      new Request("https://caleums.test/api/operator/prompts", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "publish",
          releaseId: baseline.releases[0]!.id,
          expectedCurrentReleaseId: baseline.activeReleaseId,
        }),
      }),
    );
    expect(stale.status).toBe(409);
    await expect(stale.json()).resolves.toMatchObject({
      error: expect.stringContaining("refresh required"),
    });
  });
});
