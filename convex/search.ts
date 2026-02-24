"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";

// Always wrap user query to get clean jewelry product shots
function buildSearchQuery(userQuery: string): string {
  const base = userQuery.trim().toLowerCase();
  // If user already typed something jewelry-specific, just add product shot hint
  const hasJewelryTerm = ["jewelry", "pendant", "ring", "necklace", "bracelet", "earring", "chain", "gold"].some(
    (t) => base.includes(t)
  );
  if (hasJewelryTerm) {
    return `${base} product photography white background`;
  }
  return `gold ${base} jewelry product photography white background`;
}

export const execute = action({
  args: { query: v.string(), perPage: v.optional(v.number()) },
  handler: async (_ctx, { query, perPage }) => {
    const count = perPage || 9;
    const searchQuery = buildSearchQuery(query);

    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
      throw new Error("UNSPLASH_ACCESS_KEY not set");
    }

    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=${count}&orientation=squarish`,
      {
        headers: {
          Authorization: `Client-ID ${accessKey}`,
          "Accept-Version": "v1",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status}`);
    }

    const data = await response.json();
    return (
      data.results?.map((photo: any) => ({
        imageUrl: photo.urls.regular,
        thumbnail: photo.urls.small,
        title: photo.alt_description || photo.description || "Jewelry",
        width: photo.width,
        height: photo.height,
        photographer: photo.user?.name || "Unknown",
        // Unsplash requires attribution link
        photographerUrl: photo.user?.links?.html,
        unsplashUrl: photo.links?.html,
      })) || []
    );
  },
});
