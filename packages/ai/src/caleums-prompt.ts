// Faithful TypeScript port of caleums_pipeline_final.zip's
// `prompt_builder_v5_production.py` (validated 2026-08-27).
//
// The ZIP's three separations are the whole reason its output held:
//   Geometry lives in the silhouette reference - NEVER in words.
//   Taste lives in the style anchor image - NEVER in adjectives.
//   Product config lives in the prompt - plain jeweller language.
//   Format is the ratio API parameter - NEVER in the prompt.
//
// The frozen blocks below are byte-identical to the ZIP. They passed the
// letterform contamination test (Minimal product against a Classic anchor);
// the compressed paraphrase that replaced them in the first DB release did
// not, and produced visible letterform drift on the worn shot.
//
// One deliberate adaptation: the ZIP ran on Runway, whose API accepts tagged
// reference images (`@pendantshape`, `@style`). OpenAI's images/edits takes an
// untagged ordered array, so the tags are rewritten as "the first/second
// supplied image" while the surrounding sentences are preserved exactly.

export type CaleumsShot =
  | "packshot"
  | "worn"
  | "macroGift"
  | "darkEditorial"
  | "studioHero"
  | "billboard";

const METAL: Record<string, readonly [string, string]> = {
  yellow: ["gold", "polished 18K yellow gold"],
  white: [
    "white gold",
    "polished 18K white gold with a bright cool silvery finish",
  ],
  rose: ["rose gold", "polished 18K rose gold with its warm pink hue"],
};

const GEMS: Record<string, string> = {
  "lab-diamond": "lab-grown diamonds",
  "natural-diamond": "natural diamonds",
  ruby: "rubies",
  emerald: "emeralds",
  "blue-sapphire": "blue sapphires",
  "pink-sapphire": "pink sapphires",
};

// Jeweller judgment: stones are PLACED, not coated.
// "First letter" = RIGHTMOST, because Arabic reads right to left.
const STONES: Record<string, string> = {
  accent:
    "with one to three tiny brilliant-cut {gem} placed as deliberate " +
    "punctuation - one bezel-set into a fused letter dot where the name has " +
    "one, the rest bead-set into the widest stroke bellies, every hairline " +
    "stroke left clean polished metal, ",
  "partial-pave":
    "with ONLY the first letter of the name - the RIGHTMOST letter, since " +
    "Arabic reads right to left - fully micro-pave set with tiny " +
    "brilliant-cut {gem}, held inside a thin polished border, every other " +
    "letter plain for contrast, ",
  "full-pave":
    "with micro-pave {gem} flowing ALONG the letter strokes like a river, " +
    "rows sized to each stroke's width, hairline connectors and jump rings " +
    "left polished, a thin polished rim framing every edge so the calligraphy " +
    "reads crisply, ",
};

const SIZE: Record<string, string> = {
  delicate: "a small delicate pendant approximately 2.2 cm wide",
  classic: "a refined classic pendant approximately 3.0 cm wide",
  statement:
    "a confident statement pendant approximately 3.6 cm wide, never oversized",
};

const CHAIN: Record<string, string> = {
  cable: "fine cable chain",
  rolo: "fine rolo chain with small round uniform links",
  box: "fine box chain with small square crisp-edged links",
  curb: "fine curb chain with small flattened interlocking links",
};

// Voiced only in worn shots.
const DRAPE: Record<number, string> = {
  40: "on a short 40 cm chain sitting high at the base of the throat",
  45: "on a 45 cm chain sitting at the collarbone",
  50: "on a 50 cm chain sitting just below the collarbone",
  55: "on a long 55 cm chain resting low at mid-chest",
};

export const ROLE_SEPARATION =
  "The first supplied image is the ONE AND ONLY source for the pendant: the " +
  "pendant is EXACTLY the black shape shown in it - every stroke, curve and " +
  "the small fused dots are one solid manufactured piece, present exactly as " +
  "drawn, the two small hollow rings at the top are the jump rings; do not " +
  "add, remove, separate or redraw anything. The second supplied image is a " +
  "style reference ONLY: match its framing, light, colour palette, setting " +
  "and overall mood, but never copy the pendant, the name, the letterforms " +
  "or any object from it. ";

export const HERO =
  "The pendant is the hero of the image - the sharpest, most eye-catching " +
  "element in the frame, nothing competing with it. ";

