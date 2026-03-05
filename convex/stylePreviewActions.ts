"use node";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

const STYLE_PROMPTS: Record<string, string> = {
  minimalist:
    "A minimalist gold pendant necklace on a dark velvet display stand. Clean simple lines, no ornaments, thin delicate chain. Polished 21K yellow gold catching soft studio light. Close-up product photography, shallow depth of field, warm lighting.",
  floral:
    "A floral gold pendant necklace with intricate flower and leaf motifs. Delicate petals and vine details in polished 21K yellow gold. Displayed on cream silk fabric. Close-up product photography, warm natural lighting, shallow depth of field.",
  art_deco:
    "An Art Deco gold pendant necklace with bold geometric patterns, symmetrical angular lines, and stepped forms. Polished 21K yellow gold on black velvet. Close-up product photography, dramatic lighting with sharp shadows, 1920s inspired.",
  vintage:
    "A vintage antique-style gold pendant necklace with ornate filigree details, aged patina effect, and classical scrollwork. 21K yellow gold displayed on aged leather. Close-up product photography, warm amber lighting, nostalgic mood.",
  modern:
    "A modern contemporary gold pendant necklace with sleek abstract form, asymmetric design, and matte-polished contrast. 21K yellow gold on minimalist white marble surface. Close-up product photography, clean bright lighting, editorial style.",
  arabic:
    "An Arabic-style gold pendant necklace with intricate Islamic geometric patterns and arabesque motifs. Rich ornate 21K yellow gold with traditional Middle Eastern craftsmanship. Displayed on deep burgundy velvet. Close-up product photography, warm golden lighting.",
};

// Action: generate all 6 style preview images via Gemini
export const generateAll = action({
  args: {},
  handler: async (ctx) => {
    const { GoogleGenAI } = await import("@google/genai");
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not set");

    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-3.1-flash-image-preview";

    const styleKeys = Object.keys(STYLE_PROMPTS);
    let generated = 0;

    for (const styleFamily of styleKeys) {
      const prompt = STYLE_PROMPTS[styleFamily];
      console.log(`Generating style preview: ${styleFamily}...`);

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: [{ text: prompt }],
            config: {
              responseModalities: ["TEXT", "IMAGE"],
            },
          });

          const candidate = response.candidates?.[0];
          if (!candidate?.content?.parts) {
            console.warn(`  No parts returned for ${styleFamily}`);
            continue;
          }

          let saved = false;
          for (const part of candidate.content.parts) {
            if (part.inlineData?.data) {
              const buf = Buffer.from(part.inlineData.data, "base64");
              const blob = new Blob([buf], { type: part.inlineData.mimeType || "image/png" });
              const storageId = await ctx.storage.store(blob);
              await ctx.runMutation(internal.stylePreview.savePreview, {
                styleFamily,
                storageId,
              });
              console.log(`  OK ${styleFamily} stored`);
              generated++;
              saved = true;
              break;
            }
          }
          if (saved) break;
        } catch (err: any) {
          const is429 = err.message?.includes("429") || err.message?.includes("RESOURCE_EXHAUSTED");
          if (is429 && attempt < 2) {
            const wait = (attempt + 1) * 10;
            console.warn(`  Rate limited on ${styleFamily}, waiting ${wait}s...`);
            await new Promise((r) => setTimeout(r, wait * 1000));
          } else {
            console.error(`  FAIL ${styleFamily}:`, err.message || err);
            break;
          }
        }
      }
    }

    console.log(`Style preview generation done: ${generated}/${styleKeys.length} images`);
    return { generated, total: styleKeys.length };
  },
});
