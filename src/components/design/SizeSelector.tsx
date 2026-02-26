"use client";
import { JEWELRY_SIZE_MAP, SIZE_MAP } from "@/lib/constants";

interface SizeSelectorProps {
  value: string;
  onChange: (size: string) => void;
  jewelryType?: string;
}

export function SizeSelector({ value, onChange, jewelryType }: SizeSelectorProps) {
  const sizeMap = jewelryType && jewelryType in JEWELRY_SIZE_MAP
    ? JEWELRY_SIZE_MAP[jewelryType as keyof typeof JEWELRY_SIZE_MAP]
    : SIZE_MAP;

  const sizes = Object.entries(sizeMap).map(([id, data]) => ({
    id,
    label: data.label,
    dimension: data.dimension,
  }));

  return (
    <div>
      <label className="text-text-secondary text-xs font-medium uppercase tracking-wider mb-2 block">
        Size
      </label>
      <div className="grid grid-cols-3 gap-2">
        {sizes.map((size) => (
          <button
            key={size.id}
            onClick={() => onChange(size.id)}
            className={`bg-white rounded-lg p-3 text-center transition ${
              value === size.id
                ? "border-2 border-brown"
                : "border border-warm"
            }`}
          >
            <p
              className={`text-sm ${value === size.id ? "text-brown font-semibold" : "text-text-primary font-medium"}`}
            >
              {size.label}
            </p>
            <p
              className={`text-[10px] ${value === size.id ? "text-text-secondary" : "text-text-tertiary"}`}
            >
              {size.dimension}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
