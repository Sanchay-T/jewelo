// ---------------------------------------------------------------------------
// Four maison-campaign product shots that share a pendant identity but differ
// in camera, lighting, crop, and mood — the voice is editorial, not catalog.
// ---------------------------------------------------------------------------

export interface VariationModifier {
  name: string;
  camera: string;
  lighting: string;
  crop: string;
  mood: string;
  feel: string;
}

export const VARIATIONS: VariationModifier[] = [
  {
    name: "Hero Monolith",
    camera:
      "Centered hero product shot with a straight-on luxury e-commerce framing.",
    lighting:
      "Focused studio spotlight with crisp gold reflections and controlled shadow falloff.",
    crop:
      "Square crop with negative space around the pendant and chain.",
    mood: "Quiet, expensive, architectural.",
    feel: "Quiet, expensive, architectural.",
  },
  {
    name: "Editorial Sweep",
    camera:
      "Three-quarter angle with gentle diagonal placement and a slightly closer crop.",
    lighting:
      "Editorial side-light with soft falloff and a dark velvet background read.",
    crop:
      "Vertical editorial crop showing chain rhythm and pendant silhouette.",
    mood: "Magazine-ready, tactile, intimate.",
    feel: "Magazine-ready, tactile, intimate.",
  },
  {
    name: "Macro Craft",
    camera:
      "Close macro product shot emphasising surface finish, stone rhythm, and letter edges.",
    lighting:
      "Warm atelier close-up lighting with visible edge highlights and soft shadow detail.",
    crop:
      "Tight crop focused on pendant detail while preserving legibility of the full name.",
    mood: "Craft-driven, precise, high detail.",
    feel: "Craft-driven, precise, high detail.",
  },
  {
    name: "Wearable Balance",
    camera:
      "Product-on-chain composition showing how the pendant hangs naturally as a wearable piece.",
    lighting:
      "Balanced luxury product lighting with soft frontal glow and subtle background separation.",
    crop:
      "Medium crop showing the full chain top and pendant drop.",
    mood: "Calm, giftable, real-world premium.",
    feel: "Calm, giftable, real-world premium.",
  },
];
