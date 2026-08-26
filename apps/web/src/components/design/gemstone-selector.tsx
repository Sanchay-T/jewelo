"use client";

const gems = [
  { id: "diamond", label: "Diamond", color: "#eef3f4" },
  { id: "ruby", label: "Ruby", color: "#a93445" },
  { id: "emerald", label: "Emerald", color: "#28765a" },
  { id: "sapphire", label: "Sapphire", color: "#355c99" },
];
export function GemstoneSelector({
  value,
  onChange,
}: {
  value: string[];
  onChange(value: string[]): void;
}) {
  return (
    <fieldset className="control-card">
      <legend>Gemstones</legend>
      <p className="tiny muted">
        Optional accents. Select more than one for a mixed setting.
      </p>
      <div className="option-grid four">
        {gems.map((gem) => {
          const active = value.includes(gem.id);
          return (
            <button
              type="button"
              key={gem.id}
              aria-pressed={active}
              onClick={() =>
                onChange(
                  active
                    ? value.filter((item) => item !== gem.id)
                    : [...value, gem.id],
                )
              }
            >
              <span className="gem-dot" style={{ background: gem.color }} />
              {gem.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
