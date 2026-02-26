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
 * Builds a plain-text prompt for generating jewelry completely from
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
 *
 * Returns a multi-line natural-language string (NOT JSON -- Gemini image gen
 * returns 400 errors on large JSON prompt payloads).
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

  const silhouetteDesc =
    jewelryType === "name_pendant"
      ? `The word '${design.name}' written in ${fontStyle} IS the pendant shape -- the letters are formed from solid gold wire/metal as one continuous piece.`
      : `A ${aesthetic} ${jewelryType} with a prominent, elegant surface for engraving the name '${design.name}'.`;

  const chainDesc = needsChain
    ? `Include a delicate matching ${karat} ${metalLabel} gold chain with spring ring clasp, shown draping naturally.`
    : "";

  return `Design and photograph a custom ${aesthetic} ${jewelryType} from scratch.

STEP 1 -- DESIGN THE PIECE:
Create a ${aesthetic} ${jewelryType} in ${karat} ${metalLabel} gold.
${silhouetteDesc}
- Material: solid ${karat} ${metalLabel} gold, high polish with warm luster, flawless mirror-like surface with realistic micro-reflections
- Decoration: ${decoration}
- Size: ${sizeFeel}
${chainDesc}
Think about where the name will be engraved BEFORE designing the shape. Ensure there is a prominent, elegant surface area for the name. The name should be the hero element -- design the piece around it.

STEP 2 -- ENGRAVE THE NAME:
Now integrate the customer's name as a beautifully engraved element on the piece you designed in Step 1.

${textReferenceBlock(design.name, design.language)}

The name '${design.name}' must be engraved in ${fontStyle}.
Spelling check: ${design.name.split("").join(" - ")} = ${design.name.length} characters.
Place the name in the most prominent, natural location on the piece. The engraving should feel intentional -- like the piece was designed FOR this name. Scale the text proportionally to the piece.
${engravingPhysicsBlock()}
CRITICAL: Every single letter of '${design.name}' must be present and clearly legible. Do not skip, add, or rearrange any letters.

STEP 3 -- RENDER THE FINAL PHOTOGRAPH:
Render the completed piece with engraving as a professional product photograph.

CAMERA & LIGHTING:
- Angle: ${variation.camera}
- Lighting: ${variation.lighting}
- Lens: 85mm macro, f/2.8
- Feel: ${variation.feel}
- Resolution: ultra-crisp, photorealistic, 8K detail

BACKGROUND:
${background}
No props -- the jewelry is the only object in frame. Centered, clean, catalog-ready composition.
Style: luxury jewelry catalog photography, Cartier/Tiffany/Bulgari level.

OUTPUT: Generate a SQUARE 1:1 image. Luxury catalog quality. No watermarks.

${absoluteRulesBlock(false, metalType)}`;
}
