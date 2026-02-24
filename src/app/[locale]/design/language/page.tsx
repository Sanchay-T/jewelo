"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { StepIndicator } from "@/components/layout/StepIndicator";
import { Check } from "lucide-react";

const languages = [
  { code: "en", flag: "🇬🇧", name: "English", description: "Latin script names" },
  { code: "ar", flag: "🇦🇪", name: "العربية", description: "Arabic script names" },
  { code: "zh", flag: "🇨🇳", name: "中文", description: "Chinese characters" },
];

export default function LanguagePage() {
  const [selected, setSelected] = useState<string | null>(null);
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="min-h-screen bg-cream px-6 pt-4 pb-24"
    >
      <div className="h-4" />
      <StepIndicator currentStep={1} totalSteps={7} />

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="font-display text-2xl mb-2"
      >
        What language is your name in?
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-text-secondary text-sm mb-8"
      >
        We&apos;ll pick the best fonts and AI for you.
      </motion.p>

      <div className="space-y-3">
        {languages.map((lang, i) => (
          <motion.button
            key={lang.code}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelected(lang.code)}
            className={`w-full text-left bg-white rounded-xl p-5 transition-colors ${
              selected === lang.code
                ? "border-2 border-brown shadow-sm"
                : "border border-warm hover:border-brown/30"
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="text-2xl">{lang.flag}</span>
              <div>
                <p className="text-text-primary font-medium">{lang.name}</p>
                <p className="text-text-tertiary text-sm">{lang.description}</p>
              </div>
              {selected === lang.code && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  className="ml-auto w-5 h-5 rounded-full bg-brown flex items-center justify-center"
                >
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </motion.div>
              )}
            </div>
          </motion.button>
        ))}
      </div>

      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        onClick={() =>
          selected && router.push(`/en/design/inspiration?lang=${selected}`)
        }
        disabled={!selected}
        className={`w-full font-semibold py-4 rounded-xl text-base mt-8 transition ${
          selected
            ? "bg-brown text-cream hover:bg-brown-dark"
            : "bg-brown-light text-cream/60 cursor-not-allowed"
        }`}
      >
        Continue
      </motion.button>
    </motion.div>
  );
}
