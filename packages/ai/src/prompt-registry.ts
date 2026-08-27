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
export const MAX_PROMPT_TEMPLATE_LENGTH = 12_000;
export const MAX_COMPILED_PROMPT_LENGTH = 16_000;

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
} as const;
export type PromptVariable = keyof typeof PROMPT_VARIABLES;
export type PromptVariableSnapshot = Record<PromptVariable, string>;

const PRODUCT_VARIABLES = Object.freeze(
  (Object.keys(PROMPT_VARIABLES) as PromptVariable[]).filter(
    (variable) => variable !== "piece_spec" && variable !== "drape",
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

export const BASELINE_PROMPT_TEMPLATES: Readonly<
  Record<PromptProfile, string>
> = {
  "image.studio": [
    "Create one refined {{presentation_view}} product photograph of the supplied immutable name-pendant identity for {{approved_name}} ({{language}}; Arabic style: {{arabic_style}}).",
    "Preserve the exact spelling, glyph order, {{layout}} geometry and attachments.",
    "Use {{metal_karat}} {{metal_color}} metal with a {{finish}} finish, {{stone_coverage}} {{gemstone}}, {{size_profile}} scale, and approved dimensions {{dimensions}}.",
    "Show the pendant on its {{chain_style}} chain at {{chain_length}}. Do not invent, remove, or reshape identity details.",
  ].join(" "),
  "image.packshot": imageTemplate(
    "Catalogue photograph of the full necklace against a neutral ivory cream background, both sides of the chain falling naturally toward the pendant with slightly different curves and a soft accurate shadow beneath it.",
  ),
  "image.worn": imageTemplate(
    "Jewellery-focused photograph of a woman wearing the necklace at {{chain_length}}, with a modest neckline, natural skin and fabric texture, an asymmetric chain drape and a thin soft shadow.",
  ),
  "image.macro_gift": imageTemplate(
    "Macro product photograph of the necklace laid on black suede, the chain following a loose natural curve, with resolved suede fibres, deep soft edge shadows and shallow depth of field.",
  ),
  "image.dark_editorial": imageTemplate(
    "Elegant editorial jewellery photograph at the neck and collarbone against a near-black setting, with one warm directional spotlight on the necklace and everything else in deep soft shadow.",
  ),
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
  compilerVersion: typeof PROMPT_COMPILER_VERSION;
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
  const pieceSpec = [
    `name=${scalar(input.approvedName)}`,
    `language=${scalar(input.language)}`,
    `arabic_style=${scalar(specification.arabicStyle)}`,
    `layout=${scalar(specification.layout)}`,
    `metal=${scalar(specification.metalKarat)} ${scalar(specification.metalColor)} ${scalar(specification.finish)}`,
    `stones=${scalar(specification.stoneCoverage)} ${scalar(specification.gemstone)}`,
    `size=${scalar(specification.sizeProfile)}; dimensions=${scalar(dimensions.widthMm)} × ${scalar(dimensions.heightMm)} × ${scalar(dimensions.thicknessMm)} mm`,
    `chain=${scalar(chain.style)}; length=${scalar(chain.lengthCm)} cm`,
    `view=${scalar(input.presentationView)}`,
  ].join("; ");
  return {
    approved_name: scalar(input.approvedName),
    language: scalar(input.language),
    arabic_style: scalar(specification.arabicStyle),
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
    if (value.length > 512)
      throw new Error(`Prompt value exceeds 512 characters: ${variable}`);
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

function imageTemplate(scene: string): string {
  return [
    scene,
    "The first supplied image is the ONE AND ONLY geometry law: reproduce its exact black pendant silhouette, character order, fused marks and two hollow jump rings without adding, removing, separating or redrawing anything.",
    "The second supplied image is a style reference only: match its framing, light, palette, setting and mood, but never copy its pendant, name, letterforms, text or objects.",
    "The piece is a personalised pendant for {{approved_name}} ({{language}}; Arabic style {{arabic_style}}), preserving {{layout}} geometry. Render {{metal_karat}} {{metal_color}} metal with a {{finish}} finish, {{stone_coverage}} {{gemstone}}, {{size_profile}} scale and approved dimensions {{dimensions}}. Use its {{chain_style}} chain at {{chain_length}}.",
    "Requested presentation view: {{presentation_view}}. The pendant is the sharpest visual hero. Stones are placed into approved stroke areas, never coated over letterform boundaries. The chain threads into both jump rings with no gap. Real unretouched photograph with faint grain; no artificial glow, text, logos, watermarks, extra jewellery, charms, letters, names or duplicate pendants. {{inspiration_rule}}",
  ].join(" ");
}
