import { createHash } from "node:crypto";
// The one place that says which constructions draw Latin in capitals and in
// which face; `solveIdentity` reads the same table to decide what it cuts.
import { CONSTRUCTION_LETTERING } from "@jewelo/identity";
import {
  STILL_SIZE_BY_RATIO,
  stillImageOptions,
  type StillAspectRatio,
  type StillImageOptions,
} from "@jewelo/config";

export const PROMPT_PROFILES = [
  "image.studio",
  "image.packshot",
  "image.worn",
  "image.macro_gift",
  "image.dark_editorial",
  "image.studio_hero",
  "image.billboard",
  "video.preview",
  "video.final",
  "verification.image",
] as const;
export type PromptProfile = (typeof PROMPT_PROFILES)[number];

export const PROMPT_COMPILER_VERSION = "caleums-prompt-compiler-v2";
// v2 (22 Sep 2026): the optional `look` reference role, and `@tag` rendered as
// "Image N (role)" in the compiled text, because OpenAI receives ordered files
// and never sees a tag. Stored snapshots are never recompiled, so every
// historical prompt stays exactly the bytes that were paid for.
export const STILL_COMPILER_VERSION = "caleums-still-compiler-v2";
export const MAX_PROMPT_TEMPLATE_LENGTH = 12_000;
export const MAX_COMPILED_PROMPT_LENGTH = 16_000;
/**
 * Ceiling for an ordinary variable value. Every one of them is a short field
 * off the approved specification, so anything longer is a snapshot bug rather
 * than a customer choice.
 */
export const MAX_PROMPT_VALUE_LENGTH = 512;
/**
 * `construction` is the one variable whose value is a paragraph rather than a
 * field: it carries the lab's measured construction brief for the pendant the
 * customer chose (`PENDANT_CONSTRUCTION_PROSE`). The longest of those,
 * `origami-ribbon`, is a little under a thousand characters, so the ceiling is
 * generous enough for a reworded brief and still far below the compiled-prompt
 * cap.
 */
export const MAX_CONSTRUCTION_VALUE_LENGTH = 2_400;

export const PROMPT_VARIABLES = {
  approved_name: "Exact approved pendant name",
  language: "Approved language/script",
  arabic_style: "Approved Arabic lettering style",
  layout: "Pendant name layout",
  metal_karat: "Metal karat",
  metal_color: "Metal color",
  finish: "Metal finish",
  stone_coverage: "Stone coverage",
  gemstone: "Approved gemstone",
  size_profile: "Pendant size profile",
  dimensions: "Approved width, height and thickness",
  chain_style: "Approved chain style",
  chain_length: "Approved chain length",
  presentation_view: "Requested presentation view",
  inspiration_rule: "Pinned optional inspiration handling",
  piece_spec: "Complete immutable pendant specification",
  drape: "Approved worn-view chain drape",
  construction: "Approved pendant construction, as the brief the stencil draws",
  // The minimal style-first family (lab, 22 September 2026). Each is composed
  // in `buildPromptVariableSnapshot` from the approved revision, because the
  // sentence differs by script or by construction and a template cannot branch.
  name_spelling: "How the approved name is spelled and read, by script",
  stones_rule: "Where this construction seats its stones, or that it has none",
  look_rule:
    "The finish the look reference shows; used by the compiler's Image 2 line",
} as const;
export type PromptVariable = keyof typeof PROMPT_VARIABLES;
export type PromptVariableSnapshot = Record<PromptVariable, string>;

// `construction` joins `piece_spec` and `drape` as allowed-but-not-required:
// a release published before constructions existed still validates, and the
// database's own `create_prompt_release` guard treats it the same way.
const OPTIONAL_VARIABLES: readonly PromptVariable[] = Object.freeze([
  "piece_spec",
  "drape",
  "construction",
  "name_spelling",
  "stones_rule",
  "look_rule",
]);

/**
 * The minimal style-first sheet, measured on gpt-image-2.5-sunburst on
 * 22 September 2026 (`docs/goals/road-to-gold/lab-2026-09-22/`). It names the
 * name, the construction and the stones as three composed sentences instead of
 * the fifteen immutable fields, and it passed for all four constructions at
 * about 40% of the old prompt's length. A release that carries
 * `name_spelling` is one of these and is validated against this set.
 */
const MINIMAL_STILL_REQUIRED_VARIABLES: readonly PromptVariable[] =
  Object.freeze(["name_spelling", "construction", "stones_rule"]);
const PRODUCT_VARIABLES = Object.freeze(
  (Object.keys(PROMPT_VARIABLES) as PromptVariable[]).filter(
    (variable) => !OPTIONAL_VARIABLES.includes(variable),
  ),
);
const LEGACY_VARIABLES = PRODUCT_VARIABLES.filter(
  (variable) => variable !== "inspiration_rule",
);
const ALL_VARIABLES = Object.freeze(
  Object.keys(PROMPT_VARIABLES) as PromptVariable[],
);

export const PROMPT_PROFILE_REGISTRY: Readonly<
  Record<
    PromptProfile,
    {
      allowedVariables: readonly PromptVariable[];
      requiredVariables: readonly PromptVariable[];
    }
  >
> = Object.fromEntries(
  PROMPT_PROFILES.map((profile) => [
    profile,
    {
      allowedVariables: ALL_VARIABLES,
      requiredVariables:
        profile === "image.studio" ? LEGACY_VARIABLES : PRODUCT_VARIABLES,
    },
  ]),
) as Record<
  PromptProfile,
  {
    allowedVariables: readonly PromptVariable[];
    requiredVariables: readonly PromptVariable[];
  }
>;

/**
 * Canonical still prose. Image positions are assigned by compileStillPrompt
 * from the same ordered references the transports consume. Historical published
 * templates and stored snapshots are immutable; publish a new release only after
 * jobs uses the canonical compiler. The historical lab v4.3 remains reproducible.
 */
const STILL_VIEW_LABELS: Readonly<Record<string, string>> = {
  studio: "Studio",
  on_skin: "On skin",
  close_up: "Close up",
  dark: "Dark",
};

