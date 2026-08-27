import { describe, expect, it } from "vitest";

import { MockMediaStore } from "./index";

describe("mock media adapter", () => {
  it("recovers after an injected one-shot failure", async () => {
    const store = new MockMediaStore();
    const object = {
      key: "foundation/fixture.txt",
      bytes: new Uint8Array([1, 2, 3]),
      contentType: "text/plain",
    };
    store.failNext();
    await expect(store.put(object)).rejects.toThrow("injected media failure");
    await store.put(object);
    await expect(store.get(object.key)).resolves.toEqual(object);
  });
});
