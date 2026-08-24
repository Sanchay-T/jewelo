import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import {
  getSelectedVariationIndex,
  getVariationSlotCount,
  normalizeStorageSlots,
  normalizeStringSlots,
  resolveSelectedVideoUrl,
  resolveStorageUrls,
  setStorageSlot,
  setStringSlot,
} from "./lib/designMedia";
import { validateNameForLanguage } from "./lib/designValidation";

const ADDITIONAL_INFO_VALIDATOR = v.object({
  occasion: v.optional(v.string()),
  metalFinish: v.optional(v.string()),
  notes: v.optional(v.string()),
});

const PROMPT_RELEASE_REF_VALIDATOR = v.object({
  slug: v.string(),
  version: v.number(),
});

const PRODUCT_STAGE_KEYS = ["product.reference", "product.fromScratch"] as const;
const ON_BODY_STAGE_KEYS = ["onBody.chained"] as const;
const VIDEO_STAGE_KEYS = ["video.main", "video.negative"] as const;

const PROMPT_SNAPSHOT_VALIDATOR = v.object({
  environment: v.optional(v.string()),
  mode: v.optional(v.string()),
  release: v.optional(
    v.object({
      slug: v.string(),
      version: v.number(),
    })
  ),
  pipeline: v.optional(
    v.object({
      slug: v.string(),
      version: v.number(),
    })
  ),
  templates: v.array(
    v.object({
      slug: v.string(),
      version: v.number(),
    })
  ),
  partials: v.array(
    v.object({
      slug: v.string(),
      version: v.number(),
    })
  ),
  configs: v.array(
    v.object({
      key: v.string(),
      version: v.number(),
    })
  ),
  stages: v.optional(
    v.array(
      v.object({
        stageKey: v.string(),
        stageType: v.string(),
        branch: v.string(),
        templateSlug: v.string(),
        templateVersion: v.optional(v.number()),
        usedFallback: v.boolean(),
        fallbackReason: v.optional(v.string()),
      })
    )
  ),
  capturedAt: v.number(),
});

export const create = mutation({
  args: {
    sessionId: v.string(),
    name: v.string(),
    language: v.string(),
    font: v.string(),
    size: v.string(),
    karat: v.string(),
    style: v.string(),
    referenceType: v.optional(v.string()),
    referenceUrl: v.optional(v.string()),
    referenceStorageId: v.optional(v.id("_storage")),
    jewelryType: v.optional(v.string()),
    designStyle: v.optional(v.string()),
    metalType: v.optional(v.string()),
    styleFamily: v.optional(v.string()),
    complexity: v.optional(v.number()),
    gender: v.optional(v.string()),
    gemstones: v.optional(v.array(v.string())),
    primaryGemstone: v.optional(v.string()),
    lengthMm: v.optional(v.number()),
    thicknessMm: v.optional(v.number()),
    additionalInfo: v.optional(ADDITIONAL_INFO_VALIDATOR),
    source: v.optional(v.string()),
    requestedPromptEnvironment: v.optional(v.string()),
    requestedPromptRelease: v.optional(PROMPT_RELEASE_REF_VALIDATOR),
  },
  handler: async (ctx, args) => {
    validateNameForLanguage(args.name, args.language);

    return ctx.db.insert("designs", {
      ...args,
      source: args.source ?? "customer",
      status: "draft",
      selectedVariationIndex: 0,
      regenerationsRemaining: 3,
      createdAt: Date.now(),
    });
  },
});

export const startGeneration = mutation({
  args: { designId: v.id("designs") },
  handler: async (ctx, { designId }) => {
    const design = await ctx.db.get(designId);
    if (!design) throw new Error("Design not found");
    if (!design.textReferenceStorageId) {
      throw new Error("Text reference is required before generation can start");
    }

    await ctx.db.patch(designId, {
      status: "generating",
      analysisStep: "Preparing your design...",
      error: undefined,
      productImageStorageIds: undefined,
      onBodyImageStorageIds: undefined,
      videoStorageIds: undefined,
      videoStatuses: undefined,
      videoOperationIds: undefined,
      videoStorageId: undefined,
      videoStatus: undefined,
      videoOperationId: undefined,
      promptSnapshot: undefined,
    });

    await ctx.scheduler.runAfter(0, internal.generation.generate, { designId });
  },
});

export const get = query({
  args: { designId: v.id("designs") },
  handler: async (ctx, { designId }) => {
    return ctx.db.get(designId);
  },
});

