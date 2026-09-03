import { describe, expect, it } from "vitest";
import type { TaskState } from "../../lib/types";
import {
  PRESENTATION_CARDS,
  presentationStatus,
  type PresentationCardModel,
} from "./presentation-cards";

function card(
  id: PresentationCardModel["id"],
  state: TaskState,
  overrides: Partial<PresentationCardModel> = {},
): PresentationCardModel {
  const details = PRESENTATION_CARDS.find((entry) => entry.id === id)!;
  return {
    ...details,
    state,
    alt: `${details.label} presentation`,
    canonical: false,
    ...overrides,
  };
}

const ALL_STATES: TaskState[] = [
  "queued",
  "generating",
  "verifying",
  "ready",
  "retrying",
  "failed",
  "blocked",
  "cancelled",
  "unavailable",
  "available_on_request",
];

describe("presentationStatus", () => {
  it("never shows a raw enum member or a percentage to the customer", () => {
    for (const state of ALL_STATES) {
      const status = presentationStatus(card("studio", state), []);
      expect(status.label).not.toContain("_");
      expect(status.label).not.toBe(state);
      expect(status.label).not.toMatch(/%/);
      expect(status.detail).not.toMatch(/%/);
      expect(status.detail.length).toBeGreaterThan(0);
    }
  });

  it("treats only genuine in-flight work as pending", () => {
    const pending = ALL_STATES.filter(
      (state) => presentationStatus(card("studio", state), []).pending,
    );
    expect(pending).toEqual(["queued", "generating", "verifying", "retrying"]);
  });

  it("explains that a sibling is waiting on the studio view", () => {
    const cards = [card("studio", "generating"), card("on_skin", "queued")];
    const status = presentationStatus(cards[1]!, cards);
    expect(status.label).toBe("Waiting for studio");
    expect(status.pending).toBe(true);
  });

  it("uses the plain queue label once the studio view is ready", () => {
    const cards = [
      card("studio", "ready", { assetUrl: "/fixtures/x.png" }),
      card("on_skin", "queued"),
    ];
    expect(presentationStatus(cards[1]!, cards).label).toBe("Queued");
  });

  it("names a spelling-check failure instead of showing it as blocked", () => {
    const blocked = card("studio", "blocked", {
      task: {
        id: "task-1",
        directionId: "direction-1",
        kind: "product",
        view: "studio",
        state: "blocked",
        attempt: 1,
        terminalErrorCode: "name_mismatch:layla",
      } as PresentationCardModel["task"],
    });
    const status = presentationStatus(blocked, [blocked]);
    expect(status.label).toBe("Spelling check failed");
    expect(status.detail).toMatch(/approved spelling/i);
    expect(status.pending).toBe(false);
  });

  it("tells a customer that a cancelled view was not charged", () => {
    expect(presentationStatus(card("dark", "cancelled"), []).detail).toMatch(
      /nothing further was charged/i,
    );
  });

  it("offers the on-request view as available rather than broken", () => {
    const status = presentationStatus(card("dark", "available_on_request"), []);
    expect(status.label).toBe("On request");
    expect(status.pending).toBe(false);
  });
});
