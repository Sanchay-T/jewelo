"use node";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import {
  buildProductShotPrompt,
  buildOnBodyPrompt,
  buildFromScratchPrompt,
  type DesignInput,
} from "../src/lib/prompts/index";



// ── Gemini API call via Vertex AI ────────────────────────────────────
async function callGemini(
  ai: any,
  prompt: string,
  referenceImages: Array<{ base64: string; mimeType: string }>,
): Promise<{ imageData: string; mimeType: string } | null> {
  const contents: any[] = [];

  // Add all reference images as inline_data parts BEFORE the text prompt
  for (const ref of referenceImages) {
    contents.push({
      inlineData: {
        mimeType: ref.mimeType,
        data: ref.base64,
      },
    });
  }

  contents.push({ text: prompt });

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-image-preview",
    contents,
    config: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  });

  const candidate = response.candidates?.[0];
  if (!candidate?.content?.parts) return null;

  for (const part of candidate.content.parts) {
    if (part.inlineData?.data) {
      return {
        imageData: part.inlineData.data,
        mimeType: part.inlineData.mimeType || "image/png",
      };
    }
  }
  return null;
}

// ── Helper: single Gemini call with retry (3x on 429, exponential backoff) ──
async function callGeminiWithRetry(
  ai: any,
  prompt: string,
  referenceImages: Array<{ base64: string; mimeType: string }>,
  label: string,
): Promise<{ imageData: string; mimeType: string } | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const start = Date.now();
      const result = await callGemini(ai, prompt, referenceImages);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);

      if (result) {
        console.log(`  OK ${label} (${elapsed}s)`);
        return result;
      } else {
        console.warn(`  EMPTY ${label} — no image returned (${elapsed}s)`);
        return null;
      }
    } catch (err: any) {
      const is429 =
        err.message?.includes("429") ||
        err.message?.includes("RESOURCE_EXHAUSTED");
      if (is429 && attempt < 2) {
        const wait = (attempt + 1) * 15;
        console.warn(
          `  RETRY ${label} — rate limited, waiting ${wait}s (attempt ${attempt + 1}/3)`,
        );
        await new Promise((r) => setTimeout(r, wait * 1000));
      } else {
        console.error(`  FAIL ${label}:`, err.message || err);
        return null;
      }
    }
  }
  return null;
}

