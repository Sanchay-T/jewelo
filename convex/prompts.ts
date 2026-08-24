import {
  query,
  mutation,
  internalQuery,
  internalMutation,
  type QueryCtx,
  type MutationCtx,
} from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { v } from "convex/values";
import {
  BASE_PIPELINE_SLUG,
  BASE_PROMPT_CONFIGS,
  BASE_PROMPT_PARTIALS,
  BASE_PROMPT_TEMPLATES,
  BASE_RELEASE_SLUG,
  type PromptStageDefinition,
} from "./lib/promptSeedData";
import {
  DEFAULT_PIPELINE_DESCRIPTION,
  DEFAULT_PIPELINE_NAME,
  DEFAULT_RELEASE_NAME,
  type PromptEnvironment,
  allowPromptFallback,
  getDefaultPipelineStages,
  getPromptEnvironment,
  validatePipelineStages,
  validateReleaseBindings,
} from "./lib/promptControl";
import { checkAdminPassword, validateAdminPassword } from "./lib/adminAuth";

const TEMPLATE_VERSION_REF_VALIDATOR = v.object({
  slug: v.string(),
  version: v.number(),
});

const CONFIG_VERSION_REF_VALIDATOR = v.object({
  key: v.string(),
  version: v.number(),
});

const STAGE_VALIDATOR = v.object({
  stageKey: v.string(),
  stageType: v.string(),
  branch: v.string(),
  templateSlug: v.string(),
  note: v.optional(v.string()),
});

function maxVersion(items: Array<{ version: number }>) {
  return items.reduce((max, item) => Math.max(max, item.version), 0);
}

async function getTemplateVersionDoc(
  ctx: QueryCtx | MutationCtx,
  slug: string,
  version: number,
) : Promise<Doc<"promptTemplates"> | null> {
  const versions = await ctx.db
    .query("promptTemplates")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .collect();
  return versions.find((item) => item.version === version) ?? null;
}

async function getPartialVersionDoc(
  ctx: QueryCtx | MutationCtx,
  slug: string,
  version: number,
) : Promise<Doc<"promptPartials"> | null> {
  const versions = await ctx.db
    .query("promptPartials")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .collect();
  return versions.find((item) => item.version === version) ?? null;
}

async function getConfigVersionDoc(
  ctx: QueryCtx | MutationCtx,
  key: string,
  version: number,
) : Promise<Doc<"promptConfigs"> | null> {
  const versions = await ctx.db
    .query("promptConfigs")
    .withIndex("by_key", (q) => q.eq("key", key))
    .collect();
  return versions.find((item) => item.version === version) ?? null;
}

async function getPipelineVersionDoc(
  ctx: QueryCtx | MutationCtx,
  slug: string,
  version: number,
) : Promise<Doc<"promptPipelines"> | null> {
  const versions = await ctx.db
    .query("promptPipelines")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .collect();
  return versions.find((item) => item.version === version) ?? null;
}

async function resolveReleaseBundle(
  ctx: QueryCtx | MutationCtx,
  releaseDoc: Doc<"promptReleases"> | null,
  environment?: string,
) {
  if (!releaseDoc) return null;

  const pipelineDoc = await getPipelineVersionDoc(
    ctx,
    releaseDoc.pipelineSlug,
    releaseDoc.pipelineVersion
  );
  if (!pipelineDoc) return null;

  const [templates, partials, configs] = await Promise.all([
    Promise.all(
      releaseDoc.templateVersions.map((ref: { slug: string; version: number }) =>
        getTemplateVersionDoc(ctx, ref.slug, ref.version)
      )
    ),
    Promise.all(
      releaseDoc.partialVersions.map((ref: { slug: string; version: number }) =>
        getPartialVersionDoc(ctx, ref.slug, ref.version)
      )
    ),
    Promise.all(
      releaseDoc.configVersions.map((ref: { key: string; version: number }) =>
        getConfigVersionDoc(ctx, ref.key, ref.version)
      )
    ),
  ]);

  const resolvedEnvironment = (environment ?? getPromptEnvironment()) as PromptEnvironment;

  return {
    environment: resolvedEnvironment,
    allowFallback: allowPromptFallback(resolvedEnvironment),
    pipeline: {
      slug: pipelineDoc.slug,
      version: pipelineDoc.version,
      name: pipelineDoc.name,
      description: pipelineDoc.description,
      stages: pipelineDoc.stages,
    },
    release: {
      _id: releaseDoc._id,
      slug: releaseDoc.slug,
      version: releaseDoc.version,
      name: releaseDoc.name,
      pipelineSlug: releaseDoc.pipelineSlug,
      pipelineVersion: releaseDoc.pipelineVersion,
      templateVersions: releaseDoc.templateVersions,
      partialVersions: releaseDoc.partialVersions,
      configVersions: releaseDoc.configVersions,
      status: releaseDoc.status,
      validationErrors: releaseDoc.validationErrors,
      validatedAt: releaseDoc.validatedAt,
    },
    templates: templates.filter(Boolean),
    partials: partials.filter(Boolean),
    configs: configs.filter(Boolean),
  };
}