/** `VIEWS[*].brief` from the lab compiler, verbatim. */
const STILL_VIEW_BRIEFS: Readonly<Record<string, string>> = {
  studio:
    "A catalogue packshot. The pendant lies almost flat, seen from just off straight-on, filling most of " +
    "the frame with a small even margin. The whole pendant and both jump rings are inside the frame and " +
    "in focus. The chain runs away from both rings and settles in a relaxed curve on the surface. " +
    "Background is a plain warm off-white matte paper sweep.",
  on_skin:
    "The necklace worn by one adult woman, framed from the base of the neck to the top of the chest, face " +
    "out of frame. The pendant rests flat on the skin just below the collarbones and is fully readable, " +
    "sharp and unobstructed. Natural skin texture and a soft neutral top she is wearing. Daylight from a " +
    "large window on the left.",
  close_up:
    "A tight three-quarter macro of the pendant, angled so the thickness of the cast metal edge is visible " +
    "along the strokes, with one jump ring and the first links of the chain threaded through it clearly in " +
    "frame. Every letter of the name, including the last letter's final stroke and its terminal, sits fully " +
    "inside the frame with a clear band of background on all four sides. No part of the pendant touches " +
    "or crosses the frame edge - a name cropped at the edge is wrong. Shallow but sufficient depth of field so " +
    "the near edge is sharp and the far end falls off gently.",
  dark:
    "A low-key editorial still. The pendant lies on a dark textured stone slab, lit by one narrow soft " +
    "source from the upper left so the gold reads as a bright edge against deep shadow, with a small amount " +
    "of fill so the letters never disappear into black. The whole pendant and both rings stay readable.",
};

/**
 * The `construction` slot: the lab's measured STYLE paragraph per construction,
 * verbatim from `docs/goals/road-to-gold/lab-2026-09-22/` (the minimal
 * style-first family, 22 September 2026), with the one reference to the
 * silhouette written as `@stencil` so the compiler numbers it.
 *
 * These are the whole description of the piece in the minimal family: the
 * sheet names the style, the name, the chain, the material and the shot and
 * nothing else, so anything not in the lab text does not belong here.
 *
 * The empty-string key is the fallback for a revision approved before
 * constructions existed (`JewelrySpecification.construction` is optional): the
 * classical paragraph, which is the lettering alone and so asserts nothing the
 * stencil does not already show.
 */
export const PENDANT_CONSTRUCTION_PROSE: Readonly<Record<string, string>> = {
  classical:
    "Classical nameplate. The letters alone are the pendant: no frame, plate or rail. Each letter has one " +
    "flat mirror-polished face and straight square side walls of even depth, with crisp edges. No bevels, " +
    "facets, texture or engraving.",
  "origami-ribbon":
    "Origami fold. Each letter stroke is a folded gold sheet: two or three large flat planes per stroke, " +
    "meeting at straight crisp creases where strokes join or turn. The plane facing the light is bright; the " +
    "plane beside it is a darker tone of the same gold. Faces are flat and mirror polished, side walls " +
    "straight and square. No small facets, texture or engraving.",
  "framed-minimal":
    "Framed minimal. The letters sit inside one slim rectangular gold frame, joined to it only where @stencil " +
    "joins them. The frame is a slim square bar with a flat polished top and crisp right-angle corners. The " +
    "letters have flat mirror-polished faces and straight square side walls and stand slightly above the " +
    "frame. No bevels, facets, texture or engraving.",
  "diamond-rails":
    "Rails. The letters sit between two straight parallel gold rails, one above and one below, joined only " +
    "where @stencil joins them; the rings are at the ends of the top rail. The rails are slim straight " +
    "polished bars with a flat top and square ends. The letters have flat mirror-polished faces and straight " +
    "square side walls. No bevels, facets, texture or engraving.",
};

export const PENDANT_CONSTRUCTION_FALLBACK = PENDANT_CONSTRUCTION_PROSE.classical!;

/**
 * The finish each construction's look crop shows, dropped into the compiler's
 * Image 2 sentence. Lab text, verbatim.
 */
export const PENDANT_LOOK_PROSE: Readonly<Record<string, string>> = {
  classical: "flat mirror-polished letter faces and crisp square side walls",
  "origami-ribbon":
    "large flat folded planes, crisp straight creases and mirror polish",
  "framed-minimal":
    "flat mirror-polished letter faces, crisp square side walls and a slim square frame bar",
  "diamond-rails":
    "slim crisp polished bars and flat mirror-polished letter faces",
};

/**
 * Where each construction seats its stones. Lab text, verbatim, with the
 * gemstone itself as `{gem}` / `{gems}` so the customer's approved stone is the
 * one named. Used only when the approved coverage is not "none"; otherwise the
 * sheet says "No stones."
 */
export const PENDANT_STONES_PROSE: Readonly<Record<string, string>> = {
  classical:
    "Stones: one small round {gem} set flush into the flat face of the first letter and one into the face of " +
    "the last letter; the rings stay open. No other stones.",
  "origami-ribbon":
    "Stones: three small round {gems} set flush into the flat face of the letters where two strokes meet - " +
    "one in the first letter, one in a middle letter, one in the last letter. The outline does not change. " +
    "No other stones.",
  "framed-minimal":
    "Stones: one small round {gem} in a small square raised gold bezel at each of the frame's four corners. " +
    "No other stones.",
  "diamond-rails":
    "Stones: three small round {gems} in raised round gold bezels - two on the top rail near its ends, one " +
    "at the centre of the bottom rail. No other stones.",
};

/** Singular and plural of a stone, as a jeweller would say it in a sentence. */
const GEMSTONE_STONE_NAME: Readonly<Record<string, readonly [string, string]>> = {
  "lab-diamond": ["lab-diamond", "lab-diamonds"],
  "natural-diamond": ["diamond", "diamonds"],
  ruby: ["ruby", "rubies"],
  emerald: ["emerald", "emeralds"],
  "blue-sapphire": ["blue sapphire", "blue sapphires"],
  "pink-sapphire": ["pink sapphire", "pink sapphires"],
};

export const BASELINE_PROMPT_TEMPLATES: Readonly<
  Record<PromptProfile, string>
