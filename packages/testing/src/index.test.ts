import { describe, expect, it } from "vitest";

import { MockFoundationDataStore, MockMediaStore } from "./index";

describe("foundation adapter contract", () => {
  it("exercises data and media mocks deterministically", async () => {
    const data = new MockFoundationDataStore();
    const media = new MockMediaStore();

    await data.put({ id: "foundation", value: "ready" });
    await media.put({
      key: "fixture",
      bytes: new Uint8Array([7]),
      contentType: "application/octet-stream",
    });
    expect(await data.get("foundation")).toEqual({
      id: "foundation",
      value: "ready",
    });
    expect((await media.get("fixture"))?.bytes).toEqual(new Uint8Array([7]));
  });
});
