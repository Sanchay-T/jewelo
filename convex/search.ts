"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { createLogger, serializeError } from "../src/lib/observability/logger";

const logger = createLogger({ service: "convex.search" });

type ImageResult = {
  imageUrl: string;
  thumbnail: string;
  title: string;
  width: number;
  height: number;
  photographer: string;
  source: string;
};

// ── Pexels search ───────────────────────────────────────────────────
async function searchPexels(
  query: string,
  count: number,
  pageNum: number,
  apiKey: string,
): Promise<ImageResult[]> {
  const startedAt = Date.now();
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${count}&page=${pageNum}`;

  logger.info("Searching Pexels", {
    event: "search.request",
    route: "https://api.pexels.com/v1/search",
    method: "GET",
    statusCode: 200,
  });

  try {
    const response = await fetch(url, {
      headers: { Authorization: apiKey },
    });

    logger.info("Pexels response", {
      event: "search.response",
      route: "https://api.pexels.com/v1/search",
      method: "GET",
      statusCode: response.status,
      durationMs: Date.now() - startedAt,
    });

    if (!response.ok) return [];

    const data = await response.json();
    if (!data.photos || !Array.isArray(data.photos)) return [];

    return data.photos.map((photo: any) => ({
      imageUrl: photo.src?.large2x || photo.src?.large || photo.src?.original,
      thumbnail: photo.src?.medium || photo.src?.small,
      title: photo.alt || "Jewelry",
      width: photo.width || 0,
      height: photo.height || 0,
      photographer: photo.photographer || "Unknown",
      source: "pexels",
    }));
  } catch (error) {
    logger.error("Pexels search failed", {
      event: "search.error",
      route: "https://api.pexels.com/v1/search",
      method: "GET",
      error: serializeError(error),
      durationMs: Date.now() - startedAt,
    });
    return [];
  }
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
    logger.info("Search action started", {
      event: "search.action.start",
      method: "POST",
      route: "/api/search",
      statusCode: 200,
      requestId: searchQuery,
    });

    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) {
      logger.error("PEXELS_API_KEY not set", {
        event: "search.config_missing",
        route: "/api/search",
        method: "POST",
        error: serializeError("PEXELS_API_KEY not set"),
      });
      throw new Error("PEXELS_API_KEY not set");
    }

    const results = await searchPexels(searchQuery, count, pageNum, apiKey);

    logger.info("Search action completed", {
      event: "search.action.done",
      route: "/api/search",
      method: "POST",
      statusCode: 200,
      requestId: searchQuery,
      durationMs: results.length,
    });

    return results;
  },
});
