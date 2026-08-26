import {
  foundationTaskInputSchema,
  foundationTaskResultSchema,
  type FoundationTaskInput,
  type FoundationTaskResult,
} from "@jewelo/contracts";

export interface FoundationProvider {
  execute(input: FoundationTaskInput): Promise<FoundationTaskResult>;
}

export class MockFoundationProvider implements FoundationProvider {
  #nextFailure: Error | undefined;

  failNext(error = new Error("injected provider failure")): void {
    this.#nextFailure = error;
  }

  async execute(input: FoundationTaskInput): Promise<FoundationTaskResult> {
    const parsed = foundationTaskInputSchema.parse(input);
    if (this.#nextFailure) {
      const failure = this.#nextFailure;
      this.#nextFailure = undefined;
      throw failure;
    }
    return foundationTaskResultSchema.parse({
      requestId: parsed.requestId,
      accepted: true,
      providerMode: "mock",
    });
  }
}

export const mediaProfiles = {
  productStill: { provider: "openai", model: "gpt-image-2-2026-04-21" },
  visualVerifier: { provider: "openai", model: "gpt-5.6-luna" },
  motionPreview: {
    provider: "fal",
    model: "bytedance/seedance-2.0/fast/image-to-video",
  },
  motionFinal: {
    provider: "fal",
    model: "bytedance/seedance-2.0/image-to-video",
  },
} as const;

export interface MediaRequest {
  idempotencyKey: string;
  inputAssetIds: string[];
  promptRelease: string;
  canonicalIdentityFingerprint: string;
}

export interface MediaResult {
  providerRequestId: string;
  temporaryOutputUrl: string;
  model: string;
}

export type ProviderExecutor = (
  request: MediaRequest,
  model: string,
) => Promise<MediaResult>;

export interface StillGenerationPort {
  generateStill(request: MediaRequest): Promise<MediaResult>;
}

export interface MotionGenerationPort {
  generatePreview(request: MediaRequest): Promise<MediaResult>;
  generateFinal(request: MediaRequest): Promise<MediaResult>;
}

export class DirectOpenAIStillAdapter implements StillGenerationPort {
  constructor(private readonly execute: ProviderExecutor) {}

  generateStill(request: MediaRequest): Promise<MediaResult> {
    return this.execute(request, mediaProfiles.productStill.model);
  }
}

export class FalSeedanceAdapter implements MotionGenerationPort {
  constructor(private readonly execute: ProviderExecutor) {}

  generatePreview(request: MediaRequest): Promise<MediaResult> {
    return this.execute(request, mediaProfiles.motionPreview.model);
  }

  generateFinal(request: MediaRequest): Promise<MediaResult> {
    return this.execute(request, mediaProfiles.motionFinal.model);
  }
}
