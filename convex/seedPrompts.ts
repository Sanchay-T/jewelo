"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  BASE_PROMPT_CONFIGS,
  BASE_PROMPT_PARTIALS,
  BASE_PROMPT_TEMPLATES,
} from "./lib/promptSeedData";

export const seed = internalAction({
  args: {},
  handler: async (ctx) => {
    const hasTemplates = await ctx.runQuery(internal.prompts.hasAnyTemplates, {});
    if (hasTemplates) {
      console.log("[seed] Already seeded — skipping");
      return { seeded: false, reason: "already exists" };
    }

    console.log("[seed] Seeding prompt templates, partials, and configs...");

    for (const template of BASE_PROMPT_TEMPLATES) {
      await ctx.runMutation(internal.seedHelpers.insertTemplate, {
        slug: template.slug,
        version: 1,
        name: template.name,
        template: template.template,
        isActive: true,
        createdAt: Date.now(),
      });
    }

    for (const partial of BASE_PROMPT_PARTIALS) {
      await ctx.runMutation(internal.seedHelpers.insertPartial, {
        slug: partial.slug,
        version: 1,
        name: partial.name,
        template: partial.template,
        isActive: true,
        createdAt: Date.now(),
      });
    }

    for (const config of BASE_PROMPT_CONFIGS) {
      await ctx.runMutation(internal.seedHelpers.insertConfig, {
        key: config.key,
        version: 1,
        data: JSON.stringify(config.data),
        isActive: true,
        createdAt: Date.now(),
      });
    }

    return {
      seeded: true,
      templates: BASE_PROMPT_TEMPLATES.length,
      partials: BASE_PROMPT_PARTIALS.length,
      configs: BASE_PROMPT_CONFIGS.length,
    };
  },
});
