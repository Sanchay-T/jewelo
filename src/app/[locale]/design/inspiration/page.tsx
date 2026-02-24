"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { StepIndicator } from "@/components/layout/StepIndicator";
import { SearchBar } from "@/components/design/SearchBar";
import { CategoryPills } from "@/components/design/CategoryPills";
import { InspirationGrid } from "@/components/design/InspirationGrid";
import { UploadZone } from "@/components/design/UploadZone";

export default function InspirationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = searchParams.get("lang") || "en";
  const searchImages = useAction(api.search.execute);

  const [images, setImages] = useState<
    Array<{ imageUrl: string; thumbnail: string; title: string }>
  >([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(false);

  const handleSearch = async (query: string) => {
    setLoading(true);
    try {
      const results = await searchImages({ query });
      setImages(results);
      setSelectedIndex(null);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    if (category !== "All") {
      handleSearch(`${category.toLowerCase()} gold jewelry`);
    }
  };

  const handleUpload = (_file: File) => {
    // TODO: Upload to Convex file storage
  };

  const selectedImage =
    selectedIndex !== null ? images[selectedIndex] : null;

  return (
    <div className="min-h-screen bg-cream px-6 pt-4 pb-24">
      <div className="h-4" />
      <StepIndicator currentStep={2} totalSteps={7} />
      <h2 className="font-display text-xl mb-1">Find your inspiration</h2>
      <p className="text-text-secondary text-xs mb-4">
        Pick a piece. We&apos;ll engrave your name on it.
      </p>

      <SearchBar onSearch={handleSearch} loading={loading} />
      <CategoryPills
        selected={selectedCategory}
        onChange={handleCategoryChange}
      />
      <InspirationGrid
        images={images}
        selectedIndex={selectedIndex}
        onSelect={setSelectedIndex}
      />
      <UploadZone onUpload={handleUpload} />

      <button
        onClick={() =>
          selectedImage &&
          router.push(
            `/en/design/customize?lang=${lang}&ref=${encodeURIComponent(selectedImage.imageUrl)}`
          )
        }
        disabled={!selectedImage}
        className={`w-full font-semibold py-3.5 rounded-xl text-sm mb-2 transition ${
          selectedImage
            ? "bg-brown text-cream hover:bg-brown-dark"
            : "bg-brown-light text-cream/60 cursor-not-allowed"
        }`}
      >
        Use Selected Reference
      </button>
      <button
        onClick={() => router.push(`/en/design/from-scratch?lang=${lang}`)}
        className="w-full text-text-tertiary text-xs py-2"
      >
        Skip — design from scratch →
      </button>
    </div>
  );
}