async function ensureAssetsSeeded(
  ctx: MutationCtx
) {
  const hasTemplates = await ctx.db.query("promptTemplates").first();
  if (!hasTemplates) {
    for (const template of BASE_PROMPT_TEMPLATES) {
      await ctx.db.insert("promptTemplates", {
        slug: template.slug,
        version: 1,
        name: template.name,
        template: template.template,
        isActive: true,
        createdAt: Date.now(),
      });
    }
  }

  const hasPartials = await ctx.db.query("promptPartials").first();
  if (!hasPartials) {
    for (const partial of BASE_PROMPT_PARTIALS) {
      await ctx.db.insert("promptPartials", {
        slug: partial.slug,
        version: 1,
        name: partial.name,
        template: partial.template,
        isActive: true,
        createdAt: Date.now(),
      });
    }
  }

  const hasConfigs = await ctx.db.query("promptConfigs").first();
  if (!hasConfigs) {
    for (const config of BASE_PROMPT_CONFIGS) {
      await ctx.db.insert("promptConfigs", {
        key: config.key,
        version: 1,
        data: JSON.stringify(config.data),
        isActive: true,
        createdAt: Date.now(),
      });
    }
  }
}

// Assets

export const listTemplates = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("promptTemplates").collect();
    const slugs = [...new Set(all.map((item) => item.slug))];
    return slugs.map((slug) => {
      const versions = all.filter((item) => item.slug === slug);
      const active = versions.find((item) => item.isActive);
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
    validateAdminPassword(args.password);

    const existing = await ctx.db
      .query("promptTemplates")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .collect();

    const version = maxVersion(existing) + 1;

    if (args.activate === true) {
      for (const item of existing) {
        if (item.isActive) await ctx.db.patch(item._id, { isActive: false });
      }
    }

    return await ctx.db.insert("promptTemplates", {
      slug: args.slug,
      version,
      name: args.name,
      template: args.template,
      isActive: args.activate === true,
      changeNote: args.changeNote,
      createdAt: Date.now(),
    });
  },
});

export const activateTemplateVersion = mutation({
  args: { password: v.string(), slug: v.string(), version: v.number() },
  handler: async (ctx, { password, slug, version }) => {
    validateAdminPassword(password);
    const all = await ctx.db
      .query("promptTemplates")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .collect();

    const target = all.find((item) => item.version === version);
    if (!target) throw new Error(`Version ${version} not found for ${slug}`);

    for (const item of all) {
      if (item.isActive) await ctx.db.patch(item._id, { isActive: false });
    }
    await ctx.db.patch(target._id, { isActive: true });
  },
});

export const listPartials = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("promptPartials").collect();
    const slugs = [...new Set(all.map((item) => item.slug))];
    return slugs.map((slug) => {
      const versions = all.filter((item) => item.slug === slug);
      const active = versions.find((item) => item.isActive);
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
    return all.filter((item) => item.isActive);
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
    validateAdminPassword(args.password);

    const existing = await ctx.db
      .query("promptPartials")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .collect();

    const version = maxVersion(existing) + 1;

    if (args.activate === true) {
      for (const item of existing) {
        if (item.isActive) await ctx.db.patch(item._id, { isActive: false });
      }
    }

    return await ctx.db.insert("promptPartials", {
      slug: args.slug,
      version,
      name: args.name,
      template: args.template,
      isActive: args.activate === true,
      changeNote: args.changeNote,
      createdAt: Date.now(),
    });
  },
});

