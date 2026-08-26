import { describe, expect, it } from "vitest";
import { MockJeweloClient, createCanonicalIdentity } from "./mock-client";
import type { DesignInput, ScenarioId } from "./types";
import type { LegacySpikeState as SpikeState } from "./legacy-direction-compat";

const scenarios: ScenarioId[] = [
  "fast-all",
  "slow-sibling",
  "partial",
  "quota-2",
  "retry",
  "resume",
  "cancel",
];

function clientFor(scenario: ScenarioId) {
  const state: SpikeState = {
    version: 1,
    engine: "jewelo-working-app",
    principal: { id: "guest", name: "Guest customer", role: "customer" },
    scenario,
    designs: [],
  };
  return new MockJeweloClient(state, false);
}

function designInput(name = "Layla"): DesignInput {
  return {
    jewelryType: "name-pendant",
    nameCount: 1,
    names: [{ approvedEnglishText: name, approvedArabicText: null }],
    arabicStyle: "none",
    layout: "single-name",
    source: "fresh",
    metalKarat: "18K",
    metalColor: "yellow",
    finish: "polished",
    stoneCoverage: "accent",
    gemstone: "natural-diamond",
    connector: "plain",
    sizeProfile: "classic",
    dimensions: { widthMm: 20, heightMm: 9, thicknessMm: 1.2 },
    chain: { style: "cable", lengthCm: 45 },
    complexity: 5,
    spellingConfirmed: true,
  };
}

async function start(client: MockJeweloClient) {
  const design = await client.createDesign(designInput());
  return (await client.startRun(design.id)).runs[0]!;
}

describe("MockJeweloClient progressive contract", () => {
  it("normalizes identity deterministically", () => {
    expect(createCanonicalIdentity("  Layla  ", "en")).toEqual(
      createCanonicalIdentity("Layla", "en"),
    );
    expect(createCanonicalIdentity("Layla", "en").fingerprint).not.toBe(
      createCanonicalIdentity("ليلى", "ar").fingerprint,
    );
  });

  it.each(scenarios)(
    "constructs the %s fixture without external state",
    async (scenario) => {
      const client = clientFor(scenario);
      const run = await start(client);
      const fingerprint =
        client.getDesign("design-1")!.revisions[0]!.identityAnchor.fingerprint;
      expect(run.directions).toHaveLength(4);
      expect(run.tasks).toHaveLength(12);
      expect(
        run.directions.every(
          (direction) => direction.identityFingerprint === fingerprint,
        ),
      ).toBe(true);
    },
  );

  it("reveals one verified product before its siblings finish", async () => {
    const client = clientFor("fast-all");
    const run = await start(client);
    expect(
      (await client.advanceRun(run.id, 360)).directions[0]!.representations
        .product.state,
    ).toBe("verifying");
    const progressive = await client.advanceRun(run.id, 160);
    expect(progressive.directions[0]!.representations.product.state).toBe(
      "ready",
    );
    expect(progressive.directions[0]!.representations.worn.state).toBe(
      "generating",
    );
    expect(
      progressive.directions
        .slice(1)
        .some(
          (direction) => direction.representations.product.state !== "ready",
        ),
    ).toBe(true);
  });

  it("lets a slow sibling finish independently", async () => {
    const client = clientFor("slow-sibling");
    const run = await start(client);
    const progressive = await client.advanceRun(run.id, 1_400);
    expect(
      progressive.directions
        .slice(0, 3)
        .every(
          (direction) => direction.representations.product.state === "ready",
        ),
    ).toBe(true);
    expect(progressive.directions[3]!.representations.product.state).toBe(
      "generating",
    );
  });

  it("preserves ready siblings when one product fails", async () => {
    const client = clientFor("partial");
    const partial = await client.advanceRun((await start(client)).id, 2_000);
    expect(partial.status).toBe("partial");
    expect(partial.directions[2]!.representations.product.state).toBe("failed");
    expect(partial.directions[0]!.representations.product.state).toBe("ready");
  });

  it("holds excess motion work in queue when capacity is two", async () => {
    const client = clientFor("quota-2");
    const limited = await client.advanceRun((await start(client)).id, 900);
    const states = limited.directions.map(
      (direction) => direction.representations.motion.state,
    );
    expect(
      states.filter((state) => state === "generating" || state === "verifying"),
    ).toHaveLength(2);
    expect(states.filter((state) => state === "queued")).toHaveLength(2);
  });

  it("retries one identity task without resetting siblings", async () => {
    const client = clientFor("retry");
    const run = await start(client);
    const retrying = await client.advanceRun(run.id, 900);
    expect(retrying.directions[2]!.representations.product.state).toBe(
      "retrying",
    );
    expect(retrying.directions[0]!.representations.product.state).toBe("ready");
    expect(
      (await client.advanceRun(run.id, 1_000)).directions[2]!.representations
        .product.state,
    ).toBe("ready");
  });

  it("reconstructs resume state and cancels only unfinished work", async () => {
    const resumedClient = clientFor("resume");
    const resumed = await start(resumedClient);
    const reconstructed = new MockJeweloClient(
      resumedClient.getState(),
      false,
    ).getDesign("design-1")!.runs[0]!;
    expect(reconstructed).toEqual(resumed);
    expect(reconstructed.elapsedMs).toBeGreaterThan(0);

    const cancelClient = clientFor("cancel");
    const cancelled = await cancelClient.advanceRun(
      (await start(cancelClient)).id,
      250,
    );
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.tasks.some((task) => task.state === "ready")).toBe(true);
    expect(cancelled.tasks.some((task) => task.state === "cancelled")).toBe(
      true,
    );
  });

  it("never assigns Layla fixtures to another canonical identity", async () => {
    const client = clientFor("fast-all");
    const design = await client.createDesign(designInput("Sarah"));
    const run = (await client.startRun(design.id)).runs[0]!;
    expect(
      run.directions
        .flatMap((direction) => Object.values(direction.representations))
        .every(
          (representation) =>
            representation.state === "unavailable" && !representation.assetUrl,
        ),
    ).toBe(true);
  });
});
