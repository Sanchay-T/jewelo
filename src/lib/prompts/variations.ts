// ---------------------------------------------------------------------------
// Variation modifiers — camera, lighting, and mood presets that turn a single
// base prompt into four distinct product-photography angles.
// ---------------------------------------------------------------------------

/** Describes one variation's camera, lighting, and overall mood. */
export interface VariationModifier {
  /** Human-readable label for this variation (e.g. "Hero", "Macro"). */
  name: string;
  /** Camera angle / framing instruction. */
  camera: string;
  /** Lighting setup instruction. */
  lighting: string;
  /** Overall mood and art-direction feel. */
  feel: string;
}

/**
 * Four standard product-photography variations.
 *
 * These are appended to the base generation prompt so the model produces
 * visually distinct images while keeping the same pendant design.
 */
export const VARIATIONS: VariationModifier[] = [
  {
    name: "Hero",
    camera:
      "front-facing straight-on view, pendant centered in frame with even margins on all sides",
    lighting:
      "even diffused studio lighting with twin soft-boxes at 45 degrees, minimal shadows, clean white bounce fill from below",
    feel:
      "clean catalog product shot — crisp, symmetrical, no drama, maximum clarity for e-commerce",
  },
  {
    name: "Angled",
    camera:
      "3/4 turn showing the pendant at roughly 30-40 degrees from front, revealing side profile and depth",
    lighting:
      "key light from the right side at 45 degrees with subtle fill on the left, creating gentle shadows that reveal form",
    feel:
      "dimensional and sculptural — emphasises the 3D depth of the lettering and the thickness of the metal",
  },
  {
    name: "Macro",
    camera:
      "tight close-up crop on the engraved or embossed name, filling 70-80% of the frame with the text detail",
    lighting:
      "focused spot light raking across the surface at a low angle to accentuate groove depth and surface texture",
    feel:
      "intimate detail shot — showcases craftsmanship, metal grain, and the physical depth of every letter stroke",
  },
  {
    name: "Dramatic",
    camera:
      "slightly lower angle looking up at the pendant, creating a sense of grandeur and presence",
    lighting:
      "warm directional light from upper-left with deep shadows on the right, dramatic fall-off into darkness",
    feel:
      "moody luxury editorial — evokes high-end magazine advertising with rich contrast and emotional impact",
  },
];
