/**
 * Video prompt builders for generating short jewelry commercials.
 *
 * These are designed for video generation models (e.g., Veo, Runway, Kling)
 * that accept a text prompt + optional source image. The prompts describe
 * camera motion, lighting, and mood -- NOT the jewelry design itself, since
 * the source image already contains the rendered piece.
 */

/**
 * Camera motion presets per jewelry type.
 * Each maps a jewelry type to a natural camera movement that shows the
 * piece at its best -- the way a professional jewelry commercial would
 * be shot for that specific piece type.
 */
const CAMERA_MOTION: Record<string, string> = {
  pendant:
    "slow 180-degree arc around the pendant, starting from a front-facing hero angle and sweeping to a side profile, with a slight downward tilt to catch light reflections on the metal surface",
  name_pendant:
    "slow 180-degree arc around the name pendant, starting front-on to clearly show the name, then sweeping to a 3/4 angle to reveal the depth and dimension of each letter, with a slight tilt to catch specular highlights",
  ring:
    "smooth 360-degree turntable rotation, starting from the top of the stone/face and rotating at a consistent speed, keeping the ring centered and tack-sharp throughout the full revolution",
  bracelet:
    "slow arc at wrist level, starting from a direct side view and sweeping 120 degrees around the bracelet, with the camera maintaining a consistent distance to show the full circumference and clasp detail",
  earrings:
    "gentle sway and rotate, the earring hangs from a display and rocks softly side to side while the camera slowly orbits 90 degrees, catching light at different angles on the stones and metal",
  chain:
    "overhead-to-front arc, starting from a bird's-eye view looking straight down at the chain laid flat, then smoothly arcing forward and down to a front-facing angle showing the chain's drape and shine",
  necklace:
    "overhead-to-front arc, starting from above showing the full necklace circle, then arcing down to a front view that shows how the pendant sits at the center of the chain with natural draping",
};

/** Fallback camera motion for unknown jewelry types */
const DEFAULT_MOTION = CAMERA_MOTION.pendant;

/**
 * Builds a positive prompt for generating a short jewelry video commercial.
 *
 * The prompt describes camera motion and environment. The jewelry itself
 * should already be visible in the source image passed to the video model.
 *
 * @param jewelryType - The type of jewelry (pendant, ring, bracelet, etc.)
 * @param metalType - The metal finish (yellow_gold, rose_gold, white_gold)
 * @param karat - The karat value (18K, 21K, 22K)
 * @returns The video generation prompt string
 */
export function buildVideoPrompt(
  jewelryType: string,
  metalType: string,
  karat: string,
): string {
  const motion = CAMERA_MOTION[jewelryType] || DEFAULT_MOTION;
  const metalLabel = metalType.replace(/_/g, " ");

  const lightingByMetal: Record<string, string> = {
    yellow_gold:
      "warm studio lighting with soft golden key light from the upper left, subtle fill from the right, and a backlight rim to separate the piece from the background",
    rose_gold:
      "warm pink-tinted studio lighting with a soft key light from the upper left, gentle fill, and a cool backlight rim to make the rose tones glow",
    white_gold:
      "cool neutral studio lighting with a crisp key light from the upper left, minimal fill for contrast, and a bright backlight rim to accentuate the silver-white surface",
  };

  const lighting = lightingByMetal[metalType] || lightingByMetal.yellow_gold;

  return [
    `Camera motion: ${motion}.`,
    "",
    `Lighting: ${lighting}.`,
    "",
    `Subject: a ${karat} ${metalLabel} gold ${jewelryType}, professional jewelry commercial quality.`,
    "",
    "Environment: dark gradient background transitioning from deep charcoal (#1A1A1A) at the edges to near-black (#0D0D0D) at center, ",
    "clean and minimal, no props, no distractions.",
    "",
    "Style: luxury jewelry commercial, smooth cinematic camera movement, ",
    "professional studio setup, dramatic yet elegant lighting, ",
    "metal surfaces catching and reflecting light as the camera moves, ",
    "ultra-sharp focus on the piece throughout, ",
    "subtle sparkle on any stones or polished surfaces, ",
    "no shaking, no sudden movements, buttery smooth motion.",
    "",
    "Duration: 4-6 seconds, single continuous take, no cuts.",
  ].join("\n");
}

/**
 * Builds a negative prompt for video generation.
 * This tells the model what to avoid -- critical for preventing common
 * artifacts in AI-generated jewelry videos.
 *
 * @returns The negative prompt string
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
    "hands",
    "fingers",
    "human body",
    "face",
    "deformed jewelry",
    "broken chain",
    "misshapen stones",
    "floating objects",
    "multiple pieces",
    "duplicate jewelry",
  ].join(", ");
}
