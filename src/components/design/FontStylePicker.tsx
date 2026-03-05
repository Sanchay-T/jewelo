"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useAnimation } from "motion/react";

interface FontStylePickerProps {
  name: string;
  value: string;
  onChange: (font: string) => void;
  language?: string;
  metalColor?: string;
}

const fontsByLanguage: Record<string, { id: string; label: string; className: string }[]> = {
  en: [
    { id: "script", label: "Script", className: "font-display italic" },
    { id: "modern", label: "Modern", className: "tracking-widest uppercase text-sm" },
    { id: "classic", label: "Classic", className: "font-display" },
  ],
  ar: [
    { id: "naskh", label: "نسخ", className: "font-arabic" },
    { id: "diwani", label: "ديواني", className: "font-arabic italic" },
    { id: "kufi", label: "كوفي", className: "font-arabic font-bold" },
  ],
  zh: [
    { id: "regular", label: "Regular", className: "font-body" },
    { id: "serif", label: "Serif", className: "font-display" },
    { id: "bold", label: "Bold", className: "font-body font-bold" },
  ],
};

export function FontStylePicker({
  name,
  value,
  onChange,
  language,
  metalColor = "#D4A853",
}: FontStylePickerProps) {
  const fonts = fontsByLanguage[language || "en"] || fontsByLanguage.en;
  const isArabic = language === "ar";

  const initialIndex = Math.max(0, fonts.findIndex((f) => f.id === value));
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const controls = useAnimation();

  useEffect(() => {
    function measure() {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (containerWidth > 0) {
      controls.start({
        x: -currentIndex * containerWidth,
        transition: { type: "spring", stiffness: 300, damping: 30 },
      });
    }
  }, [containerWidth, currentIndex, controls]);

  // Sync external value changes
  useEffect(() => {
    const idx = fonts.findIndex((f) => f.id === value);
    if (idx >= 0 && idx !== currentIndex) {
      setCurrentIndex(idx);
    }
  }, [value, fonts, currentIndex]);

  function handleDragEnd(
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: { offset: { x: number }; velocity: { x: number } }
  ) {
    const threshold = containerWidth / 4;
    const { offset, velocity } = info;

    let newIndex = currentIndex;
    if (offset.x < -threshold || velocity.x < -500) {
      newIndex = Math.min(currentIndex + 1, fonts.length - 1);
    } else if (offset.x > threshold || velocity.x > 500) {
      newIndex = Math.max(currentIndex - 1, 0);
    }

    setCurrentIndex(newIndex);
    onChange(fonts[newIndex].id);
    controls.start({
      x: -newIndex * containerWidth,
      transition: { type: "spring", stiffness: 300, damping: 30 },
    });
  }

  return (
    <div>
      <label className="text-text-secondary text-xs font-medium uppercase tracking-wider mb-2 block">
        Font
      </label>

      <div ref={containerRef} className="overflow-hidden relative">
        <motion.div
          className="flex"
          drag="x"
          dragConstraints={{
            left: -(fonts.length - 1) * containerWidth,
            right: 0,
          }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          animate={controls}
          style={{ x: -currentIndex * containerWidth }}
        >
          {fonts.map((font) => (
            <div key={font.id} className="min-w-full px-1">
              <div className="bg-white rounded-xl border border-warm p-6 flex flex-col items-center justify-center">
                <p
                  dir={isArabic ? "rtl" : "ltr"}
                  className={`text-3xl ${font.className}`}
                  style={{ color: metalColor }}
                >
                  {name || (isArabic ? "اسم" : "Name")}
                </p>
                <p className="text-[10px] text-text-tertiary mt-2">
                  {font.label}
                </p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      <div className="flex justify-center gap-1.5 mt-3">
        {fonts.map((font, i) => (
          <div
            key={font.id}
            className={`h-2 rounded-full transition-colors ${
              i === currentIndex ? "bg-brown w-2" : "bg-warm w-2"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
