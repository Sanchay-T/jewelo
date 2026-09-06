import { describe, expect, it } from "vitest";
import { getSnapshot, saveSnapshotRecord, RENDERER_VERSION } from "./storage";

describe("rendered piece snapshot storage", () => {
  it("reports session-only storage and retains an immutable Blob when IndexedDB is absent", async () => {
    const id = "storage-test-one";
    const blob = new Blob(["first image"], { type: "image/png" });
    const snapshot = { id, key: "piece-one", rendererVersion: RENDERER_VERSION,
      availableViews: ["Studio" as const], blobs: { Studio: blob } };
    const saved = await saveSnapshotRecord(snapshot);
    expect(saved.persistent).toBe(false);
    expect(await (await getSnapshot(id))?.blobs.Studio?.text()).toBe("first image");
    await saveSnapshotRecord({ ...snapshot, blobs: { Studio: new Blob(["replacement"]) } });
    expect(await (await getSnapshot(id))?.blobs.Studio?.text()).toBe("first image");
    await expect(saveSnapshotRecord({ ...snapshot, key: "another-piece" })).rejects.toThrow("cannot be overwritten");
    expect(await getSnapshot("missing-snapshot")).toBeUndefined();
  });
});
