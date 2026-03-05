"use client";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { StepIndicator } from "@/components/layout/StepIndicator";

const STEP_MAP: Record<string, number> = {
  language: 1,
  inspiration: 2,
  "from-scratch": 2,
  customize: 3,
  crafting: 4,
  results: 5,
  engraving: 5,
  order: 5,
  confirmed: 5,
};

function getStepFromPath(pathname: string): number {
  const segment = pathname.split("/").filter(Boolean).pop() || "";
  return STEP_MAP[segment] || 1;
}

export default function DesignLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const step = getStepFromPath(pathname);
  const showIndicator = step < 4;

  return (
    <div className="min-h-screen bg-cream">
      {showIndicator && (
        <div className="max-w-lg mx-auto px-6 pt-4 lg:pt-20">
          <div className="h-4" />
          <StepIndicator currentStep={step} />
        </div>
      )}
      <motion.div
        key={pathname}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
}
