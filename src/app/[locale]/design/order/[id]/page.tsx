"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { motion } from "motion/react";
import { api } from "../../../../../../convex/_generated/api";
import { StepIndicator } from "@/components/layout/StepIndicator";
import type { Id } from "../../../../../../convex/_generated/dataModel";

const AED_USD_PEG = 3.6725;
const KARAT_FACTOR: Record<string, number> = {
  "18K": 0.75,
  "21K": 0.875,
  "22K": 0.916,
};
const WEIGHT: Record<string, number> = { small: 2.5, medium: 4.0, large: 6.5 };
const LABOR: Record<string, number> = { small: 150, medium: 250, large: 400 };

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

  const pricePerGram = goldPrice?.pricePerGram || 0;
  const weight = WEIGHT[design?.size || "medium"] || 4.0;
  const materialCost = Math.round(
    weight * (KARAT_FACTOR[design?.karat || "21K"] || 0.875) * pricePerGram
  );
  const laborCost = LABOR[design?.size || "medium"] || 250;
  const subtotal = materialCost + laborCost;
  const total = Math.round(subtotal + subtotal * 0.8);

  // Get the selected image URL
  const selectedIdx = design?.selectedImageIndex ?? 0;
  const selectedImageUrl = design?.imageUrls?.[selectedIdx];

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
      className="min-h-screen bg-cream px-6 pt-4 pb-24"
    >
      <div className="h-4" />
      <StepIndicator currentStep={7} totalSteps={7} />
      <h2 className="font-display text-2xl mb-4">Review</h2>

      {/* Show actual generated image */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="aspect-square rounded-2xl bg-white border border-warm mb-6 flex items-center justify-center shadow-sm overflow-hidden"
      >
        {selectedImageUrl ? (
          <img
            src={selectedImageUrl}
            alt={`${design?.name} design`}
            className="w-full h-full object-cover"
          />
        ) : (
          <p className="font-display text-5xl italic text-gold/50">
            {design?.name}
          </p>
        )}
      </motion.div>

      <p className="font-display text-lg text-brown mb-1">
        &ldquo;{design?.name}&rdquo; Name Pendant
      </p>
      <p className="text-text-secondary text-sm mb-6">
        {design?.font} ·{" "}
        {design?.size === "small"
          ? "12mm"
          : design?.size === "large"
            ? "25mm"
            : "18mm"}{" "}
        · {design?.karat} Gold
      </p>

      <div className="bg-white rounded-xl p-5 border border-warm mb-6 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Gold ({weight}g)</span>
          <span className="font-mono">AED {materialCost.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Craftsmanship</span>
          <span className="font-mono">AED {laborCost}</span>
        </div>
        <div className="border-t border-warm my-2" />
        <div className="flex justify-between">
          <span className="font-medium">Total</span>
          <span className="font-mono text-xl font-bold text-brown">
            AED {total.toLocaleString()}
          </span>
        </div>
        <p className="text-text-tertiary text-xs font-mono">
          ≈ ${Math.round(total / AED_USD_PEG).toLocaleString()} USD
        </p>
        {goldPrice && (
          <div className="flex items-center gap-1 pt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 live-pulse" />
            <span className="text-text-tertiary text-[10px]">
              Gold price live as of {new Date(goldPrice.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        )}
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
        {saved ? "✓ Saved to Gallery" : "Save to Gallery"}
      </button>
    </motion.div>
  );
}
