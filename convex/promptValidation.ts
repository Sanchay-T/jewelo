"use node";

import { action } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import {
  buildPromptContext,
  fetchResolvedPromptBundleByVersion,
  resolveStagePrompt,
  type DesignInputForEngine,
  type PromptStageKey,
} from "./lib/promptEngine";
import type { ResolvedPromptReleaseBundle } from "./lib/promptControl";

type Scenario = {
  label: "fromScratch" | "reference";
  hasReference: boolean;
};

const SCENARIOS: Scenario[] = [
  { label: "fromScratch", hasReference: false },
  { label: "reference", hasReference: true },
];

function buildSampleInput(hasReference: boolean): DesignInputForEngine {
  return {
    name: hasReference ? "Aaliyah" : "Layla",
    language: "en",
    font: "script",
    size: "large",
    karat: "21K",
    style: hasReference ? "gold_with_diamonds" : "gold_only",
    metalType: "yellow",
    jewelryType: "name_pendant",
    designStyle: "minimalist",
    styleFamily: "minimalist",
    complexity: hasReference ? 7 : 5,
    gemstones: hasReference ? ["diamond"] : [],
    additionalInfo: {
      occasion: "birthday gift",
      metalFinish: "polished",
      notes: hasReference ? "Use the uploaded inspiration as the hero style reference." : "Prioritize readable lettering and elegant chain balance.",
    },
  };
}

function stageRunsInScenario(stage: { branch: string }, scenario: Scenario) {
  if (stage.branch === "always") return true;
  if (stage.branch === "has_reference") return scenario.hasReference;
  if (stage.branch === "from_scratch") return !scenario.hasReference;
  return false;
}

async function buildScenarioPreviews(
  ctx: ActionCtx,
  bundle: ResolvedPromptReleaseBundle,
  scenario: Scenario,
) {
  const sample = buildSampleInput(scenario.hasReference);
  const previews: Array<{
    stageKey: string;
    templateSlug: string;
    prompt: string;
  }> = [];

  for (let variationIndex = 0; variationIndex < 1; variationIndex += 1) {
    const context = buildPromptContext(
      sample,
      variationIndex,
      bundle.configs.reduce<Record<string, unknown>>((acc, config) => {
        if (config.data) acc[config.key] = JSON.parse(config.data);
        return acc;
      }, {}),
      { hasReference: scenario.hasReference }
    );

    const stages = bundle.pipeline.stages.filter((stage) => stageRunsInScenario(stage, scenario));
    for (const stage of stages) {
      const resolved = await resolveStagePrompt(
        ctx,
        stage.stageKey as PromptStageKey,
        context,
        undefined,
        bundle
      );
      previews.push({
        stageKey: stage.stageKey,
        templateSlug: stage.templateSlug,
        prompt: resolved.prompt,
      });
    }
  }

  return previews;
}

export const dryRunRelease = action({
  args: {
    slug: v.string(),
    version: v.number(),
    environment: v.optional(v.string()),
  },
  handler: async (ctx, { slug, version, environment }) => {
    const bundle = await fetchResolvedPromptBundleByVersion(
      ctx,
      slug,
      version,
      (environment as "dev" | "staging" | "production" | undefined) ?? "production"
    );

    if (!bundle) {
      throw new Error(`Release ${slug} v${version} could not be resolved`);
    }

    const scenarios = await Promise.all(
      SCENARIOS.map(async (scenario) => ({
        label: scenario.label,
        previews: await buildScenarioPreviews(ctx, bundle, scenario),
      }))
    );

    return {
      environment: bundle.environment,
      release: {
        slug: bundle.release.slug,
        version: bundle.release.version,
        name: bundle.release.name,
        status: bundle.release.status,
      },
      pipeline: {
        slug: bundle.pipeline.slug,
        version: bundle.pipeline.version,
        name: bundle.pipeline.name,
      },
      scenarios,
    };
  },
});

export const validateRelease = action({
  args: {
    slug: v.string(),
    version: v.number(),
  },
  handler: async (ctx, { slug, version }) => {
    const bundle = await fetchResolvedPromptBundleByVersion(ctx, slug, version, "production");
    if (!bundle) {
      throw new Error(`Release ${slug} v${version} could not be resolved`);
    }

    const errors = [...bundle.release.validationErrors];

    for (const scenario of SCENARIOS) {
      try {
        await buildScenarioPreviews(ctx, bundle, scenario);
      } catch (error) {
        errors.push(
          `${scenario.label}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    const validationErrors = [...new Set(errors)];
    await ctx.runMutation(internal.prompts.updateReleaseValidationState, {
      releaseId: bundle.release._id as never,
      status: validationErrors.length === 0 ? "validated" : "draft",
      validationErrors,
      validatedAt: validationErrors.length === 0 ? Date.now() : undefined,
    });

    return {
      valid: validationErrors.length === 0,
      errors: validationErrors,
      release: {
        slug: bundle.release.slug,
        version: bundle.release.version,
      },
    };
  },
});
