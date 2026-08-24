import { query } from "./_generated/server";
import { v } from "convex/values";
import { getSelectedVariationIndex, getVariationSlotCount, normalizeStorageSlots } from "./lib/designMedia";

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
      const slotCount = getVariationSlotCount(design);
      const idx = getSelectedVariationIndex(design);
      const storageId = normalizeStorageSlots(
        design.productImageStorageIds,
        slotCount
      )[idx];
      if (storageId) {
        const url = await ctx.storage.getUrl(storageId);
        if (url) {
          results.push({ _id: design._id, name: design.name, imageUrl: url });
        }
      }
    }
    return results;
  },
});

export const getRecentCompletedForSession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    const designs = await ctx.db
      .query("designs")
      .withIndex("by_session_created", (q) => q.eq("sessionId", sessionId))
      .order("desc")
      .take(8);

    const results = [];
    for (const design of designs) {
      if (design.status !== "completed") continue;

      const slotCount = getVariationSlotCount(design);
      const idx = getSelectedVariationIndex(design);
      const storageId = normalizeStorageSlots(
        design.productImageStorageIds,
        slotCount
      )[idx];
      if (!storageId) continue;

      const url = await ctx.storage.getUrl(storageId);
      if (url) {
        results.push({ _id: design._id, name: design.name, imageUrl: url });
      }
    }
    return results;
  },
});
