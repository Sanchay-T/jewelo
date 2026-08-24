/**
 * Prompt Engine — resolves the active prompt release bundle, compiles
 * Handlebars templates with release-scoped partials/configs, and returns
 * stage-specific prompts for Gemini/Veo.
 */
import Handlebars, { type HelperOptions } from "handlebars";
import type { GenericActionCtx } from "convex/server";
import type { DataModel } from "../_generated/dataModel";
import {
  buildPromptExecutionSnapshot,
  getPromptEnvironment,
  type PromptEnvironment,
  type PromptExecutionSnapshot,
  type PromptStageSnapshot,
  type ResolvedPromptReleaseBundle,
} from "./promptControl";

export const PROMPT_STAGE_KEYS = {
  productReference: "product.reference",
  productFromScratch: "product.fromScratch",
  onBodyChained: "onBody.chained",
  videoMain: "video.main",
  videoNegative: "video.negative",
} as const;

export type PromptStageKey = typeof PROMPT_STAGE_KEYS[keyof typeof PROMPT_STAGE_KEYS];

export interface PromptExecutionOptions {
  environment?: PromptEnvironment;
  releaseOverride?: {
    slug: string;
    version: number;
  } | null;
}

type PromptExecutionDesign = {
  requestedPromptEnvironment?: string;
  requestedPromptRelease?: {
    slug: string;
    version: number;
  };
};

export interface DesignInputForEngine {
  name: string;
  language: string;
  font: string;
  size: string;
  karat: string;
  style: string;
  metalType: string;
  jewelryType?: string;
  designStyle?: string;
  styleFamily?: string;
  complexity?: number;
  gemstones?: string[];
  additionalInfo?: {
    occasion?: string;
    metalFinish?: string;
    notes?: string;
  };
}

export interface PromptContext {
  name: string;
  language: string;
  font: string;
  size: string;
  karat: string;
  style: string;
  metalType: string;
  jewelryType: string;
  designStyle: string;
  styleFamily: string;
  complexity: number;
  gemstones: string;
  finish: string;
  occasion: string;
  fontStyle: string;
  decoration: string;
  sizeFeel: string;
  metalLabel: string;
  background: string;
  aesthetic: string;
  isNamePendant: boolean;
  needsChain: boolean;
  chainDesc: string;
  charSpelling: string;
  charCount: number;
  languageNote: string;
  spellingCheck: string;
  variationName?: string;
  variationCamera?: string;
  variationLighting?: string;
  variationFeel?: string;
  bodyPart?: string;
  bodyFraming?: string;
  bodyPose?: string;
  bodyRules?: string;
  hasReference: boolean;
  referenceRule: string;
  videoMotion?: string;
  videoLighting?: string;
}

type Configs = Record<string, unknown>;

function registerDefaultHelpers(hbs: typeof Handlebars) {
  hbs.registerHelper("unless", function (
    this: unknown,
    conditional: unknown,
    options: HelperOptions
  ) {
    return conditional ? options.inverse(this) : options.fn(this);
  });
}

function renderTemplate(
  template: string,
  partials: Array<{ slug: string; template?: string }>,
  context: PromptContext,
) {
  const hbs = Handlebars.create();
  registerDefaultHelpers(hbs);

  for (const partial of partials) {
    if (partial.template) {
      hbs.registerPartial(partial.slug, partial.template);
    }
  }

  return hbs.compile(template, { noEscape: true })(context);
}

function parseBundleConfigs(bundle: ResolvedPromptReleaseBundle): Configs {
  const map: Configs = {};
  for (const config of bundle.configs) {
    if (!config.data) continue;
    map[config.key] = JSON.parse(config.data);
  }
  return map;
}