> = {
  "image.studio": [
    "Create one refined {{presentation_view}} product photograph of the supplied immutable name-pendant identity for {{approved_name}} ({{language}}; Arabic style: {{arabic_style}}).",
    "Preserve the exact spelling, glyph order, {{layout}} geometry and attachments.",
    "Use {{metal_karat}} {{metal_color}} metal with a {{finish}} finish, {{stone_coverage}} {{gemstone}}, {{size_profile}} scale, and approved dimensions {{dimensions}}.",
    "Show the pendant on its {{chain_style}} chain at {{chain_length}}. Do not invent, remove, or reshape identity details.",
  ].join(" "),
  "image.packshot": stillTemplate("studio"),
  "image.worn": stillTemplate("on_skin"),
  "image.macro_gift": stillTemplate("close_up"),
  "image.dark_editorial": stillTemplate("dark"),
  "image.studio_hero": imageTemplate(
    "Studio photograph of the necklace against a warm ivory-grey seamless paper sweep, lit by one upper-left softbox and a right bounce card, with asymmetric falloff and a soft accurate shadow.",
  ),
  "image.billboard": imageTemplate(
    "Campaign photograph of the necklace toward the right of a matte-black paper sweep, lit by one narrow warm spotlight with subtle metal rim light and calm empty darkness to the left.",
  ),
  "video.preview": [
    "Create a restrained silent {{presentation_view}} motion preview from the approved still for {{approved_name}} ({{language}}; Arabic style: {{arabic_style}}).",
    "Keep {{layout}} geometry, spelling and attachments unchanged throughout every frame.",
    "Preserve {{metal_karat}} {{metal_color}} metal, {{finish}} finish, {{stone_coverage}} {{gemstone}}, {{size_profile}} scale, {{dimensions}}, and the {{chain_style}} chain at {{chain_length}}.",
    "Use only subtle product-camera movement and controlled specular light; no morphing or new objects. {{inspiration_rule}}",
  ].join(" "),
  "video.final": [
    "Create a polished silent {{presentation_view}} final product film from the approved still for {{approved_name}} ({{language}}; Arabic style: {{arabic_style}}).",
    "Keep exact spelling, {{layout}} geometry and attachments stable for the full shot.",
    "Preserve {{metal_karat}} {{metal_color}} metal, {{finish}} finish, {{stone_coverage}} {{gemstone}}, {{size_profile}} scale, {{dimensions}}, and the {{chain_style}} chain at {{chain_length}}.",
    "Use elegant, restrained camera motion and realistic light only; do not morph the pendant or introduce unapproved details. {{inspiration_rule}}",
  ].join(" "),
  "verification.image": [
    "Verify the supplied generated image against the immutable silhouette and approved configuration for {{approved_name}} ({{language}}; Arabic style: {{arabic_style}}).",
    "Require exact spelling and script, the same identity and {{layout}} geometry, exactly two connected jump rings with coherent {{chain_style}} chain attachment at {{chain_length}}, {{metal_karat}} {{metal_color}} {{finish}} metal, {{stone_coverage}} {{gemstone}}, {{size_profile}} dimensions {{dimensions}}, and the requested {{presentation_view}} shot.",
    "Reject any added letters, names, charms, duplicate pendants, missing or third rings, malformed chain attachment, incoherent pendant, or wrong shot. {{inspiration_rule}}",
  ].join(" "),
};

export const PRESENTATION_PROFILE = {
  studio: "image.packshot",
  on_skin: "image.worn",
  close_up: "image.macro_gift",
  dark: "image.dark_editorial",
  studio_hero: "image.studio_hero",
  billboard: "image.billboard",
  motion_preview: "video.preview",
  motion_final: "video.final",
} as const satisfies Readonly<Record<string, PromptProfile>>;

export const PRESENTATION_ASPECT_RATIO = {
  studio: "1:1",
  on_skin: "4:5",
  close_up: "1:1",
  dark: "9:16",
  studio_hero: "9:16",
  billboard: "16:9",
  motion_preview: "9:16",
  motion_final: "9:16",
} as const;

export const STYLE_ANCHOR_SOURCE_TASK_IDS = {
  "image.worn": "ee78f9a4-6ace-428c-9f12-4e6101188190",
  "image.packshot": "ddd3862a-05cb-4b95-9b6b-aa8d6453293b",
  "image.macro_gift": "44f3b981-18bd-4dbf-892e-dcf3f4c9c817",
  "image.dark_editorial": "ba0b8433-f0f2-4458-82c9-5d3ce88081d6",
  "image.studio_hero": "d0c0bac4-d2e4-481c-8fff-c658acd807ac",
  "image.billboard": "f7de6e1b-4278-4866-97ac-865abeb89560",
} as const;

export interface PromptTemplateValidation {
  profile: PromptProfile;
  variables: PromptVariable[];
}

export interface CompiledPrompt {
  profile: PromptProfile;
  compiledPrompt: string;
  compilerVersion: typeof PROMPT_COMPILER_VERSION | typeof STILL_COMPILER_VERSION;
  sha256: string;
  variableSnapshot: PromptVariableSnapshot;
}

export function isPromptProfile(value: string): value is PromptProfile {
  return (PROMPT_PROFILES as readonly string[]).includes(value);
}

