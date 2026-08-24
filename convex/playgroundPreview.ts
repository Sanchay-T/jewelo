"use node";

import { action, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import {
  buildOnBodyPrompt,
  buildFromScratchPrompt,
  buildReferenceEngravePrompt,
  buildVideoNegativePrompt,
  buildVideoPrompt,
  type DesignInput,
} from "../src/lib/prompts/index";
import {
  buildPromptContext,
  fetchResolvedPromptBundleForExecution,
  getBundleConfigs,
  getPromptExecutionOptionsForDesign,
  PROMPT_STAGE_KEYS,
  resolveStagePrompt,
  type DesignInputForEngine,
  type PromptExecutionOptions,
} from "./lib/promptEngine";
import { validateAdminPassword } from "./lib/adminAuth";

const ADDITIONAL_INFO_VALIDATOR = v.object({
  occasion: v.optional(v.string()),
  metalFinish: v.optional(v.string()),
  notes: v.optional(v.string()),
});

const PROMPT_RELEASE_REF_VALIDATOR = v.object({
  slug: v.string(),
  version: v.number(),
});

const PLAYGROUND_INPUT_VALIDATOR = {
  name: v.string(),
  language: v.string(),
  font: v.string(),
  size: v.string(),
  karat: v.string(),
  style: v.string(),
  referenceType: v.optional(v.string()),
  referenceUrl: v.optional(v.string()),
  referenceStorageId: v.optional(v.id("_storage")),
  jewelryType: v.optional(v.string()),
  designStyle: v.optional(v.string()),
  metalType: v.optional(v.string()),
  styleFamily: v.optional(v.string()),
  complexity: v.optional(v.number()),
  gender: v.optional(v.string()),
  gemstones: v.optional(v.array(v.string())),
  primaryGemstone: v.optional(v.string()),
  lengthMm: v.optional(v.number()),
  thicknessMm: v.optional(v.number()),
  additionalInfo: v.optional(ADDITIONAL_INFO_VALIDATOR),
  requestedPromptEnvironment: v.optional(v.string()),
  requestedPromptRelease: v.optional(PROMPT_RELEASE_REF_VALIDATOR),
} as const;

function toDesignInput(input: {
  name: string;
  language: string;
  font: string;
  size: string;
  karat: string;
  style: string;
  metalType?: string;
  jewelryType?: string;
  designStyle?: string;
  styleFamily?: string;
  complexity?: number;
  gemstones?: string[];
  primaryGemstone?: string;
  lengthMm?: number;
  thicknessMm?: number;
  additionalInfo?: {
    occasion?: string;
    metalFinish?: string;
    notes?: string;
  };
}): DesignInput {
  return {
    name: input.name,
    language: input.language as DesignInput["language"],
    font: input.font,
    size: input.size as DesignInput["size"],
    karat: input.karat as DesignInput["karat"],
    style: input.style as DesignInput["style"],
    metalType: (input.metalType || "yellow") as DesignInput["metalType"],
    jewelryType: input.jewelryType,
    designStyle: input.designStyle,
    styleFamily: input.styleFamily,
    complexity: input.complexity,
    gemstones: input.gemstones,
    primaryGemstone: input.primaryGemstone,
    lengthMm: input.lengthMm,
    thicknessMm: input.thicknessMm,
    additionalInfo: input.additionalInfo,
  };
}

function toEngineInput(input: {
  name: string;
  language: string;
  font: string;
  size: string;
  karat: string;
  style: string;
  metalType?: string;
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
}): DesignInputForEngine {
  return {
    name: input.name,
    language: input.language,
    font: input.font,
    size: input.size,
    karat: input.karat,
    style: input.style,
    metalType: input.metalType || "yellow",
    jewelryType: input.jewelryType,
    designStyle: input.designStyle,
    styleFamily: input.styleFamily,
    complexity: input.complexity,
    gemstones: input.gemstones,
    additionalInfo: input.additionalInfo,
  };
}

function buildChainedOnBodyPrompt(
  design: DesignInput,
  variationIndex: number,
): string {
  const basePrompt = buildOnBodyPrompt(design, variationIndex, false);
  const metalType = design.metalType || "yellow";
  const metalLabel = metalType.replace(/_/g, " ");
  const karat = design.karat || "18K";
  const jewelryType = design.jewelryType || "pendant";
  const isNamePendant = jewelryType === "name_pendant" || jewelryType === "pendant";

  const identityDesc = isNamePendant
    ? `The first attached image shows the EXACT ${karat} ${metalLabel} gold name pendant where the name '${design.name}' forms the pendant shape -- the letters ARE the piece. You MUST use this exact piece in the on-body shot below. Do NOT redesign or create a new piece. Same letter shapes, same decorative elements, same metal, same chain. Only the context changes (now worn on a person).`
    : `The first attached image shows the EXACT ${karat} ${metalLabel} gold ${jewelryType} with the name '${design.name}' engraved on it. You MUST use this exact piece in the on-body shot below. Do NOT redesign or create a new piece. Same metal, same shape, same engraving, same stones, same chain. Only the context changes (now worn on a person).`;

  return `IDENTITY CONSTRAINT — THIS IS THE SAME PIECE:
${identityDesc}
If a second attached image shows the name rendered in text, use it as a visual guide to ensure the name remains accurate on-body.

${basePrompt}`;
}

function getStageTraceDetails(stageKey: string, hasReference: boolean, variationIndex: number) {
  const variationLabel = `variation ${variationIndex + 1}`;

  switch (stageKey) {
    case PROMPT_STAGE_KEYS.productReference:
      return {
        stageType: "product-image",
        purpose: "Create the first product render using the customer's uploaded inspiration and text reference.",
        inputArtifacts: [
          "Customer reference image upload",
          "Rendered text reference image for the requested name",
        ],
        outputArtifact: `Product render for ${variationLabel}`,
        downstreamConsumer: "Feeds the on-body stage as the exact jewelry piece to preserve identity.",
      };
    case PROMPT_STAGE_KEYS.productFromScratch:
      return {
        stageType: "product-image",
        purpose: "Create the first product render from prompt-only inputs, without a customer reference image.",
        inputArtifacts: [
          "Rendered text reference image for the requested name",
        ],
        outputArtifact: `Product render for ${variationLabel}`,
        downstreamConsumer: "Feeds the on-body stage as the exact jewelry piece to preserve identity.",
      };
    case PROMPT_STAGE_KEYS.onBodyChained:
      return {
        stageType: "on-body-image",
        purpose: "Take the exact generated product image and move it into an on-body shot without redesigning it.",
        inputArtifacts: [
          `Product render for ${variationLabel} from the previous stage`,
          "Rendered text reference image for lettering accuracy",
          ...(hasReference ? ["Original customer reference image influences style only through the earlier product stage"] : []),
        ],
        outputArtifact: `On-body render for ${variationLabel}`,
        downstreamConsumer: "Feeds the video stage as the preferred source frame.",
      };
    case PROMPT_STAGE_KEYS.videoMain:
      return {
        stageType: "video-main",
        purpose: "Generate the final motion prompt that Veo uses for the video request.",
        inputArtifacts: [
          `On-body render for ${variationLabel} if available, otherwise the product render for ${variationLabel}`,
        ],
        outputArtifact: `Main video prompt for ${variationLabel}`,
        downstreamConsumer: "Used together with the negative prompt in the Veo request.",
      };
    case PROMPT_STAGE_KEYS.videoNegative:
      return {
        stageType: "video-negative",
        purpose: "Provide the guardrail prompt that tells Veo what visual failures to avoid.",
        inputArtifacts: [
          "No image attachments; this is paired as a text-only negative prompt",
        ],
        outputArtifact: `Negative prompt for ${variationLabel}`,
        downstreamConsumer: "Applied alongside the main video prompt in the same Veo request.",
      };
    default:
      return {
        stageType: "unknown",
        purpose: "Resolve and render the prompt for this stage.",
        inputArtifacts: ["Prompt context variables"],
        outputArtifact: `Resolved prompt for ${variationLabel}`,
        downstreamConsumer: "Consumed by the next runtime step.",
      };
  }
}

async function buildPromptPreviewPayload(
  ctx: ActionCtx,
  input: DesignInput,
  engineInput: DesignInputForEngine,
  hasReference: boolean,
  execution: PromptExecutionOptions,
) {
  const bundle = await fetchResolvedPromptBundleForExecution(ctx, execution);
  if (!bundle) {
    throw new Error("No active prompt release could be resolved for this environment");
  }

  const configs = getBundleConfigs(bundle);
  const variations = await Promise.all(
    Array.from({ length: 4 }, async (_, variationIndex) => {
      const promptCtx = buildPromptContext(engineInput, variationIndex, configs, {
        hasReference,
      });

      const product = await resolveStagePrompt(
        ctx,
        hasReference ? PROMPT_STAGE_KEYS.productReference : PROMPT_STAGE_KEYS.productFromScratch,
        promptCtx,
        () => hasReference
          ? buildReferenceEngravePrompt(input, variationIndex)
          : buildFromScratchPrompt(input, variationIndex),
        bundle
      );
      const onBody = await resolveStagePrompt(
        ctx,
        PROMPT_STAGE_KEYS.onBodyChained,
        promptCtx,
        () => buildChainedOnBodyPrompt(input, variationIndex),
        bundle
      );
      const video = await resolveStagePrompt(
        ctx,
        PROMPT_STAGE_KEYS.videoMain,
        promptCtx,
        () => buildVideoPrompt(input.jewelryType || "name_pendant", input.metalType || "yellow", input.karat || "21K"),
        bundle
      );
      const negative = await resolveStagePrompt(
        ctx,
        PROMPT_STAGE_KEYS.videoNegative,
        promptCtx,
        () => buildVideoNegativePrompt(),
        bundle
      );

      return {
        index: variationIndex,
        variationIndex,
        stages: [product, onBody, video, negative].map((stage) => ({
          stageKey: stage.stageSnapshot.stageKey,
          templateSlug: stage.stageSnapshot.templateSlug,
          stageType: getStageTraceDetails(
            stage.stageSnapshot.stageKey,
            hasReference,
            variationIndex
          ).stageType,
          purpose: getStageTraceDetails(
            stage.stageSnapshot.stageKey,
            hasReference,
            variationIndex
          ).purpose,
          inputArtifacts: getStageTraceDetails(
            stage.stageSnapshot.stageKey,
            hasReference,
            variationIndex
          ).inputArtifacts,
          outputArtifact: getStageTraceDetails(
            stage.stageSnapshot.stageKey,
            hasReference,
            variationIndex
          ).outputArtifact,
          downstreamConsumer: getStageTraceDetails(
            stage.stageSnapshot.stageKey,
            hasReference,
            variationIndex
          ).downstreamConsumer,
          prompt: stage.prompt,
        })),
      };
    })
  );

  return {
    flowType: hasReference ? "reference" : "fromScratch",
    flowSummary: hasReference
      ? "Reference flow: customer reference image plus text reference drive product generation, then the exact product render is chained into on-body and video."
      : "From-scratch flow: text reference and structured inputs create the product render first, then that generated piece is chained into on-body and video.",
    environment: bundle.environment,
    release: {
      slug: bundle.release.slug,
      version: bundle.release.version,
      name: bundle.release.name,
    },
    pipeline: {
      slug: bundle.pipeline.slug,
      version: bundle.pipeline.version,
      name: bundle.pipeline.name,
    },
    variations,
  };
}

export const previewDraft = action({
  args: {
    password: v.string(),
    ...PLAYGROUND_INPUT_VALIDATOR,
  },
  handler: async (ctx, args) => {
    validateAdminPassword(args.password);
    const designInput = toDesignInput(args);
    const engineInput = toEngineInput(args);
    return buildPromptPreviewPayload(
      ctx,
      designInput,
      engineInput,
      !!(args.referenceStorageId || args.referenceUrl),
      getPromptExecutionOptionsForDesign({
        requestedPromptEnvironment: args.requestedPromptEnvironment,
        requestedPromptRelease: args.requestedPromptRelease,
      })
    );
  },
});

export const previewRun = action({
  args: { password: v.string(), designId: v.id("designs") },
  handler: async (ctx, { password, designId }): Promise<Awaited<ReturnType<typeof buildPromptPreviewPayload>>> => {
    validateAdminPassword(password);
    const design: Doc<"designs"> = await ctx.runQuery(internal.designs.getInternal, { designId });
    if (design.source !== "playground") {
      throw new Error("Playground run not found");
    }

    const designInput = toDesignInput(design);
    const engineInput = toEngineInput(design);
    const execution = design.promptSnapshot?.release
      ? {
          environment: design.promptSnapshot.environment as PromptExecutionOptions["environment"],
          releaseOverride: {
            slug: design.promptSnapshot.release.slug,
            version: design.promptSnapshot.release.version,
          },
        }
      : getPromptExecutionOptionsForDesign(design);

    return buildPromptPreviewPayload(
      ctx,
      designInput,
      engineInput,
      !!(design.referenceStorageId || design.referenceUrl),
      execution
    );
  },
});
