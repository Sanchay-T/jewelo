import type { Metadata } from "next";

import { Atelier } from "@/features/atelier/Atelier";

/**
 * Storyline review 1, minor. The tab, the bookmark and the share card of the
 * Arabic journey read "Create your piece · CALEUMS" in English, because this
 * page exported one static `metadata` for both locales. The page's own heading
 * is `t("Create your piece")`, so the title is that same line, and CALEUMS
 * stays Latin in both journeys as it does everywhere else on the page.
 */
const TITLE = {
  en: "Create your piece · CALEUMS",
  ar: "صمّم قطعتك · CALEUMS",
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === "ar" ? TITLE.ar : TITLE.en };
}

export default async function DesignPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <Atelier locale={locale === "ar" ? "ar" : "en"} />;
}
