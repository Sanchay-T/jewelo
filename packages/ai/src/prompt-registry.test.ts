import { describe, expect, it } from "vitest";
import {
  BASELINE_PROMPT_TEMPLATES,
  PROMPT_COMPILER_VERSION,
  PROMPT_PROFILES,
  buildPromptVariableSnapshot,
  compilePrompt,
  validatePromptTemplate,
} from "./prompt-registry";

const variables = buildPromptVariableSnapshot({
  approvedName: "Layla",
  language: "en",
  presentationView: "studio",
  specification: {
    arabicStyle: "none",
    layout: "single-name",
    metalKarat: "18K",
    metalColor: "yellow",
    finish: "polished",
    stoneCoverage: "partial-pave",
    gemstone: "lab-diamond",
    sizeProfile: "classic",
    dimensions: { widthMm: 34, heightMm: 12, thicknessMm: 1.2 },
    chain: { style: "cable", lengthCm: 45 },
  },
});

describe("versioned prompt registry", () => {
  it("ships usable, fully-variable baselines for every managed profile", () => {
    for (const profile of PROMPT_PROFILES)
      expect(() =>
        validatePromptTemplate(profile, BASELINE_PROMPT_TEMPLATES[profile]),
      ).not.toThrow();
  });

  it("compiles deterministically and hashes the exact bytes", () => {
    const first = compilePrompt({
      profile: "image.studio",
      template: BASELINE_PROMPT_TEMPLATES["image.studio"],
      variables,
    });
    const second = compilePrompt({
      profile: "image.studio",
      template: BASELINE_PROMPT_TEMPLATES["image.studio"],
      variables: { ...variables },
    });
    expect(second).toEqual(first);
    expect(first.compilerVersion).toBe(PROMPT_COMPILER_VERSION);
    expect(first.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(first.compiledPrompt).toContain("Layla");
    expect(first.compiledPrompt).not.toContain("{{");
  });

  it.each([
    ["unclosed", "{{approved_name}"],
    ["nested", "{{{{approved_name}}}}"],
    ["spaced", "{{ approved_name }}"],
    ["unknown", "{{customer_notes}}"],
  ])("rejects %s braces or variables", (_case, fragment) => {
    const template = BASELINE_PROMPT_TEMPLATES["image.studio"].replace(
      "{{approved_name}}",
      fragment,
    );
    expect(() => validatePromptTemplate("image.studio", template)).toThrow();
  });

  it("rejects a template that omits a required immutable field", () => {
    expect(() =>
      validatePromptTemplate(
        "image.studio",
        BASELINE_PROMPT_TEMPLATES["image.studio"].replace(
          "{{chain_length}}",
          "approved length",
        ),
      ),
    ).toThrow("Missing required prompt variables: chain_length");
  });

  it("supports compact versioned prompt-sheet aliases", () => {
    const compact = compilePrompt({
      profile: "video.preview",
      template: "Animate this exact approved pendant: {{piece_spec}}",
      variables,
    });
    expect(compact.compiledPrompt).toContain("name=Layla");
    expect(compact.compiledPrompt).not.toContain("{{");

    const worn = compilePrompt({
      profile: "image.worn",
      template: "Render {{piece_spec}} with {{drape}}",
      variables,
    });
    expect(worn.compiledPrompt).toContain("Natural asymmetric cable chain");
  });

  it("rejects missing values and placeholder injection in values", () => {
    expect(() =>
      compilePrompt({
        profile: "image.studio",
        template: BASELINE_PROMPT_TEMPLATES["image.studio"],
        variables: { ...variables, metal_color: "" },
      }),
    ).toThrow("Missing required prompt value: metal_color");
    expect(() =>
      compilePrompt({
        profile: "image.studio",
        template: BASELINE_PROMPT_TEMPLATES["image.studio"],
        variables: { ...variables, approved_name: "{{layout}}" },
      }),
    ).toThrow("Prompt value contains unresolved braces: approved_name");
  });

  it("rejects excessive templates and control characters", () => {
    expect(() =>
      validatePromptTemplate(
        "image.studio",
        `${BASELINE_PROMPT_TEMPLATES["image.studio"]}${"x".repeat(12_000)}`,
      ),
    ).toThrow("exceeds");
    expect(() =>
      validatePromptTemplate(
        "image.studio",
        BASELINE_PROMPT_TEMPLATES["image.studio"].replace(
          "Create",
          "Cre\u0000ate",
        ),
      ),
    ).toThrow("control characters");
  });
});
