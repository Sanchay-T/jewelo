"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { motion, AnimatePresence } from "motion/react";
import { api } from "../../../../../convex/_generated/api";
import { ArrowRight } from "lucide-react";
import { ComplexitySlider } from "@/components/design/ComplexitySlider";
import { InlineLanguageSelector } from "@/components/design/InlineLanguageSelector";
import { NameInput } from "@/components/design/NameInput";
import type { StyleFamily } from "@/lib/constants";

const displayName = (name: string, transliterated: string) => transliterated || name;

const jewelryTypes = [
  {
    id: "name_pendant",
    label: "Name Pendant",
    description: "Name is the shape",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" className="w-6 h-6">
        <path d="M12 2L4 8v6l8 8 8-8V8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    id: "pendant",
    label: "Pendant",
    description: "Engraved pendant",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" className="w-6 h-6">
        <path d="M12 3L6 9v4l6 8 6-8V9z" />
      </svg>
    ),
  },
  {
    id: "ring",
    label: "Ring",
    description: "Engraved band",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" className="w-6 h-6">
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="5.5" />
      </svg>
    ),
  },
  {
    id: "bracelet",
    label: "Bracelet",
    description: "Name cuff",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" className="w-6 h-6">
        <path d="M4 12a8 8 0 0116 0" />
        <path d="M6 12a6 6 0 0112 0" />
      </svg>
    ),
  },
  {
    id: "earrings",
    label: "Earrings",
    description: "Initial studs",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" className="w-6 h-6">
        <circle cx="12" cy="8" r="5" />
        <path d="M12 13v6" />
        <circle cx="12" cy="21" r="2" />
      </svg>
    ),
  },
];

const styles: { id: StyleFamily; label: string; gradient: string; query: string }[] = [
  { id: "minimalist", label: "Minimalist", gradient: "linear-gradient(135deg, #f5f0e8, #ede6d8)", query: "minimalist gold jewelry pendant simple elegant" },
  { id: "floral", label: "Floral", gradient: "linear-gradient(135deg, #e8d5c4, #d4b89a)", query: "floral gold jewelry pendant flower" },
  { id: "art_deco", label: "Art Deco", gradient: "linear-gradient(135deg, #2D2418, #5C4A35)", query: "art deco gold jewelry geometric pendant" },
  { id: "vintage", label: "Vintage", gradient: "linear-gradient(135deg, #c4b49a, #8b7355)", query: "vintage antique gold jewelry pendant ornate" },
  { id: "modern", label: "Modern", gradient: "linear-gradient(135deg, #e0dcd5, #bbb5ac)", query: "modern contemporary gold jewelry pendant" },
  { id: "arabic", label: "Arabic", gradient: "linear-gradient(135deg, #d4a853, #b8923f)", query: "arabic gold jewelry calligraphy pendant" },
];


