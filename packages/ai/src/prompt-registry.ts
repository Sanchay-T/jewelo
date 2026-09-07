import { createHash } from "node:crypto";
import { buildDrape, buildPieceSpec, caleumsTemplate } from "./caleums-prompt";

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
  piece_spec: "Composed jeweller description of the physical piece",
  drape: "Chain drape sentence fragment, worn shots only",
} as const;
export type PromptVariable = keyof typeof PROMPT_VARIABLES;
export type PromptVariableSnapshot = Record<PromptVariable, string>;

// The ZIP keeps geometry out of words entirely: no prompt carries the name,
// script or lettering style, because the silhouette reference is the only
// legitimate source for those. The remaining dynamic text is one composed
// `piece_spec` clause, plus a drape fragment voiced only in worn shots.
const IMAGE_VARIABLES = Object.freeze<PromptVariable[]>(["piece_spec"]);
const WORN_VARIABLES = Object.freeze<PromptVariable[]>(["piece_spec", "drape"]);
const LEGACY_VARIABLES = Object.freeze<PromptVariable[]>([
  "approved_name",
  "language",
  "arabic_style",
  "layout",
  "metal_karat",
  "metal_color",
  "finish",
  "stone_coverage",
  "gemstone",
  "size_profile",
  "dimensions",
  "chain_style",
  "chain_length",
  "presentation_view",
]);
const MOTION_VARIABLES = Object.freeze<PromptVariable[]>(["piece_spec"]);

function variablesFor(profile: PromptProfile): readonly PromptVariable[] {
  if (profile === "image.studio") return LEGACY_VARIABLES;
  if (profile === "image.worn") return WORN_VARIABLES;
  if (profile.startsWith("video.")) return MOTION_VARIABLES;
  return IMAGE_VARIABLES;
}

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
      allowedVariables: variablesFor(profile),
      requiredVariables: variablesFor(profile),
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
  "image.packshot": caleumsTemplate("packshot"),
  "image.worn": caleumsTemplate("worn"),
  "image.macro_gift": caleumsTemplate("macroGift"),
  "image.dark_editorial": caleumsTemplate("darkEditorial"),
  "image.studio_hero": caleumsTemplate("studioHero"),
  "image.billboard": caleumsTemplate("billboard"),
  "video.preview": [
    "Create a restrained silent motion preview from the approved still.",
    "{{piece_spec}}",
    "Keep the pendant geometry, spelling and attachments unchanged in every frame.",
    "Use only subtle product-camera movement and controlled specular light; no morphing, no new objects, no text.",
  ].join(" "),
  "video.final": [
    "Create a polished silent final product film from the approved still.",
    "{{piece_spec}}",
    "Keep the pendant geometry, spelling and attachments stable for the full shot.",
    "Use elegant restrained camera motion and realistic light only; do not morph the pendant or introduce unapproved details.",
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
  const missing = PROMPT_PROFILE_REGISTRY[profile].requiredVariables.filter(
    (variable) => !variables.includes(variable),
  );
  if (missing.length)
    throw new Error(`Missing required prompt variables: ${missing.join(", ")}`);
  return { profile, variables: variables as PromptVariable[] };
}

export function buildPromptVariableSnapshot(input: {
  profile: PromptProfile;
  specification: Readonly<Record<string, unknown>>;
}): PromptVariableSnapshot {
  const snapshot = {} as PromptVariableSnapshot;
  for (const variable of PROMPT_PROFILE_REGISTRY[input.profile]
    .requiredVariables) {
    if (variable === "piece_spec")
      snapshot.piece_spec = buildPieceSpec(input.specification);
    else if (variable === "drape")
      snapshot.drape = buildDrape(input.specification);
    else throw new Error(`unsupported_prompt_variable:${variable}`);
  }
  return snapshot;
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
