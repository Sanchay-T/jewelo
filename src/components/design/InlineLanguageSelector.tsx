"use client";

interface InlineLanguageSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const LANGUAGE_OPTIONS = [
  { id: "en", label: "English" },
  { id: "ar", label: "Arabic" },
  { id: "zh", label: "Chinese" },
];

export function InlineLanguageSelector({ value, onChange }: InlineLanguageSelectorProps) {
  return (
    <div>
      <label className="text-text-secondary text-xs font-medium uppercase tracking-wider mb-2 block">
        Language
      </label>
      <div className="grid grid-cols-3 gap-2">
        {LANGUAGE_OPTIONS.map((lang) => (
          <button
            key={lang.id}
            onClick={() => onChange(lang.id)}
            className={`rounded-lg p-2.5 text-center transition border ${
              value === lang.id
                ? "border-brown bg-sand text-brown"
                : "border-warm bg-white text-text-secondary hover:bg-sand/40"
            }`}
          >
            <p className="text-xs font-medium">{lang.label}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
