"use client";
import { BottomNav } from "@/components/layout/BottomNav";
import { DesignFlowProvider } from "@/lib/DesignFlowContext";

export default function LocaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DesignFlowProvider>
      {children}
      <BottomNav />
    </DesignFlowProvider>
  );
}