export const activatePartialVersion = mutation({
  args: { password: v.string(), slug: v.string(), version: v.number() },
  handler: async (ctx, { password, slug, version }) => {
    validateAdminPassword(password);
    const all = await ctx.db
      .query("promptPartials")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .collect();

    const target = all.find((item) => item.version === version);
    if (!target) throw new Error(`Version ${version} not found for ${slug}`);

    for (const item of all) {
      if (item.isActive) await ctx.db.patch(item._id, { isActive: false });
    }
    await ctx.db.patch(target._id, { isActive: true });
  },
});

export const listConfigs = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("promptConfigs").collect();
    const keys = [...new Set(all.map((item) => item.key))];
    return keys.map((key) => {
      const versions = all.filter((item) => item.key === key);
      const active = versions.find((item) => item.isActive);
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

export const getAssetCatalog = query({
  args: {},
  handler: async (ctx) => {
    const [templates, partials, configs] = await Promise.all([
      ctx.db.query("promptTemplates").collect(),
      ctx.db.query("promptPartials").collect(),
      ctx.db.query("promptConfigs").collect(),
    ]);

    const templateCatalog = [...new Set(templates.map((item) => item.slug))]
      .sort((a, b) => a.localeCompare(b))
      .map((slug) => ({
        slug,
        versions: templates
          .filter((item) => item.slug === slug)
          .sort((a, b) => b.version - a.version)
          .map((item) => ({
            version: item.version,
            name: item.name,
            createdAt: item.createdAt,
          })),
      }));

    const partialCatalog = [...new Set(partials.map((item) => item.slug))]
      .sort((a, b) => a.localeCompare(b))
      .map((slug) => ({
        slug,
        versions: partials
          .filter((item) => item.slug === slug)
          .sort((a, b) => b.version - a.version)
          .map((item) => ({
            version: item.version,
            name: item.name,
            createdAt: item.createdAt,
          })),
      }));

    const configCatalog = [...new Set(configs.map((item) => item.key))]
      .sort((a, b) => a.localeCompare(b))
      .map((key) => ({
        key,
        versions: configs
          .filter((item) => item.key === key)
          .sort((a, b) => b.version - a.version)
          .map((item) => ({
            version: item.version,
            createdAt: item.createdAt,
          })),
      }));

    return {
      templates: templateCatalog,
      partials: partialCatalog,
      configs: configCatalog,
    };
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
    const active = all.filter((item) => item.isActive);
    const map: Record<string, unknown> = {};
    for (const item of active) {
      map[item.key] = JSON.parse(item.data);
    }
    return map;
  },
});

export const getActivePromptSnapshot = internalQuery({
  args: {},
  handler: async (ctx) => {
    const [templates, partials, configs] = await Promise.all([
      ctx.db.query("promptTemplates").collect(),
      ctx.db.query("promptPartials").collect(),
      ctx.db.query("promptConfigs").collect(),
    ]);

    return {
      templates: templates
        .filter((item) => item.isActive)
        .map((item) => ({ slug: item.slug, version: item.version })),
      partials: partials
        .filter((item) => item.isActive)
        .map((item) => ({ slug: item.slug, version: item.version })),
      configs: configs
        .filter((item) => item.isActive)
        .map((item) => ({ key: item.key, version: item.version })),
    };
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
    validateAdminPassword(args.password);
    try {
      JSON.parse(args.data);
    } catch {
      throw new Error("Invalid JSON data");
    }

    const existing = await ctx.db
      .query("promptConfigs")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .collect();

    const version = maxVersion(existing) + 1;

    if (args.activate === true) {
      for (const item of existing) {
        if (item.isActive) await ctx.db.patch(item._id, { isActive: false });
      }
    }

    return await ctx.db.insert("promptConfigs", {
      key: args.key,
      version,
      data: args.data,
      isActive: args.activate === true,
      changeNote: args.changeNote,
      createdAt: Date.now(),
    });
  },
});

export const activateConfigVersion = mutation({
  args: { password: v.string(), key: v.string(), version: v.number() },
  handler: async (ctx, { password, key, version }) => {
    validateAdminPassword(password);
    const all = await ctx.db
      .query("promptConfigs")
      .withIndex("by_key", (q) => q.eq("key", key))
      .collect();

    const target = all.find((item) => item.version === version);
    if (!target) throw new Error(`Version ${version} not found for ${key}`);

    for (const item of all) {
      if (item.isActive) await ctx.db.patch(item._id, { isActive: false });
    }
    await ctx.db.patch(target._id, { isActive: true });
  },
});

// Pipelines

export const listPipelines = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("promptPipelines").collect();
    const slugs = [...new Set(all.map((item) => item.slug))];
    return slugs.map((slug) => {
      const versions = all.filter((item) => item.slug === slug);
      const latestVersion = versions.reduce(
        (latest, item) => (item.version > latest.version ? item : latest),
        versions[0]
      );
      return {
        slug,
        latestVersion: latestVersion.version,
        latestName: latestVersion.name,
        versionCount: versions.length,
        stageCount: latestVersion.stages.length,
      };
    });
  },
});

