"use client";

const fonts = {
  en: [
    { id: "script", label: "Script" },
    { id: "modern", label: "Modern" },
    { id: "classic", label: "Classic" },
  ],
  ar: [
    { id: "naskh", label: "نسخ" },
    { id: "diwani", label: "ديواني" },
    { id: "kufi", label: "كوفي" },
  ],
} as const;

export function FontStylePicker({
  name,
  value,
  onChange,
  language,
  metalColor,
}: {
  name: string;
  value: string;
  onChange(value: string): void;
  language: "en" | "ar";
  metalColor: string;
}) {
  return (
    <fieldset className="control-card">
      <legend>Font style</legend>
      <div className="font-options">
        {fonts[language].map((font) => (
          <button
            type="button"
            key={font.id}
            aria-pressed={value === font.id}
            onClick={() => onChange(font.id)}
          >
            <span
              className={`font-sample ${font.id}`}
              style={{ color: metalColor }}
              dir={language === "ar" ? "rtl" : "ltr"}
            >
              {name || (language === "ar" ? "اسمك" : "Your name")}
            </span>
            <small>{font.label}</small>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