// ── Main generation action ─────────────────────────────────────────
export const generate = internalAction({
  args: { designId: v.id("designs") },
  handler: async (ctx, { designId }) => {
    try {
      const design = await ctx.runQuery(internal.designs.getInternal, { designId });

      console.log("=== GENERATION START ===");
      console.log("Name:", design.name, "| Karat:", design.karat);
      console.log("Font:", design.font, "| Style:", design.style);
      console.log("Reference:", design.referenceUrl ? "yes" : "no");

      // Status: analyzing — also gives the client time to upload the text reference
      await ctx.runMutation(internal.designs.updateStatus, {
        designId,
        status: "analyzing",
        analysisStep: "Studying the piece...",
      });

      // Brief pause to allow the client-side text reference upload to complete
      // (the client uploads in parallel after createDesign returns)
      await new Promise((r) => setTimeout(r, 2000));

      // Re-read design to pick up textReferenceStorageId saved by the client
      const freshDesign = await ctx.runQuery(internal.designs.getInternal, { designId });

      // Get reference image as base64
      let referenceBase64: string | null = null;
      let referenceUrl = freshDesign.referenceUrl;

      if (freshDesign.referenceStorageId) {
        const url = await ctx.storage.getUrl(freshDesign.referenceStorageId);
        if (url) referenceUrl = url;
      }

      if (referenceUrl) {
        try {
          const response = await fetch(referenceUrl);
          const buffer = await response.arrayBuffer();
          referenceBase64 = Buffer.from(buffer).toString("base64");

          if (!freshDesign.referenceStorageId) {
            const blob = new Blob([buffer], { type: "image/jpeg" });
            const refStorageId = await ctx.storage.store(blob);
            await ctx.runMutation(internal.designs.storeReferenceImage, {
              designId,
              referenceStorageId: refStorageId,
            });
          }
        } catch (e) {
          console.error("Failed to download reference:", e);
        }
      }

      // Download text reference image (Canvas-rendered name PNG)
      let textReferenceBase64: string | undefined;
      if (freshDesign.textReferenceStorageId) {
        const textRefUrl = await ctx.storage.getUrl(freshDesign.textReferenceStorageId);
        if (textRefUrl) {
          try {
            const textResp = await fetch(textRefUrl);
            const textBuffer = await textResp.arrayBuffer();
            textReferenceBase64 = Buffer.from(textBuffer).toString("base64");
            console.log("Text reference image loaded:", Math.round(textBuffer.byteLength / 1024), "KB");
          } catch (e) {
            console.error("Failed to download text reference:", e);
          }
        }
      }

      // Build reference images array for callGemini
      const referenceImages: Array<{ base64: string; mimeType: string }> = [];
      if (referenceBase64) {
        referenceImages.push({ base64: referenceBase64, mimeType: "image/jpeg" });
      }
      if (textReferenceBase64) {
        referenceImages.push({ base64: textReferenceBase64, mimeType: "image/png" });
      }

      // Status: engraving
      await ctx.runMutation(internal.designs.updateStatus, {
        designId,
        status: "engraving",
        analysisStep: `Engraving '${design.name}' in ${design.karat} gold...`,
        analysisData: {
          jewelryType: design.jewelryType || "Pendant",
          metal: `${design.karat} Gold`,
          bestSpot: "AI visualized",
        },
      });

      // Initialize Gemini via Google AI Studio (higher rate limits than Vertex AI)
      const { GoogleGenAI } = await import("@google/genai");
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY not set");

      const ai = new GoogleGenAI({ apiKey });

      // ── Build DesignInput for the new prompt builders ──────────────
      const hasReference = !!(referenceBase64 || freshDesign.referenceStorageId);

      const designInput: DesignInput = {
        name: design.name,
        language: design.language as DesignInput["language"],
        font: design.font,
        size: design.size as DesignInput["size"],
        karat: design.karat as DesignInput["karat"],
        style: design.style as DesignInput["style"],
        metalType: (design.metalType || "yellow") as DesignInput["metalType"],
        jewelryType: design.jewelryType,
        designStyle: design.designStyle,
      };

      // ── 8-call pair-staggered generation: 4 product + 4 on-body ──
      // For each variation (0-3) we fire a product shot and on-body shot
      // in parallel, then wait 3s before the next pair.
      const VARIATION_COUNT = 4;

      for (let i = 0; i < VARIATION_COUNT; i++) {
        // 3-second stagger between pairs (skip for the first pair)
        if (i > 0) {
          await new Promise((r) => setTimeout(r, 3000));
        }

        // Build prompts for this variation
        const productPrompt = hasReference
          ? buildProductShotPrompt(designInput, i, true)
          : buildFromScratchPrompt(designInput, i);

        const onBodyPrompt = buildOnBodyPrompt(designInput, i, hasReference);

        console.log(`--- Variation ${i + 1}/${VARIATION_COUNT}: firing product + on-body pair ---`);

        // Fire both calls in parallel
        const [productResult, onBodyResult] = await Promise.all([
          callGeminiWithRetry(
            ai,
            productPrompt,
            referenceImages,
            `product[${i + 1}]`,
          ),
          callGeminiWithRetry(
            ai,
            onBodyPrompt,
            referenceImages,
            `on-body[${i + 1}]`,
          ),
        ]);

        // Store product image
        if (productResult) {
          try {
            const imageBuffer = Buffer.from(productResult.imageData, "base64");
            const blob = new Blob([imageBuffer], { type: productResult.mimeType });
            const storageId = await ctx.storage.store(blob);
            await ctx.runMutation(internal.designs.addProductImage, {
              designId,
              storageId,
            });
          } catch (e: any) {
            console.error(`  STORE FAIL product[${i + 1}]:`, e.message || e);
          }
        } else {
          console.warn(`  SKIP product[${i + 1}] — no image to store`);
        }

        // Store on-body image
        if (onBodyResult) {
          try {
            const imageBuffer = Buffer.from(onBodyResult.imageData, "base64");
            const blob = new Blob([imageBuffer], { type: onBodyResult.mimeType });
            const storageId = await ctx.storage.store(blob);
            await ctx.runMutation(internal.designs.addOnBodyImage, {
              designId,
              storageId,
            });
          } catch (e: any) {
            console.error(`  STORE FAIL on-body[${i + 1}]:`, e.message || e);
          }
        } else {
          console.warn(`  SKIP on-body[${i + 1}] — no image to store`);
        }

        // Update progress
        await ctx.runMutation(internal.designs.updateStatus, {
          designId,
          status: "engraving",
          analysisStep: `Crafting variation ${i + 1} of ${VARIATION_COUNT}...`,
        });
      }

      // ── Check results ─────────────────────────────────────────────
      const finalDesign = await ctx.runQuery(internal.designs.getInternal, { designId });
      const productCount = finalDesign.productImageStorageIds?.length || 0;
      const onBodyCount = finalDesign.onBodyImageStorageIds?.length || 0;

      if (productCount === 0) {
        throw new Error("No images generated");
      }

      console.log(`=== DONE: ${productCount} product + ${onBodyCount} on-body images ===`);
      await ctx.runMutation(internal.designs.completeGeneration, { designId });

      // Trigger 4 Veo video generations (2s stagger)
      for (let i = 0; i < 4; i++) {
        await ctx.scheduler.runAfter(i * 2000, internal.video.generateVideo, {
          designId,
          variationIndex: i,
        });
      }
    } catch (error: any) {
      console.error("Generation failed:", error);
      await ctx.runMutation(internal.designs.updateStatus, {
        designId,
        status: "failed",
        error: error.message || "Generation failed",
      });
    }
  },
});
