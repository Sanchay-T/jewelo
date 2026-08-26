import { describe, expect, it, vi } from "vitest";
import type {
  GeneratedMedia,
  StudioGenerator,
  StudioVerifier,
} from "@jewelo/ai";
import {
  executePresentationTask,
  type PresentationRepository,
} from "./presentation";

function fixture() {
  const events: string[] = [];
  let attempt = 0;
  const task = {
    id: "task-1",
    run_id: "run-1",
    owner_principal_id: "owner-1",
    presentation_view: "studio" as const,
    status: "queued",
    attempt: 0,
    dispatch_idempotency_key: "task:run-1:studio:v1",
    prompt_release: "studio-placeholder-v1",
  };
  const run = {
    id: "run-1",
    design_id: "design-1",
    revision_id: "revision-1",
    owner_principal_id: "owner-1",
    status: "queued",
  };
  const revision = {
    id: "revision-1",
    specification: {},
    identity_anchor: {
      approvedText: "Layla",
      language: "en" as const,
      typography: "Playfair Display Italic",
      fingerprint: "fingerprint",
    },
  };
  const repository: PresentationRepository = {
    async load() {
      return { task: { ...task, attempt }, run, revision };
    },
    async reserveAttempt() {
      attempt += 1;
      return {
        attempt,
        idempotencyKey: `attempt:${attempt}`,
        duplicateComplete: false,
      };
    },
    async markTask(_id, status) {
      events.push(status);
    },
    async signedIdentityUrl() {
      return "https://signed.invalid/identity.png";
    },
    async storeProviderOutput() {
      events.push("stored");
      return {
        bucket: "generated-assets",
        path: "asset.png",
        checksum: "checksum",
      };
    },
    async complete() {
      events.push("complete");
    },
    async fail(input) {
      events.push(input.terminal ? "operator_review" : "retry");
    },
  };
  return { task, repository, events, getAttempt: () => attempt };
}

const media: GeneratedMedia = {
  provider: "mock",
  model: "mock",
  requestId: "request",
  bytes: new Uint8Array([1]),
  mimeType: "image/png",
  estimatedCostCents: 0,
};

describe("generic presentation execution", () => {
  it("stores provider output before verification and completion", async () => {
    const state = fixture();
    const generator: StudioGenerator = { generate: vi.fn(async () => media) };
    const verifier: StudioVerifier = {
      verify: vi.fn(async () => {
        state.events.push("verified");
        return { passed: true, exactText: true, identityScore: 1, notes: "ok" };
      }),
    };
    await expect(
      executePresentationTask("task-1", state.repository, generator, verifier),
    ).resolves.toEqual({ status: "ready", attempt: 1 });
    expect(state.events).toEqual([
      "generating",
      "stored",
      "verifying",
      "verified",
      "complete",
    ]);
  });

  it("allows an initial call and two retries before operator review", async () => {
    const state = fixture();
    const generator: StudioGenerator = {
      generate: vi.fn(async () => {
        throw new Error("transient");
      }),
    };
    const verifier: StudioVerifier = {
      verify: vi.fn(),
    } as unknown as StudioVerifier;
    await expect(
      executePresentationTask("task-1", state.repository, generator, verifier),
    ).rejects.toThrow("transient");
    await expect(
      executePresentationTask("task-1", state.repository, generator, verifier),
    ).rejects.toThrow("transient");
    await expect(
      executePresentationTask("task-1", state.repository, generator, verifier),
    ).resolves.toEqual({ status: "operator_review", attempt: 3 });
    expect(state.getAttempt()).toBe(3);
    expect(state.events.filter((item) => item === "retry")).toHaveLength(2);
    expect(state.events.at(-1)).toBe("operator_review");
  });

  it("does not call a provider after cancellation", async () => {
    const state = fixture();
    state.task.status = "cancelled";
    const generator: StudioGenerator = {
      generate: vi.fn(),
    } as unknown as StudioGenerator;
    const verifier: StudioVerifier = {
      verify: vi.fn(),
    } as unknown as StudioVerifier;
    await expect(
      executePresentationTask("task-1", state.repository, generator, verifier),
    ).resolves.toEqual({ status: "cancelled" });
    expect(generator.generate).not.toHaveBeenCalled();
  });
});
