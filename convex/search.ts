"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";

type ImageResult = {
  imageUrl: string;
  thumbnail: string;
  title: string;
  width: number;
  height: number;
  photographer: string;
  source: string;
};

// ── Unsplash search ─────────────────────────────────────────────────
async function searchUnsplash(
  query: string,
  count: number,
  pageNum: number,
  accessKey: string,
): Promise<ImageResult[]> {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&page=${pageNum}&orientation=squarish`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
      "Accept-Version": "v1",
    },
  });

  if (!response.ok) return [];

  const data = await response.json();
  if (!data.results || !Array.isArray(data.results)) return [];

  return data.results.map((photo: any) => ({
    imageUrl: photo.urls?.regular || photo.urls?.full,
    thumbnail: photo.urls?.small || photo.urls?.thumb,
    title: photo.alt_description || photo.description || "Jewelry",
    width: photo.width || 0,
    height: photo.height || 0,
    photographer: photo.user?.name || "Unknown",
    source: "unsplash",
  }));
}

// ── Openverse search (free, no key required) ────────────────────────
async function searchOpenverse(
  query: string,
  count: number,
  pageNum: number,
): Promise<ImageResult[]> {
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=${count}&page=${pageNum}&category=photograph`;

  const response = await fetch(url);
  if (!response.ok) return [];

  const data = await response.json();
  if (!data.results || !Array.isArray(data.results)) return [];

  return data.results.map((img: any) => ({
    imageUrl: img.url,
    thumbnail: img.thumbnail || img.url,
    title: img.title || "Jewelry",
    width: img.width || 0,
    height: img.height || 0,
    photographer: img.creator || "Unknown",
    source: "openverse",
  }));
}

// ── Combined search action ──────────────────────────────────────────
export const execute = action({
  args: { query: v.string(), perPage: v.optional(v.number()), page: v.optional(v.number()) },
  handler: async (_ctx, { query, perPage, page }) => {
    const count = perPage || 12;
    const pageNum = page || 1;

    // Add jewelry context if not already present
    const hasJewelryTerm = /jewelry|pendant|ring|necklace|bracelet|earring|chain|gold|silver/i.test(query);
    const searchQuery = hasJewelryTerm ? query : `${query} gold jewelry`;

    console.log("Search:", searchQuery);

    const accessKey = process.env.UNSPLASH_ACCESS_KEY;

    // Search both sources in parallel
    const [unsplashResults, openverseResults] = await Promise.all([
      accessKey
        ? searchUnsplash(searchQuery, Math.ceil(count / 2), pageNum, accessKey)
        : Promise.resolve([]),
      searchOpenverse(searchQuery, Math.ceil(count / 2), pageNum),
    ]);

    // Interleave results: unsplash, openverse, unsplash, openverse...
    const merged: ImageResult[] = [];
    const maxLen = Math.max(unsplashResults.length, openverseResults.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < unsplashResults.length) merged.push(unsplashResults[i]);
      if (i < openverseResults.length) merged.push(openverseResults[i]);
    }

    console.log(`Results: ${unsplashResults.length} unsplash + ${openverseResults.length} openverse = ${merged.length} total`);

    return merged.slice(0, count);
  },
});
