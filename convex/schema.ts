import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  designs: defineTable({
    // Design parameters
    name: v.string(),
    language: v.string(), // "en" | "ar" | "zh"
    font: v.string(),
    size: v.string(), // "small" | "medium" | "large"
    karat: v.string(), // "18K" | "21K" | "22K"
    style: v.string(), // "gold_only" | "gold_with_stones" | "gold_with_diamonds"

    // Reference image (optional)
    referenceType: v.optional(v.string()), // "search" | "gallery" | "upload"
    referenceUrl: v.optional(v.string()),
    referenceStorageId: v.optional(v.id("_storage")),

    // From scratch (optional)
    jewelryType: v.optional(v.string()),
    designStyle: v.optional(v.string()),

    // Generation status
    status: v.string(), // "generating" | "analyzing" | "engraving" | "completed" | "failed"
    analysisStep: v.optional(v.string()),
    analysisData: v.optional(
      v.object({
        jewelryType: v.optional(v.string()),
        metal: v.optional(v.string()),
        bestSpot: v.optional(v.string()),
      })
    ),
    error: v.optional(v.string()),

    // Text reference (Canvas-rendered name PNG)
    textReferenceStorageId: v.optional(v.id("_storage")),

    // Metal type (for background selection)
    metalType: v.optional(v.string()), // "yellow" | "rose" | "white"

    // Legacy (backward compat with existing data — remove after migration)
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
    selectedImageIndex: v.optional(v.number()),

    // Results — product shots (4 studio images)
    productImageStorageIds: v.optional(v.array(v.id("_storage"))),
    // Results — on-body shots (4 contextual images)
    onBodyImageStorageIds: v.optional(v.array(v.id("_storage"))),
    selectedVariationIndex: v.optional(v.number()), // 0-3 (which variation pair)
    regenerationsRemaining: v.number(),

    // Video (Veo 3.1 rotating animation)
    videoOperationId: v.optional(v.string()),
    videoStorageId: v.optional(v.id("_storage")),
    videoStatus: v.optional(v.string()), // "generating" | "completed" | "failed"

    // Featured flag (for landing page)
    featured: v.optional(v.boolean()),

    // Metadata
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_featured", ["featured"])
    .index("by_created", ["createdAt"]),

  goldPrices: defineTable({
    metalType: v.string(), // "XAU"
    currency: v.string(), // "AED", "USD"
    pricePerOzTroy: v.number(),
    pricePerGram: v.number(),
    price24k: v.optional(v.number()),
    price22k: v.optional(v.number()),
    price21k: v.optional(v.number()),
    price18k: v.optional(v.number()),
    fetchedAt: v.number(),
    source: v.string(), // "metalpriceapi"
  }).index("by_metal_currency", ["metalType", "currency"]),

  orders: defineTable({
    designId: v.id("designs"),
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.optional(v.string()),
    status: v.string(), // "confirmed" | "in_production" | "ready" | "delivered" | "cancelled"
    priceBreakdown: v.object({
      weight: v.number(),
      materialCost: v.number(),
      laborCost: v.number(),
      stoneCost: v.number(),
      markup: v.number(),
      total: v.number(),
      currency: v.string(),
      goldPricePerGram: v.number(),
      updatedAt: v.number(),
    }),
    totalPrice: v.number(),
    currency: v.string(),
    goldPriceAtOrder: v.number(),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_design", ["designId"]),

  inspirationImages: defineTable({
    imageUrl: v.string(),
    thumbnail: v.string(),
    title: v.string(),
    category: v.string(),
  }).index("by_category", ["category"]),

  rateLimits: defineTable({
    identifier: v.string(), // session ID or IP
    hour: v.number(),
    count: v.number(),
  }).index("by_identifier_hour", ["identifier", "hour"]),

  showcaseImages: defineTable({
    jewelryType: v.string(),
    designStyle: v.string(),
    imageStorageId: v.id("_storage"),
    metalType: v.string(),
    featured: v.boolean(),
  }).index("by_type_style", ["jewelryType", "designStyle"]),
});
