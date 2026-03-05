import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";

type TemplateRecord = Doc<"inspirationTemplates">;

function profileFromGemstones(gemstones: readonly string[]): string {
  if (!gemstones.length) return "none";
  if (gemstones.length === 1 && gemstones[0] === "diamond") return "diamond";
  if (gemstones.includes("diamond")) return "mixed";
  return "colored";
}

function matchesFilters(
  row: TemplateRecord,
  filters: {
    jewelryType?: string;
    styleFamily?: string;
    complexity?: number;
    gender?: string;
    gemstones?: readonly string[];
  },
): boolean {
  if (filters.jewelryType && row.jewelryType !== filters.jewelryType) return false;
  if (filters.styleFamily && row.styleFamily !== filters.styleFamily) return false;
  if (filters.gender && row.gender !== filters.gender && row.gender !== "unisex") return false;
  if (typeof filters.complexity === "number" && Math.abs(row.complexity - filters.complexity) > 1) return false;
  if (filters.gemstones?.length) {
    const desired = profileFromGemstones(filters.gemstones);
    if (desired !== row.stoneProfile) return false;
  }
  return true;
}

export const getFiltered = query({
  args: {
    jewelryType: v.optional(v.string()),
    styleFamily: v.optional(v.string()),
    complexity: v.optional(v.number()),
    gender: v.optional(v.string()),
    gemstones: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 24, 60);
    const active = await ctx.db
      .query("inspirationTemplates")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();

    const filtered = active
      .filter((row) =>
        matchesFilters(row as TemplateRecord, {
          jewelryType: args.jewelryType,
          styleFamily: args.styleFamily,
          complexity: args.complexity,
          gender: args.gender,
          gemstones: args.gemstones,
        }),
      )
      .slice(0, limit);

    return Promise.all(
      filtered.map(async (row) => ({
        ...row,
        imageUrl:
          row.imageUrl ||
          (row.imageStorageId ? await ctx.storage.getUrl(row.imageStorageId) : null),
      })),
    );
  },
});

export const getRandom = mutation({
  args: {
    jewelryType: v.optional(v.string()),
    styleFamily: v.optional(v.string()),
    complexity: v.optional(v.number()),
    gender: v.optional(v.string()),
    gemstones: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const active = await ctx.db
      .query("inspirationTemplates")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();

    const candidates = active.filter((row) =>
      matchesFilters(row as TemplateRecord, {
        jewelryType: args.jewelryType,
        styleFamily: args.styleFamily,
        complexity: args.complexity,
        gender: args.gender,
        gemstones: args.gemstones,
      }),
    );

    if (candidates.length === 0) return null;
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    await ctx.db.patch(picked._id, { uses: (picked.uses || 0) + 1, updatedAt: Date.now() });

    return {
      ...picked,
      imageUrl:
        picked.imageUrl ||
        (picked.imageStorageId ? await ctx.storage.getUrl(picked.imageStorageId) : null),
    };
  },
});

export const captureFromDesign = internalMutation({
  args: {
    designId: v.id("designs"),
    source: v.string(), // "gallery_promoted" | "order_promoted"
  },
  handler: async (ctx, { designId, source }) => {
    const design = await ctx.db.get(designId);
    if (!design?.productImageStorageIds?.length) return;

    const storageId = design.productImageStorageIds[design.selectedVariationIndex ?? 0] || design.productImageStorageIds[0];
    if (!storageId) return;

    await ctx.db.insert("inspirationTemplates", {
      jewelryType: design.jewelryType || "name_pendant",
      styleFamily: design.styleFamily || design.designStyle || "minimalist",
      complexity: Math.max(1, Math.min(10, Math.round(design.complexity || 5))),
      gender: design.gender || "unisex",
      gemstones: design.gemstones || [],
      stoneProfile: profileFromGemstones(design.gemstones || []),
      imageStorageId: storageId,
      source,
      active: source === "order_promoted",
      uses: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

function normalizeStyleFamily(designStyle?: string): string {
  const value = (designStyle || "").toLowerCase();
  if (value.includes("floral")) return "floral";
  if (value.includes("deco")) return "art_deco";
  if (value.includes("vintage")) return "vintage";
  if (value.includes("modern")) return "modern";
  if (value.includes("arabic")) return "arabic";
  return "minimalist";
}

export const seedFromShowcase = mutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const max = Math.min(limit ?? 50, 200);
    const showcase = await ctx.db.query("showcaseImages").take(max);
    let created = 0;

    for (const item of showcase) {
      const existing = await ctx.db
        .query("inspirationTemplates")
        .withIndex("by_filter", (q) =>
          q.eq("jewelryType", item.jewelryType).eq("styleFamily", normalizeStyleFamily(item.designStyle)).eq("complexity", 5),
        )
        .collect();

      const duplicate = existing.find(
        (row) => row.imageStorageId === item.imageStorageId,
      );
      if (duplicate) continue;

      await ctx.db.insert("inspirationTemplates", {
        jewelryType: item.jewelryType,
        styleFamily: normalizeStyleFamily(item.designStyle),
        complexity: 5,
        gender: "unisex",
        gemstones: [],
        stoneProfile: "none",
        imageStorageId: item.imageStorageId,
        source: "seed",
        active: true,
        uses: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      created += 1;
    }

    return { scanned: showcase.length, created };
  },
});

export const seedFromCompletedDesigns = mutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const max = Math.min(limit ?? 100, 300);
    const completed = await ctx.db
      .query("designs")
      .withIndex("by_status", (q) => q.eq("status", "completed"))
      .order("desc")
      .take(max);

    let created = 0;
    for (const design of completed) {
      const sid =
        design.productImageStorageIds?.[design.selectedVariationIndex ?? 0] ||
        design.productImageStorageIds?.[0];
      if (!sid) continue;

      const jewelryType = design.jewelryType || "name_pendant";
      const styleFamily = design.styleFamily || normalizeStyleFamily(design.designStyle);
      const complexity = Math.max(1, Math.min(10, Math.round(design.complexity || 5)));
      const existing = await ctx.db
        .query("inspirationTemplates")
        .withIndex("by_filter", (q) =>
          q.eq("jewelryType", jewelryType).eq("styleFamily", styleFamily).eq("complexity", complexity),
        )
        .collect();
      if (existing.some((row) => row.imageStorageId === sid)) continue;

      await ctx.db.insert("inspirationTemplates", {
        jewelryType,
        styleFamily,
        complexity,
        gender: design.gender || "unisex",
        gemstones: design.gemstones || [],
        stoneProfile: profileFromGemstones(design.gemstones || []),
        imageStorageId: sid,
        source: "seed",
        active: true,
        uses: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      created += 1;
    }

    return { scanned: completed.length, created };
  },
});
