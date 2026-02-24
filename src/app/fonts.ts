import { Playfair_Display, Inter, JetBrains_Mono, Noto_Naskh_Arabic } from "next/font/google";

export const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

export const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const notoNaskhArabic = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  display: "swap",
  variable: "--font-arabic",
  weight: ["400", "500", "600", "700"],
});