export const listRecentPlayground = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const rows = await ctx.db
      .query("designs")
      .withIndex("by_source_created", (q) => q.eq("source", "playground"))
      .collect();

    const recent = [...rows]
      .sort((left, right) => right.createdAt - left.createdAt)
      .slice(0, limit ?? 12);

    return Promise.all(recent.map(async (design) => {
      const slotCount = getVariationSlotCount(design);
      const selectedVariationIndex = getSelectedVariationIndex(design);
      const productUrls = await resolveStorageUrls(ctx, design.productImageStorageIds, slotCount);
      const onBodyUrls = await resolveStorageUrls(ctx, design.onBodyImageStorageIds, slotCount);
      const thumbnailUrl =
        onBodyUrls[selectedVariationIndex]
        ?? productUrls[selectedVariationIndex]
        ?? productUrls[0]
        ?? null;

      return {
        _id: design._id,
        name: design.name,
        status: design.status,
        createdAt: design.createdAt,
        source: design.source,
        requestedPromptEnvironment: design.requestedPromptEnvironment ?? null,
        requestedPromptRelease: design.requestedPromptRelease ?? null,
        thumbnailUrl,
      };
    }));
  },
});

export const getInternal = internalQuery({
  args: { designId: v.id("designs") },
  handler: async (ctx, { designId }) => {
    const design = await ctx.db.get(designId);
    if (!design) throw new Error("Design not found");
    return design;
  },
});

export const getWithImages = query({
  args: { designId: v.id("designs") },
  handler: async (ctx, { designId }) => {
    const design = await ctx.db.get(designId);
    if (!design) return null;

    const slotCount = getVariationSlotCount(design);
    const selectedVariationIndex = getSelectedVariationIndex(design);
    const productImageUrls = await resolveStorageUrls(
      ctx,
      design.productImageStorageIds,
      slotCount
    );
    const onBodyImageUrls = await resolveStorageUrls(
      ctx,
      design.onBodyImageStorageIds,
      slotCount
    );
    const videoUrl = await resolveSelectedVideoUrl(ctx, design);

    return {
      ...design,
      selectedVariationIndex,
      productImageUrls,
      onBodyImageUrls,
      selectedImageUrl: productImageUrls[selectedVariationIndex] ?? null,
      selectedOnBodyImageUrl: onBodyImageUrls[selectedVariationIndex] ?? null,
      videoUrl,
    };
  },
});

export const getBeforeAfter = query({
  args: { designId: v.id("designs") },
  handler: async (ctx, { designId }) => {
    const design = await ctx.db.get(designId);
    if (!design) return null;

    const referenceUrl = design.referenceStorageId
      ? await ctx.storage.getUrl(design.referenceStorageId)
      : design.referenceUrl || null;

    const slotCount = getVariationSlotCount(design);
    const selectedIdx = getSelectedVariationIndex(design);
    const resultStorageId = normalizeStorageSlots(
      design.productImageStorageIds,
      slotCount
    )[selectedIdx];
    const resultUrl = resultStorageId
      ? await ctx.storage.getUrl(resultStorageId)
      : null;
    const videoUrl = await resolveSelectedVideoUrl(ctx, design);

    return {
      referenceUrl,
      resultUrl,
      videoUrl,
      selectedVariationIndex: selectedIdx,
      design,
    };
  },
});

export const updateStatus = internalMutation({
  args: {
    designId: v.id("designs"),
    status: v.string(),
    analysisStep: v.optional(v.string()),
    analysisData: v.optional(
      v.object({
        jewelryType: v.optional(v.string()),
        metal: v.optional(v.string()),
        bestSpot: v.optional(v.string()),
      })
    ),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { designId, ...updates }) => {
    await ctx.db.patch(designId, updates);
  },
});

