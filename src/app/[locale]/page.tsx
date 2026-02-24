"use client";
import Link from "next/link";
import { motion } from "motion/react";
import { BeforeAfterSlider } from "@/components/shared/BeforeAfterSlider";
import { ContinueDesignBanner } from "@/components/shared/ContinueDesignBanner";

export default function LandingPage() {
  return (
    <div className="h-[100dvh] bg-cream relative flex flex-col">
      <div className="flex-1 flex flex-col px-6 pt-4 pb-20 overflow-hidden">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2 mb-4"
        >
          <div className="w-7 h-7 rounded-full bg-brown flex items-center justify-center">
            <span className="text-cream text-[10px] font-bold">J</span>
          </div>
          <span className="font-display text-base text-brown">Jewelo</span>
        </motion.div>

        {/* Hero */}
        <motion.h1 className="font-display text-[32px] leading-[1.1] mb-1.5">
          <motion.span
            initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-text-secondary italic block"
          >
            Craft Your
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-text-primary font-semibold block"
          >
            Dream Jewelry
          </motion.span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-text-secondary text-sm mb-4"
        >
          Designed by AI. Handcrafted by master artisans in 48 hours.
        </motion.p>

        {/* Before/After Slider — takes remaining vertical space */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex-1 min-h-0 mb-4"
        >
          <BeforeAfterSlider />
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.65 }}
          className="flex-shrink-0"
        >
          <Link
            href="/en/design/language"
            className="block w-full bg-brown text-cream font-semibold py-3.5 rounded-xl text-sm text-center mb-2 hover:bg-brown-dark transition relative overflow-hidden group"
          >
            <span className="relative z-10">Begin Designing</span>
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </Link>
          <Link
            href="/en/gallery"
            className="block w-full border border-brown/20 text-text-secondary py-2.5 rounded-xl text-sm text-center hover:bg-sand/50 transition"
          >
            View Gallery
          </Link>
        </motion.div>
        <ContinueDesignBanner />
      </div>
    </div>
  );
}
