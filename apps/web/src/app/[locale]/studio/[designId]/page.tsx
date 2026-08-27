import { Studio } from "@/features/studio/studio";

export default async function StudioPage({
  params,
}: {
  params: Promise<{ locale: "en" | "ar"; designId: string }>;
}) {
  const { locale, designId } = await params;

  return <Studio locale={locale} designId={designId} />;
}
