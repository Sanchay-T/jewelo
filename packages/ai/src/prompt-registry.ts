import { createHash } from "node:crypto";

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
export const STILL_COMPILER_VERSION = "caleums-still-compiler-v1";
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
]);
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
 * The `construction` slot: the lab's `LOOKS[*].brief`, rewritten only where the
 * lab told the model that the stencil was lettering alone.
 *
 * P2-2b makes `solveIdentity` draw the frame, the rails, their welds and the
 * two jump rings into the stencil itself, so for `framed-minimal` and
 * `diamond-rails` the brief now says the structure is already in Image 1 and
 * must be reproduced, never invented. `classical` and `origami-ribbon` are the
 * lettering alone in both the lab and production, and the ribbon's folded
 * facets stay what the lab called them: a finish, not a shape the stencil
 * claims.
 *
 * The empty-string key is the fallback for a revision approved before
 * constructions existed (`JewelrySpecification.construction` is optional). It
 * asserts nothing the stencil does not already show, so it can never contradict
 * the geometry law.
 */
export const PENDANT_CONSTRUCTION_FALLBACK =
  "The pendant is exactly the piece drawn in @stencil and nothing more. No frame, no plate, no rail and no " +
  "border is added, and no part of the outline is redrawn. Stroke weight is even, edges are softly rounded " +
  "where a polishing wheel would reach, and the metal has a single consistent thickness.";

export const PENDANT_CONSTRUCTION_PROSE: Readonly<Record<string, string>> = {
  "": PENDANT_CONSTRUCTION_FALLBACK,
  classical:
    "Classical. The letters themselves are the entire pendant. There is no frame, no plate, no rail and no " +
    "border. The outline of the piece is exactly the outline in @stencil. Stroke weight is even, edges are " +
    "softly rounded where a polishing wheel would reach, and the metal has a single consistent thickness.",
  "origami-ribbon":
    "Origami ribbon. The outline is exactly @stencil, but the gold is a flat strip that has been FOLDED into " +
    "the shape of the name, the way a paper ribbon is folded. Every curve is replaced by a run of straight " +
    "flat facets that meet at sharp visible crease lines, so each stroke shows two or three separate planes " +
    "tilted at slightly different angles. Because the planes are tilted, each one returns a different amount " +
    "of light: one facet is bright, the facet next to it is clearly darker, and the crease between them reads " +
    "as a hard bright line. Where a stroke changes direction there is a crisp mitred crease, never a smooth " +
    "rounded bend. A plain nameplate has one continuous polished surface; this piece is visibly built from " +
    "angled planes. The ribbon keeps a constant width and never doubles back over itself. The folds are a " +
    "finish on the metal, not a change of shape: the outline stays exactly as @stencil draws it.",
  "framed-minimal":
    "Framed minimal. The lettering sits inside one thin plain rectangular gold frame with softly rounded " +
    "corners, cast as a single piece with the letters and joined to them where the strokes reach the frame. " +
    "The frame is a simple even bar with no ornament, no engraving and no second border. @stencil already " +
    "draws that frame, the welds where the word meets it and the two jump rings on its top bar: reproduce " +
    "them exactly as drawn and add nothing to them. The word is continuous metal into the frame at more than " +
    "one place, no letter, foot, tail or terminal ends in mid-air inside the frame, and the letters keep " +
    "exactly the shapes and spacing of @stencil.",
  "diamond-rails":
    "Diamond rails. The lettering is held between two straight parallel gold rails, one running along the top " +
    "and one along the bottom, cast as a single piece with the letters that touch them. The rails are narrow, " +
    "flat and perfectly straight, the same metal as the letters. @stencil already draws both rails, the welds " +
    "where the word meets them and the two jump rings at the outer ends of the top rail: reproduce them " +
    "exactly as drawn and add nothing to them. The letters between the rails keep exactly the shapes and " +
    "spacing of @stencil.",
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
    `stones=${stonePhrase(scalar(specification.stoneCoverage), prose(GEMSTONE_PROSE, specification.gemstone))}`,
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
    gemstone: scalar(specification.gemstone),
    size_profile: scalar(specification.sizeProfile),
    dimensions: `${scalar(dimensions.widthMm)} × ${scalar(dimensions.heightMm)} × ${scalar(dimensions.thicknessMm)} mm`,
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
  };
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
  styleAnchorUrl?: string;
  inspirationImageUrl?: string;
}) {
  if (!input.identityImageUrl?.trim()) throw new Error("still_stencil_required");
  return [
    ...(input.referenceImageUrl
      ? [{ role: "master" as const, url: input.referenceImageUrl, fileName: "reference.png" }]
      : []),
    { role: "stencil" as const, url: input.identityImageUrl, fileName: "identity.png" },
    ...(input.styleAnchorUrl
      ? [{ role: "style" as const, url: input.styleAnchorUrl, fileName: "style-anchor.png" }]
      : []),
    ...(input.inspirationImageUrl
      ? [{ role: "inspiration" as const, url: input.inspirationImageUrl, fileName: "inspiration.png" }]
      : []),
  ];
}

export type StillReferencePresence = {
  master: boolean;
  style: boolean;
  inspiration: boolean;
};

