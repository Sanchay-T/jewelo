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
 * Builds a JSON-structured prompt for generating jewelry completely from
 * scratch -- no reference image. The prompt follows a deliberate 3-step
 * pipeline that forces the model to:
 *   1. Design the physical piece first (shape, material, decoration)
 *   2. Engrave the customer's name with correct physics
 *   3. Render the final product photograph
 *
 * This ordering matters. When the model designs the piece knowing a name
 * will be engraved, it allocates the right surface area. When engraving
 * is treated as a second step after the shape is locked, the text fits
 * naturally instead of being forced onto an incompatible surface.
 */
export function buildFromScratchPrompt(
  design: DesignInput,
  variationIndex: number,
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
  const aesthetic = design.designStyle || "minimalist";

  const needsChain =
    jewelryType === "pendant" ||
    jewelryType === "name_pendant" ||
    jewelryType === "necklace" ||
    jewelryType === "chain";

  const prompt = {
    STEP_1_design_piece: {
      instruction: `Design a beautiful custom ${aesthetic} ${jewelryType} from scratch. Think about shape, proportion, and where the customer's name will be engraved BEFORE finalizing the form.`,
      shape: {
        jewelry_type: jewelryType,
        design_style: aesthetic,
        silhouette: jewelryType === "name_pendant"
          ? `The word '${design.name}' written in ${fontStyle} IS the pendant shape -- the letters are formed from solid gold wire/metal as one continuous piece`
          : `A ${aesthetic} ${jewelryType} with a prominent, elegant surface for engraving`,
      },
      material: {
        metal: `solid ${karat} ${metalLabel} gold`,
        finish: "high polish with warm luster",
        surface_quality: "flawless, mirror-like where polished, with realistic micro-reflections",
      },
      style: {
        aesthetic,
        decoration,
        considerations: [
          `This is a ${aesthetic} ${jewelryType} -- keep the design true to that style`,
          "Think about where the name will be engraved BEFORE designing the shape",
          "Ensure there is a prominent, elegant surface area for the name",
          "The name should be the hero element -- design the piece around it",
        ],
      },
      chain: needsChain
        ? {
            type: "delicate matching gold chain with spring ring clasp",
            material: `${karat} ${metalLabel} gold, matching the pendant`,
            length: "adjustable, shown draping naturally",
          }
        : "none",
    },
    STEP_2_engrave_name: {
      instruction: "Now integrate the customer's name as a beautifully engraved element on the piece you designed in Step 1.",
      text_reference: textReferenceBlock(design.name, design.language),
      name_to_engrave: design.name,
      font_style: fontStyle,
      placement: {
        rules: [
          "Place the name in the most prominent, natural location on the piece",
          "The engraving should feel intentional -- like the piece was designed FOR this name",
          "Scale the text proportionally to the piece",
          "Text follows the 3D curvature of the surface",
        ],
        size_feel: sizeFeel,
      },
      physics: engravingPhysicsBlock(),
      text_accuracy: `CRITICAL: Every single letter of '${design.name}' must be present and clearly legible. Do not skip, add, or rearrange any letters. The name has ${design.name.length} characters. Spelling check: ${design.name.split("").join(" - ")}`,
    },
    STEP_3_final_render: {
      instruction: "Render the final product photograph of the completed piece with engraving.",
      environment: {
        background,
        props: "none -- the jewelry is the only object in frame",
        composition: "centered, clean, catalog-ready",
      },
      camera: {
        angle: variation.camera,
        lighting: variation.lighting,
        feel: variation.feel,
        lens: "85mm macro, f/2.8",
        resolution: "ultra-crisp, photorealistic, 8K detail",
      },
      style: "luxury jewelry catalog photography, Cartier/Tiffany/Bulgari level",
      absolute_rules: absoluteRulesBlock(false, metalType),
    },
  };

  return JSON.stringify(prompt, null, 2);
}
