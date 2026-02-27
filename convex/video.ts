"use node";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import {
  buildVideoPrompt,
  buildVideoNegativePrompt,
} from "../src/lib/prompts/index";
import { GoogleGenAI } from "@google/genai";

// ── Generate a rotating jewelry video via Veo 3.1 ──────────────────
export const generateVideo = internalAction({
  args: { designId: v.id("designs"), variationIndex: v.number() },
  handler: async (ctx, { designId, variationIndex }) => {
    try {
      const design = await ctx.runQuery(internal.designs.getInternal, {
        designId,
      });

      // Determine which product image to use as the source frame
      const storageIds = design.productImageStorageIds || [];
      if (storageIds.length === 0) {
        throw new Error("No product images available for video generation");
      }

      const sourceStorageId = storageIds[variationIndex] ?? storageIds[0];
      const sourceUrl = await ctx.storage.getUrl(sourceStorageId);
      if (!sourceUrl) {
        throw new Error("Could not resolve product image URL");
      }

      // Download image and convert to base64
      const imageResp = await fetch(sourceUrl);
      const imageBuffer = await imageResp.arrayBuffer();
      const imageBase64 = Buffer.from(imageBuffer).toString("base64");

      // Derive jewelry/metal type for prompt
      const jewelryType = design.jewelryType || "name_pendant";
      const metalType = design.metalType || "yellow";
      const karat = design.karat || "21K";

      // Build prompts
      const videoPrompt = buildVideoPrompt(jewelryType, metalType, karat);
      const negativePrompt = buildVideoNegativePrompt();

      console.log(
        `[video] Starting Veo 3.1 for design ${designId} variation ${variationIndex}`,
      );
      console.log(`[video] Jewelry: ${jewelryType}, Metal: ${metalType}`);

      // Mark video as generating
      await ctx.runMutation(internal.designs.updateVideoStatus, {
        designId,
        variationIndex,
        status: "generating",
      });

      // Use @google/genai SDK with Vertex AI + service account credentials
      // Veo 3.1 requires Vertex AI (not API key auth)
      const saJsonB64 = process.env.GOOGLE_SA_JSON;
      if (!saJsonB64) throw new Error("GOOGLE_SA_JSON env var not set");

      const saJson = JSON.parse(
        Buffer.from(saJsonB64, "base64").toString("utf-8")
      );

      const ai = new GoogleGenAI({
        vertexai: true,
        project: process.env.GCP_PROJECT_ID || "cyphersol-prod",
        location: "us-central1", // Veo requires us-central1
        googleAuthOptions: {
          credentials: saJson,
        },
      });

      // Call Veo 3.1 via SDK
      const operation = await ai.models.generateVideos({
        model: "veo-3.1-generate-preview",
        prompt: videoPrompt,
        image: {
          imageBytes: imageBase64,
          mimeType: "image/png",
        },
        config: {
          aspectRatio: "9:16",
          numberOfVideos: 1,
          durationSeconds: 6,
          negativePrompt,
          personGeneration: "dont_allow",
        },
      });

      console.log(`[video] Operation started, polling...`);

      // Store operation name for tracking
      const opName = operation.name || "";
      await ctx.runMutation(internal.designs.updateVideoStatus, {
        designId,
        variationIndex,
        status: "generating",
        operationId: opName,
      });

      // Poll for completion (SDK handles auth automatically)
      let currentOp = operation;
      const maxPolls = 60; // 5 minutes max
      for (let poll = 0; poll < maxPolls; poll++) {
        await new Promise((r) => setTimeout(r, 5000));

        currentOp = await ai.operations.get({ operation: currentOp });

        if (currentOp.done) {
          break;
        }
        console.log(`[video] Still rendering... (poll ${poll + 1})`);
      }

      if (!currentOp.done) {
        throw new Error("Video generation timed out after 5 minutes");
      }

      // Extract video
      const videos = currentOp.response?.generatedVideos;
      if (!videos || videos.length === 0) {
        throw new Error("Veo returned no videos");
      }

      const videoData = videos[0]?.video;
      if (!videoData) {
        throw new Error("No video data in response");
      }

      // Get video bytes — SDK may return as videoBytes or need download from uri
      let videoBytes: Uint8Array | null = null;

      if (videoData.videoBytes) {
        videoBytes = typeof videoData.videoBytes === "string"
          ? Buffer.from(videoData.videoBytes, "base64")
          : new Uint8Array(videoData.videoBytes);
      } else if (videoData.uri) {
        console.log(`[video] Downloading from URI: ${videoData.uri}`);
        const dlResp = await fetch(videoData.uri);
        const dlBuffer = await dlResp.arrayBuffer();
        videoBytes = new Uint8Array(dlBuffer);
      }

      if (!videoBytes || videoBytes.length === 0) {
        throw new Error("Failed to extract video bytes");
      }

      console.log(
        `[video] Video ready — ${Math.round(videoBytes.length / 1024)}KB`,
      );

      // Store in Convex
      const blob = new Blob([videoBytes as unknown as BlobPart], { type: "video/mp4" });
      const videoStorageId = await ctx.storage.store(blob);

      await ctx.runMutation(internal.designs.updateVideoStatus, {
        designId,
        variationIndex,
        status: "completed",
        storageId: videoStorageId,
      });

      console.log(
        `[video] Stored for design ${designId} variation ${variationIndex}`,
      );
    } catch (error: any) {
      console.error("[video] Generation failed:", error.message || error);
      await ctx.runMutation(internal.designs.updateVideoStatus, {
        designId,
        variationIndex,
        status: "failed",
      });
    }
  },
});

// pollVideoCompletion is no longer needed — polling happens inline in generateVideo
// Keeping as a no-op for backward compat with any scheduled calls
export const pollVideoCompletion = internalAction({
  args: { designId: v.id("designs"), variationIndex: v.number() },
  handler: async () => {
    // No-op — polling is now inline in generateVideo
    console.log("[video] Legacy pollVideoCompletion called — ignoring");
  },
});
