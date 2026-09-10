import { notFound } from "next/navigation";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { LocaleDocument } from "@/components/locale-document";

/**
 * The Arabic journey's own web face. Without it the page falls through
 * "Playfair Display" and "Instrument Sans" - neither has an Arabic glyph - to
 * whatever Naskh the device happens to ship, so the same shop looks different
 * on every tablet and phone.
 *
 * IBM Plex Sans Arabic rather than Noto Naskh Arabic: the Latin side of this
 * page is a low-contrast grotesque (Instrument Sans) and Plex Arabic is drawn
 * on a Naskh skeleton with the same near-flat contrast and open counters, so
 * the two sit together at 14px. Noto Naskh is a document face with strong
 * stroke contrast and long descenders; it reads as a book beside the Latin,
 * and it has no 500 weight for the chips and labels.
 *
 * `next/font` subsets it to Arabic and self-hosts the files in the build, so
 * the shop never asks Google for a font at runtime. `preload: false` because
 * `/en/design/new` and `/ar/design/new` are the same route module: a preload
 * link would be emitted on both and the English page would pull an Arabic face
 * it never draws a glyph with. Only the `ar` tree carries the variable, so only
 * the Arabic page fetches the file, on first paint of Arabic text.
 */
const arabicFace = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
  variable: "--font-arabic",
});

export const metadata = {
  title: "Caleums — Your name. Made precious.",
  description:
    "Design and approve a personalized 18K gold Caleums name pendant.",
};

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "ar" }];
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== "en" && locale !== "ar") notFound();
  if (locale === "en")
    return <LocaleDocument locale="en">{children}</LocaleDocument>;
  return (
    // `display: contents` so the wrapper carries the font variable without
    // adding a box to the page's layout.
    <div className={arabicFace.variable} style={{ display: "contents" }}>
      <LocaleDocument locale="ar">{children}</LocaleDocument>
    </div>
  );
}