export const getPipelineVersions = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("promptPipelines")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .collect();
  },
});

export const createPipelineVersion = mutation({
  args: {
    password: v.string(),
    slug: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    stages: v.array(STAGE_VALIDATOR),
  },
  handler: async (ctx, args) => {
    validateAdminPassword(args.password);
    const errors = validatePipelineStages(args.stages as PromptStageDefinition[]);
    if (errors.length > 0) {
      throw new Error(errors.join(" "));
    }

    const existing = await ctx.db
      .query("promptPipelines")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .collect();

    return await ctx.db.insert("promptPipelines", {
      slug: args.slug,
      version: maxVersion(existing) + 1,
      name: args.name,
      description: args.description,
      stages: args.stages,
      createdAt: Date.now(),
    });
  },
});

// Releases

export const listReleases = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("promptReleases").collect();
    const slugs = [...new Set(all.map((item) => item.slug))];
    return slugs.map((slug) => {
      const versions = all.filter((item) => item.slug === slug);
      const latestVersion = versions.reduce(
        (latest, item) => (item.version > latest.version ? item : latest),
        versions[0]
      );
      return {
        slug,
        latestVersion: latestVersion.version,
        latestName: latestVersion.name,
        status: latestVersion.status,
        validationErrors: latestVersion.validationErrors,
        pipelineSlug: latestVersion.pipelineSlug,
        pipelineVersion: latestVersion.pipelineVersion,
        versionCount: versions.length,
      };
    });
  },
});

export const getReleaseVersions = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("promptReleases")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .collect();
  },
});

export const createReleaseVersion = mutation({
  args: {
    password: v.string(),
    slug: v.string(),
    name: v.string(),
    pipelineSlug: v.string(),
    pipelineVersion: v.number(),
    templateVersions: v.array(TEMPLATE_VERSION_REF_VALIDATOR),
    partialVersions: v.array(TEMPLATE_VERSION_REF_VALIDATOR),
    configVersions: v.array(CONFIG_VERSION_REF_VALIDATOR),
  },
  handler: async (ctx, args) => {
    validateAdminPassword(args.password);
    const pipeline = await getPipelineVersionDoc(ctx, args.pipelineSlug, args.pipelineVersion);
    if (!pipeline) {
      throw new Error(`Pipeline ${args.pipelineSlug} v${args.pipelineVersion} not found`);
    }

    const validationErrors = validateReleaseBindings(
      {
        slug: pipeline.slug,
        version: pipeline.version,
        name: pipeline.name,
        description: pipeline.description,
        stages: pipeline.stages as PromptStageDefinition[],
      },
      {
        templateVersions: args.templateVersions,
        partialVersions: args.partialVersions,
        configVersions: args.configVersions,
      }
    );

    const existing = await ctx.db
      .query("promptReleases")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .collect();

    return await ctx.db.insert("promptReleases", {
      slug: args.slug,
      version: maxVersion(existing) + 1,
      name: args.name,
      pipelineSlug: args.pipelineSlug,
      pipelineVersion: args.pipelineVersion,
      templateVersions: args.templateVersions,
      partialVersions: args.partialVersions,
      configVersions: args.configVersions,
      status: "draft",
      validationErrors,
      createdAt: Date.now(),
    });
  },
});

