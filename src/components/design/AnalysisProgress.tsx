"use client";
import { motion, AnimatePresence } from "motion/react";
import { Check, Loader2 } from "lucide-react";

interface AnalysisStep {
  label: string;
  detail: string;
  status: "pending" | "done" | "loading";
}

interface AnalysisProgressProps {
  steps: AnalysisStep[];
}

export function AnalysisProgress({ steps }: AnalysisProgressProps) {
  return (
    <div className="bg-white rounded-xl p-4 border border-warm mb-4">
      <p className="text-text-secondary text-[10px] uppercase tracking-wider mb-3">
        Analyzing your piece...
      </p>
      <div className="space-y-2.5">
        <AnimatePresence mode="popLayout">
          {steps.map((step, i) => {
            if (step.status === "pending") return null;
            return (
              <motion.div
                key={`${step.label}-${i}`}
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.4, delay: i * 0.15, ease: [0.25, 0.1, 0.25, 1] }}
                className="flex items-center gap-2.5"
              >
                {step.status === "done" ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
                    className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center"
                  >
                    <Check className="w-3 h-3 text-green-500" strokeWidth={2.5} />
                  </motion.div>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-warm flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full border-2 border-brown border-t-transparent animate-spin" />
                  </div>
                )}
                <p
                  className={`text-xs ${step.status === "done" ? "text-text-primary" : "text-text-tertiary"}`}
                >
                  {step.label}:{" "}
                  <span className="font-medium">{step.detail}</span>
                </p>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
