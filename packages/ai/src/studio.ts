export interface StudioGenerationInput {
  idempotencyKey: string;
  prompt: string;
  identityImageUrl: string;
  styleAnchorUrl: string;
  inspirationImageUrl?: string;
  identityFingerprint: string;
  aspectRatio: "1:1" | "4:5" | "9:16" | "16:9";
  presentationView: string;
  specification: Readonly<Record<string, unknown>>;
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

export class OpenAIStillAdapter implements StudioGenerator {
  constructor(
    private readonly apiKey: string,
    readonly model: string,
    private readonly estimatedCostCents: number,
    private readonly fetcher: Fetch = fetch,
  ) {}

  async generate(input: StudioGenerationInput): Promise<GeneratedMedia> {
    const form = new FormData();
    form.set("model", this.model);
    form.set("prompt", input.prompt);
    form.set("size", OPENAI_SIZE_BY_RATIO[input.aspectRatio]);
    form.set("quality", "high");
    form.set("output_format", "png");
    const references = [
      [input.identityImageUrl, "identity.png"],
      [input.styleAnchorUrl, "style-anchor.png"],
      ...(input.inspirationImageUrl
        ? ([[input.inspirationImageUrl, "inspiration.png"]] as const)
        : []),
    ] as const;
    for (const [url, fileName] of references) {
      const response = await this.fetcher(url);
      if (!response.ok)
        throw new Error(`OpenAI input download failed:${response.status}`);
      form.append(
        "image[]",
        new Blob([await response.arrayBuffer()], {
          type: response.headers.get("content-type") ?? "image/png",
        }),
        fileName,
      );
    }
    const response = await this.fetcher(
      "https://api.openai.com/v1/images/edits",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "Idempotency-Key": input.idempotencyKey,
        },
        body: form,
      },
    );
    if (!response.ok)
      throw new Error(`OpenAI image edit failed:${response.status}`);
    const result = (await response.json()) as {
      id?: string;
      created?: number;
      data?: Array<{ b64_json?: string }>;
    };
    const encoded = result.data?.[0]?.b64_json;
    if (!encoded) throw new Error("OpenAI image edit omitted b64_json");
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

const OPENAI_SIZE_BY_RATIO = {
  "1:1": "1024x1024",
  "4:5": "1024x1280",
  "9:16": "1024x1824",
  "16:9": "1536x864",
} as const;

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
