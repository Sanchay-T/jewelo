"use node";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import {
  buildOnBodyPrompt,
  buildFromScratchPrompt,
  buildReferenceEngravePrompt,
  VARIATIONS,
  type DesignInput,
} from "../src/lib/prompts/index";
import {
  compilePrompt,
  buildPromptContext,
  fetchAllActiveConfigs,
  type DesignInputForEngine,
} from "./lib/promptEngine";

// ── Model constants ──────────────────────────────────────────────────
const MODEL_PRO = "gemini-3.1-flash-image-preview"; // all calls use flash for now (testing)
const MODEL_FLASH = "gemini-3.1-flash-image-preview";

// ── Gemini API call via Vertex AI ────────────────────────────────────
async function callGemini(
  ai: any,
  prompt: string,
  referenceImages: Array<{ base64: string; mimeType: string }>,
  model: string = MODEL_FLASH,
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
    model,
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
  model: string = MODEL_FLASH,
): Promise<{ imageData: string; mimeType: string } | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const start = Date.now();
      const result = await callGemini(ai, prompt, referenceImages, model);
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

/**
 * On-body prompt: takes a product shot as reference and shows that
 * exact piece being worn on a person. Identity constraint ensures
 * the AI doesn't redesign the piece.
 */
function buildChainedOnBodyPrompt(
  design: DesignInput,
  variationIndex: number,
): string {
  const basePrompt = buildOnBodyPrompt(design, variationIndex, false);

  const metalType = design.metalType || "yellow";
  const metalLabel = metalType.replace(/_/g, " ");
  const karat = design.karat || "18K";
  const jewelryType = design.jewelryType || "pendant";
  const isNamePendant = jewelryType === "name_pendant" || jewelryType === "pendant";

  const identityDesc = isNamePendant
    ? `The first attached image shows the EXACT ${karat} ${metalLabel} gold name pendant where the name '${design.name}' forms the pendant shape -- the letters ARE the piece. You MUST use this exact piece in the on-body shot below. Do NOT redesign or create a new piece. Same letter shapes, same decorative elements, same metal, same chain. Only the context changes (now worn on a person).`
    : `The first attached image shows the EXACT ${karat} ${metalLabel} gold ${jewelryType} with the name '${design.name}' engraved on it. You MUST use this exact piece in the on-body shot below. Do NOT redesign or create a new piece. Same metal, same shape, same engraving, same stones, same chain. Only the context changes (now worn on a person).`;

  return `IDENTITY CONSTRAINT — THIS IS THE SAME PIECE:
${identityDesc}
If a second attached image shows the name rendered in text, use it as a visual guide to ensure the name remains accurate on-body.

${basePrompt}`;
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
        styleFamily: design.styleFamily,
        complexity: design.complexity,
        gemstones: design.gemstones,
        primaryGemstone: design.primaryGemstone,
        lengthMm: design.lengthMm,
        thicknessMm: design.thicknessMm,
        additionalInfo: design.additionalInfo,
      };

      const engineInput: DesignInputForEngine = {
        name: design.name,
        language: design.language,
        font: design.font,
        size: design.size,
        karat: design.karat,
        style: design.style,
        metalType: design.metalType || "yellow",
        jewelryType: design.jewelryType,
        designStyle: design.designStyle,
        styleFamily: design.styleFamily,
        complexity: design.complexity,
        gemstones: design.gemstones,
        additionalInfo: design.additionalInfo,
      };

      // Fetch all active configs from DB (once for the whole generation)
      const configs = await fetchAllActiveConfigs(ctx);

      // ══════════════════════════════════════════════════════════════
      // 4-CHAIN GENERATION PIPELINE
      //
      // Phase 1: Generate 4 independent product shots (different variations)
      // Phase 2: For each product, generate its on-body shot
      //
      // Each product[i] → on-body[i] → video[i] is an independent chain.
      // The user sees 4 different design options to choose from.
      // ══════════════════════════════════════════════════════════════

      const VARIATION_COUNT = 4;

      // ── PHASE 1: Generate 4 product shots ─────────────────────────
      console.log("--- Phase 1: Generating 4 product shots ---");

      await ctx.runMutation(internal.designs.updateStatus, {
        designId,
        status: "engraving",
        analysisStep: "Creating your designs...",
      });

      // Build 4 product prompts (one per VARIATION) — DB templates with hardcoded fallback
      const productPrompts: string[] = [];
      for (let i = 0; i < VARIATION_COUNT; i++) {
        const promptCtx = buildPromptContext(engineInput, i, configs, { hasReference });
        const slug = hasReference ? "reference" : "fromScratch";
        const fallback = () => hasReference
          ? buildReferenceEngravePrompt(designInput, i)
          : buildFromScratchPrompt(designInput, i);
        productPrompts.push(await compilePrompt(ctx, slug, promptCtx, fallback));
      }

      // Keep product base64s for Phase 2 (on-body references)
      const productBase64s: Array<string | null> = [];

      // Process product shots in batches of 2 with 5s stagger
      for (let batch = 0; batch < VARIATION_COUNT; batch += 2) {
        if (batch > 0) {
          await new Promise((r) => setTimeout(r, 5000));
        }

        const batchIndices = [batch, batch + 1].filter((i) => i < VARIATION_COUNT);
        console.log(`  Product batch: ${batchIndices.map((i) => `product[${i}]`).join(" + ")}`);

        const results = await Promise.all(
          batchIndices.map((i) =>
            callGeminiWithRetry(
              ai, productPrompts[i], referenceImages, `product[${i}]`, MODEL_PRO
            )
          )
        );

        for (let j = 0; j < results.length; j++) {
          const result = results[j];
          const idx = batchIndices[j];
          if (!result) {
            console.warn(`  SKIP product[${idx}] — no image`);
            productBase64s[idx] = null;
            continue;
          }
          try {
            const buf = Buffer.from(result.imageData, "base64");
            const blob = new Blob([buf], { type: result.mimeType });
            const sid = await ctx.storage.store(blob);
            await ctx.runMutation(internal.designs.addProductImage, { designId, storageId: sid });
            productBase64s[idx] = result.imageData;
            console.log(`  ✓ product[${idx}] stored`);
          } catch (e: any) {
            console.error(`  STORE FAIL product[${idx}]:`, e.message || e);
            productBase64s[idx] = null;
          }
        }

        await ctx.runMutation(internal.designs.updateStatus, {
          designId,
          status: "engraving",
          analysisStep: `Creating your designs... (${Math.min(batch + 2, VARIATION_COUNT)}/4 product shots)`,
        });
      }

      // ── PHASE 2: Generate on-body shots (one per successful product) ──
      console.log("--- Phase 2: Generating on-body shots ---");

      await ctx.runMutation(internal.designs.updateStatus, {
        designId,
        status: "engraving",
        analysisStep: "Creating on-body previews...",
      });

      // Build on-body calls only for products that succeeded
      const onBodyCalls: Array<{ prompt: string; refs: Array<{ base64: string; mimeType: string }>; index: number }> = [];
      for (let i = 0; i < VARIATION_COUNT; i++) {
        if (!productBase64s[i]) continue;
        const refs: Array<{ base64: string; mimeType: string }> = [
          { base64: productBase64s[i]!, mimeType: "image/png" },
        ];
        if (textReferenceBase64) {
          refs.push({ base64: textReferenceBase64, mimeType: "image/png" });
        }

        // Use DB template for chained on-body with hardcoded fallback
        const onBodyCtx = buildPromptContext(engineInput, i, configs, { hasReference });
        const onBodyPrompt = await compilePrompt(
          ctx, "chainedOnBody", onBodyCtx,
          () => buildChainedOnBodyPrompt(designInput, i),
        );

        onBodyCalls.push({
          prompt: onBodyPrompt,
          refs,
          index: i,
        });
      }

      // Process on-body shots in batches of 2 with 5s stagger
      for (let batch = 0; batch < onBodyCalls.length; batch += 2) {
        if (batch > 0) {
          await new Promise((r) => setTimeout(r, 5000));
        }

        const batchItems = onBodyCalls.slice(batch, batch + 2);
        console.log(`  On-body batch: ${batchItems.map((b) => `on-body[${b.index}]`).join(" + ")}`);

        const results = await Promise.all(
          batchItems.map((item) =>
            callGeminiWithRetry(
              ai, item.prompt, item.refs, `on-body[${item.index}]`, MODEL_PRO
            )
          )
        );

        for (let j = 0; j < results.length; j++) {
          const result = results[j];
          const item = batchItems[j];
          if (!result) {
            console.warn(`  SKIP on-body[${item.index}] — no image`);
            continue;
          }
          try {
            const buf = Buffer.from(result.imageData, "base64");
            const blob = new Blob([buf], { type: result.mimeType });
            const sid = await ctx.storage.store(blob);
            await ctx.runMutation(internal.designs.addOnBodyImage, { designId, storageId: sid });
            console.log(`  ✓ on-body[${item.index}] stored`);
          } catch (e: any) {
            console.error(`  STORE FAIL on-body[${item.index}]:`, e.message || e);
          }
        }

        await ctx.runMutation(internal.designs.updateStatus, {
          designId,
          status: "engraving",
          analysisStep: `Creating on-body previews... (${Math.min(batch + 2, onBodyCalls.length)}/${onBodyCalls.length})`,
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

      // Trigger Veo video generations for each on-body image (2s stagger)
      // Videos use on-body shots as source frames (model wearing the piece)
      const videoCount = finalDesign.onBodyImageStorageIds?.length || finalDesign.productImageStorageIds?.length || 0;
      for (let i = 0; i < videoCount; i++) {
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
