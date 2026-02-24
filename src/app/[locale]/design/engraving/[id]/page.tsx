"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { motion, AnimatePresence } from "motion/react";
import { api } from "../../../../../../convex/_generated/api";
import { StepIndicator } from "@/components/layout/StepIndicator";
import { Check, ArrowDown, X, ZoomIn, ZoomOut } from "lucide-react";
import type { Id } from "../../../../../../convex/_generated/dataModel";

export default function EngravingPage() {
  const router = useRouter();
  const params = useParams();
  const designId = params.id as Id<"designs">;
  const data = useQuery(
    api.designs.getBeforeAfter,
    designId ? { designId } : "skip"
  );
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerZoom, setViewerZoom] = useState(1);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-cream px-6 pt-4 pb-24"
    >
      <div className="h-4" />
      <StepIndicator currentStep={6} totalSteps={7} />
      <h2 className="font-display text-2xl mb-2">Your name, engraved</h2>
      <p className="text-text-secondary text-sm mb-5">
        Here&apos;s how it looks on your piece. Tap to zoom.
      </p>

      <div className="space-y-3 mb-5">
        {/* Reference */}
        <div>
          <p className="text-text-tertiary text-[10px] uppercase tracking-wider mb-2">
            Your reference
          </p>
          <button
            onClick={() => data?.referenceUrl && setViewerUrl(data.referenceUrl)}
            className="w-full aspect-[4/3] rounded-xl bg-sand border border-warm flex items-center justify-center overflow-hidden"
          >
            {data?.referenceUrl ? (
              <img
                src={data.referenceUrl}
                alt="Reference"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center">
                <span className="text-gold text-3xl">☽</span>
                <p className="text-text-tertiary text-xs mt-1">
                  Original piece
                </p>
              </div>
            )}
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-center"
        >
          <ArrowDown className="w-5 h-5 text-brown" />
        </motion.div>

        {/* Result */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <p className="text-text-tertiary text-[10px] uppercase tracking-wider mb-2">
            With your name
          </p>
          <button
            onClick={() => data?.resultUrl && setViewerUrl(data.resultUrl)}
            className="w-full aspect-[4/3] rounded-xl bg-white border-2 border-brown shadow-sm shadow-gold-glow flex items-center justify-center overflow-hidden"
          >
            {data?.resultUrl ? (
              <img
                src={data.resultUrl}
                alt="Engraved result"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center">
                <span className="text-gold text-3xl">☽</span>
                <p className="font-display italic text-gold text-sm mt-1">
                  {data?.design?.name}
                </p>
              </div>
            )}
          </button>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-xl p-4 border border-warm mb-5 space-y-2"
      >
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Name</span>
          <span className="text-text-primary font-medium">
            {data?.design?.name}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Placement</span>
          <span className="text-text-primary font-medium">
            {data?.design?.analysisData?.bestSpot || "AI selected"}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Engraving</span>
          <span className="text-text-primary font-medium">
            Raised lettering, {data?.design?.font}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Quality</span>
          <span className="text-green-600 font-medium flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            Verified
          </span>
        </div>
      </motion.div>

      <button
        onClick={() => router.push(`/en/design/order/${designId}`)}
        className="w-full bg-brown text-cream font-semibold py-4 rounded-xl mb-3 hover:bg-brown-dark transition"
      >
        Looks perfect — Review Price
      </button>
      <button className="w-full border border-brown/20 text-text-secondary py-3 rounded-xl text-sm">
        Try different placement
      </button>

      {/* Fullscreen image viewer */}
      <AnimatePresence>
        {viewerUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
            onClick={() => {
              setViewerUrl(null);
              setViewerZoom(1);
            }}
          >
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
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className="w-full h-full flex items-center justify-center p-4 overflow-auto"
            >
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
