"use client";

interface NameInputProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
}

const limits: Record<string, number> = { en: 15, ar: 12, zh: 8 };

export function NameInput({ value, onChange, language }: NameInputProps) {
  const max = limits[language] || 15;
  return (
    <div>
      <label className="text-text-secondary text-xs font-medium uppercase tracking-wider mb-2 block">
        Name
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => e.target.value.length <= max && onChange(e.target.value)}
        placeholder="Enter your name"
        className="w-full bg-white border border-warm rounded-lg px-4 py-3 text-text-primary focus:border-brown focus:ring-2 focus:ring-brown/10 outline-none"
      />
      <p className="text-text-tertiary text-[10px] mt-1 text-right">
        {value.length}/{max}
      </p>
    </div>
  );
}
