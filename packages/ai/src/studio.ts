export interface StudioGenerationInput {
  idempotencyKey: string;
  prompt: string;
  identityImageUrl: string;
  identityFingerprint: string;
  specification: Readonly<Record<string, unknown>>;
}

export interface GeneratedMedia {
  provider: "mock" | "fal";
  model: string;
  requestId: string;
  bytes: Uint8Array;
  mimeType: string;
  estimatedCostCents: number;
}

export interface VerificationDecision {
  passed: boolean;
  exactText: boolean;
  identityScore: number;
  notes: string;
}

export interface StudioGenerator {
  generate(input: StudioGenerationInput): Promise<GeneratedMedia>;
}

export interface StudioVerifier {
  verify(input: {
    approvedText: string;
    identityFingerprint: string;
    media: GeneratedMedia;
  }): Promise<VerificationDecision>;
}

export class MockStudioGenerator implements StudioGenerator {
  async generate(input: StudioGenerationInput): Promise<GeneratedMedia> {
    const transparentPng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X8tZAAAAAElFTkSuQmCC",
      "base64",
    );
    return {
      provider: "mock",
      model: "mock-studio-v1",
      requestId: `mock:${input.idempotencyKey}`,
      bytes: new Uint8Array(transparentPng),
      mimeType: "image/png",
      estimatedCostCents: 0,
    };
  }
}

export class MockStudioVerifier implements StudioVerifier {
  async verify(): Promise<VerificationDecision> {
    return {
      passed: true,
      exactText: true,
      identityScore: 1,
      notes: "Mock verification passed without a provider call.",
    };
  }
}

type Fetch = typeof fetch;

export class FalStudioAdapter implements StudioGenerator {
  constructor(
    private readonly apiKey: string,
    readonly model: string,
    private readonly fetcher: Fetch = fetch,
  ) {}

  async generate(input: StudioGenerationInput): Promise<GeneratedMedia> {
    const response = await this.fetcher(`https://queue.fal.run/${this.model}`, {
      method: "POST",
      headers: {
        authorization: `Key ${this.apiKey}`,
        "content-type": "application/json",
        "x-idempotency-key": input.idempotencyKey,
      },
      body: JSON.stringify({
        prompt: input.prompt,
        image_url: input.identityImageUrl,
        num_images: 1,
        output_format: "png",
      }),
    });
    if (!response.ok)
      throw new Error(`fal submission failed:${response.status}`);
    const submitted = (await response.json()) as {
      request_id: string;
      response_url?: string;
      status_url?: string;
    };
    const resultUrl = submitted.response_url ?? submitted.status_url;
    if (!resultUrl) throw new Error("fal response omitted result URL");
    const resultResponse = await this.fetcher(resultUrl, {
      headers: { authorization: `Key ${this.apiKey}` },
    });
    if (!resultResponse.ok)
      throw new Error(`fal result failed:${resultResponse.status}`);
    const result = (await resultResponse.json()) as {
      images?: Array<{ url: string; content_type?: string }>;
    };
    const image = result.images?.[0];
    if (!image?.url) throw new Error("fal result omitted image");
    const mediaResponse = await this.fetcher(image.url);
    if (!mediaResponse.ok)
      throw new Error(`fal media download failed:${mediaResponse.status}`);
    return {
      provider: "fal",
      model: this.model,
      requestId: submitted.request_id,
      bytes: new Uint8Array(await mediaResponse.arrayBuffer()),
      mimeType:
        image.content_type ??
        mediaResponse.headers.get("content-type") ??
        "image/png",
      estimatedCostCents: 8,
    };
  }
}

export class OpenAIStudioVerifier implements StudioVerifier {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly fetcher: Fetch = fetch,
  ) {}

  async verify(input: {
    approvedText: string;
    identityFingerprint: string;
    media: GeneratedMedia;
  }): Promise<VerificationDecision> {
    const base64 = Buffer.from(input.media.bytes).toString("base64");
    const response = await this.fetcher("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `Verify exact visible spelling '${input.approvedText}' and identity fingerprint ${input.identityFingerprint}. Return JSON with passed, exactText, identityScore, notes.`,
              },
              {
                type: "input_image",
                image_url: `data:${input.media.mimeType};base64,${base64}`,
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "jewelo_verification",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                passed: { type: "boolean" },
                exactText: { type: "boolean" },
                identityScore: { type: "number" },
                notes: { type: "string" },
              },
              required: ["passed", "exactText", "identityScore", "notes"],
            },
          },
        },
      }),
    });
    if (!response.ok)
      throw new Error(`OpenAI verification failed:${response.status}`);
    const result = (await response.json()) as { output_text?: string };
    if (!result.output_text)
      throw new Error("OpenAI verification omitted output");
    const parsed = JSON.parse(result.output_text) as VerificationDecision;
    if (
      typeof parsed.passed !== "boolean" ||
      typeof parsed.exactText !== "boolean"
    )
      throw new Error("OpenAI verification was malformed");
    return parsed;
  }
}