export const GUARDS =
  "Real unretouched photograph, faint grain, not a 3D render, no artificial " +
  "glow. The chain threads INTO both jump rings with no gap. No text, no " +
  "logos, no watermarks.";

// Plain photographer language. No composition math, no ratio words, no
// ornament adjectives. Worn scenes stay jewellery-focused (moderation-safe:
// one raw prompt was blocked by output moderation; this rephrase passed).
export const SCENE: Record<CaleumsShot, string> = {
  worn:
    "A woman wearing the necklace, photographed for a jewellery brand, the " +
    "pendant resting {{drape}}, its chain draping naturally and slightly " +
    "unevenly, casting a thin soft shadow on skin and fabric, natural skin " +
    "texture. ",
  packshot:
    "Catalogue photograph of the full necklace against a neutral ivory cream " +
    "background, both sides of the chain falling from the top of the frame " +
    "down to the pendant, the two sides hanging with slightly different " +
    "curves, a soft visible shadow pooling beneath the pendant. ",
  macroGift:
    "Macro product photograph of the necklace laid on a roll of black suede, " +
    "the chain snaking across the dark textured fabric in a loose natural " +
    "curve, suede nap and tiny fibre specks resolved near the pendant, deep " +
    "soft shadow at the edges, shallow depth of field. ",
  darkEditorial:
    "Elegant editorial photograph framed on the neck and collarbone of a " +
    "woman in a midnight-blue satin dress with a modest neckline against a " +
    "near-black background, one warm directional spotlight on the necklace, " +
    "everything else in deep soft shadow, natural skin texture. ",
  studioHero:
    "Studio photograph of the necklace hanging in front of a warm ivory-grey " +
    "seamless paper sweep lit by a single softbox from the upper left with a " +
    "white bounce card right, asymmetric falloff on the sweep, no radial " +
    "halo, no props, chain hanging with slightly uneven drape, a soft " +
    "accurate shadow behind. ",
  billboard:
    "Campaign photograph of the necklace hanging toward the right of the " +
    "frame against a matte black paper sweep lit by one narrow warm " +
    "spotlight from above, the metal glowing with a subtle rim light, calm " +
    "empty darkness across the left of the frame, nothing else in frame. ",
};

function lookup(
  table: Record<string, unknown>,
  value: unknown,
  field: string,
): string {
  const key = typeof value === "string" ? value : "";
  const found = table[key];
  if (typeof found === "string") return found;
  throw new Error(`unsupported_${field}:${key || "missing"}`);
}

/** What the piece physically IS - the only dynamic text in a prompt. */
export function buildPieceSpec(
  specification: Readonly<Record<string, unknown>>,
): string {
  const metal = METAL[String(specification.metalColor ?? "")];
  if (!metal)
    throw new Error(`unsupported_metal:${String(specification.metalColor)}`);
  const [metalShort, metalFull] = metal;

  const coverage = String(specification.stoneCoverage ?? "none");
  // "none" contributes nothing at all - the ZIP omits the clause entirely
  // rather than emitting a placeholder the model has to interpret.
  const stone =
    coverage === "none"
      ? ""
      : lookup(STONES, coverage, "stone_coverage").replace(
          "{gem}",
          lookup(GEMS, specification.gemstone, "gemstone"),
        );

  const size = lookup(SIZE, specification.sizeProfile, "size_profile");
  const chain = asObject(specification.chain);
  const chainStyle = lookup(CHAIN, chain.style, "chain_style");

  return (
    `The piece: a personalised ${metalShort} Arabic name pendant necklace. ` +
    `Rendered as ${metalFull}, ${stone}${size}, its ${chainStyle} ` +
    "thread-thin with tiny links. "
  );
}

/** Chain drape sentence fragment. Worn shots only. */
export function buildDrape(
  specification: Readonly<Record<string, unknown>>,
): string {
  const chain = asObject(specification.chain);
  const length = Number(chain.lengthCm);
  const drape = DRAPE[length];
  if (!drape) throw new Error(`unsupported_chain_length:${chain.lengthCm}`);
  return drape;
}

/** The complete frozen template for a shot, as published to prompt_releases. */
export function caleumsTemplate(shot: CaleumsShot): string {
  // The separator lives in the template, not in the value: compilePrompt trims
  // every substituted value, so a trailing space on piece_spec is eaten.
  return SCENE[shot] + ROLE_SEPARATION + "{{piece_spec}} " + HERO + GUARDS;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
