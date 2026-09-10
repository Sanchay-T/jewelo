import { describe, expect, it } from "vitest";
import {
  previewRequestContactSchema,
  previewRequestInputSchema,
  previewRequestIssueMessage,
  previewRequestSpecificationSchema,
  summarizePreviewSpecification,
} from "./preview-request";

const specification = {
  script: "Arabic" as const,
  names: ["أسماء"],
  construction: "Diamond rails" as const,
  lettering: "Kufi" as const,
  gold: { karat: "18K" as const, color: "Rose gold" as const },
  stones: { coverage: "Accent" as const, gemstone: "Lab diamond" as const },
  pendantWidthMm: 32,
  chainStyle: "Rolo" as const,
};

const input = {
  locale: "ar" as const,
  specification,
  contact: { channel: "whatsapp" as const, value: "+971 50 123 4567" },
};

describe("preview request specification", () => {
  it("accepts the atelier customer specification", () => {
    const parsed = previewRequestSpecificationSchema.parse(specification);
    expect(parsed.names).toEqual(["أسماء"]);
    expect(parsed.stones.gemstone).toBe("Lab diamond");
  });

  it("rejects unknown fields so a stray provider value is never stored", () => {
    const result = previewRequestSpecificationSchema.safeParse({
      ...specification,
      providerModel: "gpt-image-2",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a two-name pendant without a layout", () => {
    const result = previewRequestSpecificationSchema.safeParse({
      ...specification,
      names: ["Asma", "Fatima"],
      script: "English",
    });
    expect(result.success).toBe(false);
    expect(
      result.success ? "" : previewRequestIssueMessage(result.error),
    ).toContain("layout");
  });

  it("accepts a two-name pendant with a layout", () => {
    expect(
      previewRequestSpecificationSchema.safeParse({
        ...specification,
        script: "English",
        names: ["Asma", "Fatima"],
        layout: "Stacked",
      }).success,
    ).toBe(true);
  });

  it("rejects a gemstone without coverage and coverage without a gemstone", () => {
    expect(
      previewRequestSpecificationSchema.safeParse({
        ...specification,
        stones: { coverage: "No stones", gemstone: "Ruby" },
      }).success,
    ).toBe(false);
    expect(
      previewRequestSpecificationSchema.safeParse({
        ...specification,
        stones: { coverage: "Full pavé" },
      }).success,
    ).toBe(false);
  });

  it("rejects a third name and an empty name", () => {
    expect(
      previewRequestSpecificationSchema.safeParse({
        ...specification,
        names: ["A", "B", "C"],
        layout: "Stacked",
      }).success,
    ).toBe(false);
    expect(
      previewRequestSpecificationSchema.safeParse({
        ...specification,
        names: ["   "],
      }).success,
    ).toBe(false);
  });

  it("caps engraving and special requests at the atelier limits", () => {
    expect(
      previewRequestSpecificationSchema.safeParse({
        ...specification,
        engraving: "x".repeat(81),
      }).success,
    ).toBe(false);
    expect(
      previewRequestSpecificationSchema.safeParse({
        ...specification,
        specialRequests: "x".repeat(1001),
      }).success,
    ).toBe(false);
  });

  it("summarizes one readable operator line", () => {
    expect(summarizePreviewSpecification(specification)).toBe(
      "أسماء · Arabic · Diamond rails · Kufi · 18K rose gold · accent lab diamond · 32 mm · rolo chain",
    );
  });
});

describe("preview request contact", () => {
  it("normalizes a formatted phone number to E.164", () => {
    expect(
      previewRequestContactSchema.parse({
        channel: "phone",
        value: "+971 (50) 123-4567",
      }),
    ).toEqual({ channel: "phone", value: "+971501234567" });
  });

  it("lowercases and trims an email address", () => {
    expect(
      previewRequestContactSchema.parse({
        channel: "email",
        value: "  Shopper@Example.COM ",
        name: "Shopper",
      }),
    ).toEqual({
      channel: "email",
      value: "shopper@example.com",
      name: "Shopper",
    });
  });

  it("rejects an unusable number, an unusable email and an unknown channel", () => {
    for (const contact of [
      { channel: "whatsapp", value: "12345" },
      { channel: "whatsapp", value: "not a phone" },
      { channel: "email", value: "shopper@" },
      { channel: "sms", value: "+971501234567" },
    ])
      expect(previewRequestContactSchema.safeParse(contact).success).toBe(false);
  });
});

describe("preview request input", () => {
  it("accepts the minimal honest-degrade capture", () => {
    const parsed = previewRequestInputSchema.parse(input);
    expect(parsed.contact.value).toBe("+971501234567");
    expect(parsed.sampleReference).toBeUndefined();
  });

  it("keeps the labelled sample reference and its role", () => {
    const parsed = previewRequestInputSchema.parse({
      ...input,
      sampleReference: {
        manifestId: "sample-assets-v9",
        sampleId: "akr-white-none-Studio-v9",
        view: "Studio",
        assetPath: "/atelier/arabic-kufi-rails-white-none-studio.png",
      },
    });
    expect(parsed.sampleReference?.role).toBe("illustrative-reference-only");
  });

  it("refuses a sample reference that escapes the catalogue", () => {
    for (const assetPath of [
      "/atelier/../../etc/passwd",
      "https://provider.example/leaked.png",
      "/uploads/other.png",
    ])
      expect(
        previewRequestInputSchema.safeParse({
          ...input,
          sampleReference: {
            manifestId: "sample-assets-v9",
            sampleId: "s",
            view: "Studio",
            assetPath,
          },
        }).success,
      ).toBe(false);
  });

  it("requires uuid link and idempotency identifiers", () => {
    expect(
      previewRequestInputSchema.safeParse({ ...input, requestKey: "abc" })
        .success,
    ).toBe(false);
    expect(
      previewRequestInputSchema.safeParse({ ...input, designId: "design-1" })
        .success,
    ).toBe(false);
    expect(
      previewRequestInputSchema.safeParse({
        ...input,
        requestKey: "3f2a0f4c-9a1b-4f4d-8a4a-5f2b7c8d9e01",
      }).success,
    ).toBe(true);
  });

  it("rejects an unknown top-level field and a missing contact", () => {
    expect(
      previewRequestInputSchema.safeParse({ ...input, status: "fulfilled" })
        .success,
    ).toBe(false);
    const missing = previewRequestInputSchema.safeParse({
      locale: "en",
      specification,
    });
    expect(missing.success).toBe(false);
    expect(
      missing.success ? "" : previewRequestIssueMessage(missing.error),
    ).toContain("contact");
  });
});
