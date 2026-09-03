import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { identityAnchorSvg, renderIdentityAnchor } from "./identity-anchor";

const ZIP_REGRESSION_NAMES = [
  "محمد",
  "عمر",
  "حسن",
  "سارة",
  "خالد",
  "ليلى",
  "نور",
  "وردة",
  "رؤى",
  "آية",
  "دعاء",
  "آلاء",
  "تسنيم",
  "شهرزاد",
  "عبدالله",
  "نورالهدى",
  "عبدالرحمن",
] as const;

describe("deterministic identity anchor", () => {
  it("preserves the existing deterministic Latin renderer", async () => {
    const anchor = {
      approvedText: "Layla",
      language: "en" as const,
      typography: "Playfair Display",
      fingerprint: "fingerprint",
    };
    const first = await renderIdentityAnchor(anchor, {
      layout: "single-name",
      connector: "none",
    });
    const second = await renderIdentityAnchor(anchor, {
      layout: "single-name",
      connector: "none",
    });
    expect(createHash("sha256").update(first.png).digest("hex")).toBe(
      createHash("sha256").update(second.png).digest("hex"),
    );
    expect(first.png.subarray(1, 4).toString()).toBe("PNG");
    expect(identityAnchorSvg(anchor, {})).toContain("Layla");
  });

  it.each(["classic", "minimal"])(
    "passes the ZIP's 17-name mask/connectivity regression for %s",
    async (style) => {
      for (const approvedText of ZIP_REGRESSION_NAMES) {
        const rendered = await renderIdentityAnchor(
          {
            approvedText,
            language: "ar",
            typography: style,
            fingerprint: "seed-fingerprint",
          },
          {
            names: [{ approvedArabicText: approvedText }],
            arabicStyle: style,
            layout: "single-name",
            connector: "none",
            dimensions: { widthMm: 30, heightMm: 12, thicknessMm: 1.2 },
          },
        );
        expect(rendered.report).toMatchObject({
          approvedCharacters: approvedText,
          style,
          jumpRingCount: 2,
          componentsFinal: 1,
          exactCharactersPreserved: true,
          passed: true,
        });
        expect(rendered.pngSha256).toMatch(/^[a-f0-9]{64}$/);
        expect(rendered.fingerprint).toMatch(/^[a-f0-9]{64}$/);
      }
    },
    60_000,
  );

  it("maps the customer-facing Contemporary option to certified Classic", async () => {
    const rendered = await renderIdentityAnchor(
      {
        approvedText: "ليلى",
        language: "ar",
        typography: "contemporary",
        fingerprint: "seed-fingerprint",
      },
      {
        names: [{ approvedArabicText: "ليلى" }],
        arabicStyle: "contemporary",
        layout: "single-name",
        connector: "none",
        dimensions: { widthMm: 30, heightMm: 12, thicknessMm: 1.2 },
      },
    );
    expect(rendered.report).toMatchObject({ style: "classic", passed: true });
  });

  // Every certified style was opened to customers on 2026-08-27, so only a
  // two-name layout and a style outside the engine still gate before spend.
  it("routes two-name layouts and unregistered Arabic styles before spend", async () => {
    const anchor = {
      approvedText: "ليلى & نور",
      language: "ar" as const,
      typography: "signature",
      fingerprint: "fingerprint",
    };
    await expect(
      renderIdentityAnchor(anchor, {
        names: [{ approvedArabicText: "ليلى" }, { approvedArabicText: "نور" }],
        arabicStyle: "minimal",
        layout: "side-by-side",
        connector: "heart",
        dimensions: { widthMm: 30, heightMm: 12, thicknessMm: 1.2 },
      }),
    ).rejects.toMatchObject({ code: "unsupported_arabic_two_name" });
    await expect(
      renderIdentityAnchor(
        { ...anchor, approvedText: "ليلى" },
        {
          names: [{ approvedArabicText: "ليلى" }],
          arabicStyle: "art-deco",
          layout: "single-name",
          connector: "none",
          dimensions: { widthMm: 30, heightMm: 12, thicknessMm: 1.2 },
        },
      ),
    ).rejects.toMatchObject({ code: "unsupported_arabic_style" });
  });

  it("renders the Signature style that was opened to every customer", async () => {
    const rendered = await renderIdentityAnchor(
      {
        approvedText: "ليلى",
        language: "ar",
        typography: "signature",
        fingerprint: "seed-fingerprint",
      },
      {
        names: [{ approvedArabicText: "ليلى" }],
        arabicStyle: "signature",
        layout: "single-name",
        connector: "none",
        dimensions: { widthMm: 30, heightMm: 12, thicknessMm: 1.2 },
      },
    );
    expect(rendered.report).toMatchObject({ style: "signature", passed: true });
  });
});
