import { notFound } from "next/navigation";
import {
  ReviewFlowPage,
  isSkin,
  isStep,
} from "@/features/review/ReviewExperience";

export default async function ReviewStepPage({
  params,
}: {
  params: Promise<{ locale: "en" | "ar"; skin: string; step: string }>;
}) {
  const { locale, skin, step } = await params;
  if (!isSkin(skin) || !isStep(step)) notFound();
  return <ReviewFlowPage locale={locale} skin={skin} step={step} />;
}
