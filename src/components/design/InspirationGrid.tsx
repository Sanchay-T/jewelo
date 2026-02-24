"use client";
import { Check } from "lucide-react";

interface InspirationImage {
  imageUrl: string;
  thumbnail: string;
  title: string;
}

interface InspirationGridProps {
  images: InspirationImage[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}

export function InspirationGrid({
  images,
  selectedIndex,
  onSelect,
}: InspirationGridProps) {
  if (images.length === 0) {
    return (
      <div className="grid grid-cols-3 gap-2 mb-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-lg bg-sand border border-warm"
          />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-2 mb-4">
      {images.map((img, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className={`aspect-square rounded-lg overflow-hidden relative ${
            selectedIndex === i
              ? "border-2 border-brown"
              : "border border-warm"
          }`}
        >
          <img
            src={img.thumbnail}
            alt={img.title}
            className="w-full h-full object-cover"
          />
          {selectedIndex === i && (
            <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-brown flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
