"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useAction } from "convex/react";
import { motion } from "motion/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

const STATUS_LABELS: Record<string, string> = {
  generating: "Preparing your design",
  analyzing: "Analyzing the piece",
  engraving: "Shaping the gold",
  completed: "Done!",
  failed: "Something went wrong",
};

export default function CraftingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const designId = searchParams.get("designId") as Id<"designs"> | null;
  const design = useQuery(
    api.designs.get,
    designId ? { designId } : "skip"
  );
  const [elapsed, setElapsed] = useState(0);
  const recentDesigns = useQuery(api.gallery.getRecentCompleted);
  const searchImages = useAction(api.search.execute);
  const [pexelsImages, setPexelsImages] = useState<{ url: string; alt: string }[]>([]);

  // If no completed designs, fetch from Pexels
  useEffect(() => {
    if (recentDesigns && recentDesigns.length === 0 && pexelsImages.length === 0) {
      searchImages({ query: "gold jewelry pendant", perPage: 6 })
        .then((results: any) => {
          if (results?.photos) {
            setPexelsImages(
              results.photos.map((p: any) => ({
                url: p.src?.medium || p.src?.small,
                alt: p.alt || "Jewelry",
              }))
            );
          }
        })
        .catch(() => {});
    }
  }, [recentDesigns]);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-navigate on completion — use replace so crafting page is removed from history
  useEffect(() => {
    if (design?.status === "completed" && design._id) {
      router.replace(`/en/design/results/${design._id}`);
    }
  }, [design?.status, design?._id, router]);

  const progress =
    design?.status === "analyzing"
      ? 33
      : design?.status === "engraving"
        ? 65
        : design?.status === "completed"
          ? 100
          : 10;

  const statusLabel =
    STATUS_LABELS[design?.status || "generating"] || "Preparing...";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-cream flex flex-col"
    >
      {/* Main content — centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-16">
        {/* Large circular spinner */}
        <div className="relative w-28 h-28 mb-8">
          {/* Track */}
          <svg className="w-full h-full" viewBox="0 0 112 112">
            <circle
              cx="56"
              cy="56"
              r="48"
              fill="none"
              stroke="#EDE6D8"
              strokeWidth="6"
            />
          </svg>
          {/* Animated arc */}
          <motion.svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 112 112"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          >
            <circle
              cx="56"
              cy="56"
              r="48"
              fill="none"
              stroke="#8B7355"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="100 202"
            />
          </motion.svg>
        </div>

        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="font-display text-2xl text-text-primary text-center mb-2"
        >
          Crafting your piece...
        </motion.h2>

        {/* Status text */}
        <motion.p
          key={statusLabel}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-text-secondary text-base text-center mb-6"
        >
          {statusLabel}
        </motion.p>

        {/* Progress bar */}
        <div className="w-56 h-1.5 bg-warm rounded-full overflow-hidden mb-3">
          <motion.div
            className="h-full bg-brown rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>

        <p className="text-text-tertiary text-sm text-center">
          Usually 8-15 seconds
        </p>

        {/* Error state */}
        {design?.status === "failed" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 bg-white rounded-xl p-4 border border-red-200 text-center"
          >
            <p className="text-red-600 text-sm mb-2">Generation failed</p>
            <p className="text-text-tertiary text-xs mb-3">
              {design.error || "Please try again"}
            </p>
            <button
              onClick={() => router.back()}
              className="bg-brown text-cream px-6 py-2 rounded-lg text-sm"
            >
              Try Again
            </button>
          </motion.div>
        )}
      </div>

      {/* Browse while waiting — bottom */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="px-6 pb-8"
      >
        <p className="text-text-tertiary text-[10px] uppercase tracking-wider font-medium mb-2">
          While you wait
        </p>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {recentDesigns && recentDesigns.length > 0
            ? recentDesigns.map((d) => (
                <div
                  key={d._id}
                  className="flex-shrink-0 w-[140px] h-[120px] rounded-xl border border-warm overflow-hidden bg-sand"
                >
                  <img
                    src={d.imageUrl}
                    alt={d.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))
            : pexelsImages.length > 0
              ? pexelsImages.map((img, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 w-[140px] h-[120px] rounded-xl border border-warm overflow-hidden bg-sand"
                  >
                    <img
                      src={img.url}
                      alt={img.alt}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))
              : Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 w-[140px] h-[120px] bg-sand rounded-xl border border-warm animate-pulse"
                  />
                ))}
        </div>
        <p className="text-text-tertiary text-xs mt-2">
          Browse recent community designs →
        </p>
      </motion.div>
    </motion.div>
  );
}
