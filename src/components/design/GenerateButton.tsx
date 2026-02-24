"use client";
import { Loader2 } from "lucide-react";

interface GenerateButtonProps {
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}

export function GenerateButton({ disabled, loading, onClick }: GenerateButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`w-full font-semibold py-4 rounded-xl text-base transition flex items-center justify-center gap-2 ${
        disabled || loading
          ? "bg-brown-light text-cream/60 cursor-not-allowed"
          : "bg-brown text-cream hover:bg-brown-dark"
      }`}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {loading ? "Generating..." : "Generate Designs"}
    </button>
  );
}
