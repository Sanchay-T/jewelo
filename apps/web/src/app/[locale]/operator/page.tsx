import { OperatorExperience } from "@/features/admin/OperatorExperience";

export default async function OperatorPage({ params }: { params: Promise<{ locale: "en" | "ar" }> }) {
  const { locale } = await params;
  return <OperatorExperience locale={locale} />;
}