export const addProductImage = internalMutation({
  args: {
    designId: v.id("designs"),
    variationIndex: v.number(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { designId, variationIndex, storageId }) => {
    const design = await ctx.db.get(designId);
    if (!design) return;

    const slotCount = getVariationSlotCount(design);
    await ctx.db.patch(designId, {
      productImageStorageIds: setStorageSlot(
        design.productImageStorageIds,
        variationIndex,
        storageId,
        slotCount
      ),
    });
  },
});

export const addOnBodyImage = internalMutation({
  args: {
    designId: v.id("designs"),
    variationIndex: v.number(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { designId, variationIndex, storageId }) => {
    const design = await ctx.db.get(designId);
    if (!design) return;

    const slotCount = getVariationSlotCount(design);
    await ctx.db.patch(designId, {
      onBodyImageStorageIds: setStorageSlot(
        design.onBodyImageStorageIds,
        variationIndex,
        storageId,
        slotCount
      ),
    });
  },
});

export const updateVideoStatus = internalMutation({
  args: {
    designId: v.id("designs"),
    variationIndex: v.number(),
    operationId: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    status: v.string(),
  },
  handler: async (ctx, { designId, variationIndex, operationId, storageId, status }) => {
    const design = await ctx.db.get(designId);
    if (!design) return;

    const slotCount = getVariationSlotCount(design);
    const patch: Record<string, unknown> = {
      videoStatuses: setStringSlot(
        design.videoStatuses,
        variationIndex,
        status,
        "pending",
        slotCount
      ),
    };

    if (operationId) {
      patch.videoOperationIds = setStringSlot(
        design.videoOperationIds,
        variationIndex,
        operationId,
        "",
        slotCount
      );
    } else if (!design.videoOperationIds) {
      patch.videoOperationIds = normalizeStringSlots(undefined, slotCount, "");
    }

    if (storageId) {
      patch.videoStorageIds = setStorageSlot(
        design.videoStorageIds,
        variationIndex,
        storageId,
        slotCount
      );
    } else if (!design.videoStorageIds) {
      patch.videoStorageIds = normalizeStorageSlots(undefined, slotCount);
    }

    await ctx.db.patch(designId, patch);
  },
});

export const storePromptSnapshot = internalMutation({
  args: {
    designId: v.id("designs"),
    promptSnapshot: PROMPT_SNAPSHOT_VALIDATOR,
  },
  handler: async (ctx, { designId, promptSnapshot }) => {
    await ctx.db.patch(designId, { promptSnapshot });
  },
});

export const prepareForPlaygroundRun = internalMutation({
  args: {
    designId: v.id("designs"),
    mode: v.union(
      v.literal("fullChain"),
      v.literal("product"),
      v.literal("onBody"),
      v.literal("video")
    ),
    requestedPromptEnvironment: v.optional(v.string()),
    requestedPromptRelease: v.optional(PROMPT_RELEASE_REF_VALIDATOR),
  },
  handler: async (ctx, { designId, mode, requestedPromptEnvironment, requestedPromptRelease }) => {
    const design = await ctx.db.get(designId);
    if (!design) {
      throw new Error("Design not found");
    }

    const patch: Record<string, unknown> = {
      status: "generating",
      error: undefined,
      requestedPromptEnvironment,
      requestedPromptRelease,
    };

    const promptSelectionChanged =
      (design.requestedPromptEnvironment ?? null) !== (requestedPromptEnvironment ?? null)
      || (design.requestedPromptRelease?.slug ?? null) !== (requestedPromptRelease?.slug ?? null)
      || (design.requestedPromptRelease?.version ?? null) !== (requestedPromptRelease?.version ?? null);

    if (mode === "fullChain" || mode === "product") {
      patch.analysisStep = mode === "fullChain"
        ? "Preparing full pipeline run..."
        : "Preparing product stage...";
      patch.productImageStorageIds = undefined;
      patch.onBodyImageStorageIds = undefined;
      patch.videoStorageIds = undefined;
      patch.videoStatuses = undefined;
      patch.videoOperationIds = undefined;
      patch.videoStorageId = undefined;
      patch.videoStatus = undefined;
      patch.videoOperationId = undefined;
      patch.selectedVariationIndex = 0;
    }

    if (mode === "onBody") {
      patch.analysisStep = "Preparing on-body stage...";
      patch.onBodyImageStorageIds = undefined;
      patch.videoStorageIds = undefined;
      patch.videoStatuses = undefined;
      patch.videoOperationIds = undefined;
      patch.videoStorageId = undefined;
      patch.videoStatus = undefined;
      patch.videoOperationId = undefined;
    }

    if (mode === "video") {
      patch.analysisStep = "Preparing video stage...";
      patch.videoStorageIds = undefined;
      patch.videoStatuses = undefined;
      patch.videoOperationIds = undefined;
      patch.videoStorageId = undefined;
      patch.videoStatus = undefined;
      patch.videoOperationId = undefined;
    }

    if (promptSelectionChanged) {
      patch.promptSnapshot = undefined;
    } else if (design.promptSnapshot) {
      const removeStageKeys = new Set<string>();
      if (mode === "fullChain" || mode === "product") {
        PRODUCT_STAGE_KEYS.forEach((key) => removeStageKeys.add(key));
        ON_BODY_STAGE_KEYS.forEach((key) => removeStageKeys.add(key));
        VIDEO_STAGE_KEYS.forEach((key) => removeStageKeys.add(key));
      } else if (mode === "onBody") {
        ON_BODY_STAGE_KEYS.forEach((key) => removeStageKeys.add(key));
        VIDEO_STAGE_KEYS.forEach((key) => removeStageKeys.add(key));
      } else {
        VIDEO_STAGE_KEYS.forEach((key) => removeStageKeys.add(key));
      }

      patch.promptSnapshot = {
        ...design.promptSnapshot,
        stages: (design.promptSnapshot.stages ?? []).filter(
          (stage) => !removeStageKeys.has(stage.stageKey)
        ),
      };
    }

    await ctx.db.patch(designId, patch);
  },
});

export const recordPromptStage = internalMutation({
  args: {
    designId: v.id("designs"),
    stage: v.object({
      stageKey: v.string(),
      stageType: v.string(),
      branch: v.string(),
      templateSlug: v.string(),
      templateVersion: v.optional(v.number()),
      usedFallback: v.boolean(),
      fallbackReason: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { designId, stage }) => {
    const design = await ctx.db.get(designId);
    if (!design?.promptSnapshot) return;

    const existingStages = design.promptSnapshot.stages ?? [];
    const nextStages = [
      ...existingStages.filter((item) => item.stageKey !== stage.stageKey),
      stage,
    ];

    await ctx.db.patch(designId, {
      promptSnapshot: {
        ...design.promptSnapshot,
        stages: nextStages,
      },
    });
  },
});

export const completeGeneration = internalMutation({
  args: { designId: v.id("designs") },
  handler: async (ctx, { designId }) => {
    await ctx.db.patch(designId, { status: "completed" });
  },
});

export const storeReferenceImage = internalMutation({
  args: {
    designId: v.id("designs"),
    referenceStorageId: v.id("_storage"),
  },
  handler: async (ctx, { designId, referenceStorageId }) => {
    await ctx.db.patch(designId, { referenceStorageId });
  },
});

export const saveToGallery = mutation({
  args: { designId: v.id("designs") },
  handler: async (ctx, { designId }) => {
    await ctx.db.patch(designId, { featured: true });
    await ctx.scheduler.runAfter(0, internal.templates.captureFromDesign, {
      designId,
      source: "gallery_promoted",
    });
  },
});

export const updatePreferences = mutation({
  args: {
    designId: v.id("designs"),
    language: v.optional(v.string()),
    font: v.optional(v.string()),
    styleFamily: v.optional(v.string()),
    complexity: v.optional(v.number()),
    gemstones: v.optional(v.array(v.string())),
    primaryGemstone: v.optional(v.string()),
    additionalInfo: v.optional(ADDITIONAL_INFO_VALIDATOR),
  },
  handler: async (ctx, { designId, ...updates }) => {
    await ctx.db.patch(designId, updates);
  },
});

export const selectVariation = mutation({
  args: { designId: v.id("designs"), index: v.number() },
  handler: async (ctx, { designId, index }) => {
    await ctx.db.patch(designId, { selectedVariationIndex: index });
  },
});

export const regenerate = mutation({
  args: { designId: v.id("designs") },
  handler: async (ctx, { designId }) => {
    const design = await ctx.db.get(designId);
    if (!design) throw new Error("Design not found");
    const remaining = design.regenerationsRemaining - 1;
    if (remaining < 0) throw new Error("No regenerations left");
    if (!design.textReferenceStorageId) {
      throw new Error("Text reference is required before regeneration");
    }

    await ctx.db.patch(designId, {
      status: "generating",
      regenerationsRemaining: remaining,
      analysisStep: "Preparing fresh variations...",
      error: undefined,
      productImageStorageIds: undefined,
      onBodyImageStorageIds: undefined,
      videoStorageId: undefined,
      videoStatus: undefined,
      videoOperationId: undefined,
      videoStorageIds: undefined,
      videoStatuses: undefined,
      videoOperationIds: undefined,
      promptSnapshot: undefined,
      selectedVariationIndex: 0,
    });

    await ctx.scheduler.runAfter(0, internal.generation.generate, { designId });
  },
});

export const getWithVideos = query({
  args: { designId: v.id("designs") },
  handler: async (ctx, { designId }) => {
    const design = await ctx.db.get(designId);
    if (!design) return null;

    const slotCount = getVariationSlotCount(design);
    const selectedVariationIndex = getSelectedVariationIndex(design);
    const productImageUrls = await resolveStorageUrls(
      ctx,
      design.productImageStorageIds,
      slotCount
    );
    const onBodyImageUrls = await resolveStorageUrls(
      ctx,
      design.onBodyImageStorageIds,
      slotCount
    );
    const videoUrls = await resolveStorageUrls(
      ctx,
      design.videoStorageIds,
      slotCount
    );
    const videoStatuses = normalizeStringSlots(
      design.videoStatuses,
      slotCount,
      "pending"
    );
    const videoUrl = videoUrls[selectedVariationIndex] ?? (await resolveSelectedVideoUrl(ctx, design));

    return {
      ...design,
      selectedVariationIndex,
      productImageUrls,
      onBodyImageUrls,
      videoUrls,
      videoUrl,
      videoStatuses,
    };
  },
});
