"use client";

export function SizeSelector({
  value,
  onChange,
}: {
  value: string;
  onChange(value: string): void;
}) {
  return (
    <fieldset className="control-card">
      <legend>Overall size</legend>
      <div className="option-grid three">
        {[
          ["small", "Delicate", "12–16 mm"],
          ["medium", "Balanced", "17–22 mm"],
          ["large", "Statement", "23–28 mm"],
        ].map(([id, label, detail]) => (
          <button
            type="button"
            key={id}
            aria-pressed={value === id}
            onClick={() => onChange(id!)}
          >
            <strong>{label}</strong>
            <small>{detail}</small>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function PendantLengthSelector({
  value,
  onChange,
}: {
  value: number;
  onChange(value: number): void;
}) {
  return (
    <div className="control-card range-control">
      <label htmlFor="pendant-length">
        <span>Pendant length</span>
        <strong>{value} mm</strong>
      </label>
      <input
        id="pendant-length"
        type="range"
        min="14"
        max="32"
        step="1"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div>
        <small>Delicate</small>
        <small>Statement</small>
      </div>
    </div>
  );
}
