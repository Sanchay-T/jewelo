import { notFound } from "next/navigation";
import { ReviewLanding, isSkin } from "@/features/review/ReviewExperience";

export default async function ReviewLandingPage({
  params,
}: {
  params: Promise<{ locale: "en" | "ar"; skin: string }>;
}) {
  const { locale, skin } = await params;
  if (!isSkin(skin)) notFound();
  return <ReviewLanding locale={locale} skin={skin} />;
}