const STILL_ROLE_RULES = {
  master: "is an approved photograph of this exact pendant. Preserve the same physical object, metal, stones, thickness and chain, changing only the requested scene. It never overrides @stencil geometry or spelling.",
  stencil: "is the sole authority for geometry and spelling: the exact black silhouette of the whole physical pendant, including all letters, joins, marks and two hollow rings. Reproduce it as gold without redesigning, adding, removing, mirroring or separating anything.",
  style: "is style only: use framing, light, palette, setting and mood; never copy its pendant, name, letterforms, text or objects.",
  inspiration: "is optional customer inspiration only; never copy text, identity, branding or unapproved objects from it.",
} as const;

/** Reject legacy role numbering before a release can become active. */
export function assertStillTemplateCompatibility(
  profile: PromptProfile,
  template: string,
) {
  if (!["image.packshot", "image.worn", "image.macro_gift", "image.dark_editorial"].includes(profile))
    return;
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
    styleAnchorUrl: input.references.style ? "style" : undefined,
    inspirationImageUrl: input.references.inspiration ? "inspiration" : undefined,
  });
  const roles = references.map(({ role }, index) =>
    `Image ${index + 1}, tagged @${role}, ${STILL_ROLE_RULES[role]}`,
  );
  const compiledPrompt = ["IMAGE ROLES", ...roles, "", compiled.compiledPrompt].join("\n");
  if (compiledPrompt.length > MAX_COMPILED_PROMPT_LENGTH)
    throw new Error("Canonical still prompt exceeds maximum length");
  return {
    ...compiled,
    compiledPrompt,
    compilerVersion: STILL_COMPILER_VERSION,
    sha256: createHash("sha256").update(compiledPrompt, "utf8").digest("hex"),
  };
}

export const STILL_API_SIZE_BY_RATIO = {
  "1:1": "1024x1024",
  "4:5": "1024x1280",
  "9:16": "1024x1824",
  "16:9": "1536x864",
} as const;

/** Both transport preparers consume this artifact without rewriting its prompt. */
export function prepareStillRequest(input: {
  prompt: string;
  aspectRatio: keyof typeof STILL_API_SIZE_BY_RATIO;
  identityImageUrl: string;
  referenceImageUrl?: string;
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

export function prepareOpenAIStillRequest(
  input: Parameters<typeof prepareStillRequest>[0], model: string,
) {
  if (!model.trim()) throw new Error("still_model_required");
  return { ...prepareStillRequest(input), model, quality: "high", output_format: "png" };
}

/** Runway's current callable model list exposes only this GPT image alias. */
export function prepareRunwayStillRequest(
  input: Parameters<typeof prepareStillRequest>[0], model: string,
) {
  if (model !== "gpt-image-2") throw new Error("runway_model_unavailable");
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
  if (view === "studio") return `CHAIN THREADING — BOTH SIDES
At each of the two stencil eyelets, the chain's terminal link physically passes THROUGH the open aperture. Show the link's front arc crossing the hole and its back arc behind the eyelet: interlocking metal, with daylight visible on both sides of the link inside the hole. Never show an empty hole with chain behind it, a link merely touching the rim, or chain resting beside the eyelet. Keep each eyelet fused into the pendant exactly as @stencil draws it. No extra eyelet, bail or hardware substitutes. One {{chain_style}} chain, {{chain_length}}, same gold, attached at both ends; no clasp in frame, no chain crossing any letter.

IDENTITY AND OBJECT
Photograph ONE finished physical name pendant. Approved name: "{{approved_name}}"; script {{language}} (en left-to-right Latin, ar right-to-left Arabic), Arabic lettering {{arabic_style}}, layout {{layout}}. Preserve every stencil glyph, dot, mark, outline, bridge, spacing and ring hole exactly. Do not redesign, mirror, rotate, duplicate, add or remove anything. The complete pendant is one continuous piece of cast gold: all letters and marks physically fused by the stencil bridges, no disconnected islands. No second spelling anywhere.
{{construction}}
{{inspiration_rule}}

MATERIAL
Solid {{metal_karat}} {{metal_color}} gold, {{finish}}, {{size_profile}} scale; dimensions {{dimensions}} with visible real edge depth. Stone coverage {{stone_coverage}}, gemstone {{gemstone}}; none means no stones, sparkle points or settings anywhere. Softly polished edges, consistent metal thickness, no ornament.

STUDIO PHOTOGRAPH
{{presentation_view}} catalogue packshot, nearly straight-on with slight off-axis depth. Whole pendant and both eyelets sharp and inside the square frame with a small even margin. Chain runs away from the rings and rests in relaxed curves. Plain warm off-white matte paper sweep, no props, wearer or other jewellery. Full-frame macro photography: broad diffused softbox key, white bounce fill, one small harder source for a defined specular streak, neutral 5000K balance. Gold has warm highlights, true gold midtones and darker reflected surroundings, never uniformly bright. True contact shadow, gentle ambient occlusion in corners, believable matte paper texture and finite depth of field; pendant stays sharp. No CGI, plastic, glow, bloom, flare, neon lighting, watermark, logo, caption or extra text.`;
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
