import { describe, expect, it } from "vitest";

import { healthPayload, readinessPayload } from "./health";

describe("health contracts", () => {
  it("returns a stable health payload without configuration details", () => {
    expect(healthPayload).toEqual({
      status: "ok",
      service: "jewelo-web",
      contractVersion: "foundation-v1",
    });
  });

  it("distinguishes configuration from connectivity", () => {
    const result = readinessPayload({});
    expect(result.connectivityChecked).toBe(false);
    expect(result.status).toBe("not_ready");
    expect(result.reason).toBe("dependencies-not-configured");
    expect(result.dependencies).toEqual({
      supabase: "not-configured",
      trigger: "not-configured",
    });
  });

  it("does not claim readiness before connectivity is checked", () => {
    const result = readinessPayload({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-fixture",
      TRIGGER_PROJECT_REF: "proj_fixture",
      TRIGGER_SECRET_KEY: "trigger-fixture",
    });
    expect(result).toMatchObject({
      status: "not_ready",
      reason: "remote-connectivity-not-checked",
      connectivityChecked: false,
    });
  });
});
