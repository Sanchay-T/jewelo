"use client";

/**
 * The recovery screen for the atelier.
 *
 * Without a boundary here, one thrown error anywhere under `/[locale]/design`
 * replaces the whole page with Next's default blank error screen: a shopper
 * standing in the shop sees nothing, and the shop assistant has nothing to say.
 * This keeps the shop's own voice, says what to do, and offers the one action
 * that actually recovers the page. Nothing about the customer's design is lost:
 * the draft lives in this browser's storage and is read back on the next render.
 */

import { useParams } from "next/navigation";

export default function DesignError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams<{ locale?: string }>();
  const arabic = params?.locale === "ar";
  return (
    <main
      dir={arabic ? "rtl" : "ltr"}
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 32,
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 500 }}>
        {arabic
          ? "تعذّر عرض هذه الصفحة الآن."
          : "This page could not be shown just now."}
      </h1>
      <p style={{ maxWidth: 460, lineHeight: 1.6 }}>
        {arabic
          ? "تصميمك محفوظ على هذا الجهاز. أعد المحاولة للعودة إلى المكان الذي توقفت عنده."
          : "Your design is saved on this device. Try again to return to where you were."}
      </p>
      <button
        type="button"
        onClick={reset}
        style={{
          padding: "12px 24px",
          borderRadius: 999,
          border: "1px solid currentColor",
          background: "none",
          cursor: "pointer",
          font: "inherit",
        }}
      >
        {arabic ? "إعادة المحاولة" : "Try again"}
      </button>
    </main>
  );
}
