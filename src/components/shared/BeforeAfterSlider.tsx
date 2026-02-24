"use client";
import { useRef, useState, useCallback } from "react";
import { motion } from "motion/react";

export function BeforeAfterSlider() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const updatePosition = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clientX - rect.left;
    const pct = Math.max(5, Math.min(95, (x / rect.width) * 100));
    setPosition(pct);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updatePosition(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    updatePosition(e.clientX);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl overflow-hidden border border-warm select-none touch-none cursor-grab active:cursor-grabbing h-full"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* BEFORE (Sketch) — full background layer */}
      <div className="absolute inset-0 bg-[#e8e4de]">
        <img
          src="/hero/sketch.png"
          alt="Customer's rough sketch"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
      </div>

      {/* AFTER (Render) — revealed from left to handle position */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 0 0 ${position}%)` }}
      >
        <div className="absolute inset-0 bg-[#f5ede3]">
          <img
            src="/hero/render.png"
            alt="AI-rendered gold pendant"
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
        </div>
      </div>

      {/* Slider line + handle */}
      <div
        className="absolute top-0 bottom-0 z-20 pointer-events-none"
        style={{ left: `${position}%` }}
      >
        <div className="absolute inset-y-0 -translate-x-1/2 w-[2px] bg-white shadow-md" />
        <motion.div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white shadow-lg border-2 border-brown flex items-center justify-center pointer-events-auto"
          animate={isDragging ? { scale: 1.15 } : { scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
        >
          <svg width="18" height="18" viewBox="0 0 16 16" className="text-brown">
            <path d="M5 3L2 8L5 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M11 3L14 8L11 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
      </div>

      {/* Labels */}
      <div className="absolute top-3 left-3 z-10">
        <span className="bg-white/80 backdrop-blur-sm text-text-secondary text-[10px] font-medium uppercase tracking-wider px-2.5 py-1 rounded-full">
          Sketch
        </span>
      </div>
      <div className="absolute top-3 right-3 z-10">
        <span className="bg-brown/80 backdrop-blur-sm text-cream text-[10px] font-medium uppercase tracking-wider px-2.5 py-1 rounded-full">
          AI Render
        </span>
      </div>
    </div>
  );
}