export function validatePromptTemplate(
  profile: PromptProfile,
  template: string,
): PromptTemplateValidation {
  if (!isPromptProfile(profile)) throw new Error("Unknown prompt profile");
  if (!template.trim()) throw new Error("Prompt template is required");
  if (template.length > MAX_PROMPT_TEMPLATE_LENGTH)
    throw new Error(
      `Prompt template exceeds ${MAX_PROMPT_TEMPLATE_LENGTH} characters`,
    );
  if (/\p{Cc}/u.test(template.replace(/[\n\r\t]/g, "")))
    throw new Error("Prompt template contains unsupported control characters");

  const matches = [...template.matchAll(/\{\{([a-z][a-z0-9_]*)\}\}/g)];
  const withoutPlaceholders = template.replace(
    /\{\{([a-z][a-z0-9_]*)\}\}/g,
    "",
  );
  if (/[{}]/.test(withoutPlaceholders))
    throw new Error("Prompt template contains malformed placeholder braces");

  const variables = [...new Set(matches.map((match) => match[1]))];
  const allowed = PROMPT_PROFILE_REGISTRY[profile].allowedVariables;
  const unknown = variables.filter(
    (variable): variable is string =>
      !allowed.includes(variable as PromptVariable),
  );
  if (unknown.length)
    throw new Error(`Unknown prompt variable: ${unknown.join(", ")}`);
  // Compact prompt-sheet releases may deliberately collapse the immutable
  // form fields into piece_spec. Legacy templates retain the stricter field-
  // by-field contract so accidentally dropping one still fails publication.
  const required = variables.includes("piece_spec")
    ? (["piece_spec"] as const)
    : variables.includes("name_spelling")
      ? MINIMAL_STILL_REQUIRED_VARIABLES
      : PROMPT_PROFILE_REGISTRY[profile].requiredVariables;
  const missing = required.filter((variable) => !variables.includes(variable));
  if (missing.length)
    throw new Error(`Missing required prompt variables: ${missing.join(", ")}`);
  return { profile, variables: variables as PromptVariable[] };
}

export function buildPromptVariableSnapshot(input: {
  approvedName: unknown;
  language: unknown;
  specification: Readonly<Record<string, unknown>>;
  presentationView: unknown;
}): PromptVariableSnapshot {
  const specification = input.specification;
  const dimensions = asObject(specification.dimensions);
  const chain = asObject(specification.chain);
  const connector = scalar(specification.connector);
  const pieceSpec = [
    `name=${scalar(input.approvedName)}`,
    `language=${scalar(input.language)}`,
    `arabic_style=${prose(ARABIC_STYLE_PROSE, specification.arabicStyle)}`,
    `layout=${prose(LAYOUT_PROSE, specification.layout)}`,
    ...(connector && connector !== "none"
      ? [`connector=${prose(CONNECTOR_PROSE, connector)}`]
      : []),
    `metal=${scalar(specification.metalKarat)} ${scalar(specification.metalColor)} gold, ${prose(FINISH_PROSE, specification.finish)}`,
    `stones=${stonePhrase(
      scalar(specification.stoneCoverage),
      joinStones(
        gemstoneList(specification).map((gem) => prose(GEMSTONE_PROSE, gem)),
      ),
    )}`,
    `size=${scalar(specification.sizeProfile)}; dimensions=${scalar(dimensions.widthMm)} × ${scalar(dimensions.heightMm)} × ${scalar(dimensions.thicknessMm)} mm`,
    `chain=${prose(CHAIN_PROSE, chain.style)}; length=${scalar(chain.lengthCm)} cm`,
  ].join("; ");
  return {
    approved_name: scalar(input.approvedName),
    language: scalar(input.language),
    arabic_style: letteringStyle(specification),
    layout: scalar(specification.layout),
    metal_karat: scalar(specification.metalKarat),
    metal_color: scalar(specification.metalColor),
    finish: scalar(specification.finish),
    stone_coverage: scalar(specification.stoneCoverage),
    // Up to three chosen stones (22 Sep 2026); `gemstone` stays the first.
    gemstone: joinStones(gemstoneList(specification)),
    size_profile: scalar(specification.sizeProfile),
    // ASCII "x", as the lab's measured sheet writes it; the multiplication
    // sign was the only non-ASCII character in an English prompt.
    dimensions: `${scalar(dimensions.widthMm)} x ${scalar(dimensions.heightMm)} x ${scalar(dimensions.thicknessMm)} mm`,
    chain_style: scalar(chain.style),
    chain_length: `${scalar(chain.lengthCm)} cm`,
    presentation_view: scalar(input.presentationView),
    inspiration_rule: specification.referenceAsset
      ? "Use the optional third input only as customer inspiration; never copy text, identity, branding or unapproved objects from it."
      : "No customer inspiration input is approved for this task.",
    piece_spec: pieceSpec,
    drape: `Natural asymmetric ${scalar(chain.style)} chain drape at ${scalar(chain.lengthCm)} cm, with the pendant centered at the approved scale.`,
    // An unknown construction id would silently describe the wrong piece, so it
    // falls back to the brief that only repeats what the stencil already shows.
    construction:
      PENDANT_CONSTRUCTION_PROSE[scalar(specification.construction)] ??
      PENDANT_CONSTRUCTION_FALLBACK,
    // How the name is read, which is a property of the script and of the face
    // the stencil draws it in, so it cannot be a slot in one template.
    name_spelling: nameSpelling(
      scalar(input.approvedName),
      scalar(input.language),
      specification,
    ),
    stones_rule: stonesRule(specification),
    look_rule:
      PENDANT_LOOK_PROSE[scalar(specification.construction)] ??
      PENDANT_LOOK_PROSE.classical!,
  };
}

/**
 * The sheet's Name sentence: the name as the metal spells it, and how to read
 * it.
 *
 * Latin: `CONSTRUCTION_LETTERING` in `@jewelo/identity` is the one place that
 * says whether a construction's stencil is drawn in capitals, and
 * `solveIdentity` applies exactly this transform to get its `drawnText`. The
 * prompt quotes the drawn text, never a second casing of its own, and it claims
 * capitals only when what is drawn really is in capitals - which is also true
 * of a shopper who typed "ASMA" under a construction that does not uppercase.
 *
 * Arabic: the face is named only when it really is Kufi, either because the
 * construction overrides the face with the boxy Kufi row or because the
 * approved lettering is `kufi`. Any other face is described without a name
 * rather than mislabelled.
 */
function nameSpelling(
  approvedName: string,
  language: string,
  specification: Readonly<Record<string, unknown>>,
): string {
  const lettering = CONSTRUCTION_LETTERING[scalar(specification.construction)];
  if (language === "ar") {
    const kufi =
      /kufi/i.test(lettering?.ar?.fontFile ?? "") ||
      letteringStyle(specification) === "kufi";
    return `"${approvedName}" in connected Arabic${kufi ? " Kufi" : ""} letters, right to left, spelled exactly as @stencil, every dot and mark in place.`;
  }
  const drawn = lettering?.en?.uppercase
    ? approvedName.toLocaleUpperCase("en")
    : approvedName;
  const capitals =
    /\p{Lu}/u.test(drawn) && drawn === drawn.toLocaleUpperCase("en");
  return capitals
    ? `"${drawn}" in capital letters, spelled exactly as @stencil.`
    : `"${drawn}", spelled exactly as @stencil.`;
}

