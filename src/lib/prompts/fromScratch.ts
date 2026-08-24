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
 * Builds a maison-campaign prompt for generating jewelry from scratch (no
 * physical reference image supplied). The prompt carries the editorial voice
 * of a luxury review deck while preserving a disciplined 3-step pipeline:
 *   1. Design the physical piece (shape, material, decoration)
 *   2. Render the approved name with correct script physics
 *   3. Photograph the finished piece in the selected editorial variant
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
  const direction = scriptDirection(design.language);

  const needsChain =
    jewelryType === "pendant" ||
    jewelryType === "name_pendant" ||
    jewelryType === "necklace" ||
    jewelryType === "chain";

  const isNamePendant = jewelryType === "name_pendant" || jewelryType === "pendant";

  const chainDesc = needsChain
    ? `Include a delicate matching ${karat} ${metalLabel} gold chain with spring ring clasp. The chain attaches at both ends of the name.`
    : "";

  const openingBlock = isNamePendant
    ? `Create a luxury product render of one bespoke name pendant necklace.
Approved rendered name: "${design.name}".
Script handling: ${direction}. Use the exact approved letterforms with no substitutions.
Material: ${karat} ${metalLabel} gold with ${finish}.
Chain: ${needsChain ? "matching spring-ring chain" : "no chain on this piece"}.
Decoration: ${decoration}.
Form intent: ${sizeFeel} — ${aesthetic} direction, ${complexityFeel}.`
    : `Create a luxury product render of one bespoke ${jewelryType}.
Approved engraved name: "${design.name}".
Script handling: ${direction}. Use the exact approved letterforms with no substitutions.
Material: ${karat} ${metalLabel} gold with ${finish}.
Decoration: ${decoration}.
Form intent: ${sizeFeel} — ${aesthetic} direction, ${complexityFeel}.`;

  const step1 = isNamePendant
    ? `STEP 1 — DESIGN THE NAME PENDANT:
The name '${design.name}' written in ${fontStyle} IS the pendant itself. There is NO separate pendant body — the letters are the shape, laser-cut or cast as one continuous piece of solid ${karat} ${metalLabel} gold with a ${finish}, warm luster, and flawless craftsmanship. The word hangs from a chain, each letter connected to the next. The piece is ${sizeFeel}, with a ${aesthetic} design aesthetic (${complexityFeel}) and ${decoration}. Letters carry beautiful ${fontStyle} styling with natural flourishes, thickness substantial enough to read clearly but still elegant. Small decorative elements (hearts, stars, butterflies, or flowers) may connect to the first or last letter for charm. ${chainDesc} ${occasion}
CRITICAL: There is NO flat plate, NO oval body, NO pendant behind the letters. The letters themselves ARE the entire piece. The silhouette of the pendant IS the word '${design.name}'.`
    : `STEP 1 — DESIGN THE PIECE:
Create a ${aesthetic} ${jewelryType} crafted from solid ${karat} ${metalLabel} gold with a ${finish}, warm luster, and flawless mirror-like surface with realistic micro-reflections. The piece features ${decoration}, is ${sizeFeel}, and should feel ${complexityFeel}. ${chainDesc} ${occasion} Think about where the name will be engraved BEFORE designing the shape. Ensure there is a prominent, elegant surface area for the name '${design.name}' — the name is the hero element, so design the piece around it.`;

  const step2 = isNamePendant
    ? `STEP 2 — REFINE THE LETTERING:
${textReferenceBlock(design.name, design.language)}

If a second attached image shows the name rendered in the correct font and language, use it as the EXACT visual guide for character shapes, spacing, and direction. Match it precisely.

The name '${design.name}' must be rendered in ${fontStyle}.
Each letter is solid gold — not engraved text on a surface, but the actual physical shape of the pendant.
The gold has thickness and dimension — you can see the depth of the metal from the side.
Light catches the polished face of each letter, creating highlights and reflections.
CRITICAL: Every single letter of '${design.name}' must be present, correctly shaped, and clearly readable. Do not skip, add, or rearrange any letters.`
    : `STEP 2 — ENGRAVE THE NAME:
Now integrate the customer's name as a beautifully engraved element on the piece you designed in Step 1.

${textReferenceBlock(design.name, design.language)}

If a second attached image shows the name rendered in the correct font and language, use it as the EXACT visual guide for character shapes, spacing, and direction. Match it precisely.

The name '${design.name}' must be engraved in ${fontStyle}.
Spelling check: ${design.name.split("").join(" - ")} = ${design.name.length} characters.
Place the name in the most prominent, natural location on the piece. The engraving should feel intentional — like the piece was designed FOR this name. Scale the text proportionally.
${engravingPhysicsBlock()}
CRITICAL: Every single letter of '${design.name}' must be present and clearly legible. Do not skip, add, or rearrange any letters.`;

  return `${openingBlock}

${step1}

${step2}

STEP 3 — PHOTOGRAPH AS A MAISON CAMPAIGN SHOT (${variation.name}):
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
No props — the jewelry is the only object in frame. Centered, clean, editorial composition.
Style: luxury jewelry maison campaign, Cartier/Tiffany/Bulgari level.

${commonProductRulesBlock()}

${absoluteRulesBlock(false, metalType)}

Return a premium photoreal SQUARE 1:1 image suitable for a luxury jewelry review deck. No watermarks.`;
}
