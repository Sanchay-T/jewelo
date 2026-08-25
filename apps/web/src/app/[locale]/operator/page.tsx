import { OperatorExperience } from "@/components/operator-experience";

export default async function OperatorPage({ params }: { params: Promise<{ locale: "en" | "ar" }> }) {
  const { locale } = await params;
  return <OperatorExperience locale={locale} />;
}
