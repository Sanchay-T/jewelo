"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { createLogger, serializeError } from "../src/lib/observability/logger";

const logger = createLogger({ service: "convex.stylePreview" });

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

// Action: generate a single style preview image via Gemini
export const generateOne = action({
  args: { styleFamily: v.string() },
  handler: async (ctx, { styleFamily }) => {
    const startedAt = Date.now();
    logger.info("Style preview generation started", {
      event: "stylePreview.generateOne.start",
      route: "gemini/stylePreview/generateOne",
      method: "POST",
      statusCode: 200,
    });

    const { GoogleGenAI } = await import("@google/genai");
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not set");

    const prompt = STYLE_PROMPTS[styleFamily];
    if (!prompt) throw new Error(`Unknown style: ${styleFamily}`);

    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-3.1-flash-image-preview";

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ text: prompt }],
          config: { responseModalities: ["TEXT", "IMAGE"] },
        });

        const candidate = response.candidates?.[0];
        if (!candidate?.content?.parts) {
          throw new Error("No parts returned");
        }

        for (const part of candidate.content.parts) {
          if (part.inlineData?.data) {
            const buf = Buffer.from(part.inlineData.data, "base64");
            const blob = new Blob([buf], { type: part.inlineData.mimeType || "image/png" });
            const storageId = await ctx.storage.store(blob);
            await ctx.runMutation(internal.stylePreview.savePreview, {
              styleFamily,
              storageId,
            });
            return { success: true, styleFamily };
          }
        }
        throw new Error("No image data in response");
      } catch (err: any) {
        const is429 = err.message?.includes("429") || err.message?.includes("RESOURCE_EXHAUSTED");
        if (is429 && attempt < 2) {
          await new Promise((r) => setTimeout(r, (attempt + 1) * 10 * 1000));
        } else {
          logger.error("Style preview generation failed", {
            event: "stylePreview.generateOne.fail",
            route: "gemini/stylePreview/generateOne",
            method: "POST",
            error: serializeError(err),
            durationMs: Date.now() - startedAt,
          });
          throw err;
        }
      }
    }
    logger.info("Style preview generation completed", {
      event: "stylePreview.generateOne.success",
      route: "gemini/stylePreview/generateOne",
      method: "POST",
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      requestId: styleFamily,
    });
    throw new Error("All attempts failed");
  },
});

// Action: generate all 6 style preview images via Gemini
export const generateAll = action({
  args: {},
  handler: async (ctx) => {
    const startedAt = Date.now();
    logger.info("Batch style preview generation started", {
      event: "stylePreview.generateAll.start",
      route: "gemini/stylePreview/generateAll",
      method: "POST",
      statusCode: 200,
    });

    const { GoogleGenAI } = await import("@google/genai");
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not set");

    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-3.1-flash-image-preview";

    const styleKeys = Object.keys(STYLE_PROMPTS);
    let generated = 0;

    for (const styleFamily of styleKeys) {
        const prompt = STYLE_PROMPTS[styleFamily];
      logger.info("Generating style prompt", {
        event: "stylePreview.generateAll.iteration",
        route: "gemini/stylePreview/generateAll",
        method: "POST",
        requestId: styleFamily,
      });

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
            logger.warn("Rate limited while generating style preview", {
              event: "stylePreview.generateAll.rate_limited",
              route: "gemini/stylePreview/generateAll",
              method: "POST",
              requestId: styleFamily,
              error: serializeError(`429/RESOURCE_EXHAUSTED`),
              durationMs: wait * 1000,
            });
            await new Promise((r) => setTimeout(r, wait * 1000));
          } else {
            logger.error("Style preview generation failed", {
              event: "stylePreview.generateAll.fail",
              route: "gemini/stylePreview/generateAll",
              method: "POST",
              requestId: styleFamily,
              error: serializeError(err),
              durationMs: Date.now() - startedAt,
            });
            break;
          }
        }
      }
    }

    logger.info("Batch style preview generation done", {
      event: "stylePreview.generateAll.done",
      route: "gemini/stylePreview/generateAll",
      method: "POST",
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      generated,
      total: styleKeys.length,
    });
    return { generated, total: styleKeys.length };
  },
});
