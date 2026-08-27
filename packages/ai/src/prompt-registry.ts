import { createHash } from "node:crypto";

export const PROMPT_PROFILES = [
  "image.studio",
  "video.preview",
  "video.final",
] as const;
export type PromptProfile = (typeof PROMPT_PROFILES)[number];

export const PROMPT_COMPILER_VERSION = "caleums-prompt-compiler-v1";
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
} as const;
export type PromptVariable = keyof typeof PROMPT_VARIABLES;
export type PromptVariableSnapshot = Record<PromptVariable, string>;

const REQUIRED_VARIABLES = Object.freeze(
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
      allowedVariables: REQUIRED_VARIABLES,
      requiredVariables: REQUIRED_VARIABLES,
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
  "video.preview": [
    "Create a restrained silent {{presentation_view}} motion preview from the approved still for {{approved_name}} ({{language}}; Arabic style: {{arabic_style}}).",
    "Keep {{layout}} geometry, spelling and attachments unchanged throughout every frame.",
    "Preserve {{metal_karat}} {{metal_color}} metal, {{finish}} finish, {{stone_coverage}} {{gemstone}}, {{size_profile}} scale, {{dimensions}}, and the {{chain_style}} chain at {{chain_length}}.",
    "Use only subtle product-camera movement and controlled specular light; no morphing or new objects.",
  ].join(" "),
  "video.final": [
    "Create a polished silent {{presentation_view}} final product film from the approved still for {{approved_name}} ({{language}}; Arabic style: {{arabic_style}}).",
    "Keep exact spelling, {{layout}} geometry and attachments stable for the full shot.",
    "Preserve {{metal_karat}} {{metal_color}} metal, {{finish}} finish, {{stone_coverage}} {{gemstone}}, {{size_profile}} scale, {{dimensions}}, and the {{chain_style}} chain at {{chain_length}}.",
    "Use elegant, restrained camera motion and realistic light only; do not morph the pendant or introduce unapproved details.",
  ].join(" "),
};

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
  const missing = PROMPT_PROFILE_REGISTRY[profile].requiredVariables.filter(
    (variable) => !variables.includes(variable),
  );
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
  };
}

export function compilePrompt(input: {
  profile: PromptProfile;
  template: string;
  variables: PromptVariableSnapshot;
}): CompiledPrompt {
  const parsed = validatePromptTemplate(input.profile, input.template);
  const snapshot = { ...input.variables };
  for (const variable of PROMPT_PROFILE_REGISTRY[input.profile]
    .requiredVariables) {
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
