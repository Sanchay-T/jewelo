import { LandingExperience } from "@/features/entry/landing-experience";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: "en" | "ar" }>;
}) {
  const { locale } = await params;
  return <LandingExperience locale={locale} />;
}
