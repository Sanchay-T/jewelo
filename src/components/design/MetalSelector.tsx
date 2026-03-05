"use client";
import { motion } from "motion/react";

interface MetalSelectorProps {
  value: string;
  onChange: (karat: string) => void;
  goldType: string;
  onGoldTypeChange: (type: string) => void;
}

const karats = [
  { id: "18K", label: "18K", purity: "75%" },
  { id: "21K", label: "21K", purity: "87.5%" },
  { id: "22K", label: "22K", purity: "91.6%" },
];

const goldTypes = [
  {
    id: "yellow",
    label: "Yellow Gold",
    colors: { "18K": "#D4A853", "21K": "#C9A03E", "22K": "#B8923F" },
    description: "Classic warm gold",
  },
  {
    id: "rose",
    label: "Rose Gold",
    colors: { "18K": "#E8A090", "21K": "#D4897A", "22K": "#C07B6E" },
    description: "Warm pink copper blend",
  },
  {
    id: "white",
    label: "White Gold",
    colors: { "18K": "#E8E4DF", "21K": "#DDD8D2", "22K": "#D5D0CA" },
    description: "Rhodium-plated silver tone",
  },
];

export function getGoldColor(karat: string, goldType: string): string {
  const type = goldTypes.find((t) => t.id === goldType) || goldTypes[0];
  return type.colors[karat as keyof typeof type.colors] || type.colors["21K"];
}

export function getGoldLabel(karat: string, goldType: string): string {
  const type = goldTypes.find((t) => t.id === goldType) || goldTypes[0];
  return `${karat} ${type.label}`;
}

export function MetalSelector({ value, onChange, goldType, onGoldTypeChange }: MetalSelectorProps) {
  const activeType = goldTypes.find((t) => t.id === goldType) || goldTypes[0];
  const activeKarat = karats.find((k) => k.id === value) || karats[1];
  const activeColor = getGoldColor(value, goldType);

  return (
    <div className="space-y-3">
      <label className="text-text-secondary text-xs font-medium uppercase tracking-wider block">
        Metal
      </label>

      {/* Gold type pill tabs */}
      <div className="flex bg-sand rounded-xl p-1">
        {goldTypes.map((type) => {
          const isActive = goldType === type.id;
          return (
            <motion.button
              key={type.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => onGoldTypeChange(type.id)}
              className={`relative flex-1 rounded-[10px] py-2 px-3 text-xs font-medium transition-colors ${
                isActive ? "text-cream" : "text-text-secondary"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="goldType"
                  className="absolute inset-0 bg-brown rounded-[10px]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{type.label}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Live swatch */}
      <motion.div
        className="rounded-xl h-20 w-full overflow-hidden relative"
        animate={{ backgroundColor: activeColor }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="shimmer-swatch absolute inset-0" />
      </motion.div>

      {/* Segmented karat toggle */}
      <div className="flex bg-sand rounded-lg p-1">
        {karats.map((karat) => {
          const isActive = value === karat.id;
          return (
            <motion.button
              key={karat.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => onChange(karat.id)}
              className={`relative flex-1 rounded-md py-2 px-2 text-center transition-colors ${
                isActive ? "text-cream" : "text-text-secondary"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="karatSelect"
                  className="absolute inset-0 bg-brown rounded-md"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center justify-center gap-1">
                <span className="text-xs font-semibold">{karat.label}</span>
                <span className={`text-[10px] ${isActive ? "text-cream/70" : "text-text-tertiary"}`}>
                  {karat.purity}
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Summary line */}
      <div className="flex items-center gap-2">
        <motion.div
          className="w-3 h-3 rounded-full shrink-0"
          animate={{ backgroundColor: activeColor }}
          transition={{ duration: 0.3 }}
        />
        <p className="text-text-tertiary text-[11px]">
          {activeKarat.label} {activeType.label} · {activeKarat.purity} pure
        </p>
      </div>
    </div>
  );
}
