"use client";
import { Gem, Diamond, CircleDot } from "lucide-react";

interface DecorationSelectorProps {
  value: string;
  onChange: (style: string) => void;
}

const decorations = [
  { id: "gold_only", label: "Pure Gold", description: "No stones", Icon: CircleDot },
  { id: "gold_with_stones", label: "Gemstones", description: "Stone accents", Icon: Gem },
  { id: "gold_with_diamonds", label: "Diamonds", description: "Diamond-set", Icon: Diamond },
];

export function DecorationSelector({ value, onChange }: DecorationSelectorProps) {
  return (
    <div>
      <label className="text-text-secondary text-xs font-medium uppercase tracking-wider mb-2 block">
        Decoration
      </label>
      <div className="grid grid-cols-3 gap-2">
        {decorations.map((dec) => (
          <button
            key={dec.id}
            onClick={() => onChange(dec.id)}
            className={`bg-white rounded-lg p-3 text-center transition ${
              value === dec.id
                ? "border-2 border-brown"
                : "border border-warm"
            }`}
          >
            <dec.Icon
              className={`w-4 h-4 mx-auto mb-1 ${value === dec.id ? "text-brown" : "text-text-tertiary"}`}
            />
            <p className={`text-xs ${value === dec.id ? "text-brown font-semibold" : "text-text-primary font-medium"}`}>
              {dec.label}
            </p>
            <p className={`text-[10px] ${value === dec.id ? "text-text-secondary" : "text-text-tertiary"}`}>
              {dec.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
