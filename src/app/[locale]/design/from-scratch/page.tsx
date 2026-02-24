"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StepIndicator } from "@/components/layout/StepIndicator";

const jewelryTypes = [
  { id: "pendant", label: "Pendant", description: "Name necklace" },
  { id: "ring", label: "Ring", description: "Engraved band" },
  { id: "bracelet", label: "Bracelet", description: "Name cuff" },
  { id: "earrings", label: "Earrings", description: "Initial studs" },
];

const styles = ["Minimalist", "Ornate", "Modern", "Vintage", "Arabic"];

export default function FromScratchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = searchParams.get("lang") || "en";
  const [selectedType, setSelectedType] = useState<string>("pendant");
  const [selectedStyle, setSelectedStyle] = useState<string>("Minimalist");

  return (
    <div className="min-h-screen bg-cream px-6 pt-4 pb-24 lg:pt-20 lg:pb-8">
      <div className="max-w-lg mx-auto">
      <div className="h-4" />
      <StepIndicator currentStep={2} totalSteps={7} />
      <h2 className="font-display text-xl mb-1 lg:text-2xl">Design from scratch</h2>
      <p className="text-text-secondary text-xs mb-5 lg:text-sm">
        No reference needed. Describe what you want.
      </p>

      <p className="text-text-secondary text-[10px] uppercase tracking-wider mb-2">
        What type of piece?
      </p>
      <div className="grid grid-cols-2 gap-2 mb-4 lg:grid-cols-4">
        {jewelryTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => setSelectedType(type.id)}
            className={`bg-white rounded-xl p-3 text-center transition ${
              selectedType === type.id
                ? "border-2 border-brown"
                : "border border-warm"
            }`}
          >
            <p
              className={`text-sm ${selectedType === type.id ? "text-brown font-medium" : "text-text-primary"}`}
            >
              {type.label}
            </p>
            <p className="text-text-tertiary text-[10px]">
              {type.description}
            </p>
          </button>
        ))}
      </div>

      <p className="text-text-secondary text-[10px] uppercase tracking-wider mb-2">
        Style
      </p>
      <div className="flex gap-1.5 mb-4 flex-wrap">
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

      <div className="bg-sand rounded-xl p-6 text-center mb-4 border border-warm lg:p-8">
        <p className="text-text-tertiary text-xs uppercase tracking-wider mb-2">
          AI will generate
        </p>
        <p className="font-display text-3xl italic text-gold/60 lg:text-4xl">Sarah</p>
        <p className="text-text-tertiary text-[10px] mt-2">
          {selectedStyle} gold {selectedType}
        </p>
      </div>

      <button
        onClick={() =>
          router.push(
            `/en/design/customize?lang=${lang}&type=${selectedType}&style=${selectedStyle}`
          )
        }
        className="w-full bg-brown text-cream font-semibold py-3.5 rounded-xl text-sm"
      >
        Continue to Customize
      </button>
      </div>
    </div>
  );
}
