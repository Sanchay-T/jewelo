/**
 * Prompt Engine — fetches active templates, partials, and configs from Convex DB,
 * compiles Handlebars templates, and returns plain-text prompts for Gemini/Veo.
 *
 * Runs inside Convex "use node" actions. Falls back to hardcoded prompts on error.
 */
import Handlebars from "handlebars";
import type { GenericActionCtx } from "convex/server";
import type { DataModel } from "../_generated/dataModel";

// ── Types ─────────────────────────────────────────────────────────────

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
  // Direct from design
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

  // Computed from configs
  fontStyle: string;
  decoration: string;
  sizeFeel: string;
  metalLabel: string;
  background: string;
  aesthetic: string;
  isNamePendant: boolean;
  needsChain: boolean;
  chainDesc: string;

  // Text reference
  charSpelling: string;
  charCount: number;
  languageNote: string;
  spellingCheck: string;

  // Variation (optional — only for product/on-body)
  variationName?: string;
  variationCamera?: string;
  variationLighting?: string;
  variationFeel?: string;

  // Body mapping (optional — only for on-body)
  bodyPart?: string;
  bodyFraming?: string;
  bodyPose?: string;
  bodyRules?: string;

  // Context flags
  hasReference: boolean;
  referenceRule: string;

  // Video (optional)
  videoMotion?: string;
  videoLighting?: string;
}

type Configs = Record<string, any>;

// ── Build prompt context from DesignInput + configs ───────────────────

export function buildPromptContext(
  design: DesignInputForEngine,
  variationIndex: number,
  configs: Configs,
  extra?: { hasReference?: boolean },
): PromptContext {
  const fontStyles = configs.fontStyles ?? {};
  const backgroundStyles = configs.backgroundStyles ?? {};
  const decorationStyles = configs.decorationStyles ?? {};
  const sizeFeels = configs.sizeFeels ?? {};
  const variations = configs.variations ?? [];
  const bodyMapping = configs.bodyMapping ?? {};
  const videoMotion = configs.videoMotion ?? {};
  const videoLighting = configs.videoLighting ?? {};

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
      ? (gemstoneList.length === 1 && gemstoneList[0] === "diamond"
        ? decorationStyles.gold_with_diamonds
        : `gold set with ${gemstoneList.join(", ")} gemstones in mixed prong and bezel settings`)
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

// ── Compile a Handlebars template with partials ───────────────────────

export async function compilePrompt(
  ctx: GenericActionCtx<DataModel>,
  slug: string,
  context: PromptContext,
  fallbackFn?: () => string,
): Promise<string> {
  try {
    const { internal } = await import("../_generated/api");

    // Fetch active template
    const template = await ctx.runQuery(internal.prompts.getActiveTemplate, { slug });
    if (!template) {
      if (fallbackFn) return fallbackFn();
      throw new Error(`No active template for slug: ${slug}`);
    }

    // Fetch all active partials
    const partials = await ctx.runQuery(internal.prompts.getAllActivePartials, {});

    // Create isolated Handlebars instance
    const hbs = Handlebars.create();
    hbs.registerHelper("unless", function (this: any, conditional: any, options: any) {
      return conditional ? options.inverse(this) : options.fn(this);
    });

    // Register partials
    for (const partial of partials) {
      hbs.registerPartial(partial.slug, partial.template);
    }

    // Compile and execute
    const compiled = hbs.compile(template.template, { noEscape: true });
    return compiled(context);
  } catch (err) {
    console.error(`[promptEngine] Failed to compile "${slug}":`, err);
    if (fallbackFn) return fallbackFn();
    throw err;
  }
}

// ── Fetch all active configs as a map ─────────────────────────────────

export async function fetchAllActiveConfigs(
  ctx: GenericActionCtx<DataModel>,
): Promise<Configs> {
  const { internal } = await import("../_generated/api");
  return await ctx.runQuery(internal.prompts.getAllActiveConfigs, {});
}
