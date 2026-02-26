"use client";

const categories = [
  "Pendants",
  "Rings",
  "Necklaces",
  "Bracelets",
  "Earrings",
  "Chains",
];

interface CategoryPillsProps {
  selected: string;
  onChange: (category: string) => void;
}

export function CategoryPills({ selected, onChange }: CategoryPillsProps) {
  return (
    <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-none">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={`flex-shrink-0 px-3.5 py-1.5 text-[11px] rounded-full font-medium transition ${
            selected === cat
              ? "bg-brown text-cream"
              : "bg-white border border-warm text-text-secondary hover:bg-sand/50"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
