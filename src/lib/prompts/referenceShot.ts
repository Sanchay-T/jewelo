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
 * Builds a plain-text prompt for the reference-based generation flow.
 * The customer has provided a reference image of a piece they love. This
 * prompt instructs the model to use that reference's STYLE and SILHOUETTE
 * as inspiration, but render the result in the customer's exact specs
 * (metal, karat, font, size, decoration, etc.) with the name applied.
 *
 * Camera angle comes from VARIATIONS[variationIndex].
 *
 * Returns a multi-line natural-language string (NOT JSON -- Gemini image gen
 * returns 400 errors on large JSON prompt payloads).
 */
export function buildReferenceEngravePrompt(
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
  const karat = design.karat || "18K";
  const jewelryType = design.jewelryType || "pendant";
  const name = design.name;
  const aesthetic = design.styleFamily || design.designStyle || "minimalist";
  const complexityFeel = complexityDescriptor(design.complexity);
  const finish = finishDescriptor(design.additionalInfo?.metalFinish);
  const occasion = design.additionalInfo?.occasion ? `Designed for ${design.additionalInfo.occasion}.` : "";
  const isNamePendant = jewelryType === "name_pendant" || jewelryType === "pendant";

  const step1 = isNamePendant
    ? `STEP 1 — ANALYZE THE REFERENCE:
Study the attached reference image. This is a name pendant where the letters of a name form the pendant shape itself -- there is no separate pendant body. Look at how the font style shapes each letter, how the letters connect to one another, whether there are decorative elements like hearts, flowers, or butterflies, and how the chain attaches to the first and last letter. Use this overall style and letter construction as your inspiration.`
    : `STEP 1 — ANALYZE THE REFERENCE:
Study the attached reference image carefully. Observe the overall shape and silhouette, the design elements that define its character such as curves, edges, and proportions, and identify the flat or gently curved surfaces where engraving is physically possible. Use this shape as your design foundation.`;

  const step2 = isNamePendant
    ? `STEP 2 — APPLY THE CUSTOMER'S SPECIFICATIONS:
The customer wants this as a name pendant where the letters form the shape, crafted from ${karat} ${metalLabel} gold with a ${finish} and warm luster. The piece is ${sizeFeel} with a ${aesthetic} design aesthetic (${complexityFeel}) and features ${decoration}. ${occasion} If the reference shows a different metal color, karat, or decoration style, override it with these customer choices.`
    : `STEP 2 — APPLY THE CUSTOMER'S SPECIFICATIONS:
The customer wants this as a ${jewelryType} crafted from ${karat} ${metalLabel} gold with a ${finish} and warm luster. The piece is ${sizeFeel} with a ${aesthetic} design aesthetic (${complexityFeel}) and features ${decoration}. ${occasion} If the reference shows a different metal color, karat, or decoration style, override it with these customer choices.`;

  const step3 = isNamePendant
    ? `STEP 3 — FORM THE NAME AS THE PENDANT:
${textReferenceBlock(name, design.language)}

If a second attached image shows the name rendered in the correct font and language, use it as your EXACT visual guide for character shapes, spacing, and direction. Match it precisely.

The name '${name}' in ${fontStyle} IS the pendant shape — the letters are solid ${karat} ${metalLabel} gold, laser-cut or cast as one continuous piece.
There is NO flat plate or pendant body behind the letters. The silhouette of the pendant IS the word '${name}'.
Each letter has thickness and dimension — solid gold with polished faces catching the light.
The chain attaches at both ends of the name.
CRITICAL: Every letter of '${name}' must be present, correctly shaped, and clearly readable.`
    : `STEP 3 — ENGRAVE THE NAME:
${textReferenceBlock(name, design.language)}

If a second attached image shows the name rendered in the correct font and language, use it as your EXACT visual guide for character shapes, spacing, and direction. Match it precisely.

The name '${name}' must be engraved in ${fontStyle}. Find the most prominent, natural location on the piece for the engraving -- a surface that is visible, smooth enough, and large enough. Do not overlap any stones, settings, clasps, or decorative elements, and let the text follow the natural curve of the surface. The name '${name}' must be the hero element, clearly readable at first glance.
${engravingPhysicsBlock()}`;

  return `You are a master jeweler AND a professional product photographer.

A customer has brought you a reference image of a ${isNamePendant ? "name pendant" : jewelryType} they love. They want a piece that follows this reference's STYLE, but made to their exact specifications below. You will craft it and photograph the result.

${step1}

${step2}

${step3}

STEP 4 — PHOTOGRAPH THE RESULT:
Capture the finished piece with a ${variation.camera} camera angle and ${variation.lighting} lighting. Use an 85mm macro lens at f/2.8 with shallow depth of field for a ${variation.feel} feel.

FRAMING:
Show the COMPLETE piece from bail/attachment to bottom. Do not crop any part of the jewelry.
The piece occupies 60-70% of frame height, centered with generous negative space on all sides.
Include chain attachment point. The viewer must see the full silhouette of the piece.

BACKGROUND:
${background}
Centered composition, no props, no humans.
Style: luxury jewelry catalog photography, Cartier/Tiffany/Bulgari level.

OUTPUT: SQUARE 1:1 image. Professional jewelry catalog quality. No watermarks.

${absoluteRulesBlock(true, metalType)}

Generate the photograph now.`;
}
