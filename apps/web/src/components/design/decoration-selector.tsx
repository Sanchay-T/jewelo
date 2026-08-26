"use client";

export function DecorationSelector({
  value,
  onChange,
}: {
  value: string;
  onChange(value: string): void;
}) {
  return (
    <fieldset className="control-card">
      <legend>Decoration</legend>
      <div className="option-grid three">
        {[
          ["minimal", "Minimal", "Clean edges"],
          ["balanced", "Balanced", "Fine accents"],
          ["ornate", "Ornate", "Rich detailing"],
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
