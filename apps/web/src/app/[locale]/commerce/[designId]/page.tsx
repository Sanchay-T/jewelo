import { CommerceExperience } from "@/features/commerce/CommerceExperience";

export default async function CommercePage({
  params,
}: {
  params: Promise<{ locale: "en" | "ar"; designId: string }>;
}) {
  const { locale, designId } = await params;
  return <CommerceExperience locale={locale} designId={designId} />;
}
