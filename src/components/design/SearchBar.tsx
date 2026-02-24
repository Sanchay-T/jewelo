"use client";
import { useState } from "react";
import { Search } from "lucide-react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  loading?: boolean;
}

export function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [query, setQuery] = useState("");
  return (
    <div className="bg-white border border-warm rounded-xl px-4 py-2.5 flex items-center gap-2 mb-3">
      <Search className="w-4 h-4 text-text-tertiary flex-shrink-0" />
      <input
        type="text"
        placeholder='Search "gold pendant"...'
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && query && onSearch(query)}
        className="flex-1 bg-transparent outline-none text-sm text-text-primary placeholder:text-text-tertiary"
      />
      <button
        onClick={() => query && onSearch(query)}
        disabled={!query || loading}
        className="bg-brown text-cream text-[10px] px-3 py-1 rounded-lg font-medium disabled:bg-brown-light"
      >
        {loading ? "..." : "Go"}
      </button>
    </div>
  );
}