/**
 * The sheet's stones sentence: where this construction seats them, with the
 * approved stone named, or that the piece has none. A coverage of "none", or no
 * stone chosen, is "No stones." - the piece the shopper approved.
 */
function stonesRule(specification: Readonly<Record<string, unknown>>): string {
  const coverage = scalar(specification.stoneCoverage);
  const gemstones = gemstoneList(specification).filter((gem) => gem !== "none");
  if (!coverage || coverage === "none" || !gemstones.length) return "No stones.";
  const names = gemstones.map(
    (gem) => GEMSTONE_STONE_NAME[gem] ?? [gem, `${gem}s`],
  );
  const sentence =
    PENDANT_STONES_PROSE[scalar(specification.construction)] ??
    PENDANT_STONES_PROSE.classical!;
  return sentence
    .replaceAll("{gems}", joinStones(names.map(([, plural]) => plural!)))
    .replaceAll("{gem}", joinStones(names.map(([singular]) => singular!)));
}

/**
 * The approved stones, up to three since 22 Sep 2026. `gemstones` is the full
 * chosen list and its first entry is the legacy single `gemstone`, so a piece
 * that carries only the old field reads exactly as it always did.
 */
function gemstoneList(
  specification: Readonly<Record<string, unknown>>,
): string[] {
  const chosen = Array.isArray(specification.gemstones)
    ? specification.gemstones.map(scalar).filter(Boolean)
    : [];
  return chosen.length
    ? chosen
    : [scalar(specification.gemstone)].filter(Boolean);
}

/** "a", "a and b", "a, b and c"; one stone is returned untouched. */
function joinStones(parts: readonly string[]): string {
  const kept = parts.filter(Boolean);
  if (kept.length < 2) return kept[0] ?? "";
  return `${kept.slice(0, -1).join(", ")} and ${kept[kept.length - 1]}`;
}

export function compilePrompt(input: {
  profile: PromptProfile;
  template: string;
  variables: PromptVariableSnapshot;
}): CompiledPrompt {
  const parsed = validatePromptTemplate(input.profile, input.template);
  const snapshot = { ...input.variables };
  for (const variable of parsed.variables) {
    const value = snapshot[variable]?.trim();
    if (!value) throw new Error(`Missing required prompt value: ${variable}`);
    const limit =
      variable === "construction"
        ? MAX_CONSTRUCTION_VALUE_LENGTH
        : MAX_PROMPT_VALUE_LENGTH;
    if (value.length > limit)
      throw new Error(`Prompt value exceeds ${limit} characters: ${variable}`);
    if (/[{}]/.test(value))
      throw new Error(`Prompt value contains unresolved braces: ${variable}`);
    snapshot[variable] = value;
  }
  let compiledPrompt = input.template;
  for (const variable of parsed.variables)
    compiledPrompt = compiledPrompt.replaceAll(
      `{{${variable}}}`,
      snapshot[variable],
    );
  if (/\{\{|\}\}/.test(compiledPrompt))
    throw new Error("Compiled prompt contains unresolved placeholders");
  if (compiledPrompt.length > MAX_COMPILED_PROMPT_LENGTH)
    throw new Error(
      `Compiled prompt exceeds ${MAX_COMPILED_PROMPT_LENGTH} characters`,
    );
  return {
    profile: input.profile,
    compiledPrompt,
    compilerVersion: PROMPT_COMPILER_VERSION,
    sha256: createHash("sha256").update(compiledPrompt, "utf8").digest("hex"),
    variableSnapshot: snapshot,
  };
}

/** Ordered exactly as the existing API transport, including historical snapshots. */
export function buildStillReferences(input: {
  identityImageUrl: string;
  referenceImageUrl?: string;
  lookReferenceUrl?: string;
  styleAnchorUrl?: string;
  inspirationImageUrl?: string;
}) {
  if (!input.identityImageUrl?.trim()) throw new Error("still_stencil_required");
  return [
    ...(input.referenceImageUrl
      ? [{ role: "master" as const, url: input.referenceImageUrl, fileName: "reference.png" }]
      : []),
    { role: "stencil" as const, url: input.identityImageUrl, fileName: "identity.png" },
    // Lab, 22 September 2026: on gpt-image-2.5-sunburst the folded ribbon look
    // only appears when a text-free crop of the shop's own reference photo is
    // supplied as its own texture-only input. Wording alone gives a flat plate.
    ...(input.lookReferenceUrl
      ? [{ role: "look" as const, url: input.lookReferenceUrl, fileName: "look-reference.png" }]
      : []),
    ...(input.styleAnchorUrl
      ? [{ role: "style" as const, url: input.styleAnchorUrl, fileName: "style-anchor.png" }]
      : []),
    ...(input.inspirationImageUrl
      ? [{ role: "inspiration" as const, url: input.inspirationImageUrl, fileName: "inspiration.png" }]
      : []),
  ];
}

/**
 * Constructions whose measured look needs a texture reference of its own.
 *
 * A construction named here is refused before spend when its look asset is
 * missing (`look_reference_missing:<construction>`), because generating without
 * it produces a flat plate the shopper did not choose and nothing downstream
 * catches that.
 */
export const LOOK_REFERENCE_CONSTRUCTIONS: ReadonlySet<string> = new Set([
  "classical",
  "origami-ribbon",
  "framed-minimal",
  "diamond-rails",
]);

export function stillLookReferenceRequired(construction: unknown): boolean {
  return LOOK_REFERENCE_CONSTRUCTIONS.has(scalar(construction));
}

export type StillReferencePresence = {
  master: boolean;
  look?: boolean;
  style: boolean;
  inspiration: boolean;
};

