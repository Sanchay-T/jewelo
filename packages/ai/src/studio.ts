export interface StudioGenerationInput {
  idempotencyKey: string;
  prompt: string;
  /** Verified sibling still whose pendant the new scene must reproduce. */
  referenceImageUrl?: string;
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

export interface VerificationDecision {
  passed: boolean;
  exactText: boolean;
  exactScript: boolean;
  identityScore: number;
  correctMetalAndStones: boolean;
  coherentPendant: boolean;
  exactlyTwoConnectedRings: boolean;
  correctShot: boolean;
  noAddedIdentityElements: boolean;
  notes: string;
}

export interface StudioGenerator {
  generate(input: StudioGenerationInput): Promise<GeneratedMedia>;
}

export interface StudioVerifier {
  verify(input: {
    approvedText: string;
    identityFingerprint: string;
    identityImageUrl: string;
    presentationView: string;
    specification: Readonly<Record<string, unknown>>;
    media: GeneratedMedia;
  }): Promise<VerificationDecision>;
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

export class MockStudioVerifier implements StudioVerifier {
  async verify(): Promise<VerificationDecision> {
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
      notes: "Mock verification passed without a provider call.",
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
      ...(input.referenceImageUrl
        ? ([[input.referenceImageUrl, "reference.png"]] as const)
        : []),
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
        signal: AbortSignal.timeout(180_000),
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

export class OpenAIStudioVerifier implements StudioVerifier {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly fetcher: Fetch = fetch,
  ) {}

  async verify(input: {
    approvedText: string;
    identityFingerprint: string;
    identityImageUrl: string;
    presentationView: string;
    specification: Readonly<Record<string, unknown>>;
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
                text: [
                  `Compare the generated pendant with the immutable identity silhouette and approved exact text ${JSON.stringify(input.approvedText)}.`,
                  `Identity fingerprint: ${input.identityFingerprint}. Required shot: ${input.presentationView}.`,
                  `Approved configuration: ${JSON.stringify(input.specification)}.`,
                  "Fail unless spelling and script are exact, identity is preserved, metal and stones match, the pendant is coherent, exactly two connected jump rings attach the chain, the shot is correct, and there are no added letters, names, charms or duplicate pendants.",
                ].join(" "),
              },
              { type: "input_image", image_url: input.identityImageUrl },
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
            name: "caleums_image_verification",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                passed: { type: "boolean" },
                exactText: { type: "boolean" },
                exactScript: { type: "boolean" },
                identityScore: { type: "number" },
                correctMetalAndStones: { type: "boolean" },
                coherentPendant: { type: "boolean" },
                exactlyTwoConnectedRings: { type: "boolean" },
                correctShot: { type: "boolean" },
                noAddedIdentityElements: { type: "boolean" },
                notes: { type: "string" },
              },
              required: [
                "passed",
                "exactText",
                "exactScript",
                "identityScore",
                "correctMetalAndStones",
                "coherentPendant",
                "exactlyTwoConnectedRings",
                "correctShot",
                "noAddedIdentityElements",
                "notes",
              ],
            },
          },
        },
      }),
    });
    if (!response.ok)
      throw new Error(`OpenAI verification failed:${response.status}`);
    const parsed = JSON.parse(
      extractResponseText(await response.json()),
    ) as VerificationDecision;
    if (
      typeof parsed.passed !== "boolean" ||
      typeof parsed.exactText !== "boolean" ||
      typeof parsed.exactlyTwoConnectedRings !== "boolean"
    )
      throw new Error("OpenAI verification was malformed");
    return parsed;
  }
}

/** Reads the letters actually engraved on a generated pendant. */
export interface StudioNameReader {
  read(media: GeneratedMedia): Promise<string>;
}

/**
 * Comparison form for an approved name: NFC, no combining marks, no tatweel and
 * no whitespace, so only the letters themselves decide a mismatch.
 */
export function normalizeIdentityText(value: string): string {
  return value
    .normalize("NFD")
    .replaceAll(/\p{M}/gu, "")
    .replaceAll(/[\sـ]/gu, "")
    .normalize("NFC");
}

export class OpenAINameReader implements StudioNameReader {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly fetcher: Fetch = fetch,
  ) {}

  async read(media: GeneratedMedia): Promise<string> {
    const base64 = Buffer.from(media.bytes).toString("base64");
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
                text: 'Transcribe EXACTLY the Arabic (or Latin) text written on the pendant. Reply with JSON {"text": "..."} only.',
              },
              {
                type: "input_image",
                image_url: `data:${media.mimeType};base64,${base64}`,
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "caleums_pendant_text",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: { text: { type: "string" } },
              required: ["text"],
            },
          },
        },
      }),
    });
    if (!response.ok)
      throw new Error(`OpenAI name read failed:${response.status}`);
    const parsed = JSON.parse(extractResponseText(await response.json())) as {
      text?: unknown;
    };
    if (typeof parsed.text !== "string")
      throw new Error("OpenAI name read was malformed");
    return parsed.text;
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

function extractResponseText(value: unknown): string {
  const response = value as {
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };
  if (response.output_text) return response.output_text;
  for (const item of response.output ?? [])
    for (const content of item.content ?? [])
      if (content.type === "output_text" && content.text) return content.text;
  throw new Error("OpenAI verification omitted output text");
}
