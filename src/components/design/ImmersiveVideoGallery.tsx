"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft } from "lucide-react";

interface ImmersiveVideoGalleryProps {
  videoUrls: (string | null)[];
  videoStatuses: string[];
  posterUrls: string[];
  onSelect: (variationIndex: number) => void;
  onBack: () => void;
}

export function ImmersiveVideoGallery({
  videoUrls,
  videoStatuses,
  posterUrls,
  onSelect,
  onBack,
}: ImmersiveVideoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([null, null, null, null]);
  const containerRef = useRef<HTMLDivElement>(null);

  const status = videoStatuses[activeIndex] || "pending";
  const hasVideo = status === "completed" && !!videoUrls[activeIndex];

  // Progress bar via requestAnimationFrame
  useEffect(() => {
    let animId: number;
    const update = () => {
      const video = videoRefs.current[activeIndex];
      if (video && video.duration) {
        setProgress(video.currentTime / video.duration);
      }
      animId = requestAnimationFrame(update);
    };
    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, [activeIndex]);

  // Scrub helpers
  const updateScrub = useCallback(
    (clientX: number) => {
      const video = videoRefs.current[activeIndex];
      const rect = containerRef.current?.getBoundingClientRect();
      if (!video || !rect || !video.duration) return;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      video.currentTime = ratio * video.duration;
    },
    [activeIndex]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!hasVideo) return;
      setIsScrubbing(true);
      videoRefs.current[activeIndex]?.pause();
      updateScrub(e.clientX);
    },
    [activeIndex, hasVideo, updateScrub]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isScrubbing) return;
      updateScrub(e.clientX);
    },
    [isScrubbing, updateScrub]
  );

  const handlePointerUp = useCallback(() => {
    if (!isScrubbing) return;
    setIsScrubbing(false);
    videoRefs.current[activeIndex]?.play();
  }, [isScrubbing, activeIndex]);

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back</span>
        </button>
        <h1 className="font-display text-lg text-text-primary">See in Motion</h1>
        <span className="text-sm text-text-secondary tabular-nums">
          {activeIndex + 1}/4
        </span>
      </div>

      {/* Video card area */}
      <div className="flex-1 px-4 flex flex-col">
        <div
          ref={containerRef}
          className="relative w-full aspect-[9/16] rounded-xl overflow-hidden border border-warm bg-[#1A1A1A] touch-none select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              onDragEnd={(_, info) => {
                if (info.offset.x < -60 && activeIndex < 3) {
                  setActiveIndex((prev) => prev + 1);
                }
                if (info.offset.x > 60 && activeIndex > 0) {
                  setActiveIndex((prev) => prev - 1);
                }
              }}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
              className="absolute inset-0"
            >
              {/* Completed — show video */}
              {status === "completed" && videoUrls[activeIndex] && (
                <video
                  ref={(el) => {
                    videoRefs.current[activeIndex] = el;
                  }}
                  src={videoUrls[activeIndex]!}
                  poster={posterUrls[activeIndex]}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover rounded-lg"
                />
              )}

              {/* Generating — poster + shimmer */}
              {status === "generating" && (
                <div className="relative w-full h-full">
                  {posterUrls[activeIndex] && (
                    <img
                      src={posterUrls[activeIndex]}
                      alt={`Variation ${activeIndex + 1}`}
                      className="w-full h-full object-cover rounded-lg opacity-60"
                    />
                  )}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="w-full h-full absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                    <div className="relative z-10 flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                      <span className="text-white/80 text-sm font-medium">
                        Rendering...
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Pending — poster + waiting */}
              {(status === "pending" || status === "failed") && (
                <div className="relative w-full h-full">
                  {posterUrls[activeIndex] && (
                    <img
                      src={posterUrls[activeIndex]}
                      alt={`Variation ${activeIndex + 1}`}
                      className="w-full h-full object-cover rounded-lg opacity-40"
                    />
                  )}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-white/60 text-sm font-medium">
                      {status === "failed" ? "Generation failed" : "Waiting..."}
                    </span>
                  </div>
                </div>
              )}

              {/* No poster and no video */}
              {!videoUrls[activeIndex] &&
                !posterUrls[activeIndex] &&
                status !== "generating" && (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-white/40 text-sm">No preview available</span>
                  </div>
                )}
            </motion.div>
          </AnimatePresence>

          {/* Progress bar */}
          {hasVideo && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
              <div
                className="h-full bg-gold transition-none"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          )}

          {/* Scrub indicator */}
          {isScrubbing && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full">
              Scrubbing
            </div>
          )}
        </div>

        {/* Dots */}
        <div className="flex items-center justify-center gap-2 py-4">
          {[0, 1, 2, 3].map((i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i === activeIndex ? "bg-gold" : "bg-warm"
              }`}
              aria-label={`Variation ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Bottom action */}
      <div className="px-4 pb-6 pt-2">
        <button
          onClick={() => onSelect(activeIndex)}
          className="w-full bg-brown text-white font-semibold py-3 rounded-xl hover:bg-brown-dark transition-colors relative overflow-hidden group"
        >
          <span className="relative z-10">Select This Design</span>
          <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </button>
      </div>
    </div>
  );
}
