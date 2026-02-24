"use client";
import { useState, useEffect } from "react";
import { useQuery, useAction } from "convex/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { api } from "../../../../convex/_generated/api";
import { Search, X, ZoomIn, ZoomOut } from "lucide-react";

const CATEGORIES = ["Pendants", "Rings", "Chains", "Earrings", "Bracelets"];

export default function GalleryPage() {
  const router = useRouter();
  const recentDesigns = useQuery(api.gallery.getRecentCompleted);
  const searchImages = useAction(api.search.execute);

  const [activeCategory, setActiveCategory] = useState("Pendants");
  const [pexelsImages, setPexelsImages] = useState<
    { url: string; alt: string; fullUrl: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerZoom, setViewerZoom] = useState(1);

  useEffect(() => {
    setLoading(true);
    searchImages({
      query: `gold ${activeCategory.toLowerCase()} jewelry`,
      perPage: 12,
    })
      .then((results: any) => {
        if (results?.photos) {
          setPexelsImages(
            results.photos.map((p: any) => ({
              url: p.src?.medium || p.src?.small,
              alt: p.alt || "Jewelry",
              fullUrl: p.src?.large || p.src?.original,
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeCategory]);

  return (
    <div className="min-h-screen bg-cream pb-24 lg:pt-16 lg:pb-8">
      <div className="px-6 pt-8 lg:max-w-5xl lg:mx-auto">
        <h1 className="font-display text-3xl text-text-primary mb-1">
          Gallery
        </h1>
        <p className="text-text-secondary text-sm mb-6">
          Browse designs & find inspiration
        </p>
      </div>

      {/* Community Designs */}
      {recentDesigns && recentDesigns.length > 0 && (
        <div className="mb-8 lg:max-w-5xl lg:mx-auto">
          <p className="px-6 text-text-secondary text-[10px] uppercase tracking-wider font-medium mb-3">
            Community Designs
          </p>
          <div className="flex gap-3 overflow-x-auto px-6 pb-2 lg:flex-wrap lg:overflow-x-visible">
            {recentDesigns.map((d, i) => (
              <motion.button
                key={d._id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setViewerUrl(d.imageUrl)}
                className="flex-shrink-0 w-32 h-32 rounded-xl border border-warm overflow-hidden bg-sand lg:w-40 lg:h-40"
              >
                <img
                  src={d.imageUrl}
                  alt={d.name}
                  className="w-full h-full object-cover"
                />
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Category pills */}
      <div className="px-6 mb-4 lg:max-w-5xl lg:mx-auto">
        <p className="text-text-secondary text-[10px] uppercase tracking-wider font-medium mb-2">
          Inspiration
        </p>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-3 py-1.5 text-xs rounded-full font-medium transition ${
                activeCategory === cat
                  ? "bg-brown text-cream"
                  : "bg-white border border-warm text-text-secondary"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Pexels grid */}
      <div className="px-6 lg:max-w-5xl lg:mx-auto">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-xl bg-sand border border-warm animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {pexelsImages.map((img, i) => (
              <motion.div
                key={`${activeCategory}-${i}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="relative group"
              >
                <button
                  onClick={() => setViewerUrl(img.fullUrl || img.url)}
                  className="w-full aspect-square rounded-xl border border-warm overflow-hidden bg-sand"
                >
                  <img
                    src={img.url}
                    alt={img.alt}
                    className="w-full h-full object-cover"
                  />
                </button>
                <button
                  onClick={() =>
                    router.push(
                      `/en/design/customize?lang=en&ref=${encodeURIComponent(img.fullUrl || img.url)}`
                    )
                  }
                  className="absolute bottom-2 left-2 right-2 bg-brown/90 backdrop-blur-sm text-cream text-[10px] font-medium py-1.5 rounded-lg text-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Use as reference →
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen viewer */}
      <AnimatePresence>
        {viewerUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
            onClick={() => {
              setViewerUrl(null);
              setViewerZoom(1);
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setViewerUrl(null);
                setViewerZoom(1);
              }}
              className="absolute top-6 right-4 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setViewerZoom((z) => (z === 1 ? 2.5 : 1));
              }}
              className="absolute top-6 left-4 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center"
            >
              {viewerZoom > 1 ? (
                <ZoomOut className="w-5 h-5 text-white" />
              ) : (
                <ZoomIn className="w-5 h-5 text-white" />
              )}
            </button>
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className="w-full h-full flex items-center justify-center p-4 overflow-auto"
            >
              <motion.img
                src={viewerUrl}
                alt="Gallery image"
                animate={{ scale: viewerZoom }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="max-w-full max-h-full object-contain rounded-lg"
                draggable={false}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
