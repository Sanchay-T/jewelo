import { pipelineLimits, stillImageOptions } from "@jewelo/config";

export interface StudioGenerationInput {
  idempotencyKey: string;
  prompt: string;
  aspectRatio: "1:1" | "4:5" | "9:16" | "16:9";
}

export interface GeneratedMedia {
  provider: "mock" | "openai" | "fal";
  model: string;
  requestId: string;
  bytes: Uint8Array;
  mimeType: string;
  estimatedCostCents: number;
}

export interface StudioGenerator {
  generate(input: StudioGenerationInput): Promise<GeneratedMedia>;
}

export class MockStudioGenerator implements StudioGenerator {
  async generate(input: StudioGenerationInput): Promise<GeneratedMedia> {
    // Deterministic zero-cost failure hook for mock end-to-end verification.
    if (input.prompt.includes("MOCKFAIL"))
      throw new Error("mock_generation_failed");
    const transparentPng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X8tZAAAAAElFTkSuQmCC",
      "base64",
    );
    return {
      provider: "mock",
      model: "mock-openai-still-v1",
      requestId: `mock:${input.idempotencyKey}`,
      bytes: new Uint8Array(transparentPng),
      mimeType: "image/png",
      estimatedCostCents: 0,
    };
  }
}

type Fetch = typeof fetch;

/**
 * SIMPLE-1. One prompt string, no input images: `/v1/images/generations` with a
 * JSON body. Quality and canvas stay validated configuration
 * (`stillImageOptions`), never literals, because the quality label means
 * different things on different model snapshots.
 */
export class OpenAIStillAdapter implements StudioGenerator {
  constructor(
    private readonly apiKey: string,
    readonly model: string,
    private readonly estimatedCostCents: number,
    private readonly fetcher: Fetch = fetch,
  ) {}

  async generate(input: StudioGenerationInput): Promise<GeneratedMedia> {
    if (!this.model.trim()) throw new Error("still_model_required");
    const options = stillImageOptions();
    const size = options.sizeByRatio[input.aspectRatio];
    if (!size) throw new Error("unsupported_still_aspect_ratio");
    const response = await this.fetcher(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
          "Idempotency-Key": input.idempotencyKey,
        },
        body: JSON.stringify({
          model: this.model,
          prompt: input.prompt,
          size,
          quality: options.quality,
          output_format: "png",
          n: 1,
        }),
        signal: AbortSignal.timeout(pipelineLimits.providerRequestTimeoutMs),
      },
    );
    if (!response.ok)
      throw new Error(`OpenAI image generation failed:${response.status}`);
    const result = (await response.json()) as {
      id?: string;
      created?: number;
      data?: Array<{ b64_json?: string }>;
    };
    const encoded = result.data?.[0]?.b64_json;
    if (!encoded) throw new Error("OpenAI image generation omitted b64_json");
    return {
      provider: "openai",
      model: this.model,
      requestId: result.id ?? `openai:${result.created ?? "unknown"}`,
      bytes: new Uint8Array(Buffer.from(encoded, "base64")),
      mimeType: "image/png",
      estimatedCostCents: this.estimatedCostCents,
    };
  }
}

export interface MotionSubmission {
  provider: "fal";
  model: string;
  requestId: string;
  statusUrl: string;
  responseUrl: string;
  estimatedCostCents: number;
}

export class FalSeedanceVideoAdapter {
  constructor(
    private readonly apiKey: string,
    readonly previewModel: string,
    readonly finalModel: string,
    private readonly estimatedCostCents: number,
    private readonly fetcher: Fetch = fetch,
  ) {}

  async submit(input: {
    idempotencyKey: string;
    prompt: string;
    verifiedStillUrl: string;
    kind: "preview" | "final";
  }): Promise<MotionSubmission> {
    const model =
      input.kind === "preview" ? this.previewModel : this.finalModel;
    const response = await this.fetcher(`https://queue.fal.run/${model}`, {
      method: "POST",
      headers: {
        authorization: `Key ${this.apiKey}`,
        "content-type": "application/json",
        "x-idempotency-key": input.idempotencyKey,
      },
      body: JSON.stringify({
        prompt: input.prompt,
        image_url: input.verifiedStillUrl,
        duration: input.kind === "preview" ? 4 : 6,
        aspect_ratio: "9:16",
        resolution: "720p",
        generate_audio: false,
      }),
    });
    if (!response.ok)
      throw new Error(`fal video submission failed:${response.status}`);
    const result = (await response.json()) as {
      request_id?: string;
      status_url?: string;
      response_url?: string;
    };
    if (!result.request_id || !result.status_url || !result.response_url)
      throw new Error("fal video submission omitted durable polling URLs");
    return {
      provider: "fal",
      model,
      requestId: result.request_id,
      statusUrl: result.status_url,
      responseUrl: result.response_url,
      estimatedCostCents: this.estimatedCostCents,
    };
  }

  async poll(
    submission: MotionSubmission,
  ): Promise<
    | { state: "pending" }
    | { state: "failed"; error: string }
    | { state: "ready"; temporaryOutputUrl: string }
  > {
    const statusResponse = await this.fetcher(submission.statusUrl, {
      headers: { authorization: `Key ${this.apiKey}` },
    });
    if (!statusResponse.ok)
      throw new Error(`fal video status failed:${statusResponse.status}`);
    const status = (await statusResponse.json()) as {
      status?: string;
      error?: string;
    };
    if (status.status === "FAILED")
      return { state: "failed", error: status.error ?? "fal_video_failed" };
    if (status.status !== "COMPLETED") return { state: "pending" };
    const resultResponse = await this.fetcher(submission.responseUrl, {
      headers: { authorization: `Key ${this.apiKey}` },
    });
    if (!resultResponse.ok)
      throw new Error(`fal video result failed:${resultResponse.status}`);
    const result = (await resultResponse.json()) as {
      video?: { url?: string };
    };
    if (!result.video?.url)
      throw new Error("fal video result omitted video URL");
    return { state: "ready", temporaryOutputUrl: result.video.url };
  }
}
