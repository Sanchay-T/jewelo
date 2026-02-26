"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useAction } from "convex/react";
import { motion, AnimatePresence } from "motion/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

export default function CraftingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const designId = searchParams.get("designId") as Id<"designs"> | null;
  const design = useQuery(
    api.designs.getWithImages,
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

  // Derive progress from actual image count (8 total: 4 product + 4 on-body)
  const productCount = design?.productImageUrls?.length ?? 0;
  const onBodyCount = design?.onBodyImageUrls?.length ?? 0;
  const totalImages = productCount + onBodyCount;
  const isFailed = design?.status === "failed";
  const isCompleted = design?.status === "completed";

  const progress = isCompleted
    ? 100
    : design?.status === "analyzing"
      ? 5
      : Math.min(95, 10 + (totalImages / 8) * 85);

  const statusLabel = isFailed
    ? "Something went wrong"
    : isCompleted
      ? "Done!"
      : totalImages === 0
        ? design?.analysisStep || "Analyzing your piece..."
        : totalImages >= 8
          ? "Finishing up..."
          : `Crafting your jewelry... (${totalImages} of 8)`;

  // Split images into two rows, triple for seamless loop
  const half = Math.ceil(scrollImages.length / 2);
  const row1 = scrollImages.slice(0, half);
  const row2 = scrollImages.slice(half);
  const marqueeRow1 = row1.length > 0 ? [...row1, ...row1, ...row1] : [];
  const marqueeRow2 = row2.length > 0 ? [...row2, ...row2, ...row2] : [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="h-[100dvh] bg-cream flex flex-col overflow-hidden lg:pt-16"
    >
      {/* Main content — centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-lg mx-auto w-full">
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

        {/* Live thumbnails — fade in as each image arrives */}
        {productCount > 0 && (
          <div className="flex items-center justify-center gap-2 mb-4">
            <AnimatePresence>
              {(design!.productImageUrls || []).map((url: string, i: number) => (
                <motion.div
                  key={url}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20, delay: i * 0.05 }}
                  className="w-12 h-12 rounded-lg overflow-hidden border-2 border-brown/20 shadow-sm"
                >
                  <img
                    src={url}
                    alt={`Variation ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              ))}
            </AnimatePresence>
            {/* Empty slots */}
            {Array.from({ length: 4 - productCount }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="w-12 h-12 rounded-lg border-2 border-dashed border-warm bg-sand/30"
              />
            ))}
          </div>
        )}

        <div className="w-48 h-1.5 bg-warm rounded-full overflow-hidden mb-2">
          <motion.div
            className="h-full bg-brown rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>

        <p className="text-text-tertiary text-xs text-center">
          {totalImages > 0
            ? `${totalImages}/8 images generated`
            : "Usually takes about a minute"}
        </p>

        {isFailed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 bg-white rounded-xl p-4 border border-red-200 text-center"
          >
            <p className="text-red-600 text-sm mb-2">Generation failed</p>
            <p className="text-text-tertiary text-xs mb-3">
              {design?.error || "Please try again"}
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

      {/* Auto-scrolling marquee — two rows, opposite directions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="pb-20 lg:pb-4"
      >
        <p className="text-text-tertiary text-[10px] uppercase tracking-wider font-medium mb-3 px-6">
          While you wait
        </p>

        {marqueeRow1.length > 0 ? (
          <div className="space-y-2.5 overflow-hidden">
            {/* Row 1 — scrolls left */}
            <div className="overflow-hidden">
              <motion.div
                className="flex gap-2.5"
                animate={{ x: [0, -(row1.length * 82)] }}
                transition={{
                  x: {
                    duration: row1.length * 4,
                    repeat: Infinity,
                    ease: "linear",
                  },
                }}
              >
                {marqueeRow1.map((img, i) => (
                  <div
                    key={`r1-${i}`}
                    className="flex-shrink-0 w-[72px] h-[72px] rounded-lg overflow-hidden"
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

            {/* Row 2 — scrolls right (opposite) */}
            <div className="overflow-hidden">
              <motion.div
                className="flex gap-2.5"
                animate={{ x: [-(row2.length * 82), 0] }}
                transition={{
                  x: {
                    duration: row2.length * 4,
                    repeat: Infinity,
                    ease: "linear",
                  },
                }}
              >
                {marqueeRow2.map((img, i) => (
                  <div
                    key={`r2-${i}`}
                    className="flex-shrink-0 w-[72px] h-[72px] rounded-lg overflow-hidden"
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
          </div>
        ) : (
          <div className="space-y-2.5 px-6">
            <div className="flex gap-2.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={`s1-${i}`}
                  className="flex-shrink-0 w-[72px] h-[72px] bg-sand rounded-lg animate-pulse"
                />
              ))}
            </div>
            <div className="flex gap-2.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={`s2-${i}`}
                  className="flex-shrink-0 w-[72px] h-[72px] bg-sand rounded-lg animate-pulse"
                />
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
