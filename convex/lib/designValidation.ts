import { NAME_LIMITS } from "../../src/lib/constants";

export function validateNameForLanguage(name: string, language: string) {
  const lang = language as keyof typeof NAME_LIMITS;
  const limits = NAME_LIMITS[lang] || NAME_LIMITS.en;
  const charCount = [...name].length;

  if (charCount < limits.min || charCount > limits.max) {
    throw new Error(
      `Name must be ${limits.min}-${limits.max} characters for ${lang.toUpperCase()}, got ${charCount}`
    );
  }
}
