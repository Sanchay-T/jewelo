import { ReviewPicker } from "@/features/review/ReviewExperience";

export default async function ReviewPickerPage({
  params,
}: {
  params: Promise<{ locale: "en" | "ar" }>;
}) {
  const { locale } = await params;
  return <ReviewPicker locale={locale} />;
}