const STILL_ROLE_RULES = {
  master: "is an approved photograph of this exact pendant. Preserve the same physical object, metal, stones, thickness and chain, changing only the requested scene. It never overrides @stencil geometry or spelling.",
  stencil: "is the sole authority for geometry and spelling: the exact black silhouette of the whole physical pendant, including all letters, joins, marks and two hollow rings. Reproduce it as gold without redesigning, adding, removing, mirroring or separating anything.",
  look: "supplies only the surface treatment of the metal - the size and number of flat planes, crease crispness, edge depth and polish; never its letters, name, outline, frame, stones, rings, chain or layout; apply it inside the stencil's silhouette.",
  style: "is style only: use framing, light, palette, setting and mood; never copy its pendant, name, letterforms, text or objects.",
  inspiration: "is optional customer inspiration only; never copy text, identity, branding or unapproved objects from it.",
} as const;

/**
 * The minimal style-first sheet (lab, 22 September 2026). Such a release names
 * its own two opening image lines through the compiler, carries no IMAGE ROLES
 * block, and refers to an input as a bare "Image N" because that is the text
 * that was measured. `name_spelling` is the marker: only the minimal family
 * has it.
 */
function isMinimalStillTemplate(template: string): boolean {
  return template.includes("{{name_spelling}}");
}

/** Reject legacy role numbering before a release can become active. */
export function assertStillTemplateCompatibility(
  profile: PromptProfile,
  template: string,
) {
  if (!["image.packshot", "image.worn", "image.macro_gift", "image.dark_editorial"].includes(profile))
    return;
  // The minimal family writes @stencil like every other release; the compiler
  // still owns the numbering, so the legacy check below has nothing to catch.
  if (isMinimalStillTemplate(template)) return;
  // Check template prose, not interpolated customer names or saved snapshots.
  if (/\bimage\s+\d|\b(first|second|third|fourth)\s+(supplied\s+)?(image|input)|IMAGE ROLES/iu.test(template))
    throw new Error(
      "Still prompt uses legacy image numbering or IMAGE ROLES. Create a new release using @stencil, @master, @style and @inspiration tags; image order is assigned by the compiler.",
    );
}

/** Compiles a new release; stored snapshots never pass through this function. */
export function compileStillPrompt(input: {
  profile: PromptProfile;
  template: string;
  variables: PromptVariableSnapshot;
  references: StillReferencePresence;
}): CompiledPrompt {
  if (!["image.packshot", "image.worn", "image.macro_gift", "image.dark_editorial"].includes(input.profile))
    throw new Error("unsupported_canonical_still_profile");
  if (input.profile !== "image.packshot" && !input.references.master)
    throw new Error("still_master_required");
  // The studio packshot still gets no sibling still and no style photo - every
  // wrong name came from one of those - but it may carry the look reference,
  // which has no letters in it at all.
  if (input.profile === "image.packshot" && (input.references.master || input.references.style))
    throw new Error("studio_extra_reference_not_approved");
  if (input.profile !== "image.packshot" && !input.references.style)
    throw new Error("still_style_reference_required");
  const variables = {
    ...input.variables,
    inspiration_rule: input.references.inspiration
      ? "Only @inspiration is approved as customer inspiration; never copy its identity or text."
      : "No customer inspiration input is approved for this task.",
  };
  // Inspect the release prose before interpolation: an approved customer name
  // such as "First Image" is data, not a legacy reference instruction.
  assertStillTemplateCompatibility(input.profile, input.template);
  const compiled = compilePrompt({ ...input, variables });
  const references = buildStillReferences({
    identityImageUrl: "stencil",
    referenceImageUrl: input.references.master ? "master" : undefined,
    lookReferenceUrl: input.references.look ? "look" : undefined,
    styleAnchorUrl: input.references.style ? "style" : undefined,
    inspirationImageUrl: input.references.inspiration ? "inspiration" : undefined,
  });
  const position = new Map(references.map(({ role }, index) => [role, index + 1]));
  const minimal = isMinimalStillTemplate(input.template);
  // Templates are authored with @tags because the order is not theirs to know.
  // OpenAI receives ordered files and no tags, so the text it reads names each
  // input by the position it is actually sent in. A tag for a role this task
  // has no file for is left as written rather than pointed at another image.
  // The minimal family says "Image 1" bare, because its opening lines have
  // already said which image is which; the older families repeat the role.
  let body = compiled.compiledPrompt;
  for (const [role, index] of position)
    body = body.replaceAll(
      `@${role}`,
      minimal ? `Image ${index}` : `Image ${index} (${role})`,
    );
  const compiledPrompt = minimal
    ? [
        ...minimalOpeningLines(position, variables),
        "",
        body,
      ].join("\n")
    : [
        "IMAGE ROLES",
        ...references.map(
          ({ role }) =>
            `Image ${position.get(role)} (${role}) ${STILL_ROLE_RULES[role]}`,
        ),
        "",
        body,
      ].join("\n");
  if (compiledPrompt.length > MAX_COMPILED_PROMPT_LENGTH)
    throw new Error("Canonical still prompt exceeds maximum length");
  return {
    ...compiled,
    compiledPrompt,
    compilerVersion: STILL_COMPILER_VERSION,
    sha256: createHash("sha256").update(compiledPrompt, "utf8").digest("hex"),
  };
}

/**
 * The minimal family's opening: one line saying what the photograph is, then
 * one line per supplied image. Lab text, verbatim; only the numbers are
 * computed, from the same ordered references the transport sends.
 *
 * It replaces the IMAGE ROLES block for this family rather than joining it:
 * what the lab measured has no header, and a header is prompt text the model
 * reads.
 */
function minimalOpeningLines(
  position: ReadonlyMap<string, number>,
  variables: PromptVariableSnapshot,
): string[] {
  const lines = [
    "Photorealistic photograph of one real gold name pendant on a chain.",
    `Image ${position.get("stencil")} (stencil) is the exact silhouette of the pendant: every letter, join and both rings. Make it in gold exactly as drawn; add, remove or move nothing.`,
  ];
  const look = position.get("look");
  if (look)
    lines.push(
      `Image ${look} (look) shows the gold finish to copy: ${variables.look_rule}. Copy only the finish, not its letters, outline, stones, rings or chain.`,
    );
  return lines;
}

