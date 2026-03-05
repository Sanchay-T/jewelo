import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { calculatePrice } from "../src/lib/pricing";
import type { Size, Karat, Style, Gemstone, MetalFinish } from "../src/lib/constants";

export const create = mutation({
  args: {
    designId: v.id("designs"),
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const design = await ctx.db.get(args.designId);
    if (!design) throw new Error("Design not found");

    const goldPrice = await ctx.db
      .query("goldPrices")
      .withIndex("by_metal_currency", (q) =>
        q.eq("metalType", "XAU").eq("currency", "AED")
      )
      .order("desc")
      .first();

    const pricePerGram = goldPrice?.pricePerGram || 250;
    const priceBreakdown = calculatePrice({
      karat: (design.karat || "21K") as Karat,
      size: (design.size || "medium") as Size,
      style: (design.style || "gold_only") as Style,
      goldPricePerGram: pricePerGram,
      jewelryType: design.jewelryType,
      complexity: design.complexity,
      gemstones: (design.gemstones || []) as Gemstone[],
      metalFinish: design.additionalInfo?.metalFinish as MetalFinish | undefined,
      lengthMm: design.lengthMm,
    });

    const orderId = await ctx.db.insert("orders", {
      designId: args.designId,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      customerEmail: args.customerEmail,
      status: "confirmed",
      priceBreakdown,
      totalPrice: priceBreakdown.total,
      currency: "AED",
      goldPriceAtOrder: pricePerGram,
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.templates.captureFromDesign, {
      designId: args.designId,
      source: "order_promoted",
    });

    return orderId;
  },
});

export const get = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const order = await ctx.db.get(orderId);
    if (!order) return null;
    const design = await ctx.db.get(order.designId);
    const videoUrl = design?.videoStorageId
      ? await ctx.storage.getUrl(design.videoStorageId)
      : null;
    return { ...order, design, videoUrl };
  },
});

export const getRecent = query({
  handler: async (ctx) => {
    const orders = await ctx.db
      .query("orders")
      .order("desc")
      .take(10);

    const results = [];
    for (const order of orders) {
      const design = await ctx.db.get(order.designId);
      let imageUrl = null;
      if (design?.productImageStorageIds?.length) {
        const idx = design.selectedVariationIndex ?? 0;
        const sid = design.productImageStorageIds[idx] || design.productImageStorageIds[0];
        imageUrl = await ctx.storage.getUrl(sid);
      }
      results.push({
        _id: order._id,
        status: order.status,
        totalPrice: order.totalPrice,
        currency: order.currency,
        customerName: order.customerName,
        createdAt: order.createdAt,
        designName: design?.name || "Unknown",
        imageUrl,
      });
    }
    return results;
  },
});
