import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getCurrent = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("goldPrices")
      .withIndex("by_metal_currency", (q) =>
        q.eq("metalType", "XAU").eq("currency", "AED")
      )
      .order("desc")
      .first();
  },
});

export const store = internalMutation({
  args: {
    metalType: v.string(),
    currency: v.string(),
    pricePerOzTroy: v.number(),
    pricePerGram: v.number(),
    price24k: v.number(),
    price22k: v.number(),
    price21k: v.number(),
    price18k: v.number(),
    fetchedAt: v.number(),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("goldPrices", args);
  },
});
