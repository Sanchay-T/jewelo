"use client";
import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { StepIndicator } from "@/components/layout/StepIndicator";
import { SearchBar } from "@/components/design/SearchBar";
import { CategoryPills } from "@/components/design/CategoryPills";
import { InspirationGrid } from "@/components/design/InspirationGrid";
import { UploadZone } from "@/components/design/UploadZone";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
  const [page, setPage] = useState(1);
  const lastQueryRef = useRef("");

  const fetchImages = async (query: string, pageNum: number) => {
    setLoading(true);
    try {
      const results = await searchImages({ query, page: pageNum });
      setImages(results);
      setSelectedIndex(null);
      lastQueryRef.current = query;
      setPage(pageNum);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => fetchImages(query, 1);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    if (category !== "All") {
      fetchImages(`${category.toLowerCase()} jewelry`, 1);
    }
  };

  const handleNext = () => {
    if (lastQueryRef.current) {
      fetchImages(lastQueryRef.current, page + 1);
    }
  };

  const handlePrev = () => {
    if (lastQueryRef.current && page > 1) {
      fetchImages(lastQueryRef.current, page - 1);
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

      {/* Pagination */}
      {images.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handlePrev}
            disabled={page <= 1 || loading}
            className={`flex items-center gap-1 text-sm py-2 px-3 rounded-lg transition ${
              page > 1
                ? "text-brown hover:bg-sand"
                : "text-text-tertiary opacity-40"
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <span className="text-text-tertiary text-xs font-mono">
            Page {page}
          </span>
          <button
            onClick={handleNext}
            disabled={loading}
            className="flex items-center gap-1 text-sm text-brown py-2 px-3 rounded-lg hover:bg-sand transition"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

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
