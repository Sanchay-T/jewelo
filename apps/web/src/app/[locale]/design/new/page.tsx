import { NewDesignExperience } from "@/features/entry/new-design-experience";

export default async function NewDesignPage({
  params,
}: {
  params: Promise<{ locale: "en" | "ar" }>;
}) {
  const { locale } = await params;
  return <NewDesignExperience locale={locale} />;
}
