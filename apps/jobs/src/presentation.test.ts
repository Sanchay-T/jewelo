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
  let blockedReason: string | undefined;
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
    async loadStoredOutput() {
      return undefined;
    },
    async reserveAttempt() {
      attempt += 1;
      return {
        attempt,
        idempotencyKey: `attempt:${attempt}`,
        duplicateComplete: false,
      };
    },
    async transitionTask(_id, _from, to) {
      events.push(to);
      return "applied";
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
    async blockPreSpend(input) {
      events.push("pre_spend_blocked");
      blockedReason =
        input.error instanceof Error ? input.error.message : "unknown";
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
    setAttempt: (value: number) => {
      attempt = value;
    },
    getSnapshot: () => storedSnapshot,
    getBlockedReason: () => blockedReason,
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

/**
 * Re-points the fixture at a dependent view (`on_skin`), which is the only
 * shape that reaches the style-anchor gate and the dependency gate.
 */
function asDependentView(state: ReturnType<typeof fixture>) {
  const load = state.repository.load.bind(state.repository);
  state.repository.load = async (taskId: string) => {
    const loaded = await load(taskId);
    return {
      ...loaded,
      task: {
        ...loaded.task,
        presentation_view: "on_skin" as const,
        aspect_ratio: "4:5" as const,
        dependency_task_id: "task-studio",
      },
    };
  };
  state.repository.signedDependencyStillUrl = async () => ({
    url: "https://signed.invalid/studio.png",
    assetId: "asset-studio",
  });
  return state;
}

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
    ).resolves.toEqual({ status: "ready", attempt: 1, runId: "run-1" });
    expect(state.events).toEqual([
      "snapshot",
      "generating",
      "stored",
      "verifying",
      "verified",
      "complete",
    ]);
  });

  it("resumes verification from a stored checkpoint without regenerating", async () => {
    const state = fixture();
    state.setAttempt(1);
    state.repository.loadStoredOutput = async () => ({
      media,
      stored: {
        bucket: "generated-assets",
        path: "stored-unverified.png",
        checksum: "checkpoint-checksum",
      },
    });
    const generate = vi.fn(async () => media);
    const verifier: StudioVerifier = {
      verify: vi.fn(async () => ({
        passed: true,
        exactText: true,
        exactScript: true,
        identityScore: 1,
        correctMetalAndStones: true,
        coherentPendant: true,
        exactlyTwoConnectedRings: true,
        correctShot: true,
        noAddedIdentityElements: true,
        notes: "checkpoint verified",
      })),
    };
    await expect(
      executePresentationTask(
        "task-1",
        state.repository,
        { generate },
        verifier,
      ),
    ).resolves.toEqual({ status: "ready", attempt: 1, runId: "run-1" });
    expect(generate).not.toHaveBeenCalled();
    expect(state.events).not.toContain("stored");
    expect(state.events).toContain("verifying");
    expect(state.events).toContain("complete");
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
    // The studio still deliberately receives no style anchor, so the gate is
    // only reachable from a dependent view.
    const state = fixture();
    asDependentView(state);
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
  it("blocks a dependent view once when its studio still is terminal", async () => {
    // Without this the stale sweeper re-queues the view every two minutes
    // forever: 120 outbox rows accumulated for one blocked run on 7 Sep 2026.
    const state = fixture();
    asDependentView(state);
    state.repository.signedDependencyStillUrl = async () => undefined;
    state.repository.dependencyTerminalStatus = vi.fn(async () => "blocked");
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
    expect(state.events).toContain("pre_spend_blocked");
    expect(state.repository.reserveAttempt).not.toHaveBeenCalled();
    expect(generator.generate).not.toHaveBeenCalled();
  });

  it("blocks a revision whose specification cannot compile the pinned prompt", async () => {
    // A revision written before a variable was added compiles to
    // "Missing required prompt value: metal_karat" every single time. Left to
    // throw, the task stayed `queued` at attempt 0 and the two-minute stale
    // sweeper re-dispatched it for ever: 13 failed runs on 7 Sep 2026.
    const state = fixture();
    const load = state.repository.load.bind(state.repository);
    state.repository.load = async (taskId: string) => {
      const loaded = await load(taskId);
      const { metalKarat: _dropped, ...rest } = loaded.revision
        .specification as Record<string, unknown>;
      return { ...loaded, revision: { ...loaded.revision, specification: rest } };
    };
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
    expect(state.events).toContain("pre_spend_blocked");
    expect(state.getBlockedReason()).toMatch(/^prompt_compile_failed:/);
    expect(state.repository.reserveAttempt).not.toHaveBeenCalled();
    expect(generator.generate).not.toHaveBeenCalled();
  });

  it("still defers a dependent view whose studio still can yet arrive", async () => {
    const state = fixture();
    asDependentView(state);
    state.repository.signedDependencyStillUrl = async () => undefined;
    state.repository.dependencyTerminalStatus = vi.fn(async () => undefined);
    state.repository.reserveAttempt = vi.fn();
    const generator: StudioGenerator = {
      generate: vi.fn(),
    } as unknown as StudioGenerator;
    const verifier: StudioVerifier = {
      verify: vi.fn(),
    } as unknown as StudioVerifier;
    await expect(
      executePresentationTask("task-1", state.repository, generator, verifier),
    ).resolves.toEqual({ status: "deferred" });
    expect(state.events).not.toContain("pre_spend_blocked");
    expect(state.repository.reserveAttempt).not.toHaveBeenCalled();
  });
});
