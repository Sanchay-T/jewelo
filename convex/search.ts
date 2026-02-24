"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";

export const execute = action({
  args: { query: v.string(), perPage: v.optional(v.number()) },
  handler: async (_ctx, { query, perPage }) => {
    const count = perPage || 9;
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${count}&orientation=square`,
      { headers: { Authorization: process.env.PEXELS_API_KEY! } }
    );
    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status}`);
    }
    const data = await response.json();
    return (
      data.photos?.map((photo: any) => ({
        imageUrl: photo.src.large2x,
        thumbnail: photo.src.medium,
        title: photo.alt || "Jewelry",
        width: photo.width,
        height: photo.height,
        photographer: photo.photographer,
      })) || []
    );
  },
});
