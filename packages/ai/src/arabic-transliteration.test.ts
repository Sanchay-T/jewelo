import { describe, expect, it, vi } from "vitest";
import {
  OpenAIArabicNameTransliterator,
  arabicTransliterationProfile,
} from "./arabic-transliteration";

describe("OpenAIArabicNameTransliterator", () => {
  it("uses Luna through the Responses API without storing the request", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({ output_text: JSON.stringify({ arabicText: "سارة" }) }),
      );
    const adapter = new OpenAIArabicNameTransliterator(
      "test-key",
      undefined,
      fetcher,
    );

    await expect(adapter.transliterate("Sarah")).resolves.toEqual({
      arabicText: "سارة",
      model: arabicTransliterationProfile.model,
    });
    const init = fetcher.mock.calls[0]![1];
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      model: "gpt-5.6-luna",
      store: false,
      reasoning: { effort: "none" },
      max_output_tokens: 64,
    });
  });

  it("rejects non-Arabic model output", async () => {
    const adapter = new OpenAIArabicNameTransliterator(
      "test-key",
      undefined,
      async () =>
        Response.json({ output_text: JSON.stringify({ arabicText: "Sarah" }) }),
    );
    await expect(adapter.transliterate("Sarah")).rejects.toThrow(
      "invalid Arabic text",
    );
  });
});