export function buildPromptContext(
  design: DesignInputForEngine,
  variationIndex: number,
  configs: Configs,
  extra?: { hasReference?: boolean },
): PromptContext {
  const fontStyles = (configs.fontStyles ?? {}) as Record<string, string>;
  const backgroundStyles = (configs.backgroundStyles ?? {}) as Record<string, string>;
  const decorationStyles = (configs.decorationStyles ?? {}) as Record<string, string>;
  const sizeFeels = (configs.sizeFeels ?? {}) as Record<string, string>;
  const variations = (configs.variations ?? []) as Array<Record<string, string>>;
  const bodyMapping = (configs.bodyMapping ?? {}) as Record<string, {
    part?: string;
    framing?: string;
    pose?: string;
    rules?: string;
  }>;
  const videoMotion = (configs.videoMotion ?? {}) as Record<string, string>;
  const videoLighting = (configs.videoLighting ?? {}) as Record<string, string>;

  const metalType = design.metalType || "yellow";
  const metalLabel = metalType.replace(/_/g, " ");
  const jewelryType = design.jewelryType || "pendant";
  const karat = design.karat || "18K";
  const isNamePendant = jewelryType === "name_pendant" || jewelryType === "pendant";
  const needsChain = ["pendant", "name_pendant", "necklace", "chain"].includes(jewelryType);
  const variation = variations[variationIndex % (variations.length || 1)] ?? {};

  const bodyMap = bodyMapping[jewelryType] ?? bodyMapping.pendant ?? {
    part: "neck and upper chest",
    framing: "chin to clavicle, tight crop on the neckline area",
    pose: "elegant, slightly turned head, natural relaxed shoulders",
    rules: "NO face above the lips, NO eyes, NO full head visible",
  };

  const chars = [...design.name];
  const spelled = chars.join(" — ");
  let languageNote = "This is Latin text. Render each character exactly as specified with correct kerning.";
  if (design.language === "ar") {
    languageNote = "This is Arabic text. Render RIGHT-TO-LEFT with correct letter connections (initial, medial, final, isolated forms). Do NOT reverse the character order.";
  } else if (design.language === "zh") {
    languageNote = "These are Chinese characters. Render each character with precise stroke order and count. Do NOT simplify or substitute characters.";
  }

  const hasReference = extra?.hasReference ?? false;
  const referenceRule = hasReference
    ? "Do not change anything about the reference image except applying the requested design modifications. "
    : "";

  const bg = backgroundStyles[metalType] ?? backgroundStyles.yellow ?? "";
  const gemstoneList = (design.gemstones || []).filter(Boolean);
  const decoration =
    gemstoneList.length > 0
      ? gemstoneList.length === 1 && gemstoneList[0] === "diamond"
        ? decorationStyles.gold_with_diamonds
        : `gold set with ${gemstoneList.join(", ")} gemstones in mixed prong and bezel settings`
      : (decorationStyles[design.style] ?? "none, pure polished gold");

  const complexity = Math.max(1, Math.min(10, Math.round(design.complexity || 5)));
  const finish = design.additionalInfo?.metalFinish || "polished";
  const occasion = design.additionalInfo?.occasion || "";

  return {
    name: design.name,
    language: design.language,
    font: design.font,
    size: design.size,
    karat,
    style: design.style,
    metalType,
    jewelryType,
    designStyle: design.designStyle || "minimalist",
    styleFamily: design.styleFamily || design.designStyle || "minimalist",
    complexity,
    gemstones: gemstoneList.join(", "),
    finish,
    occasion,
    fontStyle: fontStyles[design.font] ?? "elegant script",
    decoration,
    sizeFeel: sizeFeels[design.size] ?? "balanced, elegant, 18mm",
    metalLabel,
    background: bg,
    aesthetic: design.styleFamily || design.designStyle || "minimalist",
    isNamePendant,
    needsChain,
    chainDesc: needsChain
      ? `Include a delicate matching ${karat} ${metalLabel} gold chain with spring ring clasp. The chain attaches at both ends of the name.`
      : "",
    charSpelling: spelled,
    charCount: chars.length,
    languageNote,
    spellingCheck: `${design.name.split("").join(" - ")} = ${design.name.length} characters`,
    variationName: variation.name,
    variationCamera: variation.camera,
    variationLighting: variation.lighting,
    variationFeel: variation.feel,
    bodyPart: bodyMap.part,
    bodyFraming: bodyMap.framing,
    bodyPose: bodyMap.pose,
    bodyRules: bodyMap.rules,
    hasReference,
    referenceRule,
    videoMotion: videoMotion[jewelryType] ?? videoMotion.pendant ?? "",
    videoLighting: videoLighting[metalType] ?? videoLighting.yellow ?? "",
  };
}

export async function fetchResolvedActivePromptBundle(
  ctx: GenericActionCtx<DataModel>,
  environment?: PromptEnvironment,
): Promise<ResolvedPromptReleaseBundle | null> {
  const { internal } = await import("../_generated/api");
  return await ctx.runQuery(internal.prompts.getResolvedActiveReleaseBundle, {
    environment: environment ?? getPromptEnvironment(),
  }) as ResolvedPromptReleaseBundle | null;
}

