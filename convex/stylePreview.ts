import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Query: fetch all cached style preview images
export const getAll = query({
  handler: async (ctx) => {
    const previews = await ctx.db.query("stylePreviewImages").collect();
    const result: Record<string, string> = {};
    for (const p of previews) {
      const url = await ctx.storage.getUrl(p.imageStorageId);
      if (url) result[p.styleFamily] = url;
    }
    return result;
  },
});

// Internal mutation to save a generated preview
export const savePreview = internalMutation({
  args: {
    styleFamily: v.string(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { styleFamily, storageId }) => {
    // Delete any existing preview for this style
    const existing = await ctx.db
      .query("stylePreviewImages")
      .withIndex("by_style", (q) => q.eq("styleFamily", styleFamily))
      .collect();
    for (const doc of existing) {
      await ctx.storage.delete(doc.imageStorageId);
      await ctx.db.delete(doc._id);
    }
    await ctx.db.insert("stylePreviewImages", {
      styleFamily,
      imageStorageId: storageId,
      createdAt: Date.now(),
    });
  },
});
