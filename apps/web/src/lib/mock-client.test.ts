import { describe, expect, it } from "vitest";
import { MockJeweloClient, createCanonicalIdentity } from "./mock-client";
import type { ScenarioId, SpikeState } from "./types";

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

function start(client: MockJeweloClient) {
  const design = client.createDesign({
    approvedText: "Layla",
    language: "en",
    source: "fresh",
    complexity: 5,
    stones: "diamond accents",
  });
  return client.startRun(design.id).runs[0]!;
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
    (scenario) => {
      const client = clientFor(scenario);
      const run = start(client);
      const fingerprint =
        client.getDesign("design-1")!.revisions[0]!.identity.fingerprint;
      expect(run.directions).toHaveLength(4);
      expect(run.tasks).toHaveLength(12);
      expect(
        run.directions.every(
          (direction) => direction.identityFingerprint === fingerprint,
        ),
      ).toBe(true);
    },
  );

  it("reveals one verified product before its siblings finish", () => {
    const client = clientFor("fast-all");
    const run = start(client);
    expect(
      client.advanceRun(run.id, 360).directions[0]!.representations.product
        .state,
    ).toBe("verifying");
    const progressive = client.advanceRun(run.id, 160);
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

  it("lets a slow sibling finish independently", () => {
    const client = clientFor("slow-sibling");
    const run = start(client);
    const progressive = client.advanceRun(run.id, 1_400);
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

  it("preserves ready siblings when one product fails", () => {
    const client = clientFor("partial");
    const partial = client.advanceRun(start(client).id, 2_000);
    expect(partial.status).toBe("partial");
    expect(partial.directions[2]!.representations.product.state).toBe("failed");
    expect(partial.directions[0]!.representations.product.state).toBe("ready");
  });

  it("holds excess motion work in queue when capacity is two", () => {
    const client = clientFor("quota-2");
    const limited = client.advanceRun(start(client).id, 900);
    const states = limited.directions.map(
      (direction) => direction.representations.motion.state,
    );
    expect(
      states.filter((state) => state === "generating" || state === "verifying"),
    ).toHaveLength(2);
    expect(states.filter((state) => state === "queued")).toHaveLength(2);
  });

  it("retries one identity task without resetting siblings", () => {
    const client = clientFor("retry");
    const run = start(client);
    const retrying = client.advanceRun(run.id, 900);
    expect(retrying.directions[2]!.representations.product.state).toBe(
      "retrying",
    );
    expect(retrying.directions[0]!.representations.product.state).toBe("ready");
    expect(
      client.advanceRun(run.id, 1_000).directions[2]!.representations.product
        .state,
    ).toBe("ready");
  });

  it("reconstructs resume state and cancels only unfinished work", () => {
    const resumedClient = clientFor("resume");
    const resumed = start(resumedClient);
    const reconstructed = new MockJeweloClient(
      resumedClient.getState(),
      false,
    ).getDesign("design-1")!.runs[0]!;
    expect(reconstructed).toEqual(resumed);
    expect(reconstructed.elapsedMs).toBeGreaterThan(0);

    const cancelClient = clientFor("cancel");
    const cancelled = cancelClient.advanceRun(start(cancelClient).id, 250);
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.tasks.some((task) => task.state === "ready")).toBe(true);
    expect(cancelled.tasks.some((task) => task.state === "cancelled")).toBe(
      true,
    );
  });

  it("never assigns Layla fixtures to another canonical identity", () => {
    const client = clientFor("fast-all");
    const design = client.createDesign({
      approvedText: "Sarah",
      language: "en",
      source: "fresh",
      complexity: 4,
      stones: "none",
    });
    const run = client.startRun(design.id).runs[0]!;
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
