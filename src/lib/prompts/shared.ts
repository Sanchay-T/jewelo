// ---------------------------------------------------------------------------
// Shared prompt primitives — font styles, decoration descriptions, size feels,
// background rules, and reusable text blocks consumed by every prompt builder.
// ---------------------------------------------------------------------------

/** Design input supplied by the user through the configurator. */
export interface DesignInput {
  name: string;
  language: "en" | "ar" | "zh";
  font: string;
  size: "small" | "medium" | "large";
  karat: "18K" | "21K" | "22K";
  style: "gold_only" | "gold_with_stones" | "gold_with_diamonds";
  metalType: "yellow" | "white" | "rose";
  jewelryType?: string;
  designStyle?: string;
}

// ---------------------------------------------------------------------------
// Font style descriptions — used in prompt text to guide the AI model.
// ---------------------------------------------------------------------------

export const FONT_STYLES: Record<string, string> = {
  script:
    "elegant flowing cursive script with connected letter strokes and graceful loops",
  modern:
    "clean modern sans-serif uppercase with uniform stroke width and geometric proportions",
  classic:
    "refined classic serif with balanced proportions and subtle bracketed serifs",
  naskh:
    "traditional Naskh Arabic calligraphy with flowing connected letterforms and balanced dots",
  diwani:
    "ornate Diwani Arabic calligraphy with dramatic curved strokes and stacked composition",
  kufi:
    "angular Kufic Arabic calligraphy with geometric straight lines and square proportions",
  regular:
    "standard regular-weight letterforms with even stroke width and neutral proportions",
  serif:
    "classic serif letterforms with elegant thin-to-thick stroke contrast and traditional terminals",
  bold:
    "bold heavyweight letterforms with strong stroke width and commanding presence",
};

// ---------------------------------------------------------------------------
// Decoration / style descriptions — how stones and diamonds appear on a piece.
// ---------------------------------------------------------------------------

export const DECORATION_STYLES: Record<string, string> = {
  gold_only:
    "pure polished gold with no stones — clean, elegant surfaces with mirror-like reflections and subtle brushed accents",
  gold_with_stones:
    "gold set with semi-precious gemstones (sapphires, rubies, or emeralds) in prong or bezel settings along the frame or bail",
  gold_with_diamonds:
    "gold set with brilliant-cut diamonds in micro-pave or channel settings, each facet catching light with fire and scintillation",
};

// ---------------------------------------------------------------------------
// Size feel descriptions — communicates the physical scale to the model.
// ---------------------------------------------------------------------------

export const SIZE_FEELS: Record<string, string> = {
  small:
    "delicate and petite, approximately 12mm in height — subtle everyday jewelry with fine detail",
  medium:
    "balanced and versatile, approximately 18mm in height — the classic statement pendant size",
  large:
    "bold and commanding, approximately 25mm in height — a striking centerpiece with generous surface area",
};

// ---------------------------------------------------------------------------
// Background rules per metal type — chosen to maximise contrast and luxury feel.
// ---------------------------------------------------------------------------

export const BACKGROUND_STYLES: Record<string, string> = {
  yellow:
    "deep charcoal dark velvet background (#1A1A1A) to maximise warm gold contrast and specular highlights",
  white:
    "warm slate background (#2D2D2D) to separate the cool white-gold tones from the environment",
  rose:
    "warm cream background (#FAF7F2) to complement the soft pink-copper tones of rose gold",
};

// ---------------------------------------------------------------------------
// Reusable prompt text blocks
// ---------------------------------------------------------------------------

/**
 * Describes the physical characteristics of V-shaped groove engraving so the
 * model renders realistic metalwork rather than flat overlaid text.
 */
export function engravingPhysicsBlock(): string {
  return `ENGRAVING PHYSICS — V-SHAPED GROOVE IN REAL METAL:
- The engraving tool cuts V-shaped grooves into the metal surface
- The inside of each groove is angled, reflecting light DIFFERENTLY than the flat surface
- The groove wall FACING the light source appears as a bright specular line
- The groove wall AWAY from the light source falls into shadow
- The deepest point of each groove is the darkest
- Where the groove edge meets the flat surface there is a sharp specular highlight
- The engraving follows the 3D curvature of the surface — it is NOT flat text pasted on a curved object
- At the start and end of each letter stroke the groove tapers to a point (the burin enters and exits the metal)
- If someone zoomed in 400% the engraving should show physical depth in the metal, not flat printed text`;
}

/**
 * Instructs the model to spell the customer's name exactly, character by
 * character, and respect language-specific rendering rules.
 */
export function textReferenceBlock(name: string, language: string): string {
  const chars = [...name];
  const spelled = chars.join(" — ");

  const languageNote =
    language === "ar"
      ? "This is Arabic text. Render RIGHT-TO-LEFT with correct letter connections (initial, medial, final, isolated forms). Do NOT reverse the character order."
      : language === "zh"
        ? "These are Chinese characters. Render each character with precise stroke order and count. Do NOT simplify or substitute characters."
        : "This is Latin text. Render each character exactly as specified with correct kerning.";

  return `TEXT REFERENCE — THE NAME TO RENDER:
The customer's name is: "${name}"
Spelled character by character: ${spelled}
Total characters: ${chars.length}
${languageNote}
Every character must be present, correctly shaped, and in the exact order shown above. Do NOT add, remove, or rearrange any characters.`;
}

/**
 * Returns the absolute rules that constrain the model's output, including the
 * correct background colour for the chosen metal type.
 */
export function absoluteRulesBlock(
  hasReference: boolean,
  metalType: string,
): string {
  const bg =
    BACKGROUND_STYLES[metalType] ?? BACKGROUND_STYLES["yellow"];

  const referenceRule = hasReference
    ? "- DO NOT change anything about the reference image except applying the requested design modifications"
    : "";

  return `ABSOLUTE RULES:
${referenceRule}
- The name text must be physically part of the metal — raised, embossed, or engraved — NEVER flat printed
- Background: ${bg}
- Professional studio lighting with soft key light and subtle fill
- Luxury catalog quality — this image will be shown to customers as a product preview
- The pendant hangs naturally from its bail or chain attachment point
- No watermarks, no logos, no text overlays outside the jewelry itself
- The output image must be photorealistic at 1024x1024 resolution`.trim();
}
