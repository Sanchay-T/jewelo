"use client";

interface MetalSelectorProps {
  value: string;
  onChange: (karat: string) => void;
}

const metals = [
  { id: "18K", color: "#D4A853" },
  { id: "21K", color: "#C9A03E" },
  { id: "22K", color: "#B8923F" },
];

export function MetalSelector({ value, onChange }: MetalSelectorProps) {
  return (
    <div>
      <label className="text-text-secondary text-xs font-medium uppercase tracking-wider mb-2 block">
        Gold
      </label>
      <div className="grid grid-cols-3 gap-2">
        {metals.map((metal) => (
          <button
            key={metal.id}
            onClick={() => onChange(metal.id)}
            className={`bg-white rounded-lg p-2 text-center transition ${
              value === metal.id
                ? "border-2 border-brown"
                : "border border-warm"
            }`}
          >
            <div
              className="w-6 h-6 rounded-full mx-auto mb-1"
              style={{ background: metal.color }}
            />
            <p className={`text-[10px] ${value === metal.id ? "font-semibold" : ""}`}>
              {metal.id}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
