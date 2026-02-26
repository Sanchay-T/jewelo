"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

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
  const [showTypes, setShowTypes] = useState(false);
  const activeType = goldTypes.find((t) => t.id === goldType) || goldTypes[0];
  const activeColor = getGoldColor(value, goldType);

  return (
    <div>
      <label className="text-text-secondary text-xs font-medium uppercase tracking-wider mb-2 block">
        Metal
      </label>

      {/* Karat selection */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {karats.map((karat) => {
          const color = getGoldColor(karat.id, goldType);
          return (
            <motion.button
              key={karat.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                onChange(karat.id);
                if (!showTypes) setShowTypes(true);
              }}
              className={`bg-white rounded-lg p-3 text-center transition-all ${
                value === karat.id
                  ? "border-2 border-brown shadow-sm"
                  : "border border-warm"
              }`}
            >
              <motion.div
                className="w-7 h-7 rounded-full mx-auto mb-1.5"
                style={{ background: color }}
                layoutId={value === karat.id ? "active-karat-swatch" : undefined}
              />
              <p className={`text-xs ${value === karat.id ? "font-semibold text-text-primary" : "text-text-secondary"}`}>
                {karat.label}
              </p>
              <p className="text-[9px] text-text-tertiary">{karat.purity}</p>
            </motion.button>
          );
        })}
      </div>

      {/* Gold type selection — slides in after karat is picked */}
      <AnimatePresence>
        {showTypes && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-3 gap-2">
              {goldTypes.map((type) => {
                const color = type.colors[value as keyof typeof type.colors] || type.colors["21K"];
                const isActive = goldType === type.id;
                return (
                  <motion.button
                    key={type.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onGoldTypeChange(type.id)}
                    className={`relative bg-white rounded-lg p-3 text-center transition-all ${
                      isActive
                        ? "border-2 border-brown shadow-sm"
                        : "border border-warm"
                    }`}
                  >
                    <motion.div
                      className="w-full h-3 rounded-full mb-2"
                      style={{ background: `linear-gradient(90deg, ${type.colors["18K"]}, ${type.colors["22K"]})` }}
                      animate={isActive ? { scale: [1, 1.05, 1] } : {}}
                      transition={{ duration: 0.3 }}
                    />
                    <p className={`text-[10px] leading-tight ${isActive ? "font-semibold text-text-primary" : "text-text-secondary"}`}>
                      {type.label}
                    </p>
                    <p className="text-[8px] text-text-tertiary mt-0.5">
                      {type.description}
                    </p>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current selection summary */}
      <motion.div
        key={`${value}-${goldType}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-2 mt-2"
      >
        <div
          className="w-3 h-3 rounded-full"
          style={{ background: activeColor }}
        />
        <p className="text-text-tertiary text-[10px]">
          {getGoldLabel(value, goldType)}
        </p>
      </motion.div>
    </div>
  );
}
