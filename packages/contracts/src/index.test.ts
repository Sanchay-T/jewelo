import { describe, expect, it } from "vitest";

import { foundationTaskInputSchema } from "./index";

describe("foundation task contract", () => {
  it("accepts a bounded typed payload", () => {
    expect(
      foundationTaskInputSchema.parse({
        requestId: "req_001",
        message: "health check",
      }),
    ).toEqual({ requestId: "req_001", message: "health check" });
  });

  it("rejects an empty request id", () => {
    expect(() =>
      foundationTaskInputSchema.parse({ requestId: "", message: "health" }),
    ).toThrow();
  });
});
