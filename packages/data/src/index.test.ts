import { describe, expect, it } from "vitest";

import { MockFoundationDataStore } from "./index";

describe("mock data adapter", () => {
  it("recovers after an injected one-shot failure", async () => {
    const store = new MockFoundationDataStore();
    store.failNext();
    await expect(store.put({ id: "record-1", value: "ready" })).rejects.toThrow(
      "injected data failure",
    );
    await store.put({ id: "record-1", value: "ready" });
    await expect(store.get("record-1")).resolves.toEqual({
      id: "record-1",
      value: "ready",
    });
  });
});
