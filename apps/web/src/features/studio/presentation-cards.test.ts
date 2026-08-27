import { describe, expect, it } from "vitest";
import { MockJeweloClient } from "../../lib/mock-client";
import type { LegacySpikeState } from "../../lib/legacy-direction-compat";
import type { DesignInput } from "../../lib/types";
import {
  adaptPresentationCards,
  applyPresentationReplay,
  applySamplePresentationAssets,
  isPrimaryReady,
} from "./presentation-cards";

const input: DesignInput = {
  jewelryType: "name-pendant",
  nameCount: 1,
  names: [{ approvedEnglishText: "Layla", approvedArabicText: null }],
  arabicStyle: "none",
  layout: "single-name",
  source: "fresh",
  metalKarat: "18K",
  metalColor: "yellow",
  finish: "polished",
  stoneCoverage: "accent",
  gemstone: "lab-diamond",
  connector: "none",
  sizeProfile: "classic",
  dimensions: { widthMm: 30, heightMm: 12, thicknessMm: 1.2 },
  chain: { style: "cable", lengthCm: 45 },
  complexity: 5,
  spellingConfirmed: true,
};

async function readyRun() {
  const state: LegacySpikeState = {
    version: 1,
    engine: "jewelo-working-app",
    principal: { id: "guest", name: "Guest", role: "customer" },
    scenario: "fast-all",
    designs: [],
  };
  const client = new MockJeweloClient(state, false);
  const design = await client.createDesign(input);
  const started = await client.startRun(design.id);
  const run = started.runs.at(-1)!;
  await client.advanceRun(run.id, 5_000);
  return client.getDesign(design.id)!.runs.at(-1)!;
}

describe("presentation card adapter", () => {
  it("renders four simultaneous presentation views", async () => {
    const cards = adaptPresentationCards(await readyRun());
    expect(cards.map((card) => card.label)).toEqual([
      "Studio",
      "On model",
      "Close up",
      "Dark mood",
    ]);
    expect(cards.every((card) => card.state === "ready")).toBe(true);
    expect(isPrimaryReady(cards)).toBe(true);
  });

  it("resolves the refreshed representation when projected assets are stale", async () => {
    const run = await readyRun();
    const studioTask = run.tasks.find((task) => task.view === "studio")!;
    const projected = run.assets.find(
      (asset) => asset.lineage.taskId === studioTask.id,
    )!;
    projected.state = "verifying";
    projected.assetUrl = undefined;
    const studio = adaptPresentationCards(run)[0]!;
    expect(studio.state).toBe("ready");
    expect(studio.assetUrl).toBe(
      run.directions[0]!.representations.product.assetUrl,
    );
    expect(studio.canonical).toBe(false);
  });

  it("preserves mixed failure, blocked, and local cancellation states", async () => {
    const run = await readyRun();
    const initialCards = adaptPresentationCards(run);
    const studioTask = initialCards[0]!.task!;
    const onModelTask = initialCards[1]!.task!;
    const closeTask = initialCards[2]!.task!;
    studioTask.state = "failed";
    onModelTask.state = "blocked";
    const cards = adaptPresentationCards(run, new Set([closeTask.id]));
    expect(cards.map((card) => card.state).slice(0, 3)).toEqual([
      "failed",
      "blocked",
      "cancelled",
    ]);
    expect(isPrimaryReady(cards)).toBe(false);
  });

  it("ignores future extra tasks without redesigning the four-card set", async () => {
    const run = await readyRun();
    run.tasks.push({
      id: "future-motion-task",
      view: "motion",
      state: "queued",
      attempt: 1,
      directionId: run.directions[0]!.id,
      kind: "motion",
    });
    expect(adaptPresentationCards(run)).toHaveLength(4);
    expect(run.tasks).toHaveLength(13);
  });

  it("reveals replay assets independently in a stable four-card sequence", async () => {
    const cards = adaptPresentationCards(await readyRun());
    expect(applyPresentationReplay(cards, 0).map((card) => card.state)).toEqual(
      ["generating", "queued", "queued", "queued"],
    );
    expect(applyPresentationReplay(cards, 1).map((card) => card.state)).toEqual(
      ["verifying", "queued", "queued", "queued"],
    );
    expect(applyPresentationReplay(cards, 4).map((card) => card.state)).toEqual(
      ["ready", "ready", "generating", "queued"],
    );
    expect(
      applyPresentationReplay(cards, 8).every((card) => card.state === "ready"),
    ).toBe(true);
  });

  it("fills missing provider assets only for the explicit sample journey", () => {
    const cards = applySamplePresentationAssets(
      adaptPresentationCards(undefined),
      true,
    );
    expect(cards).toHaveLength(4);
    expect(cards.every((card) => card.state === "ready" && card.assetUrl)).toBe(
      true,
    );
    expect(cards[3]!.assetUrl).toBe("/fixtures/layla-direction-4-product.png");
    expect(cards[0]!.alt).toContain("sample presentation fixture");
  });
});
