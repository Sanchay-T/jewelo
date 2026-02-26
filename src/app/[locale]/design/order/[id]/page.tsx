"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { motion, AnimatePresence } from "motion/react";
import { api } from "../../../../../../convex/_generated/api";
import { StepIndicator } from "@/components/layout/StepIndicator";
import { X, ZoomIn, ZoomOut } from "lucide-react";
import { calculatePrice } from "@/lib/pricing";
import { AED_USD_PEG, JEWELRY_SIZE_MAP } from "@/lib/constants";
import type { Size, Karat, Style } from "@/lib/constants";
import type { Id } from "../../../../../../convex/_generated/dataModel";

// Fallback gold price per gram (AED) when API is down — ~AED 310/g as of Feb 2026
const FALLBACK_GOLD_PRICE_PER_GRAM = 310;

export default function ReviewPage() {
  const router = useRouter();
  const params = useParams();
  const designId = params.id as Id<"designs">;
  const design = useQuery(
    api.designs.getWithImages,
    designId ? { designId } : "skip"
  );
  const goldPrice = useQuery(api.prices.getCurrent);
  const createOrder = useMutation(api.orders.create);
  const saveToGallery = useMutation(api.designs.saveToGallery);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerZoom, setViewerZoom] = useState(1);

  const pricePerGram = goldPrice?.pricePerGram || FALLBACK_GOLD_PRICE_PER_GRAM;
  const isLivePrice = !!goldPrice?.pricePerGram;

  const priceBreakdown = calculatePrice({
    karat: (design?.karat || "21K") as Karat,
    size: (design?.size || "medium") as Size,
    style: (design?.style || "gold_only") as Style,
    goldPricePerGram: pricePerGram,
    jewelryType: design?.jewelryType,
  });

  // Get the selected image URL
  const selectedIdx = design?.selectedVariationIndex ?? 0;
  const selectedImageUrl = design?.productImageUrls?.[selectedIdx];

  // Type-aware size display
  const jewelryType = design?.jewelryType || "pendant";
  const sizeMap = jewelryType in JEWELRY_SIZE_MAP
    ? JEWELRY_SIZE_MAP[jewelryType as keyof typeof JEWELRY_SIZE_MAP]
    : null;
  const sizeDisplay = sizeMap?.[design?.size as Size]?.dimension
    || (design?.size === "small" ? "12mm" : design?.size === "large" ? "25mm" : "18mm");

  const handleOrder = async () => {
    if (!designId || !customerName || !customerPhone) return;
    setLoading(true);
    try {
      const orderId = await createOrder({
        designId,
        customerName,
        customerPhone,
      });
      router.push(`/en/design/confirmed/${orderId}`);
    } catch (err) {
      console.error("Order failed:", err);
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
      <div className="max-w-lg mx-auto lg:max-w-2xl">
      <div className="h-4" />
      <StepIndicator currentStep={7} totalSteps={7} />
      <h2 className="font-display text-2xl mb-4">Review</h2>

      {/* Desktop: side-by-side image and details / Mobile: stacked */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">
      {/* Show actual generated image — tap to fullscreen */}
      <motion.button
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        onClick={() => selectedImageUrl && setViewerUrl(selectedImageUrl)}
        className="w-full aspect-square rounded-2xl bg-white border border-warm mb-6 flex items-center justify-center shadow-sm overflow-hidden relative group"
      >
        {selectedImageUrl ? (
          <>
            <img
              src={selectedImageUrl}
              alt={`${design?.name} design`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition flex items-center justify-center">
              <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-80 transition" />
            </div>
          </>
        ) : (
          <p className="font-display text-5xl italic text-gold/50">
            {design?.name}
          </p>
        )}
      </motion.button>

      <div>
      <p className="font-display text-lg text-brown mb-1">
        &ldquo;{design?.name}&rdquo;{" "}
        {jewelryType === "name_pendant" ? "Name Pendant" : jewelryType.charAt(0).toUpperCase() + jewelryType.slice(1)}
      </p>
      <p className="text-text-secondary text-sm mb-6">
        {design?.font} · {sizeDisplay} · {design?.karat} Gold
        {design?.style && design.style !== "gold_only" && (
          <> · {design.style === "gold_with_stones" ? "Gemstones" : "Diamonds"}</>
        )}
      </p>

      <div className="bg-white rounded-xl p-5 border border-warm mb-6 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Gold ({priceBreakdown.weight}g)</span>
          <span className="font-mono">AED {priceBreakdown.materialCost.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Craftsmanship</span>
          <span className="font-mono">AED {priceBreakdown.laborCost}</span>
        </div>
        {priceBreakdown.stoneCost > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">
              {design?.style === "gold_with_diamonds" ? "Diamonds" : "Gemstones"}
            </span>
            <span className="font-mono">AED {priceBreakdown.stoneCost.toLocaleString()}</span>
          </div>
        )}
        <div className="border-t border-warm my-2" />
        <div className="flex justify-between">
          <span className="font-medium">Total</span>
          <span className="font-mono text-xl font-bold text-brown">
            AED {priceBreakdown.total.toLocaleString()}
          </span>
        </div>
        <p className="text-text-tertiary text-xs font-mono">
          ≈ ${Math.round(priceBreakdown.total / AED_USD_PEG).toLocaleString()} USD
        </p>
        <div className="flex items-center gap-1 pt-1">
          <div className={`w-1.5 h-1.5 rounded-full ${isLivePrice ? "bg-green-500" : "bg-yellow-500"}`} />
          <span className="text-text-tertiary text-[10px]">
            {isLivePrice
              ? `Gold price live as of ${new Date(goldPrice!.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : "Estimated price (live rates unavailable)"}
          </span>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <input
          type="text"
          placeholder="Your name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="w-full bg-white border border-warm rounded-lg px-4 py-3 text-text-primary outline-none focus:border-brown"
        />
        <input
          type="tel"
          placeholder="Phone number"
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          className="w-full bg-white border border-warm rounded-lg px-4 py-3 text-text-primary outline-none focus:border-brown"
        />
      </div>

      <button
        onClick={handleOrder}
        disabled={!customerName || !customerPhone || loading}
        className={`w-full font-semibold py-4 rounded-xl mb-3 transition ${
          customerName && customerPhone
            ? "bg-brown text-cream hover:bg-brown-dark"
            : "bg-brown-light text-cream/60"
        }`}
      >
        {loading ? "Placing Order..." : "Place Order"}
      </button>
      <button
        onClick={async () => {
          if (!designId || saved) return;
          await saveToGallery({ designId });
          setSaved(true);
        }}
        disabled={saved}
        className={`w-full border py-3 rounded-xl text-sm transition ${
          saved
            ? "border-green-300 text-green-600 bg-green-50"
            : "border-brown/20 text-text-secondary hover:bg-sand/50"
        }`}
      >
        {saved ? "Saved to Gallery" : "Save to Gallery"}
      </button>
      </div>
      </div>
      </div>

      {/* Fullscreen image viewer */}
      <AnimatePresence>
        {viewerUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
            onClick={() => { setViewerUrl(null); setViewerZoom(1); }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setViewerUrl(null); setViewerZoom(1); }}
              className="absolute top-6 right-4 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setViewerZoom((z) => (z === 1 ? 2.5 : 1)); }}
              className="absolute top-6 left-4 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center"
            >
              {viewerZoom > 1 ? <ZoomOut className="w-5 h-5 text-white" /> : <ZoomIn className="w-5 h-5 text-white" />}
            </button>
            <motion.div onClick={(e) => e.stopPropagation()} className="w-full h-full flex items-center justify-center p-4 overflow-auto">
              <motion.img
                src={viewerUrl}
                alt="Fullscreen view"
                animate={{ scale: viewerZoom }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="max-w-full max-h-full object-contain rounded-lg"
                draggable={false}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
