"use client";
import { useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { motion } from "motion/react";
import { api } from "../../../../../convex/_generated/api";
import { useDesignFlow } from "@/lib/DesignFlowContext";
import { StepIndicator } from "@/components/layout/StepIndicator";
import { NameInput } from "@/components/design/NameInput";
import { FontStylePicker } from "@/components/design/FontStylePicker";
import { SizeSelector } from "@/components/design/SizeSelector";
import { MetalSelector, getGoldColor, getGoldLabel } from "@/components/design/MetalSelector";
import { LivePriceDisplay } from "@/components/design/LivePriceDisplay";
import { GenerateButton } from "@/components/design/GenerateButton";
import { DecorationSelector } from "@/components/design/DecorationSelector";
import { calculatePrice } from "@/lib/pricing";
import { AED_USD_PEG, JEWELRY_SIZE_MAP } from "@/lib/constants";
import type { Size, Karat, Style } from "@/lib/constants";

export default function ConfiguratorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setActiveDesign, language: contextLang } = useDesignFlow();

  const lang = searchParams.get("lang") || contextLang || "en";
  const refUrl = searchParams.get("ref") || undefined;
  const jewelryType = searchParams.get("type") || "jewelry";
  const designStyle = searchParams.get("style") || "elegant";

  const [name, setName] = useState("");
  const [font, setFont] = useState("script");
  const [size, setSize] = useState("medium");
  const [karat, setKarat] = useState("21K");
  const [goldType, setGoldType] = useState("yellow");
  const [style, setStyle] = useState("gold_only");
  const [loading, setLoading] = useState(false);
  const [transliteratedName, setTransliteratedName] = useState("");
  const isSubmittingRef = useRef(false);

  const handleTransliterated = useCallback((result: string) => {
    setTransliteratedName(result);
  }, []);

  const FALLBACK_GOLD_PRICE_PER_GRAM = 310;
  const goldPrice = useQuery(api.prices.getCurrent);
  const createDesign = useMutation(api.designs.create);

  const pricePerGram = goldPrice?.pricePerGram || FALLBACK_GOLD_PRICE_PER_GRAM;
  const isLivePrice = !!goldPrice?.pricePerGram;

  const priceBreakdown = calculatePrice({
    karat: karat as Karat,
    size: size as Size,
    style: style as Style,
    goldPricePerGram: pricePerGram,
    jewelryType,
  });
  const total = priceBreakdown.total;
  const totalUSD = Math.round(total / AED_USD_PEG);

  // For Arabic/Chinese, prefer AI-refined name, fall back to local transliteration or raw name
  const displayName = transliteratedName || name;
  const canGenerate = name.length > 0;

  const handleGenerate = async () => {
    if (!canGenerate || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setLoading(true);
    try {
      const designId = await createDesign({
        name: displayName,
        language: lang,
        font,
        size,
        karat,
        style,
        referenceType: refUrl ? "search" : undefined,
        referenceUrl: refUrl,
        jewelryType,
        designStyle,
      });
      setActiveDesign(designId, "crafting");
      router.push(`/en/design/crafting?designId=${designId}`);
    } catch (err) {
      console.error("Create design failed:", err);
      isSubmittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="min-h-screen bg-cream px-6 pt-4 pb-24 lg:pt-20 lg:pb-8"
    >
      <div className="max-w-lg mx-auto">
      <div className="h-4" />
      <StepIndicator currentStep={3} totalSteps={7} />

      {/* Sticky pendant preview — reflects font, size, karat */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="bg-white rounded-2xl p-8 mb-6 shadow-card border border-warm text-center sticky top-0 z-10 lg:top-16"
      >
        <p className="text-text-tertiary text-[10px] uppercase tracking-widest mb-3">
          Live Preview
        </p>
        <motion.p
          key={`${name}-${font}-${size}-${karat}-${goldType}-${lang}`}
          initial={{ opacity: 0.5, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          dir={lang === "ar" ? "rtl" : "ltr"}
          lang={lang}
          className={`${
            lang === "ar"
              ? font === "diwani" ? "font-arabic italic"
                : font === "kufi" ? "font-arabic font-bold"
                : "font-arabic"
              : font === "script"
                ? "font-display italic"
                : font === "modern"
                  ? "tracking-[0.2em] uppercase font-body font-light"
                  : "font-display"
          } ${
            size === "small"
              ? "text-3xl"
              : size === "large"
                ? "text-6xl"
                : "text-5xl"
          }`}
          style={{ color: getGoldColor(karat, goldType) }}
        >
          {displayName || (lang === "ar" ? "اسمك" : "Your Name")}
        </motion.p>
        {/* Metal color swatch */}
        <div className="flex items-center justify-center gap-2 mt-3">
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: getGoldColor(karat, goldType) }}
          />
          <p className="text-text-tertiary text-xs font-mono">
            {(jewelryType in JEWELRY_SIZE_MAP
              ? JEWELRY_SIZE_MAP[jewelryType as keyof typeof JEWELRY_SIZE_MAP]?.[size as Size]?.dimension
              : null) || (size === "small" ? "12mm" : size === "large" ? "25mm" : "18mm")}{" "}
            · {getGoldLabel(karat, goldType)}
          </p>
        </div>
      </motion.div>

      <div className="space-y-5">
        {[
          <NameInput key="name" value={name} onChange={setName} language={lang} onTransliterated={handleTransliterated} />,
          <FontStylePicker key="font" name={name} value={font} onChange={setFont} language={lang} />,
          <SizeSelector key="size" value={size} onChange={setSize} jewelryType={jewelryType} />,
          <MetalSelector key="metal" value={karat} onChange={setKarat} goldType={goldType} onGoldTypeChange={setGoldType} />,
          <DecorationSelector key="decoration" value={style} onChange={setStyle} />,
          <LivePriceDisplay key="price" priceAED={total} priceUSD={totalUSD} isLive={isLivePrice} />,
          <GenerateButton key="gen" disabled={!canGenerate} loading={loading} onClick={handleGenerate} />,
        ].map((component, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.08, duration: 0.4 }}
          >
            {component}
          </motion.div>
        ))}
      </div>
      </div>
    </motion.div>
  );
}
