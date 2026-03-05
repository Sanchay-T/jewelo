"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { SearchBar } from "@/components/design/SearchBar";
import { CategoryPills } from "@/components/design/CategoryPills";
import { InspirationGrid } from "@/components/design/InspirationGrid";
import { ComplexitySlider } from "@/components/design/ComplexitySlider";
import { StyleFilterChips } from "@/components/design/StyleFilterChips";
import { Upload, X, ArrowRight, Sparkles, SlidersHorizontal, ChevronDown } from "lucide-react";
import type { StyleFamily } from "@/lib/constants";

type ImageResult = { imageUrl: string; thumbnail: string; title: string };

type InspirationMode = "templates" | "search";

const CATEGORY_TO_TYPE: Record<string, string> = {
  Pendants: "name_pendant",
  Rings: "ring",
  Necklaces: "chain",
  Bracelets: "bracelet",
  Earrings: "earrings",
  Chains: "chain",
};

const STYLE_QUERY: Record<StyleFamily, string> = {
  minimalist: "minimalist",
  floral: "floral",
  art_deco: "art deco",
  vintage: "vintage",
  modern: "modern",
  arabic: "arabic calligraphy",
};

const STONE_PROFILE_TO_GEMS: Record<string, string[]> = {
  none: [],
  diamond: ["diamond"],
  colored: ["ruby", "emerald"],
  mixed: ["diamond", "ruby"],
};

function buildSearchQuery(category: string, styleFamily: StyleFamily, complexity: number): string {
  const complexityHint =
    complexity <= 3
      ? "simple"
      : complexity >= 8
        ? "luxury ornate"
        : "balanced detailed";
  return `gold ${category.toLowerCase()} jewelry ${STYLE_QUERY[styleFamily]} ${complexityHint}`;
}

