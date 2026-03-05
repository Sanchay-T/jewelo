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
  styleFamily?: string;
  complexity?: number; // 1..10
  gemstones?: string[];
  primaryGemstone?: string;
  lengthMm?: number;
  thicknessMm?: number;
  additionalInfo?: {
    occasion?: string;
    metalFinish?: string;
    notes?: string;
  };
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

export function decorationFromSelection(design: DesignInput): string {
  const gemstones = design.gemstones || [];
  if (!gemstones.length) {
    return DECORATION_STYLES[design.style] || DECORATION_STYLES.gold_only;
  }

  if (gemstones.length === 1 && gemstones[0] === "diamond") {
    return DECORATION_STYLES.gold_with_diamonds;
  }

  const listed = gemstones.join(", ");
  return `gold set with ${listed} gemstones in mixed prong and bezel settings, balanced around the focal lettering`;
}

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

export function complexityDescriptor(complexity?: number): string {
  const value = Math.max(1, Math.min(10, Math.round(complexity ?? 5)));
  if (value <= 3) return "clean and restrained";
  if (value <= 7) return "balanced and detailed";
  return "ornate and luxurious";
}

export function finishDescriptor(metalFinish?: string): string {
  if (!metalFinish || metalFinish === "polished") return "high polish mirror finish";
  if (metalFinish === "matte") return "soft matte finish with low glare";
  if (metalFinish === "brushed") return "fine directional brushed finish";
  if (metalFinish === "hammered") return "light hammered artisanal texture";
  if (metalFinish === "textured") return "rich textured finish with micro-relief";
  return "high polish mirror finish";
}

// ---------------------------------------------------------------------------
// Background rules per metal type — chosen to maximise contrast and luxury feel.
// ---------------------------------------------------------------------------

export const BACKGROUND_STYLES: Record<string, string> = {
  yellow:
    "dark emerald green velvet fabric background (#1B3D2F), slightly draped with soft folds catching ambient light, providing rich contrast against yellow gold",
  yellow_gold:
    "dark emerald green velvet fabric background (#1B3D2F), slightly draped with soft folds catching ambient light, providing rich contrast against yellow gold",
  white:
    "deep navy blue velvet fabric background (#0F1B2D), smooth with subtle texture, providing elegant contrast against bright white gold",
  white_gold:
    "deep navy blue velvet fabric background (#0F1B2D), smooth with subtle texture, providing elegant contrast against bright white gold",
  rose:
    "warm cream linen fabric background (#FAF7F2), softly textured with gentle folds, complementing the soft pink-copper tones of rose gold",
  rose_gold:
    "warm cream linen fabric background (#FAF7F2), softly textured with gentle folds, complementing the soft pink-copper tones of rose gold",
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
The engraving tool cuts V-shaped grooves directly into the metal surface, creating channels with angled walls that interact with light in physically accurate ways. The groove wall facing the light source catches it as a bright specular line, while the wall turned away falls into soft shadow. At the deepest point of each groove, the metal is darkest. Where each groove edge meets the flat surface, a sharp specular highlight traces the outline of every letter. The engraving follows the 3D curvature of the surface -- never flat text pasted onto a curved object. At the start and end of each stroke, the groove tapers to a fine point where the burin enters and exits the metal. Zoomed in 400%, the engraving shows physical depth carved into the metal, not printed or overlaid text.`;
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
    ? "Do not change anything about the reference image except applying the requested design modifications. "
    : "";

  return `ABSOLUTE RULES:
${referenceRule}The name text must be physically part of the metal -- raised, embossed, or engraved into the surface -- never flat printed or overlaid. The background is ${bg}. Use professional studio lighting with a soft key light and subtle fill to reveal the metal's luster and the depth of every detail. This is luxury catalog quality -- the image will be shown to customers as a product preview. The pendant hangs naturally from its bail or chain attachment point with realistic gravity. No watermarks, no logos, no text overlays outside the jewelry itself. The output image must be photorealistic at 1024x1024 resolution.`;
}