export default function FromScratchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scrollRef = useRef<HTMLDivElement>(null);
  const lang = searchParams.get("lang") || "en";
  const [selectedType, setSelectedType] = useState<string>(searchParams.get("type") || "name_pendant");
  const [selectedStyle, setSelectedStyle] = useState<StyleFamily>((searchParams.get("styleFamily") as StyleFamily) || "minimalist");
  const [complexity, setComplexity] = useState(Number(searchParams.get("complexity") || 5));
  const [name, setName] = useState(searchParams.get("name") || "");
  const [language, setLanguage] = useState(lang);
  const [transliteratedName, setTransliteratedName] = useState("");

  const showcaseImages = useQuery(api.showcase.getAll);
  const stylePreviewImages = useQuery(api.stylePreview.getAll);

  const showcaseByType = useMemo(() => {
    if (!showcaseImages?.length) return {};
    const grouped: Record<string, typeof showcaseImages> = {};
    for (const img of showcaseImages) {
      if (!grouped[img.jewelryType]) grouped[img.jewelryType] = [];
      grouped[img.jewelryType]!.push(img);
    }
    return grouped;
  }, [showcaseImages]);

  const showcaseByStyle = useMemo(() => {
    if (!showcaseImages?.length) return {};
    const grouped: Record<string, typeof showcaseImages> = {};
    for (const img of showcaseImages) {
      const key = `${img.jewelryType}:${img.designStyle}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key]!.push(img);
    }
    return grouped;
  }, [showcaseImages]);

  const getTypeImage = (typeId: string): string | null => {
    const images = showcaseByType[typeId];
    if (!images?.length) return null;
    const featured = images.find((img) => img.featured);
    return (featured || images[0])?.imageUrl || null;
  };

  const getStyleImage = (typeId: string, style: StyleFamily): string | null => {
    const key = `${typeId}:${style}`;
    const images = showcaseByStyle[key];
    if (!images?.length) return null;
    return images[0]?.imageUrl || null;
  };

  const selectedTypeData = jewelryTypes.find((t) => t.id === selectedType);
  const selectedStyleData = styles.find((s) => s.id === selectedStyle);
  const canContinue = name.trim().length > 0;

  // Scroll selected type card into view
  useEffect(() => {
    if (!scrollRef.current) return;
    const idx = jewelryTypes.findIndex((t) => t.id === selectedType);
    const cards = scrollRef.current.children;
    if (cards[idx]) {
      (cards[idx] as HTMLElement).scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [selectedType]);

  return (
    <div className="bg-cream pb-24 lg:pb-8">
      <div className="max-w-lg mx-auto lg:max-w-2xl">

        {/* Header */}
        <div className="px-6">
          <h2 className="font-display text-xl mb-1 lg:text-2xl">Design from scratch</h2>
          <p className="text-text-secondary text-xs mb-5 lg:text-sm">Choose your piece, name it, and pick a style.</p>
        </div>

        {/* === Section 1: Type + Name === */}
        <div className="mb-6">
          <p className="text-text-tertiary text-[10px] uppercase tracking-wider font-medium mb-2 px-6">Type of piece</p>

          {/* Horizontal scroll type cards */}
          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto px-6 pb-3 scrollbar-hide snap-x snap-mandatory"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {jewelryTypes.map((type) => {
              const bgImage = getTypeImage(type.id);
              const isSelected = selectedType === type.id;

              return (
                <motion.button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  whileTap={{ scale: 0.97 }}
                  className={`flex-shrink-0 w-[120px] snap-center rounded-2xl overflow-hidden transition-all ${
                    isSelected
                      ? "border-2 border-brown shadow-md"
                      : "border border-warm"
                  }`}
                >
                  {bgImage ? (
                    <div className="relative h-[130px]">
                      <img src={bgImage} alt={type.label} className="absolute inset-0 w-full h-full object-cover" />
                      <div className={`absolute inset-0 ${
                        isSelected
                          ? "bg-gradient-to-t from-black/70 via-black/30 to-black/10"
                          : "bg-gradient-to-t from-black/60 via-black/20 to-transparent"
                      }`} />
                      <div className="relative z-10 p-3 flex flex-col justify-end h-full">
                        <p className={`text-xs font-medium text-white ${isSelected ? "font-semibold" : ""}`}>{type.label}</p>
                        <p className="text-white/60 text-[9px]">{type.description}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white p-3 text-center h-[130px] flex flex-col items-center justify-center gap-2">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                        isSelected ? "bg-brown" : "bg-sand"
                      }`}>
                        <div className={`transition-colors ${
                          isSelected ? "stroke-cream" : "stroke-text-tertiary"
                        }`}>
                          {type.icon}
                        </div>
                      </div>
                      <div>
                        <p className={`text-xs ${isSelected ? "text-brown font-semibold" : "text-text-primary font-medium"}`}>{type.label}</p>
                        <p className="text-text-tertiary text-[9px]">{type.description}</p>
                      </div>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Language + Name Input */}
        <div className="px-6 mb-6 space-y-4">
          <InlineLanguageSelector value={language} onChange={setLanguage} />
          <NameInput value={name} onChange={setName} language={language} onTransliterated={setTransliteratedName} />
        </div>

        {/* === Section 2: Style + Complexity === */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedType}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="px-6"
          >
            <p className="text-text-tertiary text-[10px] uppercase tracking-wider font-medium mb-2">Style</p>

            {/* Visual style grid — showcase > search > gradient fallback */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              {styles.map((style) => {
                const imgUrl = getStyleImage(selectedType, style.id) || stylePreviewImages?.[style.id];
                const isSelected = selectedStyle === style.id;

                return (
                  <motion.button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    whileTap={{ scale: 0.97 }}
                    className={`relative aspect-square rounded-xl overflow-hidden transition-all ${
                      isSelected ? "border-2 border-brown shadow-md ring-2 ring-brown/15" : "border border-transparent"
                    }`}
                  >
                    {imgUrl ? (
                      <img src={imgUrl} alt={style.label} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0" style={{ background: style.gradient }} />
                    )}
                    <div className={`absolute inset-0 ${
                      isSelected
                        ? "bg-gradient-to-t from-black/70 to-transparent"
                        : "bg-gradient-to-t from-black/60 via-black/10 to-transparent"
                    }`} />
                    <div className="relative z-10 flex items-end h-full p-2">
                      <p className={`text-[11px] text-white ${isSelected ? "font-bold" : "font-semibold"}`}>{style.label}</p>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Complexity - compact inline */}
            <ComplexitySlider value={complexity} onChange={setComplexity} />
          </motion.div>
        </AnimatePresence>

        {/* === Live Preview (only when name entered) === */}
        <AnimatePresence>
          {name.trim() && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="px-6 overflow-hidden"
            >
              <div className="bg-white rounded-2xl p-5 mt-5 border border-warm text-center">
                <p className="font-display text-3xl italic text-gold/70 lg:text-4xl leading-tight">{displayName(name, transliteratedName)}</p>
                <p className="text-text-tertiary text-[10px] mt-2">
                  {selectedStyleData?.label} gold {selectedTypeData?.label} · Complexity {complexity}/10
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA */}
        <div className="px-6 mt-5">
          <button
            onClick={() => {
              if (!canContinue) return;
              const query = new URLSearchParams({
                lang: language,
                type: selectedType,
                styleFamily: selectedStyle,
                complexity: String(complexity),
                name: displayName(name, transliteratedName).trim(),
              });
              router.push(`/en/design/customize?${query.toString()}`);
            }}
            disabled={!canContinue}
            className={`w-full py-3.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 ${
              canContinue
                ? "bg-brown text-cream hover:bg-brown-dark"
                : "bg-brown-light text-cream/60 cursor-not-allowed"
            }`}
          >
            Continue to Customize
            <ArrowRight className="w-4 h-4" />
          </button>
          {!canContinue && (
            <p className="text-text-tertiary text-[10px] text-center mt-2">Enter your name to continue</p>
          )}
        </div>
      </div>
    </div>
  );
}
