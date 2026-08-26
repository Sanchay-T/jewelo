import { describe, expect, it, vi } from "vitest";
import type {
  GeneratedMedia,
  PromptVariableSnapshot,
  StudioGenerator,
  StudioVerifier,
} from "@jewelo/ai";
import { BASELINE_PROMPT_TEMPLATES } from "@jewelo/ai";
import {
  executePresentationTask,
  type PresentationRepository,
} from "./presentation";

function fixture() {
  const events: string[] = [];
  let attempt = 0;
  let storedSnapshot:
    | {
        task_id: string;
        prompt_release_id: string;
        variable_snapshot: PromptVariableSnapshot;
        compiled_prompt: string;
        compiler_version: string;
        sha256: string;
      }
    | undefined;
  const task = {
    id: "task-1",
    run_id: "run-1",
    owner_principal_id: "owner-1",
    presentation_view: "studio" as const,
    status: "queued",
    attempt: 0,
    dispatch_idempotency_key: "task:run-1:studio:release:release-a",
    prompt_release: "image.studio@v1",
    prompt_release_id: "release-a",
    style_anchor_release_id: "style-a",
    pipeline_release: "caleums-final-media-v1",
    aspect_ratio: "1:1" as const,
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
    specification: {
      arabicStyle: "none",
      layout: "single-name",
      metalKarat: "18K",
      metalColor: "yellow",
      finish: "polished",
      stoneCoverage: "partial-pave",
      gemstone: "lab-diamond",
      sizeProfile: "classic",
      dimensions: { widthMm: 34, heightMm: 12, thicknessMm: 1.2 },
      chain: { style: "cable", lengthCm: 45 },
    },
    identity_anchor: {
      approvedText: "Layla",
      language: "en" as const,
      typography: "Playfair Display Italic",
      fingerprint: "fingerprint",
    },
  };
  const release = {
    id: "release-a",
    profile: "image.studio" as const,
    template: BASELINE_PROMPT_TEMPLATES["image.studio"],
  };
  const repository: PresentationRepository = {
    async load() {
      return {
        task: { ...task, attempt },
        run,
        revision,
        release,
        snapshot: storedSnapshot,
      };
    },
    async materializePromptSnapshot(input) {
      events.push("snapshot");
      storedSnapshot ??= {
        task_id: input.task.id,
        prompt_release_id: input.release.id,
        variable_snapshot: input.variables,
        compiled_prompt: input.compiledPrompt,
        compiler_version: input.compilerVersion,
        sha256: input.sha256,
      };
      return storedSnapshot;
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
      return {
        url: "https://signed.invalid/identity.png",
        fingerprint: "fingerprint",
        artifactId: "identity-artifact",
      };
    },
    async signedStyleAnchorUrl() {
      return "https://signed.invalid/style.png";
    },
    async signedInspirationUrl() {
      return undefined;
    },
    async blockPreSpend() {
      events.push("pre_spend_blocked");
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
  return {
    task,
    repository,
    events,
    getAttempt: () => attempt,
    getSnapshot: () => storedSnapshot,
  };
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
        return {
          passed: true,
          exactText: true,
          exactScript: true,
          identityScore: 1,
          correctMetalAndStones: true,
          coherentPendant: true,
          exactlyTwoConnectedRings: true,
          correctShot: true,
          noAddedIdentityElements: true,
          notes: "ok",
        };
      }),
    };
    await expect(
      executePresentationTask("task-1", state.repository, generator, verifier),
    ).resolves.toEqual({ status: "ready", attempt: 1 });
    expect(state.events).toEqual([
      "snapshot",
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
    expect(state.events.filter((item) => item === "snapshot")).toHaveLength(1);
    expect(state.events.at(-1)).toBe("operator_review");
  });

  it("pins release A through retries even after the live template becomes B", async () => {
    const state = fixture();
    const prompts: string[] = [];
    const generator: StudioGenerator = {
      generate: vi.fn(async (input) => {
        prompts.push(input.prompt);
        throw new Error("retry-me");
      }),
    };
    const verifier = { verify: vi.fn() } as unknown as StudioVerifier;
    await expect(
      executePresentationTask("task-1", state.repository, generator, verifier),
    ).rejects.toThrow("retry-me");
    const pinned = state.getSnapshot()?.compiled_prompt;
    await expect(
      executePresentationTask("task-1", state.repository, generator, verifier),
    ).rejects.toThrow("retry-me");
    expect(prompts).toEqual([pinned, pinned]);
    expect(pinned).toContain("Layla");
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

  it("blocks a missing exact style anchor before reserving or calling a provider", async () => {
    const state = fixture();
    state.repository.signedStyleAnchorUrl = vi.fn(async () => {
      throw new Error(
        "style_anchor_missing:ddd3862a-05cb-4b95-9b6b-aa8d6453293b",
      );
    });
    state.repository.reserveAttempt = vi.fn();
    const generator: StudioGenerator = {
      generate: vi.fn(),
    } as unknown as StudioGenerator;
    const verifier: StudioVerifier = {
      verify: vi.fn(),
    } as unknown as StudioVerifier;
    await expect(
      executePresentationTask("task-1", state.repository, generator, verifier),
    ).resolves.toEqual({ status: "operator_review", attempt: 0 });
    expect(state.repository.reserveAttempt).not.toHaveBeenCalled();
    expect(generator.generate).not.toHaveBeenCalled();
    expect(state.events).toContain("pre_spend_blocked");
  });
});
