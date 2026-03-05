"use client";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps?: number;
  onBack?: () => void;
}

const STEPS = [
  { label: "Language" },
  { label: "Inspire" },
  { label: "Customize" },
  { label: "Craft" },
  { label: "Results" },
];

export function StepIndicator({ currentStep, onBack }: StepIndicatorProps) {
  const router = useRouter();

  return (
    <div className="mb-6">
      <button
        onClick={onBack || (() => router.back())}
        className="text-text-secondary text-sm flex items-center gap-1 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex items-center">
        {STEPS.map((step, i) => {
          const stepNum = i + 1;
          const isCompleted = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;
          const isFuture = stepNum > currentStep;

          return (
            <div key={step.label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className="relative">
                  {isCurrent ? (
                    <motion.div
                      layoutId="step-active"
                      className="w-4 h-4 rounded-full border-2 border-gold bg-cream"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  ) : (
                    <div
                      className={`w-3 h-3 rounded-full ${
                        isCompleted ? "bg-gold" : "border-2 border-warm bg-cream"
                      }`}
                    />
                  )}
                </div>
                <span
                  className={`text-[9px] mt-1 whitespace-nowrap ${
                    isCurrent
                      ? "text-text-primary font-semibold"
                      : "text-text-tertiary"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {i < STEPS.length - 1 && (
                <div className="flex-1 h-[2px] mx-1 mt-[-12px] relative bg-warm overflow-hidden rounded-full">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-gold rounded-full"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: isCompleted ? 1 : 0 }}
                    style={{ transformOrigin: "left" }}
                    transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
