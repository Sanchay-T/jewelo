"use client";

import { DEFAULT_PENDANT_THICKNESS_MM, PENDANT_LENGTH_OPTIONS_MM } from "@/lib/constants";
import { motion } from "motion/react";

interface PendantLengthSelectorProps {
  value: number;
  onChange: (lengthMm: number) => void;
}

export function PendantLengthSelector({ value, onChange }: PendantLengthSelectorProps) {
  return (
    <div>
      <label className="text-text-secondary text-xs font-medium uppercase tracking-wider mb-2 block">
        Pendant Length
      </label>
      <div className="flex bg-sand rounded-xl p-1">
        {PENDANT_LENGTH_OPTIONS_MM.map((length) => {
          const isSelected = value === length;
          return (
            <button
              key={length}
              onClick={() => onChange(length)}
              className={`flex-1 text-center py-2 text-xs rounded-lg relative cursor-pointer transition-colors ${
                isSelected ? "text-cream font-semibold" : "text-text-secondary"
              }`}
            >
              {isSelected && (
                <motion.div
                  layoutId="lengthIndicator"
                  className="absolute inset-0 bg-brown rounded-lg"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{length}mm</span>
            </button>
          );
        })}
      </div>
      <p className="text-text-tertiary text-[10px] mt-2">
        Selected: {value}mm &middot; Thickness: {DEFAULT_PENDANT_THICKNESS_MM}mm
      </p>
    </div>
  );
}
