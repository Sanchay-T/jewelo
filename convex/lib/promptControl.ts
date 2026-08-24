import {
  BASE_PIPELINE_SLUG,
  BASE_PROMPT_PIPELINE_STAGES,
  BASE_RELEASE_SLUG,
  REQUIRED_PROMPT_CONFIG_KEYS,
  type PromptStageDefinition,
} from "./promptSeedData";
import type { Id } from "../_generated/dataModel";

export type PromptEnvironment = "dev" | "staging" | "production";

export type PromptTemplateVersionRef = {
  slug: string;
  version: number;
};

export type PromptConfigVersionRef = {
  key: string;
  version: number;
};

export type PromptStageSnapshot = {
  stageKey: string;
  stageType: string;
  branch: string;
  templateSlug: string;
  templateVersion?: number;
  usedFallback: boolean;
  fallbackReason?: string;
};

export type PromptExecutionSnapshot = {
  environment?: string;
  mode?: string;
  release?: {
    slug: string;
    version: number;
  };
  pipeline?: {
    slug: string;
    version: number;
  };
  templates: PromptTemplateVersionRef[];
  partials: PromptTemplateVersionRef[];
  configs: PromptConfigVersionRef[];
  stages?: PromptStageSnapshot[];
  capturedAt: number;
};

export type PromptPipelineRecord = {
  slug: string;
  version: number;
  name: string;
  description?: string;
  stages: PromptStageDefinition[];
};

export type PromptReleaseRecord = {
  _id: Id<"promptReleases">;
  slug: string;
  version: number;
  name: string;
  pipelineSlug: string;
  pipelineVersion: number;
  templateVersions: PromptTemplateVersionRef[];
  partialVersions: PromptTemplateVersionRef[];
  configVersions: PromptConfigVersionRef[];
  status: string;
  validationErrors: string[];
  validatedAt?: number;
};

export type PromptAssetVersion = {
  slug?: string;
  key?: string;
  version: number;
  name?: string;
  template?: string;
  data?: string;
};

export type ResolvedPromptReleaseBundle = {
  environment: PromptEnvironment;
  allowFallback: boolean;
  pipeline: PromptPipelineRecord;
  release: PromptReleaseRecord;
  templates: Array<PromptAssetVersion & { slug: string }>;
  partials: Array<PromptAssetVersion & { slug: string }>;
  configs: Array<PromptAssetVersion & { key: string }>;
};

export const DEFAULT_PIPELINE_NAME = "Core Jewelry Pipeline";
export const DEFAULT_PIPELINE_DESCRIPTION =
  "Default prompt pipeline for product images, on-body renders, and Veo videos.";
export const DEFAULT_RELEASE_NAME = "Baseline Release";

export function getPromptEnvironment(): PromptEnvironment {
  const convexDeployment = process.env.CONVEX_DEPLOYMENT?.toLowerCase();
  if (convexDeployment?.startsWith("dev:")) return "dev";
  if (convexDeployment?.startsWith("prod:")) return "production";

  const raw =
    process.env.PROMPT_ENVIRONMENT ||
    process.env.NEXT_PUBLIC_PROMPT_ENVIRONMENT ||
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV ||
    "development";

  const normalized = raw.toLowerCase();
  if (normalized === "production" || normalized === "prod") return "production";
  if (normalized === "preview" || normalized === "staging" || normalized === "stage") return "staging";
  return "dev";
}

export function allowPromptFallback(environment: PromptEnvironment): boolean {
  return environment !== "production";
}

export function getDefaultPipelineStages(): PromptStageDefinition[] {
  return BASE_PROMPT_PIPELINE_STAGES.map((stage) => ({ ...stage }));
}

export function getDefaultReleaseRefs() {
  return {
    pipelineSlug: BASE_PIPELINE_SLUG,
    releaseSlug: BASE_RELEASE_SLUG,
  };
}

export function getRequiredTemplateSlugs(stages: PromptStageDefinition[]): string[] {
  return [...new Set(stages.map((stage) => stage.templateSlug))];
}

export function validatePipelineStages(stages: PromptStageDefinition[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();

  if (stages.length === 0) {
    errors.push("Pipeline must contain at least one stage.");
    return errors;
  }

  for (const stage of stages) {
    if (!stage.stageKey.trim()) {
      errors.push("Stage key cannot be empty.");
    }
    if (seen.has(stage.stageKey)) {
      errors.push(`Duplicate stage key: ${stage.stageKey}`);
    }
    seen.add(stage.stageKey);
    if (!stage.templateSlug.trim()) {
      errors.push(`Stage ${stage.stageKey} must reference a template slug.`);
    }
  }

  const knownKeys = new Set(BASE_PROMPT_PIPELINE_STAGES.map((stage) => stage.stageKey));
  for (const required of knownKeys) {
    if (!seen.has(required)) {
      errors.push(`Missing required baseline stage: ${required}`);
    }
  }

  return errors;
}

export function validateReleaseBindings(
  pipeline: PromptPipelineRecord,
  release: Pick<PromptReleaseRecord, "templateVersions" | "configVersions" | "partialVersions">
): string[] {
  const errors = validatePipelineStages(pipeline.stages);
  const templateSlugs = new Set(release.templateVersions.map((ref) => ref.slug));
  const configKeys = new Set(release.configVersions.map((ref) => ref.key));
  const seenTemplateBindings = new Set<string>();

  for (const slug of getRequiredTemplateSlugs(pipeline.stages)) {
    if (!templateSlugs.has(slug)) {
      errors.push(`Release is missing a template version for slug "${slug}".`);
    }
  }

  for (const ref of release.templateVersions) {
    const key = `${ref.slug}:${ref.version}`;
    if (seenTemplateBindings.has(key)) {
      errors.push(`Duplicate template binding for ${ref.slug} v${ref.version}.`);
    }
    seenTemplateBindings.add(key);
  }

  for (const key of REQUIRED_PROMPT_CONFIG_KEYS) {
    if (!configKeys.has(key)) {
      errors.push(`Release is missing required config "${key}".`);
    }
  }

  if (release.partialVersions.length === 0) {
    errors.push("Release must include at least one partial version.");
  }

  return [...new Set(errors)];
}

export function buildPromptExecutionSnapshot(
  bundle: ResolvedPromptReleaseBundle,
  stages?: PromptStageSnapshot[]
): PromptExecutionSnapshot {
  return {
    environment: bundle.environment,
    mode: "release",
    release: {
      slug: bundle.release.slug,
      version: bundle.release.version,
    },
    pipeline: {
      slug: bundle.pipeline.slug,
      version: bundle.pipeline.version,
    },
    templates: bundle.release.templateVersions,
    partials: bundle.release.partialVersions,
    configs: bundle.release.configVersions,
    stages,
    capturedAt: Date.now(),
  };
}