export async function fetchResolvedPromptBundleForExecution(
  ctx: GenericActionCtx<DataModel>,
  options?: PromptExecutionOptions,
): Promise<ResolvedPromptReleaseBundle | null> {
  if (options?.releaseOverride) {
    return await fetchResolvedPromptBundleByVersion(
      ctx,
      options.releaseOverride.slug,
      options.releaseOverride.version,
      options.environment
    );
  }

  return await fetchResolvedActivePromptBundle(ctx, options?.environment);
}

export function getPromptExecutionOptionsForDesign(
  design: PromptExecutionDesign
): PromptExecutionOptions {
  return {
    environment: design.requestedPromptEnvironment as PromptEnvironment | undefined,
    releaseOverride: design.requestedPromptRelease
      ? {
          slug: design.requestedPromptRelease.slug,
          version: design.requestedPromptRelease.version,
        }
      : null,
  };
}

export async function fetchResolvedPromptBundleByVersion(
  ctx: GenericActionCtx<DataModel>,
  slug: string,
  version: number,
  environment?: PromptEnvironment,
): Promise<ResolvedPromptReleaseBundle | null> {
  const { internal } = await import("../_generated/api");
  return await ctx.runQuery(internal.prompts.getReleaseBundleByVersion, {
    slug,
    version,
    environment,
  }) as ResolvedPromptReleaseBundle | null;
}

export function buildPromptSnapshotFromBundle(
  bundle: ResolvedPromptReleaseBundle,
  stages?: PromptStageSnapshot[],
): PromptExecutionSnapshot {
  return buildPromptExecutionSnapshot(bundle, stages);
}

export function getBundleConfigs(bundle: ResolvedPromptReleaseBundle): Configs {
  return parseBundleConfigs(bundle);
}

export async function resolveStagePrompt(
  ctx: GenericActionCtx<DataModel>,
  stageKey: PromptStageKey,
  context: PromptContext,
  fallbackFn?: () => string,
  bundle?: ResolvedPromptReleaseBundle | null,
): Promise<{
  prompt: string;
  stageSnapshot: PromptStageSnapshot;
  bundle: ResolvedPromptReleaseBundle | null;
  configs: Configs;
}> {
  const resolvedBundle = bundle ?? await fetchResolvedActivePromptBundle(ctx);
  const environment = resolvedBundle?.environment ?? getPromptEnvironment();
  const allowFallback = resolvedBundle?.allowFallback ?? environment !== "production";

  const fallback = (reason: string) => {
    if (!fallbackFn || !allowFallback) {
      throw new Error(reason);
    }
    return {
      prompt: fallbackFn(),
      stageSnapshot: {
        stageKey,
        stageType: "unknown",
        branch: "always",
        templateSlug: "fallback",
        usedFallback: true,
        fallbackReason: reason,
      },
      bundle: resolvedBundle,
      configs: resolvedBundle ? parseBundleConfigs(resolvedBundle) : {},
    };
  };

  if (!resolvedBundle) {
    return fallback("No active prompt release is configured for this environment");
  }

  const stage = resolvedBundle.pipeline.stages.find((item) => item.stageKey === stageKey);
  if (!stage) {
    return fallback(`Stage "${stageKey}" is missing from pipeline ${resolvedBundle.pipeline.slug} v${resolvedBundle.pipeline.version}`);
  }

  const binding = resolvedBundle.release.templateVersions.find(
    (item) => item.slug === stage.templateSlug
  );
  const template = resolvedBundle.templates.find(
    (item) => item.slug === stage.templateSlug && item.version === binding?.version
  );

  if (!binding || !template?.template) {
    return fallback(`Release ${resolvedBundle.release.slug} v${resolvedBundle.release.version} is missing template ${stage.templateSlug}`);
  }

  try {
    const prompt = renderTemplate(template.template, resolvedBundle.partials, context);
    return {
      prompt,
      stageSnapshot: {
        stageKey: stage.stageKey,
        stageType: stage.stageType,
        branch: stage.branch,
        templateSlug: stage.templateSlug,
        templateVersion: binding.version,
        usedFallback: false,
      },
      bundle: resolvedBundle,
      configs: parseBundleConfigs(resolvedBundle),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return fallback(`Failed to compile stage ${stageKey}: ${message}`);
  }
}
