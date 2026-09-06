import { describe, it, expect } from "vitest";
import {
  initialState,
  emptyDraft,
  signature,
  validate,
  mockGeneration,
  canAdd,
  putInBag,
  restore,
  sampleSource,
  beginBagEdit,
  cancelBagEdit,
} from "./model";
const draft = { ...emptyDraft, name: "Asma" };
describe("local atelier", () => {
  it("keeps studio samples consistent with the saved design", () => {
    expect(sampleSource("Studio", draft)).toBe("/atelier/v1/asma-studio.png");
    expect(sampleSource("Studio", { ...draft, script: "Arabic" })).toBe(
      "/atelier/v1/asma-arabic.png",
    );
    expect(sampleSource("Studio", { ...draft, twoNames: true })).toBe(
      "/atelier/v1/asma-fatima.png",
    );
    expect(sampleSource("Dark", draft)).toBe("/atelier/v1/asma-dark.png");
  });
  it("uses the approved defaults and validates spelling", () => {
    expect(emptyDraft).toMatchObject({
      twoNames: false,
      metal: "Yellow gold",
      coverage: "No stones",
      size: 32,
      chain: "Cable",
      length: 45,
    });
    expect(validate(emptyDraft).name).toBeTruthy();
    expect(validate({ ...draft, twoNames: true }).secondName).toBeTruthy();
    expect(validate({ ...draft, script: "Arabic" }).name).toBeTruthy();
    expect(validate({ ...draft, name: "أسماء", script: "Arabic" })).toEqual({});
  });
  it("signatures ignore hidden fields but include every effective specification", () => {
    expect(signature(draft)).toBe(
      signature({ ...draft, secondName: "Hidden", gem: "Ruby" }),
    );
    for (const changed of [
      { name: "Fatima" },
      { size: 22 },
      { engraving: "Hi" },
      { requests: "Matte" },
      { twoNames: true, secondName: "Fatima" },
      { coverage: "Accent", gem: "Ruby" },
    ])
      expect(signature({ ...draft, ...changed } as typeof draft)).not.toBe(
        signature(draft),
      );
  });
  it("recovers pending work, preserves siblings and independently retries failures", () => {
    const run = mockGeneration.start(draft, "r", 0, "Dark");
    const saved = restore(
      JSON.stringify({
        ...initialState(),
        draft,
        runs: [run],
        stage: "review",
      }),
    );
    const settled = mockGeneration.settle(saved.runs[0]!, 3000);
    expect(settled.slots.map((s) => s.status)).toEqual([
      "ready",
      "ready",
      "ready",
      "failed",
    ]);
    const retry = mockGeneration.retry(settled, "Dark", 4000);
    expect(retry.slots[0]).toEqual(settled.slots[0]);
    expect(mockGeneration.settle(retry, 6000).slots[3]?.status).toBe("ready");
    expect(settled.slots[3]?.status).toBe("failed");
  });
  it("requires current success and explicit spelling before bag, and snapshots are isolated", () => {
    const run = mockGeneration.settle(
      mockGeneration.start(draft, "r", 0, "Dark"),
      3000,
    );
    const state = {
      ...initialState(),
      draft,
      runs: [run],
      sampleFocus: "metal" as const,
    };
    expect(canAdd(draft, run, false)).toBe(false);
    expect(canAdd({ ...draft, name: "Fatima" }, run, true)).toBe(false);
    const added = putInBag(state, true, "one", "white");
    expect(restore(JSON.stringify(added)).bag[0]?.sampleId).toBe("white");
    expect(restore(JSON.stringify(added)).sampleFocus).toBe("metal");
    expect(restore(JSON.stringify(added)).bag[0]?.sampleFocus).toBe("metal");
    expect(added.bag).toHaveLength(1);
    added.draft.name = "Edited";
    expect(added.bag[0]?.draft.name).toBe("Asma");
    expect(
      putInBag(
        {
          ...added,
          editing: "one",
          draft: { ...draft },
          bag: added.bag.map((b) => ({ ...b, quantity: 3 })),
        },
        true,
        "new",
      ).bag[0]?.quantity,
    ).toBe(3);
  });
  it("rejects corrupt or incompatible saved state", () => {
    expect(() => restore("{")).toThrow();
    expect(() =>
      restore(JSON.stringify({ ...initialState(), version: 2 })),
    ).toThrow();
    expect(() =>
      restore(
        JSON.stringify({ ...initialState(), draft: { ...draft, size: 30 } }),
      ),
    ).toThrow();
    expect(restore(null)).toEqual(initialState());
  });
});

it("restores an unfinished draft after cancelling bag editing, even after reload", () => {
  const draft = { ...emptyDraft, name: "Asma" };
  const run = mockGeneration.settle(
    mockGeneration.start(draft, "saved", 0),
    5000,
  );
  const saved = putInBag(
    { ...initialState(), draft, runs: [run] },
    true,
    "piece",
  );
  const working = {
    ...saved,
    draft: {
      ...emptyDraft,
      name: "Noor",
      construction: "Origami ribbon" as const,
    },
    runs: [],
    stage: "design" as const,
  };
  const editing = beginBagEdit(working, "piece");
  expect(editing.draft.name).toBe("Asma");
  const returned = cancelBagEdit(restore(JSON.stringify(editing)));
  expect(returned.draft).toEqual(working.draft);
  expect(returned.bag).toEqual(working.bag);
  expect(returned.editing).toBeNull();
});

it("recovers renderer snapshot metadata alongside legacy bag pieces and rejects corrupt descriptors", () => {
  const run = mockGeneration.settle(
    mockGeneration.start(draft, "snapshot-run", 0),
    5000,
  );
  const state = putInBag(
    { ...initialState(), draft, runs: [run] },
    true,
    "snapshot-piece",
  );
  const snapshot = {
    id: "immutable-image",
    key: "assembly",
    rendererVersion: "procedural-v1",
    availableViews: ["Studio"],
    persistent: true,
  };
  const saved = {
    ...state,
    bag: [
      { ...state.bag[0], snapshot },
      { ...state.bag[0], id: "legacy", sampleId: "old-photo" },
    ],
  };
  const recovered = restore(JSON.stringify(saved));
  expect(recovered.bag[0]?.snapshot).toEqual(snapshot);
  expect(recovered.bag[1]?.sampleId).toBe("old-photo");
  expect(recovered.bag[1]?.snapshot).toBeUndefined();
  expect(() =>
    restore(
      JSON.stringify({
        ...saved,
        bag: [
          {
            ...saved.bag[0],
            snapshot: { ...snapshot, availableViews: ["Unknown"] },
          },
        ],
      }),
    ),
  ).toThrow("Invalid saved design");
});
