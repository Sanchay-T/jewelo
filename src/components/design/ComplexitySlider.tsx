"use client";

import { motion, AnimatePresence } from "motion/react";
import { useMemo } from "react";

interface ComplexitySliderProps {
  value: number;
  onChange: (value: number) => void;
}

type ComplexityTier = "simple" | "balanced" | "ornate";

function getTier(value: number): ComplexityTier {
  if (value <= 3) return "simple";
  if (value <= 7) return "balanced";
  return "ornate";
}

const tierLabels: Record<ComplexityTier, string> = {
  simple: "Clean & Simple",
  balanced: "Balanced",
  ornate: "Ornate & Luxurious",
};

function JewelryIcon({ tier }: { tier: ComplexityTier }) {
  if (tier === "simple") {
    return (
      <svg viewBox="0 0 48 48" className="w-10 h-10">
        {/* Simple pendant - clean teardrop shape */}
        <path
          d="M24 6c-1 0-2 .5-2 1.5v3c0 0-8 5-8 14 0 6 4.5 11 10 11s10-5 10-11c0-9-8-14-8-14v-3c0-1-1-1.5-2-1.5z"
          fill="none"
          stroke="var(--color-gold)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Chain loop */}
        <ellipse cx="24" cy="6" rx="3" ry="2" fill="none" stroke="var(--color-gold)" strokeWidth="1.2" />
      </svg>
    );
  }

  if (tier === "balanced") {
    return (
      <svg viewBox="0 0 48 48" className="w-10 h-10">
        {/* Balanced pendant with center gem */}
        <path
          d="M24 6c-1 0-2 .5-2 1.5v3c0 0-8 5-8 14 0 6 4.5 11 10 11s10-5 10-11c0-9-8-14-8-14v-3c0-1-1-1.5-2-1.5z"
          fill="none"
          stroke="var(--color-gold)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Center gemstone */}
        <circle cx="24" cy="24" r="3.5" fill="var(--color-gold)" opacity="0.3" stroke="var(--color-gold)" strokeWidth="1" />
        <circle cx="24" cy="24" r="1.5" fill="var(--color-gold)" opacity="0.6" />
        {/* Chain loop */}
        <ellipse cx="24" cy="6" rx="3" ry="2" fill="none" stroke="var(--color-gold)" strokeWidth="1.2" />
      </svg>
    );
  }

  // ornate
  return (
    <svg viewBox="0 0 48 48" className="w-10 h-10">
      {/* Ornate pendant with decorations */}
      <path
        d="M24 6c-1 0-2 .5-2 1.5v3c0 0-8 5-8 14 0 6 4.5 11 10 11s10-5 10-11c0-9-8-14-8-14v-3c0-1-1-1.5-2-1.5z"
        fill="none"
        stroke="var(--color-gold)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Center gemstone */}
      <circle cx="24" cy="22" r="4" fill="var(--color-gold)" opacity="0.25" stroke="var(--color-gold)" strokeWidth="1" />
      <circle cx="24" cy="22" r="2" fill="var(--color-gold)" opacity="0.5" />
      {/* Side gems */}
      <circle cx="18" cy="24" r="1.5" fill="var(--color-gold)" opacity="0.4" />
      <circle cx="30" cy="24" r="1.5" fill="var(--color-gold)" opacity="0.4" />
      {/* Filigree accents */}
      <path d="M18 18c-2-1-3 1-2 3" fill="none" stroke="var(--color-gold)" strokeWidth="0.8" opacity="0.6" />
      <path d="M30 18c2-1 3 1 2 3" fill="none" stroke="var(--color-gold)" strokeWidth="0.8" opacity="0.6" />
      <path d="M20 30c-1 1 0 3 2 3" fill="none" stroke="var(--color-gold)" strokeWidth="0.8" opacity="0.6" />
      <path d="M28 30c1 1 0 3-2 3" fill="none" stroke="var(--color-gold)" strokeWidth="0.8" opacity="0.6" />
      {/* Chain loop */}
      <ellipse cx="24" cy="6" rx="3" ry="2" fill="none" stroke="var(--color-gold)" strokeWidth="1.2" />
      {/* Bottom accent */}
      <circle cx="24" cy="31" r="1" fill="var(--color-gold)" opacity="0.5" />
    </svg>
  );
}

export function ComplexitySlider({ value, onChange }: ComplexitySliderProps) {
  const tier = getTier(value);
  const fillPercent = useMemo(() => ((value - 1) / 9) * 100, [value]);

  return (
    <div className="bg-white border border-warm rounded-2xl p-4">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-text-secondary text-[10px] uppercase tracking-wider font-medium">
          Complexity
        </p>
        <div className="flex items-center gap-2">
          <AnimatePresence mode="wait">
            <motion.span
              key={tier}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="text-text-tertiary text-[10px]"
            >
              {tierLabels[tier]}
            </motion.span>
          </AnimatePresence>
          <span className="font-mono text-gold text-sm font-bold bg-gold/10 px-2 py-0.5 rounded-lg">
            {value}
          </span>
        </div>
      </div>

      {/* Icon + Slider row */}
      <div className="flex items-center gap-3">
        {/* Animated jewelry icon */}
        <div className="flex-shrink-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={tier}
              initial={{ opacity: 0, scale: 0.7, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.7, rotate: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <JewelryIcon tier={tier} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Slider */}
        <div className="flex-1">
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="gold-slider w-full"
            style={{
              background: `linear-gradient(to right, var(--color-gold) ${fillPercent}%, var(--color-sand) ${fillPercent}%)`,
            }}
          />
          <div className="flex items-center justify-between text-[9px] text-text-tertiary mt-0.5 px-0.5">
            <span>Simple</span>
            <span>Luxurious</span>
          </div>
        </div>
      </div>
    </div>
  );
}
