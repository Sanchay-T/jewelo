"use client";

const categories = [
  "Pendants",
  "Rings",
  "Necklaces",
  "Bracelets",
  "Earrings",
  "Chains",
];
export function CategoryPills({
  selected,
  onChange,
}: {
  selected: string;
  onChange(value: string): void;
}) {
  return (
    <div className="category-pills" aria-label="Jewelry category">
      {categories.map((category) => (
        <button
          type="button"
          key={category}
          aria-pressed={selected === category}
          onClick={() => onChange(category)}
        >
          {category}
        </button>
      ))}
    </div>
  );
}
