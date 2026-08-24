import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import {
  getSelectedVariationIndex,
  getVariationSlotCount,
  normalizeStringSlots,
  resolveSelectedVideoUrl,
  resolveStorageUrls,
} from "./lib/designMedia";
import { validateAdminPassword } from "./lib/adminAuth";
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

const PLAYGROUND_INPUT_VALIDATOR = {
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
  requestedPromptEnvironment: v.optional(v.string()),
  requestedPromptRelease: v.optional(PROMPT_RELEASE_REF_VALIDATOR),
} as const;

export const createRun = mutation({
  args: {
    password: v.string(),
    textReferenceStorageId: v.id("_storage"),
    ...PLAYGROUND_INPUT_VALIDATOR,
  },
  handler: async (ctx, args) => {
    validateAdminPassword(args.password);
    validateNameForLanguage(args.name, args.language);

    return await ctx.db.insert("designs", {
      sessionId: "playground",
      source: "playground",
      status: "draft",
      selectedVariationIndex: 0,
      regenerationsRemaining: 99,
      createdAt: Date.now(),
      textReferenceStorageId: args.textReferenceStorageId,
      name: args.name,
      language: args.language,
      font: args.font,
      size: args.size,
      karat: args.karat,
      style: args.style,
      referenceType: args.referenceStorageId ? (args.referenceType ?? "upload") : args.referenceType,
      referenceUrl: args.referenceUrl,
      referenceStorageId: args.referenceStorageId,
      jewelryType: args.jewelryType,
      designStyle: args.designStyle,
      metalType: args.metalType,
      styleFamily: args.styleFamily,
      complexity: args.complexity,
      gender: args.gender,
      gemstones: args.gemstones,
      primaryGemstone: args.primaryGemstone,
      lengthMm: args.lengthMm,
      thicknessMm: args.thicknessMm,
      additionalInfo: args.additionalInfo,
      requestedPromptEnvironment: args.requestedPromptEnvironment,
      requestedPromptRelease: args.requestedPromptRelease,
    });
  },
});

export const run = mutation({
  args: {
    password: v.string(),
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
  handler: async (ctx, args) => {
    validateAdminPassword(args.password);

    const design = await ctx.db.get(args.designId);
    if (!design || design.source !== "playground") {
      throw new Error("Playground run not found");
    }
    if (!design.textReferenceStorageId) {
      throw new Error("Text reference is required before running the pipeline");
    }

    if (args.mode === "onBody" && !(design.productImageStorageIds?.some(Boolean))) {
      throw new Error("Generate the product stage before running on-body");
    }

    if (
      args.mode === "video"
      && !(design.onBodyImageStorageIds?.some(Boolean) || design.productImageStorageIds?.some(Boolean))
    ) {
      throw new Error("Generate product or on-body images before running video");
    }

    await ctx.runMutation(internal.designs.prepareForPlaygroundRun, {
      designId: args.designId,
      mode: args.mode,
      requestedPromptEnvironment: args.requestedPromptEnvironment,
      requestedPromptRelease: args.requestedPromptRelease,
    });

    if (args.mode === "fullChain") {
      await ctx.scheduler.runAfter(0, internal.generation.generate, {
        designId: args.designId,
      });
      return { queued: 1, mode: args.mode };
    }

    if (args.mode === "product") {
      await ctx.scheduler.runAfter(0, internal.generation.generateProductStage, {
        designId: args.designId,
      });
      return { queued: 1, mode: args.mode };
    }

    if (args.mode === "onBody") {
      await ctx.scheduler.runAfter(0, internal.generation.generateOnBodyStage, {
        designId: args.designId,
      });
      return { queued: 1, mode: args.mode };
    }

    const slotCount = getVariationSlotCount(design);
    let queued = 0;
    for (let variationIndex = 0; variationIndex < slotCount; variationIndex += 1) {
      const hasSource = design.onBodyImageStorageIds?.[variationIndex] || design.productImageStorageIds?.[variationIndex];
      if (!hasSource) continue;
      await ctx.scheduler.runAfter(variationIndex * 2000, internal.video.generateVideo, {
        designId: args.designId,
        variationIndex,
      });
      queued += 1;
    }

    await ctx.runMutation(internal.designs.completeGeneration, { designId: args.designId });
    return { queued, mode: args.mode };
  },
});

export const getRun = query({
  args: { designId: v.id("designs") },
  handler: async (ctx, { designId }) => {
    const design = await ctx.db.get(designId);
    if (!design || design.source !== "playground") return null;

    const slotCount = getVariationSlotCount(design);
    const selectedVariationIndex = getSelectedVariationIndex(design);
    const productImageUrls = await resolveStorageUrls(ctx, design.productImageStorageIds, slotCount);
    const onBodyImageUrls = await resolveStorageUrls(ctx, design.onBodyImageStorageIds, slotCount);
    const videoUrls = await resolveStorageUrls(ctx, design.videoStorageIds, slotCount);
    const videoStatuses = normalizeStringSlots(design.videoStatuses, slotCount, "pending");
    const videoUrl = await resolveSelectedVideoUrl(ctx, design);
    const referenceUrl = design.referenceStorageId
      ? await ctx.storage.getUrl(design.referenceStorageId)
      : design.referenceUrl || null;

    return {
      ...design,
      referenceUrl,
      selectedVariationIndex,
      productImageUrls,
      onBodyImageUrls,
      videoUrls,
      videoUrl,
      videoStatuses,
      counts: {
        product: productImageUrls.filter(Boolean).length,
        onBody: onBodyImageUrls.filter(Boolean).length,
        video: videoUrls.filter(Boolean).length,
      },
      stageAvailability: {
        canRunProduct: true,
        canRunOnBody: productImageUrls.some(Boolean),
        canRunVideo: onBodyImageUrls.some(Boolean) || productImageUrls.some(Boolean),
      },
    };
  },
});

export const listRuns = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const rows = await ctx.db
      .query("designs")
      .withIndex("by_source_created", (q) => q.eq("source", "playground"))
      .collect();

    const recent = [...rows]
      .sort((left, right) => right.createdAt - left.createdAt)
      .slice(0, limit ?? 12);

    return await Promise.all(recent.map(async (design) => {
      const slotCount = getVariationSlotCount(design);
      const selectedVariationIndex = getSelectedVariationIndex(design);
      const productUrls = await resolveStorageUrls(ctx, design.productImageStorageIds, slotCount);
      const onBodyUrls = await resolveStorageUrls(ctx, design.onBodyImageStorageIds, slotCount);
      const imageUrl =
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
        imageUrl,
      };
    }));
  },
});