export const updateReleaseValidationState = internalMutation({
  args: {
    releaseId: v.id("promptReleases"),
    status: v.string(),
    validationErrors: v.array(v.string()),
    validatedAt: v.optional(v.number()),
  },
  handler: async (ctx, { releaseId, ...patch }) => {
    await ctx.db.patch(releaseId, patch);
  },
});

export const archiveReleaseVersion = mutation({
  args: { password: v.string(), releaseId: v.id("promptReleases") },
  handler: async (ctx, { password, releaseId }) => {
    validateAdminPassword(password);
    await ctx.db.patch(releaseId, { status: "archived" });
  },
});

export const listValidatedReleases = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("promptReleases")
      .withIndex("by_status", (q) => q.eq("status", "validated"))
      .collect();
  },
});

// Environments

export const getRuntimeEnvironment = query({
  args: {},
  handler: async () => {
    return getPromptEnvironment();
  },
});

export const listEnvironmentActivations = query({
  args: {},
  handler: async (ctx) => {
    const activations = await ctx.db.query("promptEnvironmentActivations").collect();
    return activations.sort((a, b) => a.environment.localeCompare(b.environment));
  },
});

export const activateReleaseForEnvironment = mutation({
  args: {
    password: v.string(),
    environment: v.string(),
    releaseId: v.id("promptReleases"),
  },
  handler: async (ctx, { password, environment, releaseId }) => {
    validateAdminPassword(password);
    const release = await ctx.db.get(releaseId);
    if (!release) throw new Error("Release not found");
    if (release.status !== "validated") {
      throw new Error("Only validated releases can be activated");
    }

    const existing = await ctx.db
      .query("promptEnvironmentActivations")
      .withIndex("by_environment", (q) => q.eq("environment", environment))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        releaseId,
        releaseSlug: release.slug,
        releaseVersion: release.version,
        activatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("promptEnvironmentActivations", {
      environment,
      releaseId,
      releaseSlug: release.slug,
      releaseVersion: release.version,
      activatedAt: Date.now(),
    });
  },
});

// Bundle resolution

export const getReleaseBundleByVersion = internalQuery({
  args: {
    slug: v.string(),
    version: v.number(),
    environment: v.optional(v.string()),
  },
  handler: async (ctx, { slug, version, environment }) => {
    const versions = await ctx.db
      .query("promptReleases")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .collect();
    const release = versions.find((item) => item.version === version) ?? null;
    return await resolveReleaseBundle(ctx, release, environment);
  },
});

export const getResolvedActiveReleaseBundle = internalQuery({
  args: { environment: v.optional(v.string()) },
  handler: async (ctx, { environment }) => {
    const resolvedEnvironment = environment ?? getPromptEnvironment();
    const activation = await ctx.db
      .query("promptEnvironmentActivations")
      .withIndex("by_environment", (q) => q.eq("environment", resolvedEnvironment))
      .unique();

    if (!activation) return null;

    const release = await ctx.db.get(activation.releaseId);
    return await resolveReleaseBundle(ctx, release, resolvedEnvironment);
  },
});

export const listReleaseStageBindings = query({
  args: { slug: v.string(), version: v.number() },
  handler: async (ctx, { slug, version }) => {
    const versions = await ctx.db
      .query("promptReleases")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .collect();
    const release = versions.find((item) => item.version === version) ?? null;
    const bundle = await resolveReleaseBundle(ctx, release);

    if (!bundle) return null;

    return (bundle.pipeline.stages as PromptStageDefinition[]).map((stage) => {
      const binding = bundle.release.templateVersions.find(
        (item: { slug: string; version: number }) => item.slug === stage.templateSlug
      );
      return {
        ...stage,
        templateVersion: binding?.version ?? null,
      };
    });
  },
});

// Bootstrap and admin utilities

