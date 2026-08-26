import { describe, expect, it } from "vitest";
import { transliterateArabicName } from "./transliterate-arabic";

describe("transliterateArabicName", () => {
  it.each([
    ["Layla", "ليلى"],
    ["Sarah", "سارة"],
    ["Mariam", "مريم"],
    ["Mohammed", "محمد"],
    ["Noor", "نور"],
  ])("reflects %s with the legacy name correction", (latin, arabic) => {
    expect(transliterateArabicName(latin)).toBe(arabic);
  });

  it("uses the legacy digraph and character fallback while typing", () => {
    expect(transliterateArabicName("Khalid")).toBe("خالد");
    expect(transliterateArabicName("Asma")).toBe("اسما");
    expect(transliterateArabicName("Omar Noor")).toBe("ومار نور");
  });

  it("returns an empty reflection for empty input", () => {
    expect(transliterateArabicName("  ")).toBe("");
  });
});
