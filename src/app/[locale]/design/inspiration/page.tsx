"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAction, useMutation } from "convex/react";
import { motion } from "motion/react";
import { api } from "../../../../../convex/_generated/api";
import { StepIndicator } from "@/components/layout/StepIndicator";
import { SearchBar } from "@/components/design/SearchBar";
import { CategoryPills } from "@/components/design/CategoryPills";
import { InspirationGrid } from "@/components/design/InspirationGrid";
import { Upload, X, ArrowRight } from "lucide-react";

type ImageResult = { imageUrl: string; thumbnail: string; title: string };

export default function InspirationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = searchParams.get("lang") || "en";
  const searchImages = useAction(api.search.execute);
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);
  const saveReference = useMutation(api.uploads.saveReference);

  const [images, setImages] = useState<ImageResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("Pendants");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [uploading, setUploading] = useState(false);
  const lastQueryRef = useRef("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const initialLoadDone = useRef(false);

  // Auto-load curated results on mount
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      fetchImages("gold pendant jewelry", 1);
    }
  }, []);

  // Infinite scroll — observe sentinel element
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && !loadingMore && hasMore && lastQueryRef.current) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loading, loadingMore, hasMore]);

  const fetchImages = async (query: string, pageNum: number, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      const results = await searchImages({ query, perPage: 15, page: pageNum });
      if (append) {
        setImages((prev) => [...prev, ...results]);
      } else {
        setImages(results);
        setSelectedIndex(null);
      }
      lastQueryRef.current = query;
      setPage(pageNum);
      setHasMore(results.length >= 15);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (lastQueryRef.current && !loadingMore) {
      fetchImages(lastQueryRef.current, page + 1, true);
    }
  };

  const handleSearch = (query: string) => {
    setHasMore(true);
    fetchImages(query, 1);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setHasMore(true);
    const queries: Record<string, string> = {
      Pendants: "gold pendant jewelry",
      Rings: "gold ring jewelry",
      Necklaces: "gold necklace jewelry",
      Bracelets: "gold bracelet jewelry",
      Earrings: "gold earrings jewelry",
      Chains: "gold chain necklace",
    };
    fetchImages(queries[category] || `${category.toLowerCase()} gold jewelry`, 1);
  };

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await res.json();
      const { url } = await saveReference({ storageId });
      if (url) {
        router.push(`/en/design/customize?lang=${lang}&ref=${encodeURIComponent(url)}`);
      }
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  }, [generateUploadUrl, saveReference, router, lang]);

  const selectedImage = selectedIndex !== null ? images[selectedIndex] : null;

  return (
    <div className="min-h-screen bg-cream px-6 pt-4 pb-32 lg:pt-20 lg:pb-24">
      <div className="max-w-2xl mx-auto">
        <div className="h-4" />
        <StepIndicator currentStep={2} totalSteps={7} />
        <h2 className="font-display text-xl mb-1 lg:text-2xl">
          Find your inspiration
        </h2>
        <p className="text-text-secondary text-xs mb-4 lg:text-sm">
          Pick a piece you love — we&apos;ll engrave your name on it.
        </p>

        <SearchBar onSearch={handleSearch} loading={loading} />
        <CategoryPills
          selected={selectedCategory}
          onChange={handleCategoryChange}
        />

        {/* Loading skeleton for initial load */}
        {loading && images.length === 0 && (
          <div className="grid grid-cols-3 gap-2 mb-4 lg:grid-cols-4 lg:gap-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-lg bg-sand animate-pulse"
              />
            ))}
          </div>
        )}

        <InspirationGrid
          images={images}
          selectedIndex={selectedIndex}
          onSelect={(i) => setSelectedIndex(i === selectedIndex ? null : i)}
        />

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-1" />

        {/* Loading more indicator */}
        {loadingMore && (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-brown border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Upload section — after all images */}
        <div className="border-t border-warm pt-4 mt-2 mb-4">
          <p className="text-text-tertiary text-[10px] uppercase tracking-wider font-medium mb-2">
            Or use your own
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full bg-white border border-dashed border-brown/30 rounded-xl p-3 flex items-center gap-3 hover:bg-sand/50 transition"
          >
            <div className="w-9 h-9 rounded-lg bg-sand flex items-center justify-center flex-shrink-0">
              {uploading ? (
                <div className="w-4 h-4 border-2 border-brown border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-4 h-4 text-brown" />
              )}
            </div>
            <div className="text-left">
              <p className="text-text-primary text-xs font-medium">
                {uploading ? "Uploading..." : "Upload your own reference"}
              </p>
              <p className="text-text-tertiary text-[10px]">
                Photo, screenshot, or Pinterest save
              </p>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
          />
        </div>
      </div>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-warm px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:pb-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="max-w-2xl mx-auto">
          {selectedImage ? (
            <div className="flex items-center gap-3">
              {/* Thumbnail preview */}
              <div className="relative flex-shrink-0">
                <img
                  src={selectedImage.thumbnail}
                  alt="Selected"
                  className="w-12 h-12 rounded-lg object-cover border-2 border-brown"
                />
                <button
                  onClick={() => setSelectedIndex(null)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-text-primary rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>

              {/* CTA */}
              <button
                onClick={() =>
                  router.push(
                    `/en/design/customize?lang=${lang}&ref=${encodeURIComponent(selectedImage.imageUrl)}`
                  )
                }
                className="flex-1 bg-brown text-cream font-semibold py-3 rounded-xl text-sm hover:bg-brown-dark transition flex items-center justify-center gap-2"
              >
                Use this reference
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => router.push(`/en/design/from-scratch?lang=${lang}`)}
              className="w-full text-text-secondary text-sm py-2.5 rounded-xl border border-warm hover:bg-sand/50 transition"
            >
              Skip — design from scratch
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
