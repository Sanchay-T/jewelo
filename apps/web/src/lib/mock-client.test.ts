import { describe, expect, it } from "vitest";
import { MockJeweloClient } from "./mock-client";
import type { ScenarioId, SpikeState } from "./types";

function clientFor(scenario: ScenarioId = "partial") {
  const state: SpikeState = {
    version: 1,
    principal: { id: "test", name: "Test Customer", role: "customer" },
    scenario,
    designs: [],
  };
  return new MockJeweloClient(state);
}

function create(client: MockJeweloClient) {
  return client.createDesign({ approvedText: "Layla", language: "en", source: "fresh", complexity: 5, stones: "diamond accents" });
}

describe("MockJeweloClient invariants", () => {
  it("preserves earlier runs and creates immutable refinements", () => {
    const client = clientFor();
    const design = create(client);
    client.startRun(design.id);
    client.refineDesign(design.id, "Make the frame quieter");
    client.startRun(design.id);
    const result = client.getDesign(design.id)!;
    expect(result.runs).toHaveLength(2);
    expect(result.revisions).toHaveLength(2);
    expect(result.revisions[0].immutable).toBe(true);
    expect(result.runs[0].revisionId).not.toBe(result.runs[1].revisionId);
  });

  it("retries only one failed task and keeps ready siblings unchanged", () => {
    const client = clientFor("retry-success");
    const design = create(client);
    const withRun = client.startRun(design.id);
    const run = withRun.runs[0];
    const failed = run.tasks.find((task) => task.state === "failed")!;
    const readyBefore = run.tasks.filter((task) => task.state === "ready").map((task) => `${task.id}:${task.attempt}:${task.state}`);
    client.retryTask(design.id, failed.id);
    const after = client.getDesign(design.id)!.runs[0];
    expect(after.tasks.find((task) => task.id === failed.id)?.state).toBe("ready");
    expect(after.tasks.filter((task) => readyBefore.some((value) => value.startsWith(`${task.id}:`))).map((task) => `${task.id}:${task.attempt}:${task.state}`)).toEqual(readyBefore);
  });

  it("keeps identity and complete lineage across linked representations", () => {
    const client = clientFor("happy");
    const design = create(client);
    const result = client.startRun(design.id);
    const revision = result.revisions[0];
    for (const direction of result.runs[0].directions) {
      expect(direction.identityFingerprint).toBe(revision.identity.fingerprint);
      for (const representation of Object.values(direction.representations)) {
        expect(representation.lineage.revisionId).toBe(revision.id);
        expect(representation.lineage.directionId).toBe(direction.id);
        expect(representation.lineage.inputAssets).toContain(`canonical://${revision.identity.fingerprint}`);
        expect(representation.lineage.verificationResult).toBeDefined();
      }
    }
  });

  it("blocks quote acceptance after expiry", () => {
    const client = clientFor("quote-expired");
    const design = create(client);
    const run = client.startRun(design.id).runs[0];
    client.selectDirection(design.id, run.directions[0].id);
    client.calculateEstimate(design.id);
    client.requestQuote(design.id);
    client.issueQuote(design.id);
    expect(client.getDesign(design.id)?.quote?.status).toBe("expired");
    expect(() => client.acceptQuote(design.id)).toThrow("Only a current issued quote can be accepted");
  });

  it("preserves commercial snapshot assumptions and timestamps", () => {
    const client = clientFor("happy");
    const design = create(client);
    const run = client.startRun(design.id).runs[0];
    client.selectDirection(design.id, run.directions[0].id);
    client.calculateEstimate(design.id);
    client.requestQuote(design.id);
    const quote = client.getDesign(design.id)!.quote!;
    expect(quote.snapshot.assumptions.length).toBeGreaterThan(0);
    expect(quote.snapshot.goldPriceTimestamp).toBeTruthy();
    expect(quote.snapshot.directionId).toBe(run.directions[0].id);
  });

  it("locks an order to the accepted quote snapshot and audits state changes", () => {
    const client = clientFor("happy");
    const design = create(client);
    const run = client.startRun(design.id).runs[0];
    client.selectDirection(design.id, run.directions[0].id);
    client.calculateEstimate(design.id);
    client.requestQuote(design.id);
    client.issueQuote(design.id);
    expect(() => client.selectDirection(design.id, run.directions[1].id)).toThrow(/quoted direction is locked/i);
    client.acceptQuote(design.id);
    client.createOrder(design.id);
    const result = client.getDesign(design.id)!;
    expect(result.order?.directionId).toBe(result.quote?.snapshot.directionId);
    expect(client.getAudit(design.id).map((event) => event.action)).toContain("Order created");
  });

  it("never verifies Layla media against a different canonical identity", () => {
    const client = clientFor("happy");
    const design = client.createDesign({ approvedText: "Sarah", language: "en", source: "fresh", complexity: 5, stones: "none" });
    const result = client.startRun(design.id);
    for (const representation of result.runs[0].directions.flatMap((item) => Object.values(item.representations))) {
      expect(representation.state).toBe("unavailable");
      expect(representation.assetUrl).toBeUndefined();
      expect(representation.lineage.verificationResult.exactText).toBe(false);
    }
  });
});
