import { query } from "./_generated/server";
import { v } from "convex/values";

export const getFeatured = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("designs")
      .withIndex("by_featured")
      .filter((q) => q.eq(q.field("featured"), true))
      .take(4);
  },
});

export const byCategory = query({
  args: { category: v.string() },
  handler: async (ctx, { category }) => {
    return await ctx.db
      .query("inspirationImages")
      .withIndex("by_category", (q) => q.eq("category", category))
      .take(12);
  },
});

export const getRecentCompleted = query({
  handler: async (ctx) => {
    const designs = await ctx.db
      .query("designs")
      .withIndex("by_status", (q) => q.eq("status", "completed"))
      .order("desc")
      .take(8);

    const results = [];
    for (const design of designs) {
      if (design.imageStorageIds && design.imageStorageIds.length > 0) {
        const idx = design.selectedImageIndex ?? 0;
        const storageId = design.imageStorageIds[idx] || design.imageStorageIds[0];
        const url = await ctx.storage.getUrl(storageId);
        if (url) {
          results.push({ _id: design._id, name: design.name, imageUrl: url });
        }
      }
    }
    return results;
  },
});