export default function InspirationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = searchParams.get("lang") || "en";
  const searchImages = useAction(api.search.execute);
  const randomTemplate = useMutation(api.templates.getRandom);
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);
  const saveReference = useMutation(api.uploads.saveReference);

  const [images, setImages] = useState<ImageResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("Pendants");
  const [styleFamily, setStyleFamily] = useState<StyleFamily>("minimalist");
  const [complexity, setComplexity] = useState(5);
  const [mode, setMode] = useState<InspirationMode>("templates");
  const [gender, setGender] = useState("unisex");
  const [stoneProfile, setStoneProfile] = useState("none");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [inspiring, setInspiring] = useState(false);
  const [inspireStatus, setInspireStatus] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const lastQueryRef = useRef("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const initialLoadDone = useRef(false);

  const templateGemstones = useMemo(() => STONE_PROFILE_TO_GEMS[stoneProfile] || [], [stoneProfile]);
  const jewelryType = CATEGORY_TO_TYPE[selectedCategory] || "name_pendant";

  const templates = useQuery(api.templates.getFiltered, {
    jewelryType,
    styleFamily,
    complexity,
    gender,
    gemstones: templateGemstones,
    limit: 18,
  });

  const fetchImages = async (
    query: string,
    pageNum: number,
    append = false,
    options?: { autoPickRandom?: boolean },
  ) => {
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
        if (options?.autoPickRandom && results.length > 0) {
          setSelectedIndex(Math.floor(Math.random() * results.length));
        } else {
          setSelectedIndex(null);
        }
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
    if (mode === "search" && lastQueryRef.current && !loadingMore) {
      fetchImages(lastQueryRef.current, page + 1, true);
    }
  };

  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      // In templates mode, the templates useEffect handles loading.
      // Only fetch search images if explicitly in search mode.
      if (mode === "search") {
        fetchImages(buildSearchQuery(selectedCategory, styleFamily, complexity), 1);
      }
    }
  }, []);

  useEffect(() => {
    if (mode !== "templates") return;

    // templates is undefined while Convex is loading — wait
    if (templates === undefined) return;

    if (templates.length > 0) {
      const mapped = templates
        .filter((img) => !!img.imageUrl)
        .map((img) => ({
          imageUrl: img.imageUrl!,
          thumbnail: img.imageUrl!,
          title: `${img.styleFamily} template`,
        }));
      setImages(mapped);
      if (mapped.length > 0) {
        setSelectedIndex(Math.floor(Math.random() * mapped.length));
      } else {
        setSelectedIndex(null);
      }
      setHasMore(false);
      return;
    }

    // No templates found — fall back to search
    fetchImages(buildSearchQuery(selectedCategory, styleFamily, complexity), 1);
  }, [templates, mode, selectedCategory, styleFamily, complexity]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || mode !== "search") return;

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
  }, [mode, loading, loadingMore, hasMore, page]);

  const handleSearch = (query: string) => {
    setMode("search");
    setHasMore(true);
    fetchImages(query, 1);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setHasMore(true);
    if (mode === "search") {
      fetchImages(buildSearchQuery(category, styleFamily, complexity), 1);
    }
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
        const query = new URLSearchParams({
          lang,
          ref: url,
          type: jewelryType,
          styleFamily,
          complexity: String(complexity),
          gender,
          gemstones: templateGemstones.join(","),
        });
        router.push(`/en/design/customize?${query.toString()}`);
      }
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  }, [generateUploadUrl, saveReference, router, lang, styleFamily, complexity, gender, jewelryType, templateGemstones]);

  const handleInspireMe = async () => {
    setInspiring(true);
    setInspireStatus("Finding inspiration...");
    try {
      const picked = await randomTemplate({
        jewelryType,
        styleFamily,
        complexity,
        gender,
        gemstones: templateGemstones,
      });

      if (picked?.imageUrl) {
        const candidate = {
          imageUrl: picked.imageUrl,
          thumbnail: picked.imageUrl,
          title: "Inspired template",
        };
        setMode("templates");
        setImages([candidate, ...images.filter((img) => img.imageUrl !== candidate.imageUrl)]);
        setSelectedIndex(0);
        setInspireStatus("Picked from template library.");
        return;
      }

      setMode("search");
      await fetchImages(buildSearchQuery(selectedCategory, styleFamily, complexity), 1, false, {
        autoPickRandom: true,
      });
      setInspireStatus("Picked from live search (no template match yet).");
    } catch (err) {
      console.error("Inspire me failed:", err);
      if (images.length > 0) {
        setSelectedIndex(Math.floor(Math.random() * images.length));
        setInspireStatus("Picked from current results (fallback).");
      } else {
        setInspireStatus("Could not fetch inspiration. Try again.");
      }
    } finally {
      setInspiring(false);
    }
  };

  const activeFilterCount = [
    styleFamily !== "minimalist",
    complexity !== 5,
    gender !== "unisex",
    stoneProfile !== "none",
  ].filter(Boolean).length;

  const selectedImage = selectedIndex !== null ? images[selectedIndex] : null;

  const customizeRouteForSelected = () => {
    if (!selectedImage) return "";
    const query = new URLSearchParams({
      lang,
      ref: selectedImage.imageUrl,
      type: jewelryType,
      styleFamily,
      complexity: String(complexity),
      gender,
      gemstones: templateGemstones.join(","),
    });
    return `/en/design/customize?${query.toString()}`;
  };

  return (
    <div className="bg-cream px-6 pb-32 lg:pb-24">
      <div className="max-w-2xl mx-auto">
        <h2 className="font-display text-xl mb-1 lg:text-2xl">Find your inspiration</h2>
        <p className="text-text-secondary text-xs mb-4 lg:text-sm">
          Filter by style and complexity, or let us surprise you.
        </p>

        <SearchBar onSearch={handleSearch} loading={loading} />
        <CategoryPills selected={selectedCategory} onChange={handleCategoryChange} />

        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={handleInspireMe}
            disabled={inspiring}
            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-brown text-cream text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-brown-dark transition"
          >
            <Sparkles className="w-4 h-4" />
            {inspiring ? "Finding..." : "Inspire Me"}
          </button>
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`relative inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition border ${
              filtersOpen ? "bg-sand border-brown text-brown" : "bg-white border-warm text-text-secondary hover:bg-sand/50"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-brown text-cream text-[10px] font-bold rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {inspireStatus && (
          <p className="text-[10px] text-brown mb-3">{inspireStatus}</p>
        )}

        {filtersOpen && (
          <div className="bg-white border border-warm rounded-xl p-3 mb-4 space-y-3">
            <StyleFilterChips value={styleFamily} onChange={setStyleFamily} />
            <ComplexitySlider value={complexity} onChange={setComplexity} />
            <div className="flex items-center gap-2">
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="text-xs bg-cream border border-warm rounded-lg px-2.5 py-1.5 flex-1"
              >
                <option value="unisex">Unisex</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
              <select
                value={stoneProfile}
                onChange={(e) => setStoneProfile(e.target.value)}
                className="text-xs bg-cream border border-warm rounded-lg px-2.5 py-1.5 flex-1"
              >
                <option value="none">No stones</option>
                <option value="diamond">Diamond</option>
                <option value="colored">Colored stones</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
          </div>
        )}

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full bg-white border border-dashed border-brown/30 rounded-xl p-3 flex items-center gap-3 hover:bg-sand/50 transition mb-4"
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
            <p className="text-text-tertiary text-[10px]">Photo or screenshot</p>
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

        {loading && images.length === 0 && (
          <div className="grid grid-cols-3 gap-2 mb-4 lg:grid-cols-4 lg:gap-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-lg bg-sand animate-pulse" />
            ))}
          </div>
        )}

        <InspirationGrid
          images={images}
          selectedIndex={selectedIndex}
          onSelect={(i) => setSelectedIndex(i === selectedIndex ? null : i)}
        />

        <div ref={sentinelRef} className="h-1" />

        {loadingMore && (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-brown border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <div className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-warm px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:pb-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="max-w-2xl mx-auto">
          {selectedImage ? (
            <div className="flex items-center gap-3">
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

              <button
                onClick={() => router.push(customizeRouteForSelected())}
                className="flex-1 bg-brown text-cream font-semibold py-3 rounded-xl text-sm hover:bg-brown-dark transition flex items-center justify-center gap-2"
              >
                Use this reference
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                const query = new URLSearchParams({
                  lang,
                  type: jewelryType,
                  styleFamily,
                  complexity: String(complexity),
                  gender,
                  gemstones: templateGemstones.join(","),
                });
                router.push(`/en/design/from-scratch?${query.toString()}`);
              }}
              className="w-full text-text-secondary text-sm py-2.5 rounded-xl border border-warm hover:bg-sand/50 transition"
            >
              Skip - design from scratch
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
