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
  const searchImages = useAction(api.search.execute);
  const [scrollImages, setScrollImages] = useState<
    { url: string; alt: string }[]
  >([]);

  // Fetch inspiration images for the marquee
  useEffect(() => {
    searchImages({ query: "luxury jewelry collection", perPage: 20 })
      .then((results: any) => {
        if (results?.length) {
          setScrollImages(
            results.map((r: any) => ({ url: r.thumbnail, alt: r.title }))
          );
        }
      })
      .catch(() => {});
  }, []);

  // Auto-navigate on completion
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

  // Double the images for seamless infinite scroll
  const marqueeImages = scrollImages.length > 0 ? [...scrollImages, ...scrollImages] : [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="h-[100dvh] bg-cream flex flex-col overflow-hidden"
    >
      {/* Main content — centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Large circular spinner */}
        <div className="relative w-24 h-24 mb-6">
          <svg className="w-full h-full" viewBox="0 0 112 112">
            <circle
              cx="56" cy="56" r="48"
              fill="none" stroke="#EDE6D8" strokeWidth="6"
            />
          </svg>
          <motion.svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 112 112"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          >
            <circle
              cx="56" cy="56" r="48"
              fill="none" stroke="#8B7355" strokeWidth="6"
              strokeLinecap="round" strokeDasharray="100 202"
            />
          </motion.svg>
        </div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="font-display text-2xl text-text-primary text-center mb-2"
        >
          Crafting your piece...
        </motion.h2>

        <motion.p
          key={statusLabel}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-text-secondary text-sm text-center mb-5"
        >
          {statusLabel}
        </motion.p>

        <div className="w-48 h-1.5 bg-warm rounded-full overflow-hidden mb-2">
          <motion.div
            className="h-full bg-brown rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>

        <p className="text-text-tertiary text-xs text-center">
          Usually takes about a minute
        </p>

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

      {/* Auto-scrolling marquee at the bottom */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="pb-8"
      >
        <p className="text-text-tertiary text-[10px] uppercase tracking-wider font-medium mb-3 px-6">
          While you wait
        </p>

        {marqueeImages.length > 0 ? (
          <div className="overflow-hidden">
            <motion.div
              className="flex gap-3"
              animate={{ x: [0, -(scrollImages.length * 116)] }}
              transition={{
                x: {
                  duration: scrollImages.length * 3,
                  repeat: Infinity,
                  ease: "linear",
                },
              }}
            >
              {marqueeImages.map((img, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-[100px] h-[100px] rounded-xl overflow-hidden"
                >
                  <img
                    src={img.url}
                    alt={img.alt}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </motion.div>
          </div>
        ) : (
          <div className="flex gap-3 px-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-[100px] h-[100px] bg-sand rounded-xl animate-pulse"
              />
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
