import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { identityAnchorSvg, renderIdentityAnchor } from "./identity-anchor";

describe("deterministic identity anchor", () => {
  it("renders the same approved identity to identical PNG bytes", async () => {
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
  });

  it("preserves exact Arabic two-name text and geometry selectors in SVG", () => {
    const svg = identityAnchorSvg(
      {
        approvedText: "ليلى & نور",
        language: "ar",
        typography: "Noto Naskh Arabic",
        fingerprint: "arabic-fingerprint",
      },
      { layout: "side-by-side", connector: "heart" },
    );
    expect(svg).toContain("ليلى &amp; نور");
    expect(svg).toContain("side-by-side|heart|arabic-fingerprint");
    expect(svg).toContain('direction="rtl"');
  });
});
