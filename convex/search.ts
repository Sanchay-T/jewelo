"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";

export const execute = action({
  args: { query: v.string(), perPage: v.optional(v.number()), page: v.optional(v.number()) },
  handler: async (_ctx, { query, perPage, page }) => {
    const count = perPage || 9;
    const pageNum = page || 1;

    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
      throw new Error("UNSPLASH_ACCESS_KEY not set");
    }

    // Add jewelry context if not already present
    const hasJewelryTerm = /jewelry|pendant|ring|necklace|bracelet|earring|chain|gold|silver/i.test(query);
    const searchQuery = hasJewelryTerm ? query : `${query} gold jewelry`;

    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=${count}&page=${pageNum}&orientation=squarish`;

    console.log("Unsplash search:", searchQuery, "url:", url);

    const response = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        "Accept-Version": "v1",
      },
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("Unsplash error:", response.status, body);
      throw new Error(`Unsplash API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Unsplash results:", data.total, "photos found");

    if (!data.results || !Array.isArray(data.results)) {
      console.error("Unexpected response shape:", JSON.stringify(data).slice(0, 200));
      return [];
    }

    return data.results.map((photo: any) => ({
      imageUrl: photo.urls?.regular || photo.urls?.full,
      thumbnail: photo.urls?.small || photo.urls?.thumb,
      title: photo.alt_description || photo.description || "Jewelry",
      width: photo.width,
      height: photo.height,
      photographer: photo.user?.name || "Unknown",
    }));
  },
});
