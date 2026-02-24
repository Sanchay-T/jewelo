"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { motion } from "motion/react";
import { api } from "../../../../../convex/_generated/api";
import { useDesignFlow } from "@/lib/DesignFlowContext";
import { StepIndicator } from "@/components/layout/StepIndicator";
import { NameInput } from "@/components/design/NameInput";
import { FontStylePicker } from "@/components/design/FontStylePicker";
import { SizeSelector } from "@/components/design/SizeSelector";
import { MetalSelector } from "@/components/design/MetalSelector";
import { LivePriceDisplay } from "@/components/design/LivePriceDisplay";
import { GenerateButton } from "@/components/design/GenerateButton";

const AED_USD_PEG = 3.6725;
const KARAT_FACTOR: Record<string, number> = { "18K": 0.75, "21K": 0.875, "22K": 0.916 };
const WEIGHT: Record<string, number> = { small: 2.5, medium: 4.0, large: 6.5 };
const LABOR: Record<string, number> = { small: 150, medium: 250, large: 400 };

export default function ConfiguratorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = searchParams.get("lang") || "en";
  const refUrl = searchParams.get("ref") || undefined;
  const jewelryType = searchParams.get("type") || "jewelry";
  const designStyle = searchParams.get("style") || "elegant";

  const [name, setName] = useState("");
  const [font, setFont] = useState("script");
  const [size, setSize] = useState("medium");
  const [karat, setKarat] = useState("21K");
  const [loading, setLoading] = useState(false);

  const goldPrice = useQuery(api.prices.getCurrent);
  const createDesign = useMutation(api.designs.create);
  const { setActiveDesign } = useDesignFlow();

  const pricePerGram = goldPrice?.pricePerGram || 0;
  const weight = WEIGHT[size] || 4.0;
  const materialCost = weight * (KARAT_FACTOR[karat] || 0.875) * pricePerGram;
  const laborCost = LABOR[size] || 250;
  const subtotal = materialCost + laborCost;
  const total = Math.round(subtotal + subtotal * 0.8);
  const totalUSD = Math.round(total / AED_USD_PEG);

  const canGenerate = name.length > 0;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setLoading(true);
    try {
      const designId = await createDesign({
        name,
        language: lang,
        font,
        size,
        karat,
        style: "gold_only",
        referenceType: refUrl ? "search" : undefined,
        referenceUrl: refUrl,
        jewelryType,
        designStyle,
      });
      setActiveDesign(designId, "crafting");
      router.push(`/en/design/crafting?designId=${designId}`);
    } catch (err) {
      console.error("Create design failed:", err);
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="min-h-screen bg-cream px-6 pt-4 pb-24"
    >
      <div className="h-4" />
      <StepIndicator currentStep={3} totalSteps={7} />

      {/* Sticky pendant preview — reflects font, size, karat */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="bg-white rounded-2xl p-8 mb-6 shadow-card border border-warm text-center sticky top-0 z-10"
      >
        <p className="text-text-tertiary text-[10px] uppercase tracking-widest mb-3">
          Live Preview
        </p>
        <motion.p
          key={`${name}-${font}-${size}-${karat}`}
          initial={{ opacity: 0.5, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className={`${
            font === "script"
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
          style={{
            color:
              karat === "18K"
                ? "#D4A853"
                : karat === "22K"
                  ? "#B8923F"
                  : "#C9A03E",
          }}
        >
          {name || "Your Name"}
        </motion.p>
        {/* Metal color swatch */}
        <div className="flex items-center justify-center gap-2 mt-3">
          <div
            className="w-3 h-3 rounded-full"
            style={{
              background:
                karat === "18K"
                  ? "#D4A853"
                  : karat === "22K"
                    ? "#B8923F"
                    : "#C9A03E",
            }}
          />
          <p className="text-text-tertiary text-xs font-mono">
            {size === "small" ? "12mm" : size === "large" ? "25mm" : "18mm"} ·{" "}
            {karat} Yellow Gold
          </p>
        </div>
      </motion.div>

      <div className="space-y-5">
        {[
          <NameInput key="name" value={name} onChange={setName} language={lang} />,
          <FontStylePicker key="font" name={name} value={font} onChange={setFont} />,
          <SizeSelector key="size" value={size} onChange={setSize} />,
          <MetalSelector key="metal" value={karat} onChange={setKarat} />,
          <LivePriceDisplay key="price" priceAED={total} priceUSD={totalUSD} />,
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
    </motion.div>
  );
}
