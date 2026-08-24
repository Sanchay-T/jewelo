"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { createLogger, serializeError } from "../src/lib/observability/logger";

const logger = createLogger({ service: "convex.transliterate" });

export const transliterate = action({
  args: {
    name: v.string(),
    targetLanguage: v.string(),
  },
  handler: async (_ctx, { name, targetLanguage }) => {
    const startedAt = Date.now();
    logger.info("Transliteration requested", {
      event: "transliterate.start",
      route: "gemini/transliterate",
      method: "POST",
      requestId: name,
    });

    if (!name.trim()) return "";

    const { GoogleGenAI } = await import("@google/genai");
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.error("Transliteration config missing", {
        event: "transliterate.config_missing",
        route: "gemini/transliterate",
        method: "POST",
        error: serializeError("GEMINI_API_KEY not set"),
      });
      throw new Error("GEMINI_API_KEY not set");
    }

    const ai = new GoogleGenAI({ apiKey });

    const langName = targetLanguage === "ar" ? "Arabic" : "Chinese";
    const langHint =
      targetLanguage === "ar"
        ? "Use standard Arabic script. For names, use the most common Arabic transliteration (e.g., Umayr→عمير, Mohammed→محمد, Sarah→سارة, Layla→ليلى, Omar→عمر, Fatima→فاطمة)."
        : "Use Simplified Chinese characters. For names, use the most common phonetic transliteration (e.g., Sarah→萨拉, Michael→迈克尔, David→大卫).";

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Transliterate this name to ${langName} script. ${langHint} Return ONLY the transliterated name, nothing else — no quotes, no explanation, no punctuation. Name: ${name}`,
            },
          ],
        },
      ],
    });

    const text =
      response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    logger.info("Transliteration completed", {
      event: "transliterate.success",
      route: "gemini/transliterate",
      method: "POST",
      requestId: name,
      durationMs: Date.now() - startedAt,
    });

    return text || name;
  },
});
