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
  commonProductRulesBlock,
  scriptDirection,
  type DesignInput,
} from "./shared";
import { VARIATIONS } from "./variations";

/**
 * Builds a maison-campaign prompt for the reference-based flow: the customer
 * has supplied a reference image. Use its style and silhouette as inspiration,
 * then render the piece in the customer's exact specifications with the
 * approved name applied.
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
  const direction = scriptDirection(design.language);

  const openingBlock = isNamePendant
    ? `Create a luxury product render of one bespoke name pendant necklace, guided by the attached reference piece.
Approved rendered name: "${name}".
Script handling: ${direction}. Use the exact approved letterforms with no substitutions.
Material: ${karat} ${metalLabel} gold with ${finish}.
Decoration: ${decoration}.
Form intent: ${sizeFeel} — ${aesthetic} direction, ${complexityFeel}.`
    : `Create a luxury product render of one bespoke ${jewelryType}, guided by the attached reference piece.
Approved engraved name: "${name}".
Script handling: ${direction}. Use the exact approved letterforms with no substitutions.
Material: ${karat} ${metalLabel} gold with ${finish}.
Decoration: ${decoration}.
Form intent: ${sizeFeel} — ${aesthetic} direction, ${complexityFeel}.`;

  const step1 = isNamePendant
    ? `STEP 1 — ANALYZE THE REFERENCE:
Study the attached reference image. This is a name pendant where the letters form the pendant shape itself — there is no separate body. Observe how the font shapes each letter, how letters connect, whether decorative elements (hearts, flowers, butterflies) appear, and how the chain attaches to the first and last letter. Use this overall style and construction as inspiration.`
    : `STEP 1 — ANALYZE THE REFERENCE:
Study the attached reference image. Observe the overall shape and silhouette, the design elements that define its character (curves, edges, proportions), and identify the flat or gently curved surfaces where engraving is physically possible. Use this shape as your design foundation.`;

  const step2 = isNamePendant
    ? `STEP 2 — APPLY THE CUSTOMER SPECIFICATION:
Render the piece in ${karat} ${metalLabel} gold with ${finish} and warm luster. Size ${sizeFeel}, ${aesthetic} aesthetic (${complexityFeel}), featuring ${decoration}. ${occasion} If the reference shows a different metal, karat, or decoration style, override with these customer choices.`
    : `STEP 2 — APPLY THE CUSTOMER SPECIFICATION:
Render the piece as a ${jewelryType} in ${karat} ${metalLabel} gold with ${finish} and warm luster. Size ${sizeFeel}, ${aesthetic} aesthetic (${complexityFeel}), featuring ${decoration}. ${occasion} If the reference shows a different metal, karat, or decoration style, override with these customer choices.`;

  const step3 = isNamePendant
    ? `STEP 3 — FORM THE NAME AS THE PENDANT:
${textReferenceBlock(name, design.language)}

If a second attached image shows the name rendered in the correct font and language, use it as the EXACT visual guide for character shapes, spacing, and direction. Match it precisely.

The name '${name}' in ${fontStyle} IS the pendant shape — letters are solid ${karat} ${metalLabel} gold, cast as one continuous piece.
There is NO flat plate or body behind the letters. The silhouette of the pendant IS the word '${name}'.
Each letter has thickness and dimension — solid gold with polished faces catching the light.
The chain attaches at both ends of the name.
CRITICAL: Every letter of '${name}' must be present, correctly shaped, and clearly readable.`
    : `STEP 3 — ENGRAVE THE NAME:
${textReferenceBlock(name, design.language)}

If a second attached image shows the name rendered in the correct font and language, use it as the EXACT visual guide for character shapes, spacing, and direction. Match it precisely.

The name '${name}' must be engraved in ${fontStyle}. Place it in the most prominent, natural location — visible, smooth enough, and large enough. Do not overlap stones, settings, clasps, or decorative elements. Let the text follow the natural curve of the surface. The name must be the hero element, readable at first glance.
${engravingPhysicsBlock()}`;

  return `${openingBlock}

${step1}

${step2}

${step3}

STEP 4 — PHOTOGRAPH AS A MAISON CAMPAIGN SHOT (${variation.name}):
${variation.camera}
${variation.lighting}
${variation.crop}
Mood: ${variation.mood}.
Lens: 85mm macro, f/2.8. Ultra-crisp, photorealistic, 8K detail.

FRAMING:
Show the COMPLETE piece from bail/attachment to bottom. Do not crop any part of the jewelry.
The piece occupies 60-70% of frame height, centered with generous negative space on all sides.
Include chain attachment point. The viewer must see the full silhouette of the piece.

BACKGROUND:
${background}
No props, no humans. Centered, clean, editorial composition.
Style: luxury jewelry maison campaign, Cartier/Tiffany/Bulgari level.

${commonProductRulesBlock()}

${absoluteRulesBlock(true, metalType)}

Return a premium photoreal SQUARE 1:1 image suitable for a luxury jewelry review deck. No watermarks.`;
}
