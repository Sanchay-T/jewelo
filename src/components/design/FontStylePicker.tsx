"use client";

interface FontStylePickerProps {
  name: string;
  value: string;
  onChange: (font: string) => void;
  language?: string;
}

const fontsByLanguage: Record<string, { id: string; label: string; className: string }[]> = {
  en: [
    { id: "script", label: "Script", className: "font-display italic" },
    { id: "modern", label: "Modern", className: "tracking-widest uppercase text-sm" },
    { id: "classic", label: "Classic", className: "font-display" },
  ],
  ar: [
    { id: "naskh", label: "نسخ", className: "font-arabic" },
    { id: "diwani", label: "ديواني", className: "font-arabic italic" },
    { id: "kufi", label: "كوفي", className: "font-arabic font-bold" },
  ],
  zh: [
    { id: "regular", label: "Regular", className: "font-body" },
    { id: "serif", label: "Serif", className: "font-display" },
    { id: "bold", label: "Bold", className: "font-body font-bold" },
  ],
};

export function FontStylePicker({ name, value, onChange, language }: FontStylePickerProps) {
  const fonts = fontsByLanguage[language || "en"] || fontsByLanguage.en;
  const isArabic = language === "ar";

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
              dir={isArabic ? "rtl" : "ltr"}
              className={`${font.className} ${value === font.id ? "text-brown" : "text-text-primary"}`}
            >
              {name || (isArabic ? "اسم" : "Name")}
            </p>
            <p className="text-[10px] text-text-tertiary">{font.label}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
