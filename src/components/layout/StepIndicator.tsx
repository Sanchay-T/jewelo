"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  onBack?: () => void;
}

export function StepIndicator({ currentStep, totalSteps, onBack }: StepIndicatorProps) {
  const router = useRouter();
  return (
    <div className="flex items-center justify-between mb-8">
      <button
        onClick={onBack || (() => router.back())}
        className="text-text-secondary text-sm flex items-center gap-1"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <span className="text-text-tertiary text-xs font-mono">
        {currentStep}/{totalSteps}
      </span>
    </div>
  );
}