export const seedBaselinePromptControl = mutation({
  args: { password: v.string() },
  handler: async (ctx, { password }) => {
    validateAdminPassword(password);
    await ensureAssetsSeeded(ctx);

    const pipelineVersions = await ctx.db
      .query("promptPipelines")
      .withIndex("by_slug", (q) => q.eq("slug", BASE_PIPELINE_SLUG))
      .collect();

    let pipelineVersion = pipelineVersions.find((item) => item.version === 1) ?? undefined;
    if (!pipelineVersion) {
      const pipelineId = await ctx.db.insert("promptPipelines", {
        slug: BASE_PIPELINE_SLUG,
        version: 1,
        name: DEFAULT_PIPELINE_NAME,
        description: DEFAULT_PIPELINE_DESCRIPTION,
        stages: getDefaultPipelineStages(),
        createdAt: Date.now(),
      });
      const insertedPipeline = await ctx.db.get(pipelineId);
      if (!insertedPipeline) {
        throw new Error("Failed to create baseline pipeline");
      }
      pipelineVersion = insertedPipeline;
    }

    const templateVersions = BASE_PROMPT_TEMPLATES.map((item) => ({
      slug: item.slug,
      version: 1,
    }));
    const partialVersions = BASE_PROMPT_PARTIALS.map((item) => ({
      slug: item.slug,
      version: 1,
    }));
    const configVersions = BASE_PROMPT_CONFIGS.map((item) => ({
      key: item.key,
      version: 1,
    }));

    const existingReleases = await ctx.db
      .query("promptReleases")
      .withIndex("by_slug", (q) => q.eq("slug", BASE_RELEASE_SLUG))
      .collect();

    let release = existingReleases.find((item) => item.version === 1) ?? undefined;
    if (!release) {
      const validationErrors = validateReleaseBindings(
        {
          slug: pipelineVersion.slug,
          version: pipelineVersion.version,
          name: pipelineVersion.name,
          description: pipelineVersion.description,
          stages: pipelineVersion.stages as PromptStageDefinition[],
        },
        { templateVersions, partialVersions, configVersions }
      );

      const releaseId = await ctx.db.insert("promptReleases", {
        slug: BASE_RELEASE_SLUG,
        version: 1,
        name: DEFAULT_RELEASE_NAME,
        pipelineSlug: pipelineVersion.slug,
        pipelineVersion: pipelineVersion.version,
        templateVersions,
        partialVersions,
        configVersions,
        status: validationErrors.length === 0 ? "validated" : "draft",
        validationErrors,
        validatedAt: validationErrors.length === 0 ? Date.now() : undefined,
        createdAt: Date.now(),
      });
      const insertedRelease = await ctx.db.get(releaseId);
      if (!insertedRelease) {
        throw new Error("Failed to create baseline release");
      }
      release = insertedRelease;
    }

    const environment = getPromptEnvironment();
    if (release && release.status === "validated") {
      const activation = await ctx.db
        .query("promptEnvironmentActivations")
        .withIndex("by_environment", (q) => q.eq("environment", environment))
        .unique();

      if (activation) {
        await ctx.db.patch(activation._id, {
          releaseId: release._id,
          releaseSlug: release.slug,
          releaseVersion: release.version,
          activatedAt: Date.now(),
        });
      } else {
        await ctx.db.insert("promptEnvironmentActivations", {
          environment,
          releaseId: release._id,
          releaseSlug: release.slug,
          releaseVersion: release.version,
          activatedAt: Date.now(),
        });
      }
    }

    return {
      environment,
      pipeline: pipelineVersion
        ? { slug: pipelineVersion.slug, version: pipelineVersion.version }
        : null,
      release: release
        ? { slug: release.slug, version: release.version, status: release.status }
        : null,
    };
  },
});

export const getAdminOverview = query({
  args: {},
  handler: async (ctx) => {
    const [
      templates,
      partials,
      configs,
      pipelines,
      releases,
      activations,
    ] = await Promise.all([
      ctx.db.query("promptTemplates").collect(),
      ctx.db.query("promptPartials").collect(),
      ctx.db.query("promptConfigs").collect(),
      ctx.db.query("promptPipelines").collect(),
      ctx.db.query("promptReleases").collect(),
      ctx.db.query("promptEnvironmentActivations").collect(),
    ]);

    return {
      counts: {
        templates: templates.length,
        partials: partials.length,
        configs: configs.length,
        pipelines: pipelines.length,
        releases: releases.length,
      },
      activations,
      runtimeEnvironment: getPromptEnvironment(),
    };
  },
});

export const checkPassword = query({
  args: { password: v.string() },
  handler: async (_ctx, { password }) => {
    return checkAdminPassword(password);
  },
});
