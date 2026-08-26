import { describe, expect, it } from "vitest";

import { MockFoundationProvider } from "./index";

describe("mock provider adapter", () => {
  it("recovers after an injected one-shot failure", async () => {
    const provider = new MockFoundationProvider();
    const input = { requestId: "req-recovery", message: "probe" };
    provider.failNext();
    await expect(provider.execute(input)).rejects.toThrow(
      "injected provider failure",
    );
    await expect(provider.execute(input)).resolves.toEqual({
      requestId: "req-recovery",
      accepted: true,
      providerMode: "mock",
    });
  });
});
