"use client";
import { useState, useRef, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { motion } from "motion/react";
import { api } from "../../../../../convex/_generated/api";
import { useDesignFlow } from "@/lib/DesignFlowContext";
import { NameInput } from "@/components/design/NameInput";
import { FontStylePicker } from "@/components/design/FontStylePicker";
import { SizeSelector } from "@/components/design/SizeSelector";
import { MetalSelector, getGoldColor, getGoldLabel } from "@/components/design/MetalSelector";
import { LivePriceDisplay } from "@/components/design/LivePriceDisplay";
import { GenerateButton } from "@/components/design/GenerateButton";
import { StickyBottomBar } from "@/components/design/StickyBottomBar";
import { GemstoneSelector } from "@/components/design/GemstoneSelector";
import { ComplexitySlider } from "@/components/design/ComplexitySlider";
import { InlineLanguageSelector } from "@/components/design/InlineLanguageSelector";
import { AdditionalInfoSection } from "@/components/design/AdditionalInfoSection";
import { PendantLengthSelector } from "@/components/design/PendantLengthSelector";
import { calculatePrice } from "@/lib/pricing";
import {
  AED_USD_PEG,
  DEFAULT_PENDANT_THICKNESS_MM,
  JEWELRY_SIZE_MAP,
  styleFromGemstones,
  sizeFromLengthMm,
  GEMSTONES,
} from "@/lib/constants";
import type { Size, Karat, Style, Gemstone } from "@/lib/constants";
import { renderTextToCanvas } from "@/lib/canvasTextRenderer";

export default function ConfiguratorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setActiveDesign, language: contextLang, setLanguage } = useDesignFlow();

  const initialLang = searchParams.get("lang") || contextLang || "en";
  const refUrl = searchParams.get("ref") || undefined;
  const jewelryType = searchParams.get("type") || "name_pendant";
  const styleFamily = searchParams.get("styleFamily") || searchParams.get("style") || "minimalist";
  const gender = searchParams.get("gender") || "unisex";
  const parsedGemstones = (searchParams.get("gemstones") || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is Gemstone => (GEMSTONES as readonly string[]).includes(s));

  const isPendant = jewelryType === "pendant" || jewelryType === "name_pendant";

  const [language, setLanguageState] = useState(initialLang);
  const [name, setName] = useState(searchParams.get("name") || "");
  const [font, setFont] = useState("script");
  const [size, setSize] = useState<Size>("medium");
  const [lengthMm, setLengthMm] = useState(20);
  const [karat, setKarat] = useState("21K");
  const [goldType, setGoldType] = useState("yellow");
  const [complexity, setComplexity] = useState(Number(searchParams.get("complexity") || 5));
  const [gemstones, setGemstones] = useState<Gemstone[]>(parsedGemstones);
  const [loading, setLoading] = useState(false);
  const [transliteratedName, setTransliteratedName] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState<{
    occasion?: string;
    metalFinish?: "polished" | "matte" | "brushed" | "hammered" | "textured";
    notes?: string;
  }>({});
  const isSubmittingRef = useRef(false);

  const handleTransliterated = useCallback((result: string) => {
    setTransliteratedName(result);
  }, []);

  const handleLanguageChange = useCallback((lang: string) => {
    setLanguageState(lang);
    setLanguage(lang);
  }, [setLanguage]);

  const handleLengthChange = useCallback((nextLengthMm: number) => {
    setLengthMm(nextLengthMm);
    setSize(sizeFromLengthMm(nextLengthMm));
  }, [setSize]);

  const FALLBACK_GOLD_PRICE_PER_GRAM = 310;
  const goldPrice = useQuery(api.prices.getCurrent);
  const createDesign = useMutation(api.designs.create);
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);
  const saveTextReference = useMutation(api.uploads.saveTextReference);

  const style = useMemo(() => styleFromGemstones(gemstones, "gold_only") as Style, [gemstones]);

  const pricePerGram = goldPrice?.pricePerGram || FALLBACK_GOLD_PRICE_PER_GRAM;
  const isLivePrice = !!goldPrice?.pricePerGram;

  const priceBreakdown = calculatePrice({
    karat: karat as Karat,
    size,
    style,
    goldPricePerGram: pricePerGram,
    jewelryType,
    complexity,
    gemstones,
    metalFinish: additionalInfo.metalFinish,
    lengthMm: isPendant ? lengthMm : undefined,
  });
  const total = priceBreakdown.total;
  const totalUSD = Math.round(total / AED_USD_PEG);

  const displayName = transliteratedName || name;
  const canGenerate = name.length > 0;

  const handleGenerate = async () => {
    if (!canGenerate || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setLoading(true);

    try {
      const designId = await createDesign({
        name: displayName,
        language,
        font,
        size,
        karat,
        style,
        referenceType: refUrl ? "search" : undefined,
        referenceUrl: refUrl,
        jewelryType,
        designStyle: styleFamily,
        metalType: goldType,
        styleFamily,
        complexity,
        gender,
        gemstones,
        primaryGemstone: gemstones[0],
        lengthMm: isPendant ? lengthMm : undefined,
        thicknessMm: isPendant ? DEFAULT_PENDANT_THICKNESS_MM : undefined,
        additionalInfo,
      });

      try {
        const textBlob = await renderTextToCanvas(displayName, font, language);
        const uploadUrl = await generateUploadUrl();
        const uploadResp = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "image/png" },
          body: textBlob,
        });
        if (uploadResp.ok) {
          const { storageId } = await uploadResp.json();
          await saveTextReference({ designId, storageId });
        } else {
          console.error("Text reference upload failed:", uploadResp.status);
        }
      } catch (textRefErr) {
        console.error("Text reference render/upload failed:", textRefErr);
      }

      setActiveDesign(designId, "crafting");
      router.push(`/en/design/crafting?designId=${designId}`);
    } catch (err) {
      console.error("Create design failed:", err);
      isSubmittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="bg-cream px-6 pb-40 lg:pb-8">
      <div className="max-w-lg mx-auto">

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="bg-white rounded-2xl p-8 mb-6 shadow-card border border-warm text-center sticky top-0 z-10 lg:top-16"
        >
          <p className="text-text-tertiary text-[10px] uppercase tracking-widest mb-3">Live Preview</p>
          <motion.p
            key={`${name}-${font}-${size}-${karat}-${goldType}-${language}-${complexity}-${gemstones.join("-")}`}
            initial={{ opacity: 0.5, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            dir={language === "ar" ? "rtl" : "ltr"}
            lang={language}
            className={`${
              language === "ar"
                ? font === "diwani"
                  ? "font-arabic italic"
                  : font === "kufi"
                    ? "font-arabic font-bold"
                    : "font-arabic"
                : font === "script"
                  ? "font-display italic"
                  : font === "modern"
                    ? "tracking-[0.2em] uppercase font-body font-light"
                    : "font-display"
            } ${
              size === "small" ? "text-3xl" : size === "large" ? "text-6xl" : "text-5xl"
            }`}
            style={{ color: getGoldColor(karat, goldType) }}
          >
            {displayName || (language === "ar" ? "اسمك" : "Your Name")}
          </motion.p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="w-3 h-3 rounded-full" style={{ background: getGoldColor(karat, goldType) }} />
            <p className="text-text-tertiary text-xs font-mono">
              {isPendant
                ? `${lengthMm}mm`
                : (jewelryType in JEWELRY_SIZE_MAP
                  ? JEWELRY_SIZE_MAP[jewelryType as keyof typeof JEWELRY_SIZE_MAP]?.[size]?.dimension
                  : null) || (size === "small" ? "12mm" : size === "large" ? "25mm" : "18mm")} {" "}
              · {getGoldLabel(karat, goldType)}
            </p>
          </div>
        </motion.div>

        <div className="space-y-5">
          {[
            <InlineLanguageSelector key="language" value={language} onChange={handleLanguageChange} />,
            <NameInput key="name" value={name} onChange={setName} language={language} onTransliterated={handleTransliterated} />,
            <FontStylePicker key="font" name={name} value={font} onChange={setFont} language={language} metalColor={getGoldColor(karat, goldType)} />,
            <MetalSelector key="metal" value={karat} onChange={setKarat} goldType={goldType} onGoldTypeChange={setGoldType} />,
            isPendant
              ? <PendantLengthSelector key="length" value={lengthMm} onChange={handleLengthChange} />
              : <SizeSelector key="size" value={size} onChange={(v) => setSize(v as Size)} jewelryType={jewelryType} />,
            <ComplexitySlider key="complexity" value={complexity} onChange={setComplexity} />,
            <GemstoneSelector key="gemstones" value={gemstones} onChange={setGemstones} />,
            <AdditionalInfoSection key="additional" value={additionalInfo} onChange={setAdditionalInfo} />,
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

      <StickyBottomBar>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <LivePriceDisplay priceAED={total} priceUSD={totalUSD} isLive={isLivePrice} compact />
          </div>
          <button
            onClick={handleGenerate}
            disabled={!canGenerate || loading}
            className={`px-6 py-3 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
              !canGenerate || loading
                ? "bg-brown-light text-cream/60 cursor-not-allowed"
                : "bg-brown text-cream hover:bg-brown-dark"
            }`}
          >
            {loading ? "Generating..." : "Generate"}
          </button>
        </div>
      </StickyBottomBar>
    </div>
  );
}
