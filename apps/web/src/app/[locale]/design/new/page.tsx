import { Atelier } from "@/features/atelier/Atelier";
export const metadata = { title: "Create your piece · CALEUMS" };
export default async function DesignPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <Atelier locale={locale === "ar" ? "ar" : "en"} />;
}
