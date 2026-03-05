import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    designId: v.id("designs"),
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.optional(v.string()),
    notes: v.string(),
    estimatedPrice: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const design = await ctx.db.get(args.designId);
    if (!design) throw new Error("Design not found");

    return await ctx.db.insert("quoteRequests", {
      designId: args.designId,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      customerEmail: args.customerEmail,
      jewelryType: design.jewelryType || "pendant",
      lengthMm: design.lengthMm,
      estimatedPrice: args.estimatedPrice,
      notes: args.notes,
      status: "open",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const getByDesign = query({
  args: { designId: v.id("designs") },
  handler: async (ctx, { designId }) => {
    return await ctx.db
      .query("quoteRequests")
      .withIndex("by_design", (q) => q.eq("designId", designId))
      .order("desc")
      .first();
  },
});

export const listOpen = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("quoteRequests")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .order("desc")
      .take(50);
  },
});
