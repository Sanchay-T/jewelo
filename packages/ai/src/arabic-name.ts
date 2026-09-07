// The ONLY sanctioned gpt-5.6-luna call site in Jewelo. Luna proposes an Arabic
// spelling for an English name; it never decides one. The customer confirms the
// suggestion, and `caleums-arabic-v3` owns geometry from that point on.

export interface ArabicNameSuggestion {
  arabic: string;
  confidence: "high" | "medium" | "low";
  note: string;
}

export interface ArabicNameConverter {
  suggest(englishName: string): Promise<ArabicNameSuggestion>;
}

// Script property rather than a hand-rolled range: it covers Arabic letters and
// their combining marks without silently admitting Latin or stray punctuation.
const ARABIC_LETTERS = /^[\p{Script=Arabic}\s]+$/u;
export const MAX_ENGLISH_NAME_LENGTH = 40;

export function assertConvertibleEnglishName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("english_name_required");
  if (trimmed.length > MAX_ENGLISH_NAME_LENGTH)
    throw new Error("english_name_too_long");
  if (!/^[\p{Script=Latin}\p{M}'\-. ]+$/u.test(trimmed))
    throw new Error("english_name_must_be_latin");
  return trimmed;
}

export function assertArabicSuggestion(value: string): string {
  const normalized = value.normalize("NFC").trim();
  if (!normalized) throw new Error("arabic_suggestion_empty");
  if (!ARABIC_LETTERS.test(normalized))
    throw new Error("arabic_suggestion_not_arabic");
  return normalized;
}

export class OpenAIArabicNameConverter implements ArabicNameConverter {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async suggest(englishName: string): Promise<ArabicNameSuggestion> {
    const name = assertConvertibleEnglishName(englishName);
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
                  `Give the standard Arabic spelling of the personal name ${JSON.stringify(name)}.`,
                  "Return the name only: Arabic letters, no vowel marks unless the name is conventionally written with them, no transliteration, no Latin characters, no punctuation, no explanation.",
                  "Prefer the spelling a native speaker would engrave on jewellery.",
                  "Use confidence 'low' when the name has several common spellings or is not an established Arabic name.",
                ].join(" "),
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "caleums_arabic_name",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                arabic: { type: "string" },
                confidence: { type: "string", enum: ["high", "medium", "low"] },
                note: { type: "string" },
              },
              required: ["arabic", "confidence", "note"],
            },
          },
        },
      }),
    });
    if (!response.ok)
      throw new Error(`arabic_name_suggestion_failed:${response.status}`);
    const parsed = JSON.parse(
      extractResponseText(await response.json()),
    ) as ArabicNameSuggestion;
    return {
      arabic: assertArabicSuggestion(parsed.arabic),
      confidence: parsed.confidence,
      note: String(parsed.note ?? "").slice(0, 300),
    };
  }
}

export class MockArabicNameConverter implements ArabicNameConverter {
  async suggest(englishName: string): Promise<ArabicNameSuggestion> {
    assertConvertibleEnglishName(englishName);
    return {
      arabic: "ليلى",
      confidence: "low",
      note: "Mock suggestion; no provider call was made.",
    };
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
  throw new Error("arabic_name_suggestion_omitted_output");
}
