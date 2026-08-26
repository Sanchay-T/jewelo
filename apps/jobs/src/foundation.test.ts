import { describe, expect, it } from "vitest";

import {
  runFoundationContract,
  runValidatedFoundationContract,
} from "./foundation";

describe("foundation job contract", () => {
  it("returns the typed mock result", async () => {
    await expect(
      runFoundationContract({ requestId: "job-1", message: "probe" }),
    ).resolves.toEqual({
      requestId: "job-1",
      accepted: true,
      providerMode: "mock",
    });
  });

  it("rejects malformed work before execution", async () => {
    await expect(
      runFoundationContract({ requestId: "", message: "probe" }),
    ).rejects.toThrow();
  });

  it("rejects missing jobs runtime configuration before execution", async () => {
    await expect(
      runValidatedFoundationContract(
        { requestId: "job-2", message: "probe" },
        {},
      ),
    ).rejects.toThrow(/SUPABASE_URL/);
  });

  it("runs with a complete mock-mode jobs environment", async () => {
    await expect(
      runValidatedFoundationContract(
        { requestId: "job-3", message: "probe" },
        {
          SUPABASE_URL: "https://example.supabase.co",
          SUPABASE_SERVICE_ROLE_KEY: "service-role-fixture",
          TRIGGER_PROJECT_REF: "proj_fixture",
          TRIGGER_SECRET_KEY: "trigger-fixture",
          PROVIDER_MODE: "mock",
        },
      ),
    ).resolves.toMatchObject({ requestId: "job-3", accepted: true });
  });
});