export const STILL_API_SIZE_BY_RATIO = STILL_SIZE_BY_RATIO.standard;

/** Both transport preparers consume this artifact without rewriting its prompt. */
export function prepareStillRequest(input: {
  prompt: string;
  aspectRatio: StillAspectRatio;
  identityImageUrl: string;
  referenceImageUrl?: string;
  lookReferenceUrl?: string;
  styleAnchorUrl?: string;
  inspirationImageUrl?: string;
}) {
  const size = STILL_API_SIZE_BY_RATIO[input.aspectRatio];
  if (!size) throw new Error("unsupported_still_aspect_ratio");
  return {
    prompt: input.prompt,
    promptSha256: createHash("sha256").update(input.prompt, "utf8").digest("hex"),
    references: buildStillReferences(input),
    aspectRatio: input.aspectRatio,
    size,
  };
}

/**
 * Quality and canvas come from validated configuration, never from a literal:
 * on Sunburst the quality label maps differently (its `high` is about
 * gpt-image-2's `medium`), so the model snapshot and the quality a deployment
 * asks for have to be settable together. See `stillImageOptions`.
 */
export function prepareOpenAIStillRequest(
  input: Parameters<typeof prepareStillRequest>[0], model: string,
  options: StillImageOptions = stillImageOptions(),
) {
  if (!model.trim()) throw new Error("still_model_required");
  const size = options.sizeByRatio[input.aspectRatio];
  if (!size) throw new Error("unsupported_still_aspect_ratio");
  return {
    ...prepareStillRequest(input),
    model,
    size,
    quality: options.quality,
    output_format: "png",
  };
}

/** The two GPT image models Runway's callable list exposes. */
export function prepareRunwayStillRequest(
  input: Parameters<typeof prepareStillRequest>[0], model: string,
) {
  if (!["gpt-image-2", "gpt-image-2.5-sunburst"].includes(model))
    throw new Error("runway_model_unavailable");
  const request = prepareStillRequest(input);
  return {
    model, promptText: request.prompt, ratio: request.aspectRatio, count: 1,
    referenceImages: request.references.map(({ role, url }) => ({ url, tag: role })),
  };
}

// Photographic prose for the immutable enum tokens. Unknown values pass through
// unchanged so an older revision still compiles.
const ARABIC_STYLE_PROSE: Readonly<Record<string, string>> = {
  contemporary: "classic",
};
const LAYOUT_PROSE: Readonly<Record<string, string>> = {
  "single-name": "single name",
  "side-by-side": "two names side by side",
  "connected-heart": "two names joined by a heart",
  stacked: "two names stacked",
  "stacked-heart": "two names stacked with a heart",
  infinity: "two names joined by an infinity symbol",
  interlocked: "two names interlocked",
};
const CONNECTOR_PROSE: Readonly<Record<string, string>> = {
  heart: "joined by a heart",
  infinity: "joined by an infinity symbol",
  plain: "joined by a plain bar",
  interlocked: "interlocked directly",
};
const FINISH_PROSE: Readonly<Record<string, string>> = {
  polished: "high-polished",
  matte: "matte brushed",
  satin: "satin",
};
const GEMSTONE_PROSE: Readonly<Record<string, string>> = {
  none: "",
  "lab-diamond": "lab-grown white diamonds",
  "natural-diamond": "natural white diamonds",
  ruby: "deep red rubies",
  emerald: "green emeralds",
  "blue-sapphire": "blue sapphires",
  "pink-sapphire": "pink sapphires",
};
const CHAIN_PROSE: Readonly<Record<string, string>> = {
  cable: "flat oval cable-link chain",
  rolo: "round rolo-link chain",
  box: "square box-link chain",
  curb: "fine curb-link chain",
  "fine-curb": "fine curb-link chain",
};
const STONE_COVERAGE_PROSE: Readonly<Record<string, string>> = {
  none: "no stones, solid metal",
  accent: "a few accent {gem}",
  "partial-pave": "partially pavé-set with {gem}",
  "full-pave": "fully pavé-set with {gem}",
};

/**
 * `arabicStyle` is the Arabic identity engine's selector and is the literal
 * string `none` on an English piece, which reads as "Lettering: none" in a
 * prompt that asks for a lettering style. The customer's own choice lives in
 * the newer optional `lettering` field, so that is preferred whenever
 * `arabicStyle` says nothing, and `classic` is the last resort for a revision
 * that carries neither.
 */
function letteringStyle(specification: Readonly<Record<string, unknown>>) {
  const arabicStyle = scalar(specification.arabicStyle);
  if (arabicStyle && arabicStyle !== "none") return arabicStyle;
  return scalar(specification.lettering) || "classic";
}

function prose(map: Readonly<Record<string, string>>, value: unknown): string {
  const token = scalar(value);
  return map[token] ?? token;
}

