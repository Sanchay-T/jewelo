"use client";
import { Check } from "lucide-react";
import { motion } from "motion/react";

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
  if (images.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-2 lg:grid-cols-4 lg:gap-3">
      {images.map((img, i) => (
        <motion.button
          key={`${img.thumbnail}-${i}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
          onClick={() => onSelect(i)}
          className={`aspect-square rounded-lg overflow-hidden relative transition-all ${
            selectedIndex === i
              ? "ring-2 ring-brown ring-offset-2 ring-offset-cream scale-[0.97]"
              : "border border-warm hover:border-brown/40"
          }`}
        >
          <img
            src={img.thumbnail}
            alt={img.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {selectedIndex === i && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-brown flex items-center justify-center shadow-sm"
            >
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            </motion.div>
          )}
        </motion.button>
      ))}
    </div>
  );
}
