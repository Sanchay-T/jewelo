"use client";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";
import { useDesignFlow } from "@/lib/DesignFlowContext";

export function ContinueDesignBanner() {
  const { activeDesignId, getResumeUrl } = useDesignFlow();
  const resumeUrl = getResumeUrl();

  if (!activeDesignId || !resumeUrl) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4"
    >
      <Link
        href={resumeUrl}
        className="flex items-center gap-3 bg-white border border-brown/20 rounded-xl p-4 hover:bg-sand/50 transition"
      >
        <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-gold" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-text-primary text-sm font-medium">
            Design in progress
          </p>
          <p className="text-text-tertiary text-xs">
            Pick up where you left off
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-brown flex-shrink-0" />
      </Link>
    </motion.div>
  );
}
