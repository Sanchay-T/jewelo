import localFont from "next/font/local";
import type { Draft } from "./model";

// The live identity face mapping, served as web fonts without importing the engine.
const naskh = localFont({
  src: "../../../../../packages/identity/engines/caleums-arabic-v3/fonts/NotoNaskhArabic-Regular.ttf",
  display: "swap",
});
const scheherazade = localFont({
  src: "../../../../../packages/identity/engines/caleums-arabic-v3/fonts/ScheherazadeNew-Regular.ttf",
  display: "swap",
});
const kufi = localFont({
  src: "../../../../../packages/identity/engines/caleums-arabic-v3/fonts/NotoKufiArabic-Regular.ttf",
  display: "swap",
});
const rakkas = localFont({
  src: "../../../../../packages/identity/engines/caleums-arabic-v3/fonts/rakkas.ttf",
  display: "swap",
});
const playfair = localFont({
  src: "../../../../../packages/identity/engines/caleums-arabic-v3/fonts/PlayfairDisplay-SemiBold.ttf",
  display: "swap",
});
const cairo = localFont({
  src: "../../../../../packages/identity/engines/caleums-arabic-v3/fonts/cairo.ttf",
  display: "swap",
});

export function letteringFont(script: Draft["script"], lettering: Draft["lettering"]) {
  if (script === "English") return lettering === "Kufi" ? cairo : playfair;
  switch (lettering) {
    case "Minimal": return scheherazade;
    case "Kufi": return kufi;
    case "Thuluth inspired": return rakkas;
    default: return naskh;
  }
}
