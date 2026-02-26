import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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

    // Server-side price calculation
    const karatFactor: Record<string, number> = { "18K": 0.750, "21K": 0.875, "22K": 0.916 };
    const weightMap: Record<string, number> = { small: 2.5, medium: 4.0, large: 6.5 };
    const laborMap: Record<string, number> = { small: 150, medium: 250, large: 400 };

    const weight = weightMap[design.size] || 4.0;
    const goldContent = weight * (karatFactor[design.karat] || 0.875);
    const materialCost = Math.round(goldContent * pricePerGram);
    const laborCost = laborMap[design.size] || 250;
    const stoneCost = 0;
    const subtotal = materialCost + laborCost + stoneCost;
    const markupPercent = design.style === "gold_only" ? 80 : design.style === "gold_with_stones" ? 100 : 120;
    const markup = Math.round(subtotal * (markupPercent / 100));
    const total = subtotal + markup;

    const priceBreakdown = {
      weight,
      materialCost,
      laborCost,
      stoneCost,
      markup,
      total,
      currency: "AED",
      goldPricePerGram: pricePerGram,
      updatedAt: Date.now(),
    };

    const orderId = await ctx.db.insert("orders", {
      designId: args.designId,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      customerEmail: args.customerEmail,
      status: "confirmed",
      priceBreakdown,
      totalPrice: total,
      currency: "AED",
      goldPriceAtOrder: pricePerGram,
      createdAt: Date.now(),
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
    return { ...order, design };
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
