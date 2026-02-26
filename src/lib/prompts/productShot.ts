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
 * Builds a plain-text prompt for generating a professional product shot
 * of a jewelry piece. This is the primary "catalog photo" style -- the piece
 * alone on a clean background, no body, no props.
 *
 * Returns a multi-line natural-language string that Gemini's image generation
 * model can follow directly (NOT JSON -- Gemini image gen returns 400 errors
 * on large JSON prompt payloads).
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

  const referenceNote = hasReference
    ? "Use the attached reference image as style inspiration. Create a product shot of a piece that matches its aesthetic, but generate a FRESH design -- do not copy it exactly."
    : `Design a beautiful ${jewelryType} from scratch in ${karat} ${metalLabel} gold.`;

  return `Generate a professional studio product photograph of a ${jewelryType} in ${karat} ${metalLabel} gold.

${referenceNote}

PIECE DETAILS:
- Metal: ${karat} ${metalLabel} gold, high polish with warm luster
- Decoration: ${decoration}
- Size feel: ${sizeFeel}
- Design style: ${design.designStyle || "minimalist"}

${textReferenceBlock(design.name, design.language)}

ENGRAVING:
The name '${design.name}' must be engraved on this piece in ${fontStyle}.
Spelling check: ${design.name.split("").join(" - ")} = ${design.name.length} characters.
${engravingPhysicsBlock()}
The engraved name '${design.name}' MUST be clearly legible and prominent -- it is the hero element of this photograph. The viewer should be able to read it instantly.

CAMERA & LIGHTING:
- Angle: ${variation.camera}
- Lighting: ${variation.lighting}
- Lens: 85mm macro, f/2.8, shallow depth of field
- Feel: ${variation.feel}
- Resolution: ultra-crisp, photorealistic, 8K detail

BACKGROUND:
${background}
Centered composition, no props, no humans.
Style: luxury jewelry catalog photography, Cartier/Tiffany/Bulgari level.

OUTPUT: Generate a SQUARE 1:1 image. Professional jewelry catalog quality. No watermarks.

${absoluteRulesBlock(hasReference, metalType)}`;
}
