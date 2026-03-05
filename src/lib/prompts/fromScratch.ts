import {
  FONT_STYLES,
  SIZE_FEELS,
  BACKGROUND_STYLES,
  complexityDescriptor,
  decorationFromSelection,
  finishDescriptor,
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
  const decoration = decorationFromSelection(design);
  const sizeFeel = SIZE_FEELS[design.size] || "balanced, elegant, 18mm";
  const metalType = design.metalType || "yellow";
  const metalLabel = metalType.replace(/_/g, " ");
  const background = BACKGROUND_STYLES[metalType] || BACKGROUND_STYLES.yellow;
  const jewelryType = design.jewelryType || "pendant";
  const karat = design.karat || "18K";
  const aesthetic = design.styleFamily || design.designStyle || "minimalist";
  const complexityFeel = complexityDescriptor(design.complexity);
  const finish = finishDescriptor(design.additionalInfo?.metalFinish);
  const occasion = design.additionalInfo?.occasion ? `Designed for ${design.additionalInfo.occasion}.` : "";

  const needsChain =
    jewelryType === "pendant" ||
    jewelryType === "name_pendant" ||
    jewelryType === "necklace" ||
    jewelryType === "chain";

  const isNamePendant = jewelryType === "name_pendant" || jewelryType === "pendant";

  const chainDesc = needsChain
    ? `Include a delicate matching ${karat} ${metalLabel} gold chain with spring ring clasp. The chain attaches at both ends of the name.`
    : "";

  // Name pendants: the letters ARE the pendant (like "Anna" or "Sophia" name necklaces)
  // Other types: engraved on a surface
  const step1 = isNamePendant
    ? `STEP 1 -- DESIGN THE NAME PENDANT:
The name '${design.name}' written in ${fontStyle} IS the pendant itself. There is NO separate pendant body -- the letters are the shape, laser-cut or cast as one continuous piece of solid ${karat} ${metalLabel} gold with a ${finish}, warm luster, and flawless craftsmanship. Think of name necklaces you see on Etsy or in a gold souk: the word hangs from a chain, each letter connected to the next. The piece is ${sizeFeel}, with a ${aesthetic} design aesthetic (${complexityFeel}) and ${decoration}. The letters should have beautiful ${fontStyle} styling with natural flourishes, their thickness substantial enough to read clearly but still elegant. Small decorative elements like hearts, stars, butterflies, or flowers may connect to the first or last letter for added charm. ${chainDesc} ${occasion}
CRITICAL: There is NO flat plate, NO oval body, NO pendant behind the letters. The letters themselves ARE the entire piece. The silhouette of the pendant IS the word '${design.name}'.`
    : `STEP 1 -- DESIGN THE PIECE:
Create a ${aesthetic} ${jewelryType} crafted from solid ${karat} ${metalLabel} gold with a ${finish}, warm luster, and flawless mirror-like surface with realistic micro-reflections. The piece features ${decoration}, is ${sizeFeel}, and should feel ${complexityFeel}. ${chainDesc} ${occasion} Think about where the name will be engraved BEFORE designing the shape. Ensure there is a prominent, elegant surface area for the name '${design.name}' -- the name should be the hero element, so design the piece around it.`;

  const step2 = isNamePendant
    ? `STEP 2 -- REFINE THE LETTERING:
${textReferenceBlock(design.name, design.language)}

If a second attached image shows the name rendered in the correct font and language, use it as your EXACT visual guide for character shapes, spacing, and direction. Match it precisely.

The name '${design.name}' must be rendered in ${fontStyle}.
Each letter is solid gold -- not engraved text on a surface, but the actual physical shape of the pendant.
The gold has thickness and dimension -- you can see the depth of the metal from the side.
Light catches the polished face of each letter, creating highlights and reflections.
CRITICAL: Every single letter of '${design.name}' must be present, correctly shaped, and clearly readable. Do not skip, add, or rearrange any letters.`
    : `STEP 2 -- ENGRAVE THE NAME:
Now integrate the customer's name as a beautifully engraved element on the piece you designed in Step 1.

${textReferenceBlock(design.name, design.language)}

If a second attached image shows the name rendered in the correct font and language, use it as your EXACT visual guide for character shapes, spacing, and direction. Match it precisely.

The name '${design.name}' must be engraved in ${fontStyle}.
Spelling check: ${design.name.split("").join(" - ")} = ${design.name.length} characters.
Place the name in the most prominent, natural location on the piece. The engraving should feel intentional -- like the piece was designed FOR this name. Scale the text proportionally to the piece.
${engravingPhysicsBlock()}
CRITICAL: Every single letter of '${design.name}' must be present and clearly legible. Do not skip, add, or rearrange any letters.`;

  return `Design and photograph a custom ${aesthetic} ${isNamePendant ? "name pendant" : jewelryType} from scratch.

${step1}

${step2}

STEP 3 -- RENDER THE FINAL PHOTOGRAPH:
Render the completed piece with engraving as a professional product photograph.

CAMERA & LIGHTING:
- Angle: ${variation.camera}
- Lighting: ${variation.lighting}
- Lens: 85mm macro, f/2.8
- Feel: ${variation.feel}
- Resolution: ultra-crisp, photorealistic, 8K detail

FRAMING:
Show the COMPLETE piece from bail/attachment to bottom. Do not crop any part of the jewelry.
The piece occupies 60-70% of frame height, centered with generous negative space on all sides.
Include chain attachment point. The viewer must see the full silhouette of the piece.

BACKGROUND:
${background}
No props -- the jewelry is the only object in frame. Centered, clean, catalog-ready composition.
Style: luxury jewelry catalog photography, Cartier/Tiffany/Bulgari level.

OUTPUT: Generate a SQUARE 1:1 image. Luxury catalog quality. No watermarks.

${absoluteRulesBlock(false, metalType)}`;
}
