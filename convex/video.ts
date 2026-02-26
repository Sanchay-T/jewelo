"use node";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import {
  buildVideoPrompt,
  buildVideoNegativePrompt,
} from "../src/lib/prompts/index";

// NOTE: `google-auth-library` must be installed:
//   npm install google-auth-library
// It is NOT currently in package.json.

/**
 * Acquire a Google Cloud access token using the service account credentials.
 *
 * Uses the `google-auth-library` package which automatically picks up
 * credentials from the GOOGLE_APPLICATION_CREDENTIALS environment variable
 * (path to a service-account JSON file).
 */
async function getGcpAccessToken(): Promise<string> {
  const { GoogleAuth } = await import("google-auth-library");
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  if (!token) throw new Error("Failed to obtain GCP access token");
  return token;
}

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
      const metalType = design.metalType || "yellow_gold";
      const karat = design.karat || "21K";

      // Build prompts
      const videoPrompt = buildVideoPrompt(jewelryType, metalType, karat);
      const negativePrompt = buildVideoNegativePrompt();

      console.log(
        `[video] Starting Veo 3.1 generation for design ${designId} variation ${variationIndex}`,
      );
      console.log(`[video] Jewelry: ${jewelryType}, Metal: ${metalType}`);

      // Mark video as generating
      await ctx.runMutation(internal.designs.updateVideoStatus, {
        designId,
        variationIndex,
        status: "generating",
      });

      // Call Veo 3.1 via Vertex AI REST (long-running operation)
      const projectId = process.env.GCP_PROJECT_ID;
      if (!projectId) throw new Error("GCP_PROJECT_ID not set");

      const accessToken = await getGcpAccessToken();

      const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/veo-3.1-generate-preview:predictLongRunning`;

      const body = {
        instances: [
          {
            prompt: videoPrompt,
            referenceImages: [
              {
                image: {
                  bytesBase64Encoded: imageBase64,
                  mimeType: "image/png",
                },
                referenceType: "asset",
              },
            ],
          },
        ],
        parameters: {
          durationSeconds: 6,
          resolution: "1080p",
          aspectRatio: "9:16",
          sampleCount: 1,
          negativePrompt,
          personGeneration: "disallow",
        },
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Veo 3.1 API error ${response.status}: ${errorText}`,
        );
      }

      const result = await response.json();
      const operationName: string | undefined = result.name;

      if (!operationName) {
        throw new Error(
          "Veo 3.1 did not return an operation name: " +
            JSON.stringify(result),
        );
      }

      console.log(`[video] Operation started: ${operationName}`);

      // Store the operation ID on the design record
      await ctx.runMutation(internal.designs.updateVideoStatus, {
        designId,
        variationIndex,
        status: "generating",
        operationId: operationName,
      });

      // Schedule first poll in 5 seconds
      await ctx.scheduler.runAfter(
        5000,
        internal.video.pollVideoCompletion,
        { designId, variationIndex },
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

// ── Poll the Veo 3.1 long-running operation until done ──────────────
export const pollVideoCompletion = internalAction({
  args: { designId: v.id("designs"), variationIndex: v.number() },
  handler: async (ctx, { designId, variationIndex }) => {
    try {
      const design = await ctx.runQuery(internal.designs.getInternal, {
        designId,
      });

      const operationName = design.videoOperationIds?.[variationIndex];
      if (!operationName) {
        throw new Error(`No videoOperationId for variation ${variationIndex} — cannot poll`);
      }

      const accessToken = await getGcpAccessToken();

      const pollUrl = `https://us-central1-aiplatform.googleapis.com/v1/${operationName}`;

      const response = await fetch(pollUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Poll error ${response.status}: ${errorText}`,
        );
      }

      const result = await response.json();

      if (result.done) {
        // Check for error in the operation result
        if (result.error) {
          throw new Error(
            `Veo 3.1 operation failed: ${JSON.stringify(result.error)}`,
          );
        }

        // Extract the video bytes
        const videoBase64: string | undefined =
          result.response?.predictions?.[0]?.bytesBase64Encoded;

        if (!videoBase64) {
          throw new Error(
            "Veo 3.1 completed but no video data in response: " +
              JSON.stringify(result.response),
          );
        }

        console.log(
          `[video] Operation complete — storing video (${Math.round(videoBase64.length * 0.75 / 1024)}KB)`,
        );

        // Store video in Convex storage
        const videoBuffer = Buffer.from(videoBase64, "base64");
        const blob = new Blob([videoBuffer], { type: "video/mp4" });
        const videoStorageId = await ctx.storage.store(blob);

        // Update design with completed video
        await ctx.runMutation(internal.designs.updateVideoStatus, {
          designId,
          variationIndex,
          status: "completed",
          storageId: videoStorageId,
        });

        console.log(`[video] Video stored for design ${designId} variation ${variationIndex}`);
      } else {
        // Not done yet — schedule another poll in 5 seconds
        console.log(
          `[video] Operation still in progress for design ${designId} variation ${variationIndex}, polling again in 5s...`,
        );
        await ctx.scheduler.runAfter(
          5000,
          internal.video.pollVideoCompletion,
          { designId, variationIndex },
        );
      }
    } catch (error: any) {
      console.error("[video] Poll failed:", error.message || error);
      await ctx.runMutation(internal.designs.updateVideoStatus, {
        designId,
        variationIndex,
        status: "failed",
      });
    }
  },
});
