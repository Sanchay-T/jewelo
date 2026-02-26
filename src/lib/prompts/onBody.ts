import {
  FONT_STYLES,
  DECORATION_STYLES,
  SIZE_FEELS,
  engravingPhysicsBlock,
  textReferenceBlock,
  absoluteRulesBlock,
  type DesignInput,
} from "./shared";
import { VARIATIONS } from "./variations";

/**
 * Body-part mapping per jewelry type.
 * Each entry defines where the piece is worn, how to frame the shot,
 * the model pose, and hard rules to keep the image commercial-safe.
 */
const BODY_MAPPING: Record<
  string,
  { part: string; framing: string; pose: string; rules: string }
> = {
  pendant: {
    part: "neck and upper chest",
    framing: "chin to clavicle, tight crop on the neckline area",
    pose: "elegant, slightly turned head, natural relaxed shoulders",
    rules: "NO face above the lips, NO eyes, NO full head visible",
  },
  necklace: {
    part: "neck and upper chest",
    framing: "chin to clavicle, tight crop on the neckline area",
    pose: "elegant, slightly turned head, natural relaxed shoulders",
    rules: "NO face above the lips, NO eyes, NO full head visible",
  },
  name_pendant: {
    part: "neck and upper chest",
    framing: "chin to clavicle, tight crop centering the pendant on the chest",
    pose: "straight-on or slight 3/4 turn, relaxed shoulders, pendant resting naturally",
    rules: "NO face above the lips, NO eyes, NO full head visible",
  },
  chain: {
    part: "neck and upper chest",
    framing: "chin to mid-chest, showing the full chain drape",
    pose: "natural, relaxed posture, chain catching light",
    rules: "NO face above the lips, NO eyes, NO full head visible",
  },
  ring: {
    part: "hand and fingers",
    framing: "close crop on the hand, ring prominent on the finger",
    pose: "graceful hand pose, fingers slightly separated, elegant and relaxed",
    rules: "NO face, NO body above the wrist, hand only",
  },
  bracelet: {
    part: "hand and wrist",
    framing: "wrist and lower forearm, hand upright in an Apple-style product hand pose",
    pose: "wrist slightly turned to catch light, fingers relaxed and natural",
    rules: "NO face, NO body above the mid-forearm, wrist and hand only",
  },
  earrings: {
    part: "ear and jawline",
    framing: "side profile from ear to jaw, hair swept back to reveal the earring",
    pose: "head turned to show the earring in profile, chin slightly lifted",
    rules: "NO eyes visible, NO frontal face, side profile only, hair swept behind the ear",
  },
};

/** Fallback body mapping for unknown jewelry types */
const DEFAULT_BODY = BODY_MAPPING.pendant;

/**
 * Builds a plain-text prompt for generating an on-body lifestyle shot
 * of the jewelry piece being worn. The shot shows the piece in context --
 * on a neck, hand, wrist, or ear -- with the framing carefully cropped
 * to keep the focus on the jewelry and avoid showing the model's full face.
 *
 * Returns a multi-line natural-language string (NOT JSON -- Gemini image gen
 * returns 400 errors on large JSON prompt payloads).
 */
export function buildOnBodyPrompt(
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
  const jewelryType = design.jewelryType || "pendant";
  const karat = design.karat || "18K";
  const bodyMap = BODY_MAPPING[jewelryType] || DEFAULT_BODY;

  const referenceNote = hasReference
    ? "The attached reference shows the jewelry style. Generate an on-body lifestyle shot of a similar piece being worn."
    : `Generate an on-body lifestyle shot of a ${jewelryType} in ${karat} ${metalLabel} gold being worn.`;

  return `Generate a professional jewelry advertisement photograph showing a ${jewelryType} in ${karat} ${metalLabel} gold being worn.

${referenceNote}

PIECE DETAILS:
- Metal: ${karat} ${metalLabel} gold, high polish with warm luster
- Decoration: ${decoration}
- Size feel: ${sizeFeel}
- Design style: ${design.designStyle || "minimalist"}
- Style reference: Cartier, Tiffany, Bulgari editorial campaign quality

BODY & FRAMING:
- Body part: ${bodyMap.part}
- Framing: ${bodyMap.framing}
- Pose: ${bodyMap.pose}
- Skin: Natural warm-toned skin, healthy glow, no visible blemishes
- ${bodyMap.rules}
- Wardrobe: Minimal or absent -- bare skin or simple neutral fabric that does not compete with the jewelry
- The jewelry is the star of the photograph.

${textReferenceBlock(design.name, design.language)}

ENGRAVING:
The name '${design.name}' must be engraved on this piece in ${fontStyle}.
Spelling check: ${design.name.split("").join(" - ")} = ${design.name.length} characters.
${engravingPhysicsBlock()}
The engraved name '${design.name}' MUST be clearly readable even in the on-body context. Frame the shot so the jewelry -- and especially the engraved name -- is prominent and legible. The name is the star of this photograph.

CAMERA & LIGHTING:
- Angle: ${variation.camera}
- Lighting: ${variation.lighting}. Soft studio lighting, shallow depth of field.
- Lens: 85mm, f/1.8, creamy bokeh
- Depth of field: shallow -- jewelry tack-sharp, background and skin softly blurred
- Feel: ${variation.feel}
- Resolution: ultra-crisp, photorealistic, 8K detail

OUTPUT: Generate a SQUARE 1:1 image. Professional jewelry ad quality. No watermarks.

${absoluteRulesBlock(hasReference, metalType)}`;
}
