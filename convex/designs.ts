import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const create = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const designId = await ctx.db.insert("designs", {
      ...args,
      status: "generating",
      regenerationsRemaining: 3,
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.generation.generate, { designId });
    return designId;
  },
});

export const get = query({
  args: { designId: v.id("designs") },
  handler: async (ctx, { designId }) => {
    return await ctx.db.get(designId);
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
    const productImageUrls = await Promise.all(
      (design.productImageStorageIds || []).map((id) => ctx.storage.getUrl(id))
    );
    const onBodyImageUrls = await Promise.all(
      (design.onBodyImageStorageIds || []).map((id) => ctx.storage.getUrl(id))
    );
    const videoUrl = design.videoStorageId
      ? await ctx.storage.getUrl(design.videoStorageId)
      : null;
    return {
      ...design,
      productImageUrls: productImageUrls.filter(Boolean) as string[],
      onBodyImageUrls: onBodyImageUrls.filter(Boolean) as string[],
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

    const selectedIdx = design.selectedVariationIndex ?? 0;
    const resultStorageId = design.productImageStorageIds?.[selectedIdx];
    const resultUrl = resultStorageId
      ? await ctx.storage.getUrl(resultStorageId)
      : null;

    const videoUrl = design.videoStorageId
      ? await ctx.storage.getUrl(design.videoStorageId)
      : null;

    return { referenceUrl, resultUrl, videoUrl, design };
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
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { designId, storageId }) => {
    const design = await ctx.db.get(designId);
    if (!design) return;
    const existing = design.productImageStorageIds || [];
    await ctx.db.patch(designId, {
      productImageStorageIds: [...existing, storageId],
    });
  },
});

export const addOnBodyImage = internalMutation({
  args: {
    designId: v.id("designs"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { designId, storageId }) => {
    const design = await ctx.db.get(designId);
    if (!design) return;
    const existing = design.onBodyImageStorageIds || [];
    await ctx.db.patch(designId, {
      onBodyImageStorageIds: [...existing, storageId],
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

    const statuses = [...(design.videoStatuses || ["pending", "pending", "pending", "pending"])];
    const opIds = [...(design.videoOperationIds || ["", "", "", ""])];

    statuses[variationIndex] = status;
    if (operationId) opIds[variationIndex] = operationId;

    const patch: Record<string, unknown> = {
      videoStatuses: statuses,
      videoOperationIds: opIds,
    };

    if (storageId) {
      const storageIds = [...(design.videoStorageIds || [])];
      // Ensure array is long enough
      while (storageIds.length <= variationIndex) storageIds.push(undefined as any);
      storageIds[variationIndex] = storageId;
      patch.videoStorageIds = storageIds.filter(Boolean);
    }

    await ctx.db.patch(designId, patch);
  },
});

export const completeGeneration = internalMutation({
  args: {
    designId: v.id("designs"),
  },
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
  },
});

export const selectVariation = mutation({
  args: { designId: v.id("designs"), index: v.number() },
  handler: async (ctx, { designId, index }) => {
    await ctx.db.patch(designId, { selectedVariationIndex: index });
    // Videos now trigger from generation completion, not selection
  },
});

export const regenerate = mutation({
  args: { designId: v.id("designs") },
  handler: async (ctx, { designId }) => {
    const design = await ctx.db.get(designId);
    if (!design) throw new Error("Design not found");
    const remaining = design.regenerationsRemaining - 1;
    if (remaining < 0) throw new Error("No regenerations left");

    await ctx.db.patch(designId, {
      status: "generating",
      regenerationsRemaining: remaining,
      productImageStorageIds: [],
      onBodyImageStorageIds: [],
      videoStorageId: undefined,
      videoStatus: undefined,
      videoOperationId: undefined,
      videoStorageIds: undefined,
      videoStatuses: undefined,
      videoOperationIds: undefined,
    });

    await ctx.scheduler.runAfter(0, internal.generation.generate, { designId });
  },
});

export const getWithVideos = query({
  args: { designId: v.id("designs") },
  handler: async (ctx, { designId }) => {
    const design = await ctx.db.get(designId);
    if (!design) return null;

    const productImageUrls = await Promise.all(
      (design.productImageStorageIds || []).map((id) => ctx.storage.getUrl(id))
    );

    const onBodyImageUrls = await Promise.all(
      (design.onBodyImageStorageIds || []).map((id) => ctx.storage.getUrl(id))
    );

    const videoUrls = await Promise.all(
      (design.videoStorageIds || []).map((id) =>
        id ? ctx.storage.getUrl(id) : null
      )
    );

    const videoUrl = design.videoStorageId
      ? await ctx.storage.getUrl(design.videoStorageId)
      : null;

    return {
      ...design,
      productImageUrls: productImageUrls.filter(Boolean) as string[],
      onBodyImageUrls: onBodyImageUrls.filter(Boolean) as string[],
      videoUrls,
      videoUrl,
      videoStatuses: design.videoStatuses || [],
    };
  },
});
