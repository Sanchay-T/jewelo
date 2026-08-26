export const arabicTransliterationProfile = {
  provider: "openai",
  model: "gpt-5.6-luna",
} as const;

export interface ArabicTransliterationResult {
  arabicText: string;
  model: string;
}

type Fetcher = typeof fetch;

function responseOutputText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const response = payload as {
    output_text?: unknown;
    output?: Array<{ content?: Array<{ text?: unknown }> }>;
  };
  if (typeof response.output_text === "string") return response.output_text;
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.text === "string") return content.text;
    }
  }
  return "";
}

export class OpenAIArabicNameTransliterator {
  constructor(
    private readonly apiKey: string,
    readonly model: string = arabicTransliterationProfile.model,
    private readonly fetcher: Fetcher = fetch,
  ) {}

  async transliterate(name: string): Promise<ArabicTransliterationResult> {
    const response = await this.fetcher("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        store: false,
        reasoning: { effort: "none" },
        max_output_tokens: 64,
        input: [
          {
            role: "system",
            content:
              "Transliterate personal names from Latin characters into the most common standard Arabic spelling. Preserve the name's pronunciation. Return only the requested structured result.",
          },
          {
            role: "user",
            content: `Name: ${name}`,
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "arabic_name_transliteration",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                arabicText: { type: "string", minLength: 1, maxLength: 48 },
              },
              required: ["arabicText"],
            },
          },
        },
      }),
    });
    if (!response.ok)
      throw new Error(`OpenAI transliteration failed:${response.status}`);

    const output = responseOutputText(await response.json());
    if (!output) throw new Error("OpenAI transliteration omitted output");
    const parsed = JSON.parse(output) as { arabicText?: unknown };
    const arabicText =
      typeof parsed.arabicText === "string" ? parsed.arabicText.trim() : "";
    if (
      !arabicText ||
      arabicText.length > 48 ||
      !/^[\u0600-\u06ff\s]+$/u.test(arabicText)
    )
      throw new Error("OpenAI transliteration returned invalid Arabic text");
    return { arabicText, model: this.model };
  }
}
