"use client";

interface FontStylePickerProps {
  name: string;
  value: string;
  onChange: (font: string) => void;
}

const fonts = [
  { id: "script", label: "Script", className: "font-display italic" },
  { id: "modern", label: "Modern", className: "tracking-widest uppercase text-sm" },
  { id: "classic", label: "Classic", className: "font-display" },
];

export function FontStylePicker({ name, value, onChange }: FontStylePickerProps) {
  return (
    <div>
      <label className="text-text-secondary text-xs font-medium uppercase tracking-wider mb-2 block">
        Font
      </label>
      <div className="flex gap-2">
        {fonts.map((font) => (
          <button
            key={font.id}
            onClick={() => onChange(font.id)}
            className={`flex-1 bg-white rounded-lg p-2 text-center transition ${
              value === font.id
                ? "border-2 border-brown"
                : "border border-warm"
            }`}
          >
            <p
              className={`${font.className} ${value === font.id ? "text-brown" : "text-text-primary"}`}
            >
              {name || "Name"}
            </p>
            <p className="text-[10px] text-text-tertiary">{font.label}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
