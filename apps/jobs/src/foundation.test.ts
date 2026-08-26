import { describe, expect, it } from "vitest";

import { runFoundationContract } from "./foundation";

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
});
