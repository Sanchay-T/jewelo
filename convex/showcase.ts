import { query } from "./_generated/server";
import { v } from "convex/values";

export const getByType = query({
  args: { jewelryType: v.string() },
  handler: async (ctx, { jewelryType }) => {
    const images = await ctx.db
      .query("showcaseImages")
      .withIndex("by_type_style", (q) => q.eq("jewelryType", jewelryType))
      .collect();
    return Promise.all(
      images.map(async (img) => ({
        ...img,
        imageUrl: await ctx.storage.getUrl(img.imageStorageId),
      }))
    );
  },
});

export const getAll = query({
  handler: async (ctx) => {
    const images = await ctx.db.query("showcaseImages").collect();
    return Promise.all(
      images.map(async (img) => ({
        ...img,
        imageUrl: await ctx.storage.getUrl(img.imageStorageId),
      }))
    );
  },
});
