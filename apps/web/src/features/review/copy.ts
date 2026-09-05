export function t(locale: "en" | "ar", en: string, ar: string) {
  return locale === "ar" ? ar : en;
}
