"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, X } from "lucide-react";
import { COMPLEMENTARY_GEMSTONES, GEMSTONES, type Gemstone } from "@/lib/constants";

const GEM_COLORS: Record<Gemstone, string> = {
  diamond: "#E8E4DF",
  ruby: "#E0115F",
  emerald: "#50C878",
  sapphire: "#0F52BA",
  amethyst: "#9966CC",
  topaz: "#FFC87C",
};

const WHEEL_RADIUS = 70;
const DOT_SIZE = 40;
const START_ANGLE_DEG = -90;

interface GemstoneSelectorProps {
  value: Gemstone[];
  onChange: (value: Gemstone[]) => void;
}

function toggleGem(gems: Gemstone[], gem: Gemstone): Gemstone[] {
  if (gems.includes(gem)) return gems.filter((g) => g !== gem);
  return [...gems, gem];
}

function gemPosition(index: number) {
  const angleDeg = START_ANGLE_DEG + index * 60;
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    left: `calc(50% + ${Math.cos(angleRad) * WHEEL_RADIUS - DOT_SIZE / 2}px)`,
    top: `calc(50% + ${Math.sin(angleRad) * WHEEL_RADIUS - DOT_SIZE / 2}px)`,
  };
}

export function GemstoneSelector({ value, onChange }: GemstoneSelectorProps) {
  const [expanded, setExpanded] = useState(false);
  const [hoveredGem, setHoveredGem] = useState<Gemstone | null>(null);

  const primary = value[0] ?? null;
  const complementary = primary ? (COMPLEMENTARY_GEMSTONES[primary] ?? []) : [];

  return (
    <div>
      {/* Accordion Header */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between rounded-lg border border-warm bg-white px-3 py-2.5 transition hover:bg-sand/40"
      >
        <div className="flex items-center gap-2">
          <span className="text-text-secondary text-xs font-medium uppercase tracking-wider">
            Gemstones
          </span>
          {value.length > 0 && (
            <div className="flex items-center gap-1">
              {value.map((gem) => (
                <span
                  key={gem}
                  className="h-3 w-3 rounded-full border border-warm/50"
                  style={{ backgroundColor: GEM_COLORS[gem] }}
                />
              ))}
            </div>
          )}
        </div>
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-4 w-4 text-text-tertiary" />
        </motion.span>
      </button>

      {/* Accordion Body */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="gemstone-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {/* Color Wheel */}
            <div className="relative mx-auto my-4 h-[200px] w-[200px]">
              {/* Center label */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] text-text-tertiary text-center px-2">
                  {hoveredGem
                    ? hoveredGem.charAt(0).toUpperCase() + hoveredGem.slice(1)
                    : "Tap to select"}
                </span>
              </div>

              {/* Gem dots */}
              {GEMSTONES.map((gem, i) => {
                const pos = gemPosition(i);
                const isSelected = value.includes(gem);
                const isComplementary =
                  !isSelected && complementary.includes(gem);

                return (
                  <button
                    key={gem}
                    type="button"
                    onClick={() => onChange(toggleGem(value, gem))}
                    onMouseEnter={() => setHoveredGem(gem)}
                    onMouseLeave={() => setHoveredGem(null)}
                    onTouchStart={() => setHoveredGem(gem)}
                    className={[
                      "absolute w-10 h-10 rounded-full cursor-pointer transition-all",
                      isSelected
                        ? "ring-2 ring-gold ring-offset-2 ring-offset-cream scale-110"
                        : "",
                      isComplementary ? "gem-pulse" : "",
                    ].join(" ")}
                    style={{
                      left: pos.left,
                      top: pos.top,
                      backgroundColor: GEM_COLORS[gem],
                      ...(isComplementary
                        ? ({ "--gem-color": GEM_COLORS[gem] } as React.CSSProperties)
                        : {}),
                    }}
                  />
                );
              })}
            </div>

            {/* Selected name label (fade in below wheel) */}
            <AnimatePresence mode="wait">
              {hoveredGem && (
                <motion.p
                  key={hoveredGem}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="text-center text-xs text-text-secondary capitalize"
                >
                  {hoveredGem}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Selected chips */}
            {value.length > 0 && (
              <div className="flex gap-2 flex-wrap justify-center mt-3">
                <AnimatePresence>
                  {value.map((gem) => (
                    <motion.span
                      key={gem}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-warm rounded-full text-xs"
                    >
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: GEM_COLORS[gem] }}
                      />
                      <span className="capitalize text-text-secondary">
                        {gem}
                      </span>
                      <button
                        type="button"
                        onClick={() => onChange(toggleGem(value, gem))}
                        className="text-text-tertiary hover:text-text-primary transition"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
