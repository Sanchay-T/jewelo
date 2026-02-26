"use client";
import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { motion, AnimatePresence } from "motion/react";
import { api } from "../../../../../convex/_generated/api";
import { StepIndicator } from "@/components/layout/StepIndicator";
import { Sparkles } from "lucide-react";

const jewelryTypes = [
  { id: "name_pendant", label: "Name Pendant", description: "Name is the shape", emoji: "✦" },
  { id: "pendant", label: "Pendant", description: "Engraved pendant", emoji: "◇" },
  { id: "ring", label: "Ring", description: "Engraved band", emoji: "○" },
  { id: "bracelet", label: "Bracelet", description: "Name cuff", emoji: "◠" },
  { id: "earrings", label: "Earrings", description: "Initial studs", emoji: "◈" },
];

const styles = ["Minimalist", "Ornate", "Modern", "Vintage", "Arabic"];

export default function FromScratchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = searchParams.get("lang") || "en";
  const [selectedType, setSelectedType] = useState<string>("name_pendant");
  const [selectedStyle, setSelectedStyle] = useState<string>("Minimalist");

  // Query showcase images for visual cards (graceful fallback if table is empty)
  const showcaseImages = useQuery(api.showcase.getAll);

  // Group showcase images by jewelryType and designStyle
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

  // Get the first showcase image for a type (for the type card background)
  const getTypeImage = (typeId: string): string | null => {
    const images = showcaseByType[typeId];
    if (!images?.length) return null;
    const featured = images.find((img) => img.featured);
    return (featured || images[0])?.imageUrl || null;
  };

  // Get showcase image for a specific type + style combination
  const getStyleImage = (typeId: string, style: string): string | null => {
    const key = `${typeId}:${style}`;
    const images = showcaseByStyle[key];
    if (!images?.length) return null;
    return images[0]?.imageUrl || null;
  };

  const hasAnyShowcaseImages = showcaseImages && showcaseImages.length > 0;

  const selectedTypeData = jewelryTypes.find((t) => t.id === selectedType);

  return (
    <div className="min-h-screen bg-cream px-6 pt-4 pb-24 lg:pt-20 lg:pb-8">
      <div className="max-w-lg mx-auto lg:max-w-2xl">
        <div className="h-4" />
        <StepIndicator currentStep={2} totalSteps={7} />
        <h2 className="font-display text-xl mb-1 lg:text-2xl">Design from scratch</h2>
        <p className="text-text-secondary text-xs mb-5 lg:text-sm">
          No reference needed. Describe what you want.
        </p>

        {/* Jewelry Type Selection */}
        <p className="text-text-secondary text-[10px] uppercase tracking-wider mb-2">
          What type of piece?
        </p>
        <div className="grid grid-cols-2 gap-3 mb-6 lg:grid-cols-4">
          {jewelryTypes.map((type) => {
            const bgImage = getTypeImage(type.id);
            const isSelected = selectedType === type.id;

            return (
              <motion.button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                whileTap={{ scale: 0.97 }}
                className={`relative rounded-xl overflow-hidden transition min-h-[88px] ${
                  isSelected
                    ? "border-2 border-brown shadow-sm"
                    : "border border-warm"
                }`}
              >
                {bgImage ? (
                  <>
                    <img
                      src={bgImage}
                      alt={type.label}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div
                      className={`absolute inset-0 ${
                        isSelected
                          ? "bg-gradient-to-t from-black/70 via-black/30 to-black/10"
                          : "bg-gradient-to-t from-black/60 via-black/20 to-transparent"
                      }`}
                    />
                    <div className="relative z-10 p-3 flex flex-col justify-end h-full min-h-[88px]">
                      <p
                        className={`text-sm font-medium text-white ${
                          isSelected ? "font-semibold" : ""
                        }`}
                      >
                        {type.label}
                      </p>
                      <p className="text-white/70 text-[10px]">{type.description}</p>
                    </div>
                  </>
                ) : (
                  <div className="bg-white p-3 text-center flex flex-col items-center justify-center h-full min-h-[88px]">
                    <span className="text-2xl text-gold/50 mb-1">{type.emoji}</span>
                    <p
                      className={`text-sm ${
                        isSelected ? "text-brown font-medium" : "text-text-primary"
                      }`}
                    >
                      {type.label}
                    </p>
                    <p className="text-text-tertiary text-[10px]">{type.description}</p>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Style Selection */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedType}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <p className="text-text-secondary text-[10px] uppercase tracking-wider mb-2">
              Style
            </p>

            {/* If showcase images exist for this type's styles, show visual cards */}
            {hasAnyShowcaseImages &&
            styles.some((s) => getStyleImage(selectedType, s)) ? (
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                {styles.map((style) => {
                  const styleImage = getStyleImage(selectedType, style);
                  const isSelected = selectedStyle === style;

                  return (
                    <motion.button
                      key={style}
                      onClick={() => setSelectedStyle(style)}
                      whileTap={{ scale: 0.97 }}
                      className={`relative flex-shrink-0 w-24 h-28 rounded-xl overflow-hidden transition ${
                        isSelected
                          ? "border-2 border-brown shadow-sm"
                          : "border border-warm"
                      }`}
                    >
                      {styleImage ? (
                        <>
                          <img
                            src={styleImage}
                            alt={style}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <div
                            className={`absolute inset-0 ${
                              isSelected
                                ? "bg-gradient-to-t from-black/70 to-transparent"
                                : "bg-gradient-to-t from-black/50 to-transparent"
                            }`}
                          />
                          <div className="relative z-10 p-2 flex items-end h-full">
                            <p
                              className={`text-xs text-white ${
                                isSelected ? "font-semibold" : "font-medium"
                              }`}
                            >
                              {style}
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="bg-white flex items-center justify-center h-full">
                          <p
                            className={`text-xs ${
                              isSelected
                                ? "text-brown font-semibold"
                                : "text-text-secondary font-medium"
                            }`}
                          >
                            {style}
                          </p>
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              /* Fallback: pill buttons when no showcase images */
              <div className="flex gap-1.5 mb-6 flex-wrap">
                {styles.map((style) => (
                  <button
                    key={style}
                    onClick={() => setSelectedStyle(style)}
                    className={`px-3 py-1.5 text-xs rounded-full font-medium transition ${
                      selectedStyle === style
                        ? "bg-brown text-cream"
                        : "bg-white border border-warm text-text-secondary"
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Preview Card */}
        <motion.div
          layout
          className="bg-sand rounded-xl p-6 text-center mb-4 border border-warm lg:p-8"
        >
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-gold/60" />
            <p className="text-text-tertiary text-xs uppercase tracking-wider">
              AI will generate
            </p>
          </div>
          <p className="font-display text-3xl italic text-gold/60 lg:text-4xl">
            Your Name
          </p>
          <p className="text-text-tertiary text-[10px] mt-2">
            {selectedStyle} gold {selectedTypeData?.label || selectedType}
          </p>
        </motion.div>

        <button
          onClick={() =>
            router.push(
              `/en/design/customize?lang=${lang}&type=${selectedType}&style=${selectedStyle}`
            )
          }
          className="w-full bg-brown text-cream font-semibold py-3.5 rounded-xl text-sm hover:bg-brown-dark transition"
        >
          Continue to Customize
        </button>
      </div>
    </div>
  );
}
