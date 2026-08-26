import { describe, expect, it } from "vitest";

import {
  MockFoundationDataStore,
  MockFoundationProvider,
  MockMediaStore,
} from "./index";

describe("foundation adapter contract", () => {
  it("exercises data, media, and provider mocks deterministically", async () => {
    const data = new MockFoundationDataStore();
    const media = new MockMediaStore();
    const provider = new MockFoundationProvider();

    await data.put({ id: "foundation", value: "ready" });
    await media.put({
      key: "fixture",
      bytes: new Uint8Array([7]),
      contentType: "application/octet-stream",
    });
    const result = await provider.execute({
      requestId: "contract-1",
      message: "exercise mocks",
    });

    expect(await data.get("foundation")).toEqual({
      id: "foundation",
      value: "ready",
    });
    expect((await media.get("fixture"))?.bytes).toEqual(new Uint8Array([7]));
    expect(result.providerMode).toBe("mock");
  });
});
