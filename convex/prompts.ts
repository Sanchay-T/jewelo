import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// ── Auth helper ───────────────────────────────────────────────────────
function validatePassword(password: string) {
  const adminPw = process.env.ADMIN_PASSWORD;
  if (!adminPw) throw new Error("ADMIN_PASSWORD not configured");
  if (password !== adminPw) throw new Error("Unauthorized");
}

// ══════════════════════════════════════════════════════════════════════
// TEMPLATES
// ══════════════════════════════════════════════════════════════════════

export const listTemplates = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("promptTemplates").collect();
    const slugs = [...new Set(all.map((t) => t.slug))];
    return slugs.map((slug) => {
      const versions = all.filter((t) => t.slug === slug);
      const active = versions.find((t) => t.isActive);
      return {
        slug,
        activeVersion: active?.version ?? null,
        activeName: active?.name ?? slug,
        versionCount: versions.length,
      };
    });
  },
});

export const getTemplateVersions = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("promptTemplates")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .collect();
  },
});

export const hasAnyTemplates = internalQuery({
  args: {},
  handler: async (ctx) => {
    const first = await ctx.db.query("promptTemplates").first();
    return first !== null;
  },
});

export const getActiveTemplate = internalQuery({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const results = await ctx.db
      .query("promptTemplates")
      .withIndex("by_slug_active", (q) => q.eq("slug", slug).eq("isActive", true))
      .collect();
    return results[0] ?? null;
  },
});

export const createTemplateVersion = mutation({
  args: {
    password: v.string(),
    slug: v.string(),
    name: v.string(),
    template: v.string(),
    changeNote: v.optional(v.string()),
    activate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    validatePassword(args.password);

    const existing = await ctx.db
      .query("promptTemplates")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .collect();

    const maxVersion = existing.reduce((max, t) => Math.max(max, t.version), 0);
    const newVersion = maxVersion + 1;

    if (args.activate !== false) {
      for (const t of existing) {
        if (t.isActive) {
          await ctx.db.patch(t._id, { isActive: false });
        }
      }
    }

    return await ctx.db.insert("promptTemplates", {
      slug: args.slug,
      version: newVersion,
      name: args.name,
      template: args.template,
      isActive: args.activate !== false,
      changeNote: args.changeNote,
      createdAt: Date.now(),
    });
  },
});

export const activateTemplateVersion = mutation({
  args: { password: v.string(), slug: v.string(), version: v.number() },
  handler: async (ctx, { password, slug, version }) => {
    validatePassword(password);

    const all = await ctx.db
      .query("promptTemplates")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .collect();

    const target = all.find((t) => t.version === version);
    if (!target) throw new Error(`Version ${version} not found for ${slug}`);

    for (const t of all) {
      if (t.isActive) await ctx.db.patch(t._id, { isActive: false });
    }
    await ctx.db.patch(target._id, { isActive: true });
  },
});

// ══════════════════════════════════════════════════════════════════════
// PARTIALS
// ══════════════════════════════════════════════════════════════════════

export const listPartials = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("promptPartials").collect();
    const slugs = [...new Set(all.map((p) => p.slug))];
    return slugs.map((slug) => {
      const versions = all.filter((p) => p.slug === slug);
      const active = versions.find((p) => p.isActive);
      return {
        slug,
        activeVersion: active?.version ?? null,
        activeName: active?.name ?? slug,
        versionCount: versions.length,
      };
    });
  },
});

export const getPartialVersions = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("promptPartials")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .collect();
  },
});

export const getAllActivePartials = internalQuery({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("promptPartials").collect();
    return all.filter((p) => p.isActive);
  },
});

