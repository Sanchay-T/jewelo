"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { motion, AnimatePresence } from "motion/react";
import { api } from "../../../../../../convex/_generated/api";
import { StepIndicator } from "@/components/layout/StepIndicator";
import { Check, Gem, Maximize2, User, X, ZoomIn, ZoomOut } from "lucide-react";
import type { Id } from "../../../../../../convex/_generated/dataModel";

export default function ResultsPage() {
  const router = useRouter();
  const params = useParams();
  const designId = params.id as Id<"designs">;
  const design = useQuery(
    api.designs.getWithImages,
    designId ? { designId } : "skip"
  );
  const selectVariation = useMutation(api.designs.selectVariation);
  const regenerate = useMutation(api.designs.regenerate);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerZoom, setViewerZoom] = useState(1);

  // Per-card view mode (independent toggles)
  const [cardViews, setCardViews] = useState<Record<number, "product" | "onBody">>({});
  const [globalView, setGlobalView] = useState<"product" | "onBody">("product");

  const productUrls = design?.productImageUrls || [];
  const onBodyUrls = design?.onBodyImageUrls || [];
  const remaining = design?.regenerationsRemaining ?? 3;

  const getViewForCard = (index: number) => cardViews[index] ?? globalView;
  const getUrlForCard = (index: number) => {
    const view = getViewForCard(index);
    return view === "onBody" ? onBodyUrls[index] : productUrls[index];
  };

  const toggleCard = (index: number) => {
    setCardViews((prev) => ({
      ...prev,
      [index]: getViewForCard(index) === "product" ? "onBody" : "product",
    }));
  };

  const toggleGlobal = (view: "product" | "onBody") => {
    setGlobalView(view);
    setCardViews({}); // Reset per-card overrides
  };

  const handleSelect = async () => {
    if (!designId) return;
    await selectVariation({ designId, index: selectedIdx });
    router.push(`/en/design/engraving/${designId}`);
  };

  const handleRegenerate = async () => {
    if (!designId || remaining <= 0) return;
    await regenerate({ designId });
    router.push(`/en/design/crafting?designId=${designId}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="min-h-screen bg-cream px-6 pt-4 pb-24 lg:pt-20 lg:pb-8"
    >
      <div className="max-w-xl mx-auto">
      <div className="h-4" />
      <StepIndicator currentStep={5} totalSteps={7} />

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="font-display text-2xl mb-1"
      >
        Your designs
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-text-secondary text-sm mb-6"
      >
        Tap to select · pinch to zoom
      </motion.p>

      {/* Global product / on-body toggle */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <button
          onClick={() => toggleGlobal("product")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            globalView === "product"
              ? "bg-brown text-white"
              : "bg-sand text-text-secondary hover:bg-warm"
          }`}
        >
          <Gem size={14} />
          Product
        </button>
        <button
          onClick={() => toggleGlobal("onBody")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            globalView === "onBody"
              ? "bg-brown text-white"
              : "bg-sand text-text-secondary hover:bg-warm"
          }`}
        >
          <User size={14} />
          On Body
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6 lg:gap-4">
        {([0, 1, 2, 3] as const).map((i) => {
          const cardUrl = getUrlForCard(i);
          const hasProduct = !!productUrls[i];
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.85, filter: "blur(8px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              transition={{
                duration: 0.5,
                delay: 0.3 + i * 0.15,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              className="relative"
            >
              <button
                onClick={() => setSelectedIdx(i)}
                className={`aspect-square rounded-xl bg-white flex items-center justify-center w-full relative overflow-hidden ${
                  selectedIdx === i
                    ? "border-2 border-brown shadow-sm shadow-gold-glow"
                    : "border border-warm"
                }`}
              >
                {cardUrl ? (
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={cardUrl}
                      src={cardUrl}
                      alt={`Variation ${i + 1}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="w-full h-full object-cover"
                    />
                  </AnimatePresence>
                ) : hasProduct ? (
                  /* On-body not available yet — show shimmer */
                  <div className="w-full h-full bg-sand animate-pulse flex items-center justify-center">
                    <User className="w-6 h-6 text-gold/30" />
                  </div>
                ) : (
                  <div className="w-full h-full bg-sand animate-pulse flex items-center justify-center">
                    <p className="font-display text-xl italic text-gold/40">
                      {design?.name || "..."}
                    </p>
                  </div>
                )}
                {selectedIdx === i && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 15,
                    }}
                    className="absolute top-2 left-2 w-5 h-5 rounded-full bg-brown flex items-center justify-center"
                  >
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </motion.div>
                )}
              </button>

              {/* Per-card view toggle */}
              {hasProduct && (
                <button
                  onClick={(e) => { e.stopPropagation(); toggleCard(i); }}
                  className="absolute top-2 right-10 z-10 w-8 h-8 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow-sm hover:bg-white transition-colors"
                  title={getViewForCard(i) === "product" ? "Show on body" : "Show product"}
                >
                  {getViewForCard(i) === "product" ? <User size={14} /> : <Gem size={14} />}
                </button>
              )}

              {/* Expand button — opens fullscreen */}
              {cardUrl && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewerUrl(cardUrl);
                    setViewerZoom(1);
                  }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-white" />
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <button
          onClick={handleRegenerate}
          disabled={remaining <= 0}
          className="w-full border border-brown/20 text-text-secondary py-3 rounded-xl text-sm mb-3 disabled:opacity-50 hover:bg-sand/50 transition"
        >
          ↻ Regenerate ({remaining} left)
        </button>
        <button
          onClick={handleSelect}
          className="w-full bg-brown text-cream font-semibold py-4 rounded-xl hover:bg-brown-dark transition relative overflow-hidden group"
        >
          <span className="relative z-10">Select This Design</span>
          <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </button>
      </motion.div>
      </div>

      {/* Fullscreen image viewer */}
      <AnimatePresence>
        {viewerUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
            onClick={() => {
              setViewerUrl(null);
              setViewerZoom(1);
            }}
          >
            {/* Close */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setViewerUrl(null);
                setViewerZoom(1);
              }}
              className="absolute top-6 right-4 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {/* Zoom toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setViewerZoom((z) => (z === 1 ? 2.5 : 1));
              }}
              className="absolute top-6 left-4 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center"
            >
              {viewerZoom > 1 ? (
                <ZoomOut className="w-5 h-5 text-white" />
              ) : (
                <ZoomIn className="w-5 h-5 text-white" />
              )}
            </button>

            {/* Image */}
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className="w-full h-full flex items-center justify-center p-4 overflow-auto"
            >
              <motion.img
                src={viewerUrl}
                alt="Design detail"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: viewerZoom, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
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
