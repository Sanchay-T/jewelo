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
    expect(readinessPayload({}).connectivityChecked).toBe(false);
    expect(readinessPayload({}).dependencies).toEqual({
      supabase: "not-configured",
      trigger: "not-configured",
    });
  });
});
