"use client";

import { useState } from "react";
export interface AdditionalInfo {
  occasion?: string;
  metalFinish?: string;
  notes?: string;
}
export function AdditionalInfoSection({
  value,
  onChange,
}: {
  value: AdditionalInfo;
  onChange(value: AdditionalInfo): void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="control-card additional">
      <button
        type="button"
        className="additional-toggle"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>Additional information</span>
        <small>{open ? "Hide" : "Optional"}</small>
      </button>
      {open && (
        <div className="additional-fields">
          <label>
            Occasion
            <select
              value={value.occasion ?? ""}
              onChange={(event) =>
                onChange({
                  ...value,
                  occasion: event.target.value || undefined,
                })
              }
            >
              <option value="">Select occasion</option>
              {[
                "Everyday wear",
                "Birthday",
                "Anniversary",
                "Wedding",
                "Graduation",
                "Gift",
              ].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Metal finish
            <select
              value={value.metalFinish ?? ""}
              onChange={(event) =>
                onChange({
                  ...value,
                  metalFinish: event.target.value || undefined,
                })
              }
            >
              <option value="">Choose finish</option>
              {["polished", "matte", "brushed", "hammered", "textured"].map(
                (item) => (
                  <option key={item}>{item}</option>
                ),
              )}
            </select>
          </label>
          <label className="full">
            Notes
            <textarea
              rows={3}
              maxLength={280}
              placeholder="Any special details for your piece"
              value={value.notes ?? ""}
              onChange={(event) =>
                onChange({ ...value, notes: event.target.value || undefined })
              }
            />
          </label>
        </div>
      )}
    </section>
  );
}
