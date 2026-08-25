"use client";

import { useEffect } from "react";

export function LocaleDocument({ locale, children }: { locale: "en" | "ar"; children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    return () => {
      document.documentElement.lang = "en";
      document.documentElement.dir = "ltr";
    };
  }, [locale]);
  return children;
}
