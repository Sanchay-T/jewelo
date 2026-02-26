import {
  FONT_STYLES,
  DECORATION_STYLES,
  SIZE_FEELS,
  BACKGROUND_STYLES,
  engravingPhysicsBlock,
  textReferenceBlock,
  absoluteRulesBlock,
  type DesignInput,
} from "./shared";
import { VARIATIONS } from "./variations";

/**
 * Builds a JSON-structured prompt for generating a professional product shot
 * of a jewelry piece. This is the primary "catalog photo" style -- the piece
 * alone on a clean background, no body, no props.
 *
 * The prompt is returned as a JSON.stringify'd string so Gemini's structured-
 * thinking mode can parse and follow the hierarchy reliably.
 */
export function buildProductShotPrompt(
  design: DesignInput,
  variationIndex: number,
  hasReference: boolean,
): string {
  const variation = VARIATIONS[variationIndex % VARIATIONS.length];
  const fontStyle = FONT_STYLES[design.font] || "elegant script";
  const decoration = DECORATION_STYLES[design.style] || "none, pure polished gold";
  const sizeFeel = SIZE_FEELS[design.size] || "balanced, elegant, 18mm";
  const metalType = design.metalType || "yellow";
  const metalLabel = metalType.replace(/_/g, " ");
  const background = BACKGROUND_STYLES[metalType] || BACKGROUND_STYLES.yellow;
  const jewelryType = design.jewelryType || "pendant";
  const karat = design.karat || "18K";

  const prompt = {
    output_format: {
      aspect_ratio: "1:1 square",
      resolution: "high resolution, minimum 1024x1024 pixels",
      instruction: "Generate a SQUARE image. Width and height must be equal.",
    },
    task: "PRODUCT_SHOT",
    context: {
      jewelry_type: jewelryType,
      metal: `${karat} ${metalLabel} gold`,
      decoration,
      size_feel: sizeFeel,
      design_style: design.designStyle || "minimalist",
      has_reference_image: hasReference,
      instruction: hasReference
        ? "Use the attached reference image as style inspiration. Create a product shot of a piece that matches its aesthetic, but generate a FRESH design -- do not copy it exactly."
        : `Design a beautiful ${jewelryType} from scratch in ${karat} ${metalLabel} gold.`,
    },
    text_reference: textReferenceBlock(design.name, design.language),
    engraving: {
      text: design.name,
      font_style: fontStyle,
      physics: engravingPhysicsBlock(),
      text_accuracy: `CRITICAL: The name '${design.name}' must be spelled exactly as shown. Every letter must be present and legible. Character count: ${design.name.length}. Spelling check: ${design.name.split("").join(" - ")}`,
      legibility: `The engraved name '${design.name}' MUST be clearly legible and prominent. It is the hero element of this photograph. The viewer should be able to read it instantly.`,
    },
    camera: {
      angle: variation.camera,
      lighting: variation.lighting,
      feel: variation.feel,
      lens: "85mm macro, f/2.8",
      resolution: "ultra-crisp, photorealistic, 8K detail",
    },
    background: {
      description: background,
      composition: "centered, no props, no humans",
      style: "luxury jewelry catalog photography, Cartier/Tiffany/Bulgari level",
    },
    absolute_rules: absoluteRulesBlock(hasReference, metalType),
  };

  return JSON.stringify(prompt, null, 2);
}
