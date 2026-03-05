"use client";

import { useState } from "react";
import { METAL_FINISHES, type MetalFinish } from "@/lib/constants";

interface AdditionalInfoValue {
  occasion?: string;
  metalFinish?: MetalFinish;
  notes?: string;
}

interface AdditionalInfoSectionProps {
  value: AdditionalInfoValue;
  onChange: (next: AdditionalInfoValue) => void;
}

const OCCASIONS = [
  "Everyday wear",
  "Birthday",
  "Anniversary",
  "Wedding",
  "Graduation",
  "Gift",
] as const;

export function AdditionalInfoSection({ value, onChange }: AdditionalInfoSectionProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-warm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3 text-left flex items-center justify-between"
      >
        <span className="text-text-secondary text-xs font-medium uppercase tracking-wider">
          Additional Info
        </span>
        <span className="text-text-tertiary text-xs">{open ? "Hide" : "Optional"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          <div>
            <p className="text-text-tertiary text-[10px] uppercase tracking-wider mb-1">Occasion</p>
            <select
              value={value.occasion || ""}
              onChange={(e) => onChange({ ...value, occasion: e.target.value || undefined })}
              className="w-full bg-cream border border-warm rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Select occasion</option>
              {OCCASIONS.map((occasion) => (
                <option key={occasion} value={occasion}>
                  {occasion}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-text-tertiary text-[10px] uppercase tracking-wider mb-1">Metal Finish</p>
            <div className="flex gap-1.5 flex-wrap">
              {METAL_FINISHES.map((finish) => (
                <button
                  key={finish}
                  onClick={() =>
                    onChange({
                      ...value,
                      metalFinish: value.metalFinish === finish ? undefined : finish,
                    })
                  }
                  className={`px-2 py-1 rounded-full text-[10px] border transition capitalize ${
                    value.metalFinish === finish
                      ? "bg-brown text-cream border-brown"
                      : "bg-white text-text-secondary border-warm hover:bg-sand/40"
                  }`}
                >
                  {finish}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-text-tertiary text-[10px] uppercase tracking-wider mb-1">Notes</p>
            <textarea
              value={value.notes || ""}
              onChange={(e) => onChange({ ...value, notes: e.target.value || undefined })}
              rows={3}
              placeholder="Any special details for your piece"
              className="w-full bg-cream border border-warm rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
