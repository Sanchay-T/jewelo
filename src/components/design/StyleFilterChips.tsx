"use client";

import type { StyleFamily } from "@/lib/constants";

const STYLE_OPTIONS: { id: StyleFamily; label: string }[] = [
  { id: "minimalist", label: "Minimalist" },
  { id: "floral", label: "Floral" },
  { id: "art_deco", label: "Art Deco" },
  { id: "vintage", label: "Vintage" },
  { id: "modern", label: "Modern" },
  { id: "arabic", label: "Arabic" },
];

interface StyleFilterChipsProps {
  value: StyleFamily;
  onChange: (style: StyleFamily) => void;
}

export function StyleFilterChips({ value, onChange }: StyleFilterChipsProps) {
  return (
    <div>
      <p className="text-text-secondary text-[10px] uppercase tracking-wider font-medium mb-2">
        Style
      </p>
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {STYLE_OPTIONS.map((option) => (
          <button
            key={option.id}
            onClick={() => onChange(option.id)}
            className={`flex-shrink-0 px-3 py-1.5 text-xs rounded-full font-medium transition ${
              value === option.id
                ? "bg-brown text-cream"
                : "bg-white border border-warm text-text-secondary hover:bg-sand/50"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
