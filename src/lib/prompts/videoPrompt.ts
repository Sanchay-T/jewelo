/**
 * Video prompt builders for generating on-body jewelry lifestyle videos.
 *
 * The source image is an on-body shot (model wearing the piece). The prompt
 * describes subtle model movement, camera motion, and cinematic mood to create
 * a 9:16 vertical video suitable for Instagram Reels / TikTok / product pages.
 */

/**
 * On-body camera motion presets per jewelry type.
 * Each describes natural, subtle movement of a model wearing the piece --
 * the way a luxury jewelry brand films their social media content.
 */
const ON_BODY_MOTION: Record<string, string> = {
  pendant:
    "the model slowly turns her head to the side, the pendant catches light and gently sways on her chest, camera holds steady with a slight slow push-in toward the neckline",
  name_pendant:
    "the model subtly tilts her chin upward and turns slightly, the name pendant catches a warm glint of light as each gold letter rests against her collarbone, camera slowly pushes in with shallow depth of field to reveal the name detail, 85mm cinematic lens feel",
  ring:
    "the model slowly rotates her hand, fingers gently moving, the ring catches light from different angles, camera holds tight on the hand with a soft slow pan",
  bracelet:
    "the model gently lifts and turns her wrist, the bracelet catches light, camera follows the wrist with a slow tracking shot",
  earrings:
    "the model turns her head slowly to one side, the earring sways and catches light, camera holds at ear level with a subtle push-in",
  chain:
    "the model takes a slow breath, the chain rises and falls gently on her chest, catching light, camera slowly pans down from chin to the chain detail",
  necklace:
    "the model slowly turns from profile to front-facing, the necklace drapes naturally and catches light across the curve of her neck, camera holds steady at chest level",
};

const DEFAULT_MOTION = ON_BODY_MOTION.pendant;

/**
 * Builds a prompt for generating a short on-body jewelry lifestyle video.
 *
 * The source image is an on-body shot (model wearing the piece). The prompt
 * adds subtle cinematic movement to bring the still image to life.
 */
export function buildVideoPrompt(
  jewelryType: string,
  metalType: string,
  karat: string,
): string {
  const motion = ON_BODY_MOTION[jewelryType] || DEFAULT_MOTION;
  const metalLabel = metalType.replace(/_/g, " ");

  const lightingByMetal: Record<string, string> = {
    yellow:
      "warm golden-hour studio lighting, soft key light from upper left, gentle fill from right, warm skin tones, gold glowing with rich luster",
    yellow_gold:
      "warm golden-hour studio lighting, soft key light from upper left, gentle fill from right, warm skin tones, gold glowing with rich luster",
    rose_gold:
      "warm pink-tinted soft lighting, gentle key light from upper left, subtle fill, rose gold glowing with soft copper-pink warmth against the skin",
    rose:
      "warm pink-tinted soft lighting, gentle key light from upper left, subtle fill, rose gold glowing with soft copper-pink warmth against the skin",
    white_gold:
      "cool neutral studio lighting, crisp key light from upper left, clean fill, white gold gleaming with bright silver-platinum reflections",
    white:
      "cool neutral studio lighting, crisp key light from upper left, clean fill, white gold gleaming with bright silver-platinum reflections",
  };

  const lighting = lightingByMetal[metalType] || lightingByMetal.yellow;

  return [
    `On-body lifestyle video of a model wearing a ${karat} ${metalLabel} gold ${jewelryType}.`,
    "",
    `Movement: ${motion}.`,
    "",
    `Lighting: ${lighting}.`,
    "",
    "The model's movement is slow, natural, and elegant -- like a luxury jewelry advertisement.",
    "The jewelry is the star -- it catches light beautifully as the model moves.",
    "Shallow depth of field: the jewelry is tack-sharp, background and skin softly blurred.",
    "Cinematic 9:16 vertical framing, the piece is always visible and prominent in frame.",
    "",
    "Style: luxury jewelry brand social media content, Cartier/Tiffany/Bulgari campaign quality,",
    "professional studio lighting, cinematic color grading, warm and inviting mood,",
    "ultra-smooth motion, no shaking, no sudden movements.",
    "",
    "Duration: 5-6 seconds, single continuous take, no cuts.",
  ].join("\n");
}

/**
 * Builds a negative prompt for on-body video generation.
 */
export function buildVideoNegativePrompt(): string {
  return [
    "shaky camera",
    "blurry",
    "out of focus",
    "distorted geometry",
    "morphing shapes",
    "melting metal",
    "text overlay",
    "watermark",
    "logo",
    "fast movement",
    "sudden cuts",
    "jump cuts",
    "flickering",
    "low quality",
    "pixelated",
    "noisy",
    "grainy",
    "overexposed",
    "underexposed",
    "color banding",
    "artifacts",
    "deformed jewelry",
    "broken chain",
    "misshapen stones",
    "floating objects",
    "multiple pieces",
    "duplicate jewelry",
    "distorted face",
    "extra fingers",
    "deformed hands",
  ].join(", ");
}
