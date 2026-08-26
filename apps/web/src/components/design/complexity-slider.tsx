"use client";

export function ComplexitySlider({
  value,
  onChange,
}: {
  value: number;
  onChange(value: number): void;
}) {
  const label =
    value <= 3
      ? "Refined simplicity"
      : value <= 7
        ? "Balanced detail"
        : "Luxurious detail";
  return (
    <div className="control-card range-control">
      <label htmlFor="complexity">
        <span>
          Complexity · <small>{label}</small>
        </span>
        <strong>{value}/10</strong>
      </label>
      <input
        id="complexity"
        type="range"
        min="1"
        max="10"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div>
        <small>Simple</small>
        <small>Luxurious</small>
      </div>
    </div>
  );
}
