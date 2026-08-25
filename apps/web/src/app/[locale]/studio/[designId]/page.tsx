import { StudioExperience } from "@/components/studio-experience";

export default async function StudioPage({ params }: { params: Promise<{ locale: "en" | "ar"; designId: string }> }) {
  const { locale, designId } = await params;
  return <StudioExperience locale={locale} designId={designId} />;
}
