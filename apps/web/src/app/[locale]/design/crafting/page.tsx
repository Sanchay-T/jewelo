import { CraftingTransition } from "@/features/entry/crafting-transition";

export default async function CraftingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: "en" | "ar" }>;
  searchParams: Promise<{ designId?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  return <CraftingTransition locale={locale} designId={query.designId ?? ""} />;
}
