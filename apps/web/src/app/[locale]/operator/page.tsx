import { JeweloProvider } from "@/lib/jewelo-provider";
import { OperatorExperience } from "@/features/admin/OperatorExperience";

export default async function OperatorPage({
  params,
}: {
  params: Promise<{ locale: "en" | "ar" }>;
}) {
  const { locale } = await params;
  return (
    <JeweloProvider>
      <OperatorExperience locale={locale} />
    </JeweloProvider>
  );
}
