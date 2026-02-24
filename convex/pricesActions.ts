"use node";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

export const fetchPrices = internalAction({
  handler: async (ctx) => {
    const apiKey = process.env.METAL_PRICE_API_KEY;
    if (!apiKey) {
      console.error("METAL_PRICE_API_KEY not set");
      return;
    }

    const response = await fetch(
      `https://api.metalpriceapi.com/v1/latest?api_key=${apiKey}&base=XAU&currencies=AED,USD`
    );
    if (!response.ok) {
      console.error(`MetalPriceAPI error: ${response.status}`);
      return;
    }
    const data = await response.json();
    if (!data.success) {
      console.error("MetalPriceAPI failed:", data);
      return;
    }

    // The API with base=XAU returns rates as "1 AED = X XAU"
    // We need to INVERT to get "1 XAU (oz) = Y AED"
    const rawRate = data.rates?.XAUAED || data.rates?.AED;
    if (!rawRate) {
      console.error("No AED rate in response:", data);
      return;
    }

    // If rate is tiny (< 1), it's inverted — "1 AED in XAU"
    // If rate is large (> 1000), it's already "1 XAU in AED"
    const pricePerOzTroy = rawRate < 1 ? 1 / rawRate : rawRate;
    const pricePerGram = pricePerOzTroy / 31.1035;

    console.log(`Gold price: ${pricePerOzTroy.toFixed(2)} AED/oz, ${pricePerGram.toFixed(2)} AED/g`);

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
