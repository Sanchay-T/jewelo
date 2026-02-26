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
 * Builds a JSON-structured prompt for generating an on-body lifestyle shot
 * of the jewelry piece being worn. The shot shows the piece in context --
 * on a neck, hand, wrist, or ear -- with the framing carefully cropped
 * to keep the focus on the jewelry and avoid showing the model's full face.
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

  const prompt = {
    task: "ON_BODY_SHOT",
    context: {
      jewelry_type: jewelryType,
      metal: `${karat} ${metalLabel} gold`,
      decoration,
      size_feel: sizeFeel,
      design_style: design.designStyle || "minimalist",
      style_reference: "Cartier, Tiffany, Bulgari editorial campaign quality",
      has_reference_image: hasReference,
      instruction: hasReference
        ? "The attached reference shows the jewelry style. Generate an on-body lifestyle shot of a similar piece being worn."
        : `Generate an on-body lifestyle shot of a ${jewelryType} in ${karat} ${metalLabel} gold being worn.`,
    },
    body: {
      part: bodyMap.part,
      framing: bodyMap.framing,
      pose: bodyMap.pose,
      skin: "natural warm-toned skin, healthy glow, no visible blemishes",
      rules: bodyMap.rules,
      wardrobe: "minimal or absent -- bare skin or simple neutral fabric that does not compete with the jewelry",
    },
    camera: {
      angle: variation.camera,
      lighting: variation.lighting,
      feel: variation.feel,
      lens: "85mm, f/1.8, creamy bokeh",
      depth_of_field: "shallow -- jewelry tack-sharp, background and skin softly blurred",
      resolution: "ultra-crisp, photorealistic, 8K detail",
    },
    text_reference: textReferenceBlock(design.name, design.language),
    engraving: {
      text: design.name,
      font_style: fontStyle,
      physics: engravingPhysicsBlock(),
      text_accuracy: `CRITICAL: The name '${design.name}' must be spelled exactly as shown. Every letter must be present and legible. Character count: ${design.name.length}. Spelling check: ${design.name.split("").join(" - ")}`,
    },
    absolute_rules: absoluteRulesBlock(hasReference, metalType),
  };

  return JSON.stringify(prompt, null, 2);
}
