"use client";

const categories = ["All", "Pendants", "Rings", "Chains", "Earrings"];

interface CategoryPillsProps {
  selected: string;
  onChange: (category: string) => void;
}

export function CategoryPills({ selected, onChange }: CategoryPillsProps) {
  return (
    <div className="flex gap-1.5 mb-4 overflow-x-auto">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={`flex-shrink-0 px-3 py-1 text-[10px] rounded-full font-medium transition ${
            selected === cat
              ? "bg-brown text-cream"
              : "bg-white border border-warm text-text-secondary"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
