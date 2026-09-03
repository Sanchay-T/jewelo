export interface StudioGenerationInput {
  idempotencyKey: string;
  prompt: string;
  /** Verified sibling still whose pendant the new scene must reproduce. */
  referenceImageUrl?: string;
  identityImageUrl: string;
  styleAnchorUrl?: string;
  inspirationImageUrl?: string;
  identityFingerprint: string;
  aspectRatio: "1:1" | "4:5" | "9:16" | "16:9";
  presentationView: string;
  specification: Readonly<Record<string, unknown>>;
}

export interface GeneratedMedia {
  provider: "mock" | "openai";
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
      ...(input.styleAnchorUrl
        ? ([[input.styleAnchorUrl, "style-anchor.png"]] as const)
        : []),
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
  read(
    media: GeneratedMedia,
    expected: string,
  ): Promise<{ text: string; matches: boolean }>;
}

/**
 * Comparison form for an approved name: NFC, no combining marks, no tatweel and
 * no whitespace, so only the letters themselves decide a mismatch.
 */
export function normalizeIdentityText(value: string): string {
  return value
    .normalize("NFD")
    .replaceAll(/\p{M}/gu, "")
    .replaceAll(/[^\p{L}]/gu, "")
    .replaceAll("ـ", "")
    .toLowerCase()
    .normalize("NFC");
}

/**
 * A serif Latin render can lose or swap a single glyph to the reader without
 * being a different name, so a five-letter-or-longer Latin name passes within
 * one Damerau-Levenshtein edit. Arabic identity stays exact.
 */
export function identityTextMatches(
  readText: string,
  approvedText: string,
): boolean {
  const read = normalizeIdentityText(readText);
  const approved = normalizeIdentityText(approvedText);
  if (read === approved) return true;
  if (approved.length < 5 || !/^[a-z]+$/.test(approved)) return false;
  return damerauLevenshteinDistance(read, approved) <= 1;
}

function damerauLevenshteinDistance(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, (_row, index) =>
    Array.from({ length: b.length + 1 }, (_cell, column) =>
      index === 0 ? column : column === 0 ? index : 0,
    ),
  );
  for (let i = 1; i <= a.length; i += 1)
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let distance = Math.min(
        rows[i - 1]![j]! + 1,
        rows[i]![j - 1]! + 1,
        rows[i - 1]![j - 1]! + cost,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        distance = Math.min(distance, rows[i - 2]![j - 2]! + 1);
      rows[i]![j] = distance;
    }
  return rows[a.length]![b.length]!;
}

export class OpenAINameReader implements StudioNameReader {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly fetcher: Fetch = fetch,
  ) {}

  async read(
    media: GeneratedMedia,
    expected: string,
  ): Promise<{ text: string; matches: boolean }> {
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
                text: `The approved name for this pendant is "${expected}". Read the name written on the pendant carefully (it may be cursive, pavé, or Arabic calligraphy). Reply with JSON {"text": "<what is written>", "matches": <true if it spells exactly the approved name, letter for letter, in the same script; otherwise false>} only.`,
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
              properties: {
                text: { type: "string" },
                matches: { type: "boolean" },
              },
              required: ["text", "matches"],
            },
          },
        },
      }),
    });
    if (!response.ok)
      throw new Error(`OpenAI name read failed:${response.status}`);
    const parsed = JSON.parse(extractResponseText(await response.json())) as {
      text?: unknown;
      matches?: unknown;
    };
    if (typeof parsed.text !== "string" || typeof parsed.matches !== "boolean")
      throw new Error("OpenAI name read was malformed");
    return { text: parsed.text, matches: parsed.matches };
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