export const createPartialVersion = mutation({
  args: {
    password: v.string(),
    slug: v.string(),
    name: v.string(),
    template: v.string(),
    changeNote: v.optional(v.string()),
    activate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    validatePassword(args.password);

    const existing = await ctx.db
      .query("promptPartials")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .collect();

    const maxVersion = existing.reduce((max, p) => Math.max(max, p.version), 0);

    if (args.activate !== false) {
      for (const p of existing) {
        if (p.isActive) await ctx.db.patch(p._id, { isActive: false });
      }
    }

    return await ctx.db.insert("promptPartials", {
      slug: args.slug,
      version: maxVersion + 1,
      name: args.name,
      template: args.template,
      isActive: args.activate !== false,
      changeNote: args.changeNote,
      createdAt: Date.now(),
    });
  },
});

export const activatePartialVersion = mutation({
  args: { password: v.string(), slug: v.string(), version: v.number() },
  handler: async (ctx, { password, slug, version }) => {
    validatePassword(password);

    const all = await ctx.db
      .query("promptPartials")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .collect();

    const target = all.find((p) => p.version === version);
    if (!target) throw new Error(`Version ${version} not found for ${slug}`);

    for (const p of all) {
      if (p.isActive) await ctx.db.patch(p._id, { isActive: false });
    }
    await ctx.db.patch(target._id, { isActive: true });
  },
});

// ══════════════════════════════════════════════════════════════════════
// CONFIGS
// ══════════════════════════════════════════════════════════════════════

export const listConfigs = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("promptConfigs").collect();
    const keys = [...new Set(all.map((c) => c.key))];
    return keys.map((key) => {
      const versions = all.filter((c) => c.key === key);
      const active = versions.find((c) => c.isActive);
      return {
        key,
        activeVersion: active?.version ?? null,
        versionCount: versions.length,
      };
    });
  },
});

export const getConfigVersions = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    return await ctx.db
      .query("promptConfigs")
      .withIndex("by_key", (q) => q.eq("key", key))
      .collect();
  },
});

export const getActiveConfig = internalQuery({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const results = await ctx.db
      .query("promptConfigs")
      .withIndex("by_key_active", (q) => q.eq("key", key).eq("isActive", true))
      .collect();
    return results[0] ?? null;
  },
});

export const getAllActiveConfigs = internalQuery({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("promptConfigs").collect();
    const active = all.filter((c) => c.isActive);
    const map: Record<string, any> = {};
    for (const c of active) {
      map[c.key] = JSON.parse(c.data);
    }
    return map;
  },
});

export const createConfigVersion = mutation({
  args: {
    password: v.string(),
    key: v.string(),
    data: v.string(),
    changeNote: v.optional(v.string()),
    activate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    validatePassword(args.password);

    // Validate JSON
    try {
      JSON.parse(args.data);
    } catch {
      throw new Error("Invalid JSON data");
    }

    const existing = await ctx.db
      .query("promptConfigs")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .collect();

    const maxVersion = existing.reduce((max, c) => Math.max(max, c.version), 0);

    if (args.activate !== false) {
      for (const c of existing) {
        if (c.isActive) await ctx.db.patch(c._id, { isActive: false });
      }
    }

    return await ctx.db.insert("promptConfigs", {
      key: args.key,
      version: maxVersion + 1,
      data: args.data,
      isActive: args.activate !== false,
      changeNote: args.changeNote,
      createdAt: Date.now(),
    });
  },
});

export const activateConfigVersion = mutation({
  args: { password: v.string(), key: v.string(), version: v.number() },
  handler: async (ctx, { password, key, version }) => {
    validatePassword(password);

    const all = await ctx.db
      .query("promptConfigs")
      .withIndex("by_key", (q) => q.eq("key", key))
      .collect();

    const target = all.find((c) => c.version === version);
    if (!target) throw new Error(`Version ${version} not found for ${key}`);

    for (const c of all) {
      if (c.isActive) await ctx.db.patch(c._id, { isActive: false });
    }
    await ctx.db.patch(target._id, { isActive: true });
  },
});

// ── Admin password check ──────────────────────────────────────────────
export const checkPassword = query({
  args: { password: v.string() },
  handler: async (_ctx, { password }) => {
    const adminPw = process.env.ADMIN_PASSWORD;
    if (!adminPw) return false;
    return password === adminPw;
  },
});
