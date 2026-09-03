import { describe, expect, it } from "vitest";
import {
  ARABIC_STYLE_OPTIONS,
  PRESENTATION_VIEW_DETAILS,
  arabicStyleLabel,
  formatCaleumsPrice,
  formatIdentity,
  isProviderSupportedArabicStyle,
} from "./ui-presentation";
import type { ArabicStyle } from "./types";

describe("Caleums UI presentation mappings", () => {
  it("keeps each two-name connector identical in inline and preview output", () => {
    expect(formatIdentity(["Asma", "Fatima"], "connected-heart")).toEqual({
      inline: "Asma ♡ Fatima",
      lines: ["Asma ♡ Fatima"],
    });
    expect(formatIdentity(["Asma", "Fatima"], "infinity")).toEqual({
      inline: "Asma ∞ Fatima",
      lines: ["Asma ∞ Fatima"],
    });
    expect(formatIdentity(["Asma", "Fatima"], "stacked-heart")).toEqual({
      inline: "Asma ♡ Fatima",
      lines: ["Asma", "♡", "Fatima"],
    });
    expect(formatIdentity(["Asma", "Fatima"], "interlocked")).toEqual({
      inline: "Asma × Fatima",
      lines: ["Asma × Fatima"],
    });
  });

  // Every certified Arabic style was opened to customers on 2026-08-27; only a
  // style the identity engine does not register stays review-only.
  it("marks every offered Arabic style as provider-supported", () => {
    expect(arabicStyleLabel("contemporary")).toBe("Arabic · Classic");
    for (const style of ARABIC_STYLE_OPTIONS)
      expect(isProviderSupportedArabicStyle(style.id)).toBe(true);
    expect(isProviderSupportedArabicStyle("none")).toBe(true);
    expect(isProviderSupportedArabicStyle("art-deco" as ArabicStyle)).toBe(
      false,
    );
  });

  it("defines the four independent still presentations and ratios", () => {
    expect(PRESENTATION_VIEW_DETAILS).toEqual([
      { id: "studio", label: "Studio", treatment: "Packshot", ratio: "1:1" },
      { id: "on_skin", label: "On Skin", treatment: "Worn", ratio: "4:5" },
      { id: "close_up", label: "Close Up", treatment: "Macro", ratio: "1:1" },
      { id: "dark", label: "Dark", treatment: "Editorial", ratio: "9:16" },
    ]);
  });

  it("uses the shared price source and replaces it with persisted commerce state", () => {
    expect(formatCaleumsPrice()).toBe("AED 7,950");
    expect(
      formatCaleumsPrice({
        estimate: { currency: "AED", high: 8_200 },
        quote: { status: "requested", total: 8_450 },
      }),
    ).toBe("AED 8,200");
    expect(
      formatCaleumsPrice({
        estimate: { currency: "AED", high: 8_200 },
        quote: { status: "issued", total: 8_450 },
      }),
    ).toBe("AED 8,450");
  });
});
