import { describe, expect, it } from "vitest";
import { MockJeweloClient } from "../../lib/mock-client";
import type { LegacySpikeState } from "../../lib/legacy-direction-compat";
import type { DesignInput } from "../../lib/types";
import { deriveCommerceReadiness } from "./commerce-readiness";

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
  stoneCoverage: "full-pave",
  gemstone: "lab-diamond",
  connector: "none",
  sizeProfile: "classic",
  dimensions: { widthMm: 30, heightMm: 12, thicknessMm: 1.2 },
  chain: { style: "cable", lengthCm: 45 },
  complexity: 8,
  spellingConfirmed: true,
};

function client() {
  const state: LegacySpikeState = {
    version: 1,
    engine: "jewelo-working-app",
    principal: { id: "guest", name: "Guest", role: "customer" },
    scenario: "fast-all",
    designs: [],
  };
  return new MockJeweloClient(state, false);
}

describe("commerce readiness and handoff", () => {
  it("gates quotes on spelling, a ready asset, and an estimate", () => {
    expect(
      deriveCommerceReadiness({
        hasAsset: true,
        hasEstimate: false,
        confirmed: true,
        quoteAccepted: false,
        ordered: false,
      }),
    ).toMatchObject({ quoteReady: false, needsStudioRecovery: true });
    expect(
      deriveCommerceReadiness({
        hasAsset: true,
        hasEstimate: true,
        confirmed: true,
        quoteAccepted: false,
        ordered: false,
      }).quoteReady,
    ).toBe(true);
  });

  it("preserves locked spelling after quote acceptance and order creation", () => {
    expect(
      deriveCommerceReadiness({
        hasAsset: true,
        hasEstimate: true,
        confirmed: false,
        quoteAccepted: true,
        ordered: false,
      }),
    ).toMatchObject({ spellingLocked: true, spellingConfirmed: true });
  });

  it("keeps estimate and accepted price continuity through a fresh order", async () => {
    const api = client();
    const design = await api.createDesign(input);
    const started = await api.startRun(design.id);
    await api.advanceRun(started.runs[0]!.id, 5_000);
    const ready = api.getDesign(design.id)!;
    await expect(api.requestQuote(design.id)).rejects.toThrow(
      "Estimate required",
    );
    await api.selectDirection(design.id, ready.runs[0]!.directions[0]!.id);
    const estimated = await api.calculateEstimate(design.id);
    const estimateId = estimated.estimate!.id;
    const requested = await api.requestQuote(design.id);
    expect(requested.quote!.estimateId).toBe(estimateId);
    const issued = await api.issueQuote(design.id);
    const accepted = await api.acceptQuote(design.id);
    const ordered = await api.createOrder(design.id);
    expect(accepted.quote!.total).toBe(issued.quote!.total);
    expect(ordered.order!.acceptedTotal).toBe(accepted.quote!.total);
    expect(ordered.order!.revisionId).toBe(estimated.estimate!.revisionId);
  });
});
