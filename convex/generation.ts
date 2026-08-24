"use node";
import { internalAction } from "./_generated/server";
import type { DataModel } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { GenericActionCtx } from "convex/server";
import {
  buildOnBodyPrompt,
  buildFromScratchPrompt,
  buildReferenceEngravePrompt,
  type DesignInput,
} from "../src/lib/prompts/index";
import {
  buildPromptContext,
  buildPromptSnapshotFromBundle,
  fetchResolvedPromptBundleForExecution,
  getPromptExecutionOptionsForDesign,
  getBundleConfigs,
  PROMPT_STAGE_KEYS,
  resolveStagePrompt,
  type DesignInputForEngine,
} from "./lib/promptEngine";

// ── Model constants ──────────────────────────────────────────────────
const MODEL_PRO = "gemini-3.1-flash-image-preview"; // all calls use flash for now (testing)
const MODEL_FLASH = "gemini-3.1-flash-image-preview";

type GeminiReferenceImage = { base64: string; mimeType: string };
type GeminiInlinePart = { inlineData: { mimeType: string; data: string } } | { text: string };
type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: {
          data?: string;
          mimeType?: string;
        };
      }>;
    };
  }>;
};
type GeminiImageClient = {
  models: {
    generateContent: (args: {
      model: string;
      contents: GeminiInlinePart[];
      config: { responseModalities: string[] };
    }) => Promise<GeminiGenerateContentResponse>;
  };
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// ── Gemini API call via Vertex AI ────────────────────────────────────
async function callGemini(
  ai: GeminiImageClient,
  prompt: string,
  referenceImages: GeminiReferenceImage[],
  model: string = MODEL_FLASH,
): Promise<{ imageData: string; mimeType: string } | null> {
  const contents: GeminiInlinePart[] = [];

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
  ai: GeminiImageClient,
  prompt: string,
  referenceImages: GeminiReferenceImage[],
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
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      const is429 =
        message.includes("429") ||
        message.includes("RESOURCE_EXHAUSTED");
      if (is429 && attempt < 2) {
        const wait = (attempt + 1) * 15;
        console.warn(
          `  RETRY ${label} — rate limited, waiting ${wait}s (attempt ${attempt + 1}/3)`,
        );
        await new Promise((r) => setTimeout(r, wait * 1000));
      } else {
        console.error(`  FAIL ${label}:`, message);
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

type GenerationCtx = GenericActionCtx<DataModel>;

async function createGeminiClient() {
  const { GoogleGenAI } = await import("@google/genai");
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");
  return new GoogleGenAI({ apiKey });
}

async function loadGenerationContext(ctx: GenerationCtx, designId: string) {
  const design = await ctx.runQuery(internal.designs.getInternal, { designId: designId as never });

  if (!design.textReferenceStorageId) {
    throw new Error("Text reference is required before generation");
  }

  let referenceBase64: string | null = null;
  let referenceUrl = design.referenceUrl;

  if (design.referenceStorageId) {
    const storageUrl = await ctx.storage.getUrl(design.referenceStorageId);
    if (storageUrl) {
      referenceUrl = storageUrl;
    }
  }

  if (referenceUrl) {
    try {
      const response = await fetch(referenceUrl);
      const buffer = await response.arrayBuffer();
      referenceBase64 = Buffer.from(buffer).toString("base64");

      if (!design.referenceStorageId) {
        const blob = new Blob([buffer], { type: "image/jpeg" });
        const refStorageId = await ctx.storage.store(blob);
        await ctx.runMutation(internal.designs.storeReferenceImage, {
          designId: designId as never,
          referenceStorageId: refStorageId,
        });
      }
    } catch (error) {
      console.error("Failed to download reference:", error);
    }
  }

  let textReferenceBase64: string | undefined;
  const textRefUrl = await ctx.storage.getUrl(design.textReferenceStorageId);
  if (textRefUrl) {
    try {
      const textResp = await fetch(textRefUrl);
      const textBuffer = await textResp.arrayBuffer();
      textReferenceBase64 = Buffer.from(textBuffer).toString("base64");
    } catch (error) {
      console.error("Failed to download text reference:", error);
    }
  }

  if (!textReferenceBase64) {
    throw new Error("Text reference could not be loaded");
  }

  const hasReference = !!(referenceBase64 || design.referenceStorageId);

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

  const promptBundle = await fetchResolvedPromptBundleForExecution(
    ctx,
    getPromptExecutionOptionsForDesign(design)
  );
  if (promptBundle && !design.promptSnapshot) {
    await ctx.runMutation(internal.designs.storePromptSnapshot, {
      designId: designId as never,
      promptSnapshot: buildPromptSnapshotFromBundle(promptBundle, []),
    });
  }

  return {
    design,
    designInput,
    engineInput,
    hasReference,
    promptBundle,
    configs: promptBundle ? getBundleConfigs(promptBundle) : {},
    referenceImages: [
      ...(referenceBase64 ? [{ base64: referenceBase64, mimeType: "image/jpeg" as const }] : []),
      { base64: textReferenceBase64, mimeType: "image/png" as const },
    ] as GeminiReferenceImage[],
    textReferenceBase64,
    ai: await createGeminiClient(),
  };
}

async function generateProductStageInternal(
  ctx: GenerationCtx,
  designId: string,
  loadedContext?: Awaited<ReturnType<typeof loadGenerationContext>>,
) {
  const loaded = loadedContext ?? await loadGenerationContext(ctx, designId);
  const { ai, design, designInput, engineInput, hasReference, promptBundle, configs, referenceImages } = loaded;

  const variationCount = 4;
  const productPrompts: string[] = [];
  const productBase64s: Array<string | null> = Array.from({ length: variationCount }, () => null);
  let recordedProductStage = false;

  await ctx.runMutation(internal.designs.updateStatus, {
    designId: designId as never,
    status: "engraving",
    analysisStep: "Creating your designs...",
    analysisData: {
      jewelryType: design.jewelryType || "Pendant",
      metal: `${design.karat} Gold`,
      bestSpot: "AI visualized",
    },
  });

  for (let i = 0; i < variationCount; i += 1) {
    const promptCtx = buildPromptContext(engineInput, i, configs, { hasReference });
    const fallback = () => hasReference
      ? buildReferenceEngravePrompt(designInput, i)
      : buildFromScratchPrompt(designInput, i);
    const resolved = await resolveStagePrompt(
      ctx,
      hasReference ? PROMPT_STAGE_KEYS.productReference : PROMPT_STAGE_KEYS.productFromScratch,
      promptCtx,
      fallback,
      promptBundle
    );
    productPrompts.push(resolved.prompt);

    if (!recordedProductStage && promptBundle) {
      await ctx.runMutation(internal.designs.recordPromptStage, {
        designId: designId as never,
        stage: resolved.stageSnapshot,
      });
      recordedProductStage = true;
    }
  }

  for (let batch = 0; batch < variationCount; batch += 2) {
    if (batch > 0) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    const batchIndices = [batch, batch + 1].filter((index) => index < variationCount);
    const results = await Promise.all(
      batchIndices.map((index) =>
        callGeminiWithRetry(
          ai,
          productPrompts[index],
          referenceImages,
          `product[${index}]`,
          MODEL_PRO
        )
      )
    );

    for (let offset = 0; offset < results.length; offset += 1) {
      const result = results[offset];
      const variationIndex = batchIndices[offset];
      if (!result) {
        continue;
      }

      try {
        const buf = Buffer.from(result.imageData, "base64");
        const blob = new Blob([buf], { type: result.mimeType });
        const storageId = await ctx.storage.store(blob);
        await ctx.runMutation(internal.designs.addProductImage, {
          designId: designId as never,
          variationIndex,
          storageId,
        });
        productBase64s[variationIndex] = result.imageData;
      } catch (error) {
        console.error(`STORE FAIL product[${variationIndex}]:`, getErrorMessage(error));
      }
    }

    await ctx.runMutation(internal.designs.updateStatus, {
      designId: designId as never,
      status: "engraving",
      analysisStep: `Creating your designs... (${Math.min(batch + 2, variationCount)}/4 product shots)`,
    });
  }

  const refreshed = await ctx.runQuery(internal.designs.getInternal, { designId: designId as never });
  const productCount = refreshed.productImageStorageIds?.filter(Boolean).length || 0;
  if (productCount === 0) {
    throw new Error("No product images generated");
  }

  return {
    ...loaded,
    design: refreshed,
    productBase64s,
    productCount,
  };
}

async function buildOnBodyCalls(
  ctx: GenerationCtx,
  loaded: Awaited<ReturnType<typeof loadGenerationContext>>,
  productBase64s?: Array<string | null>,
) {
  const refreshed = await ctx.runQuery(internal.designs.getInternal, { designId: loaded.design._id });
  const calls: Array<{ prompt: string; refs: GeminiReferenceImage[]; index: number }> = [];
  let recordedOnBodyStage = false;

  for (let i = 0; i < 4; i += 1) {
    let productBase64 = productBase64s?.[i] ?? null;
    const productStorageId = refreshed.productImageStorageIds?.[i];
    if (!productBase64 && productStorageId) {
      const productUrl = await ctx.storage.getUrl(productStorageId);
      if (productUrl) {
        const response = await fetch(productUrl);
        const buffer = await response.arrayBuffer();
        productBase64 = Buffer.from(buffer).toString("base64");
      }
    }

    if (!productBase64) {
      continue;
    }

    const refs: GeminiReferenceImage[] = [
      { base64: productBase64, mimeType: "image/png" },
    ];
    if (loaded.textReferenceBase64) {
      refs.push({ base64: loaded.textReferenceBase64, mimeType: "image/png" });
    }

    const onBodyCtx = buildPromptContext(loaded.engineInput, i, loaded.configs, {
      hasReference: loaded.hasReference,
    });
    const resolved = await resolveStagePrompt(
      ctx,
      PROMPT_STAGE_KEYS.onBodyChained,
      onBodyCtx,
      () => buildChainedOnBodyPrompt(loaded.designInput, i),
      loaded.promptBundle
    );

    if (!recordedOnBodyStage && loaded.promptBundle) {
      await ctx.runMutation(internal.designs.recordPromptStage, {
        designId: loaded.design._id,
        stage: resolved.stageSnapshot,
      });
      recordedOnBodyStage = true;
    }

    calls.push({
      prompt: resolved.prompt,
      refs,
      index: i,
    });
  }

  return calls;
}

async function generateOnBodyStageInternal(
  ctx: GenerationCtx,
  designId: string,
  loadedContext?: Awaited<ReturnType<typeof loadGenerationContext>>,
  productBase64s?: Array<string | null>,
) {
  const loaded = loadedContext ?? await loadGenerationContext(ctx, designId);
  const onBodyCalls = await buildOnBodyCalls(ctx, loaded, productBase64s);

  if (onBodyCalls.length === 0) {
    throw new Error("No product images available for on-body generation");
  }

  await ctx.runMutation(internal.designs.updateStatus, {
    designId: designId as never,
    status: "engraving",
    analysisStep: "Creating on-body previews...",
  });

  for (let batch = 0; batch < onBodyCalls.length; batch += 2) {
    if (batch > 0) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    const batchItems = onBodyCalls.slice(batch, batch + 2);
    const results = await Promise.all(
      batchItems.map((item) =>
        callGeminiWithRetry(
          loaded.ai,
          item.prompt,
          item.refs,
          `on-body[${item.index}]`,
          MODEL_PRO
        )
      )
    );

    for (let offset = 0; offset < results.length; offset += 1) {
      const result = results[offset];
      const item = batchItems[offset];
      if (!result) {
        continue;
      }

      try {
        const buf = Buffer.from(result.imageData, "base64");
        const blob = new Blob([buf], { type: result.mimeType });
        const storageId = await ctx.storage.store(blob);
        await ctx.runMutation(internal.designs.addOnBodyImage, {
          designId: designId as never,
          variationIndex: item.index,
          storageId,
        });
      } catch (error) {
        console.error(`STORE FAIL on-body[${item.index}]:`, getErrorMessage(error));
      }
    }

    await ctx.runMutation(internal.designs.updateStatus, {
      designId: designId as never,
      status: "engraving",
      analysisStep: `Creating on-body previews... (${Math.min(batch + 2, onBodyCalls.length)}/${onBodyCalls.length})`,
    });
  }

  const refreshed = await ctx.runQuery(internal.designs.getInternal, { designId: designId as never });
  const onBodyCount = refreshed.onBodyImageStorageIds?.filter(Boolean).length || 0;

  return {
    ...loaded,
    design: refreshed,
    onBodyCount,
  };
}

async function queueVideoGenerations(ctx: GenerationCtx, designId: string) {
  const design = await ctx.runQuery(internal.designs.getInternal, {
    designId: designId as never,
  });
  const videoSlots = Math.max(
    design.onBodyImageStorageIds?.length || 0,
    design.productImageStorageIds?.length || 0,
  );

  let queuedVideos = 0;
  for (let i = 0; i < videoSlots; i += 1) {
    const hasSource = design.onBodyImageStorageIds?.[i] || design.productImageStorageIds?.[i];
    if (!hasSource) continue;
    await ctx.scheduler.runAfter(i * 2000, internal.video.generateVideo, {
      designId: designId as never,
      variationIndex: i,
    });
    queuedVideos += 1;
  }

  return queuedVideos;
}

export const generateProductStage = internalAction({
  args: { designId: v.id("designs") },
  handler: async (ctx, { designId }) => {
    try {
      await generateProductStageInternal(ctx, designId);
      await ctx.runMutation(internal.designs.completeGeneration, { designId });
    } catch (error) {
      console.error("Product stage failed:", error);
      await ctx.runMutation(internal.designs.updateStatus, {
        designId,
        status: "failed",
        error: getErrorMessage(error) || "Product stage failed",
      });
    }
  },
});

export const generateOnBodyStage = internalAction({
  args: { designId: v.id("designs") },
  handler: async (ctx, { designId }) => {
    try {
      await generateOnBodyStageInternal(ctx, designId);
      await ctx.runMutation(internal.designs.completeGeneration, { designId });
    } catch (error) {
      console.error("On-body stage failed:", error);
      await ctx.runMutation(internal.designs.updateStatus, {
        designId,
        status: "failed",
        error: getErrorMessage(error) || "On-body stage failed",
      });
    }
  },
});

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

      await ctx.runMutation(internal.designs.updateStatus, {
        designId,
        status: "analyzing",
        analysisStep: "Studying the piece...",
      });

      const productStage = await generateProductStageInternal(ctx, designId);
      const onBodyStage = await generateOnBodyStageInternal(
        ctx,
        designId,
        productStage,
        productStage.productBase64s
      );
      const queuedVideos = await queueVideoGenerations(ctx, designId);

      console.log(
        `=== DONE: ${productStage.productCount} product + ${onBodyStage.onBodyCount} on-body images ===`
      );
      await ctx.runMutation(internal.designs.completeGeneration, { designId });
      console.log(`=== QUEUED ${queuedVideos} video jobs ===`);
    } catch (error: unknown) {
      console.error("Generation failed:", error);
      await ctx.runMutation(internal.designs.updateStatus, {
        designId,
        status: "failed",
        error: getErrorMessage(error) || "Generation failed",
      });
    }
  },
});
