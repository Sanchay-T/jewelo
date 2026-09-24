import localFont from "next/font/local";
import type { Draft } from "./model";

// The live identity face mapping, served as web fonts without importing the engine.
const naskh = localFont({
  src: "./fonts/NotoNaskhArabic-Regular.ttf",
  display: "swap",
});
const scheherazade = localFont({
  src: "./fonts/ScheherazadeNew-Regular.ttf",
  display: "swap",
});
const kufi = localFont({
  src: "./fonts/NotoKufiArabic-Regular.ttf",
  display: "swap",
});
const rakkas = localFont({
  src: "./fonts/rakkas.ttf",
  display: "swap",
});
const playfair = localFont({
  src: "./fonts/PlayfairDisplay-SemiBold.ttf",
  display: "swap",
});
const cairo = localFont({
  src: "./fonts/cairo.ttf",
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
