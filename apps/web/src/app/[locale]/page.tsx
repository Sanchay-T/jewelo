import { LandingExperience } from "@/components/landing-experience";

export default async function LandingPage({ params }: { params: Promise<{ locale: "en" | "ar" }> }) {
  const { locale } = await params;
  return <LandingExperience locale={locale} />;
}