function stonePhrase(coverage: string, gem: string): string {
  const phrase = STONE_COVERAGE_PROSE[coverage];
  if (phrase === undefined) return [coverage, gem].filter(Boolean).join(" ");
  if (!phrase.includes("{gem}")) return phrase;
  return gem ? phrase.replace("{gem}", gem) : "no stones, solid metal";
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function scalar(value: unknown): string {
  if (typeof value === "string" || typeof value === "number")
    return String(value).trim();
  return "";
}

/**
 * One of the four independent stills, in the lab's block order. The view label
 * and the shot brief are baked in per profile; everything a customer chooses is
 * a slot.
 */
function stillTemplate(view: keyof typeof STILL_VIEW_BRIEFS): string {
  // Frozen studio candidate C; other scene templates retain their own prose.
  // The minimal style-first sheet measured on gpt-image-2.5-sunburst,
  // 22 September 2026: `docs/goals/road-to-gold/lab-2026-09-22/final/*.txt` are
  // the exact prompts that passed for all four constructions. The two opening
  // image lines are the compiler's (`minimalOpeningLines`), because the look
  // line exists only when a look reference is sent. The trailing newline is
  // part of the measured text.
  if (view === "studio")
    return [
      "Style: {{construction}}",
      'Name: {{name_spelling}} The whole pendant is one piece of gold. No other text anywhere.',
      "Chain: one gold {{chain_style}} chain. Its end link passes through each ring's hole, looped through it, never lying behind or beside it. No clasp in view, no chain over the letters, no extra rings or bails.",
      "Material: {{finish}} {{metal_karat}} {{metal_color}} gold, {{dimensions}}, visible edge depth. {{stones_rule}}",
      "Photo: studio catalogue packshot, nearly straight-on. Whole pendant and both rings sharp and centred with an even margin; chain in relaxed curves. Warm off-white matte paper, no props. Soft diffused light with one defined highlight streak, neutral white balance; the gold shows bright highlights and darker reflections. Real contact shadow. No text, logo or watermark.\n",
    ].join("\n\n");
  const label = STILL_VIEW_LABELS[view];
  return [
    `Photograph one real, physical, finished {{metal_karat}} gold name pendant necklace. ${label} shot.`,
    "",
    "IDENTITY",
    'The name is "{{approved_name}}". Script: {{language}} - "en" is English Latin letters read left to right, "ar" is Arabic script read right to left. Lettering: {{arabic_style}}. Layout: {{layout}}.',
    "Every glyph, dot, mark and stroke in @stencil appears in the photograph, in the same order, at the same place, at the same angle. Nothing is added, nothing is removed, nothing is rotated, nothing is duplicated, nothing is mirrored. Do not write the name a second time anywhere in the picture.",
    "",
    "CASTING",
    "This is one piece of gold, as if it came out of a single mould.",
    "Every letter is physically fused to the next letter or to the part of the piece that holds it. There are no separate islands and no air gap that would make this two objects. Where @stencil shows a bridge of metal between two shapes, that bridge is metal in the photograph. A jeweller could pick this whole pendant up as one object and nothing would fall off. If any letter, dot or mark is a separate floating piece, the picture is wrong.",
    "",
    "ATTACHMENT",
    "Exactly two jump rings, no more and no fewer. Both are closed rings of the same gold, grown out of the body of the piece, not soldered-on afterthoughts and not floating beside it. Both jump rings sit exactly where @stencil places them: @stencil is the whole physical piece, so it is the only authority on where they are, and no further eyelet, loop or ring is added anywhere.",
    "Each of the two jump rings is threaded: something passes through its open hole and you can see daylight through the hole on both sides of what passes through it. That is either the chain's own end link or one small connector link, and it goes THROUGH the hole - never behind the pendant, never hooked on the outside of the ring, never resting against a closed eyelet. An empty ring hole with the chain passing behind the piece is wrong.",
    "The chain is a fine {{chain_style}}-link chain at {{chain_length}} in the same gold and hangs from both rings, one side to each. The chain never passes over, around or behind a letter, and there is no second chain, no cord, no clasp in shot and no other hardware.",
    "",
    "CONSTRUCTION",
    "{{construction}}",
    "{{inspiration_rule}}",
    "",
    `SHOT - ${label} ({{presentation_view}})`,
    STILL_VIEW_BRIEFS[view],
    "",
    "MATERIAL",
    "Solid {{metal_karat}} {{metal_color}} gold, {{finish}}, at {{size_profile}} scale. The reflections carry that metal's own hue into the highlights and a darker version of it into the shaded facets.",
    'Stones: coverage {{stone_coverage}}, gemstone {{gemstone}}. A coverage of "none" means no stones anywhere on this piece: every surface is plain polished gold, with no pave, no accent stone, no sparkle point and no setting of any kind. Any stone that is set is seated down in metal with the setting visibly gripping it, placed inside a stroke area and never crossing a letterform boundary, and no stone floats above the surface.',
    "The pendant measures {{dimensions}}, so the cast edge has real visible depth.",
    "",
    "PHOTOGRAPHY",
    "This must read as an actual photograph taken on a jewellery set with a full-frame camera and a macro lens at a working aperture, not as a render.",
    "Broad diffused key light through a large softbox, a white bounce card filling the shadow side, and one small harder source that puts a defined specular streak along the polished strokes. Neutral 5000K white balance. The gold shows a real specular response: bright reflected highlights, true mid tones in the metal's own colour, and darker reflections of the surroundings in the curves, never a uniform flat brightness. There is a true contact shadow where the metal meets the surface and a soft ambient occlusion in the tight corners. Depth of field is finite: the plane of the pendant is sharp and the surface behind it falls off gently. The background surface has believable material texture.",
    "No 3D-render look, no plastic or candy gold, no glow, no bloom, no neon rim light, no beauty-filter smoothing, no lens flare, no watermark, no logo, no caption, no added words or numbers anywhere in the frame.",
    "",
    "PRESERVE",
    "Exact spelling and glyph order from @stencil. One connected piece. Exactly two jump rings with the chain through both. The pendant is the sharpest thing in the frame. No added letters, no second name, no charms, no duplicate pendant and no extra jewellery.",
  ].join("\n");
}

function imageTemplate(scene: string): string {
  return [
    scene,
    "The first supplied image is the ONE AND ONLY geometry law: reproduce its exact black pendant silhouette, character order, fused marks and two hollow jump rings without adding, removing, separating or redrawing anything.",
    "The second supplied image is a style reference only: match its framing, light, palette, setting and mood, but never copy its pendant, name, letterforms, text or objects.",
    "The piece is a personalised pendant for {{approved_name}} ({{language}}; Arabic style {{arabic_style}}), preserving {{layout}} geometry. Render {{metal_karat}} {{metal_color}} metal with a {{finish}} finish, {{stone_coverage}} {{gemstone}}, {{size_profile}} scale and approved dimensions {{dimensions}}. Use its {{chain_style}} chain at {{chain_length}}.",
    "Requested presentation view: {{presentation_view}}. The pendant is the sharpest visual hero. Stones are placed into approved stroke areas, never coated over letterform boundaries. The chain threads into both jump rings with no gap. Real unretouched photograph with faint grain; no artificial glow, text, logos, watermarks, extra jewellery, charms, letters, names or duplicate pendants. {{inspiration_rule}}",
  ].join(" ");
}
