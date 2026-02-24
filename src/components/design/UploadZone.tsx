"use client";
import { useRef } from "react";
import { ImageIcon } from "lucide-react";

interface UploadZoneProps {
  onUpload: (file: File) => void;
}

export function UploadZone({ onUpload }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <button
      onClick={() => inputRef.current?.click()}
      className="w-full bg-white border border-dashed border-warm rounded-xl p-3 flex items-center gap-3 mb-3 cursor-pointer hover:bg-sand/50 transition"
    >
      <ImageIcon className="w-5 h-5 text-text-tertiary" />
      <div className="text-left">
        <p className="text-text-secondary text-xs font-medium">
          Upload your own
        </p>
        <p className="text-text-tertiary text-[10px]">Photo or screenshot</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
      />
    </button>
  );
}
