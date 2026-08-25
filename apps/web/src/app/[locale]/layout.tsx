import { notFound } from "next/navigation";
import { LocaleDocument } from "@/components/locale-document";

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "ar" }];
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en" && locale !== "ar") notFound();
  return <LocaleDocument locale={locale}>{children}</LocaleDocument>;
}
