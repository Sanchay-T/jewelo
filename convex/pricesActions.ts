"use node";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { createLogger, serializeError } from "../src/lib/observability/logger";

const logger = createLogger({ service: "convex.pricesActions" });

export const fetchPrices = internalAction({
  handler: async (ctx) => {
    const startedAt = Date.now();
    const route = "https://api.metalpriceapi.com/v1/latest";

    const apiKey = process.env.METAL_PRICE_API_KEY;
    if (!apiKey) {
      logger.error("Missing METAL_PRICE_API_KEY", { event: "prices.fetch.config_missing" });
      return;
    }

    const url = `${route}?api_key=${apiKey}&base=XAU&currencies=AED,USD`;
    logger.info("Fetching gold price feed", {
      event: "prices.fetch.request",
      route,
      method: "GET",
    });

    const response = await fetch(url);
    logger.info("Gold price feed response", {
      event: "prices.fetch.response",
      route,
      method: "GET",
      statusCode: response.status,
      durationMs: Date.now() - startedAt,
    });

    if (!response.ok) {
      logger.warn("Gold price feed non-2xx response", {
        event: "prices.fetch.error",
        route,
        method: "GET",
        statusCode: response.status,
      });
      return;
    }

    const data = await response.json();
    if (!data.success) {
      logger.error("Gold price feed succeeded but API payload invalid", {
        event: "prices.fetch.bad_payload",
        route,
        error: serializeError(data),
      });
      return;
    }

    // The API with base=XAU returns rates as "1 AED = X XAU"
    // We need to INVERT to get "1 XAU (oz) = Y AED"
    const rawRate = data.rates?.XAUAED || data.rates?.AED;
    if (!rawRate) {
      logger.error("Gold price payload missing AED rate", {
        event: "prices.fetch.bad_payload",
        route,
        error: serializeError(data),
      });
      return;
    }

    // If rate is tiny (< 1), it's inverted — "1 AED in XAU"
    // If rate is large (> 1000), it's already "1 XAU in AED"
    const pricePerOzTroy = rawRate < 1 ? 1 / rawRate : rawRate;
    const pricePerGram = pricePerOzTroy / 31.1035;

    logger.info("Gold price parsed from external API", {
      event: "prices.fetch.parsed",
      route,
      method: "GET",
      statusCode: response.status,
      requestId: "prices-fetched",
      durationMs: Date.now() - startedAt,
      level: "info",
      goldPricePerOzTroy: pricePerOzTroy,
      goldPricePerGram: pricePerGram,
    });

    await ctx.runMutation(internal.prices.store, {
      metalType: "XAU",
      currency: "AED",
      pricePerOzTroy,
      pricePerGram,
      price24k: pricePerGram,
      price22k: pricePerGram * 0.916,
      price21k: pricePerGram * 0.875,
      price18k: pricePerGram * 0.750,
      fetchedAt: Date.now(),
      source: "metalpriceapi",
    });
  },
});
