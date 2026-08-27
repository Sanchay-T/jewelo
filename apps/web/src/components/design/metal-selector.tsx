"use client";

const metals = [
  { id: "yellow", label: "Yellow gold", color: "#c9a03e" },
  { id: "rose", label: "Rose gold", color: "#d4897a" },
  { id: "white", label: "White gold", color: "#d5d0ca" },
];
const karats = ["18K", "21K", "22K"];

export function getGoldColor(_karat: string, type: string) {
  return metals.find((metal) => metal.id === type)?.color ?? metals[0]!.color;
}
export function MetalSelector({
  karat,
  goldType,
  onKaratChange,
  onGoldTypeChange,
}: {
  karat: string;
  goldType: string;
  onKaratChange(value: string): void;
  onGoldTypeChange(value: string): void;
}) {
  return (
    <fieldset className="control-card">
      <legend>Metal</legend>
      <div className="option-grid three">
        {metals.map((metal) => (
          <button
            type="button"
            key={metal.id}
            aria-pressed={metal.id === goldType}
            onClick={() => onGoldTypeChange(metal.id)}
          >
            <span className="metal-dot" style={{ background: metal.color }} />
            {metal.label}
          </button>
        ))}
      </div>
      <div className="segmented compact">
        {karats.map((item) => (
          <button
            type="button"
            key={item}
            aria-pressed={karat === item}
            onClick={() => onKaratChange(item)}
          >
            {item}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
