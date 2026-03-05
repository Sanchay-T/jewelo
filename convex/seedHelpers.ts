import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const insertTemplate = internalMutation({
  args: {
    slug: v.string(),
    version: v.number(),
    name: v.string(),
    template: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("promptTemplates", args);
  },
});

export const insertPartial = internalMutation({
  args: {
    slug: v.string(),
    version: v.number(),
    name: v.string(),
    template: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("promptPartials", args);
  },
});

export const insertConfig = internalMutation({
  args: {
    key: v.string(),
    version: v.number(),
    data: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("promptConfigs", args);
  },
});
