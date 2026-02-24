"use node";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const FONT_DESCRIPTIONS: Record<string, string> = {
  script: "elegant flowing cursive script",
  modern: "clean modern sans-serif uppercase",
  classic: "refined classic serif",
};

const STYLE_DESCRIPTIONS: Record<string, string> = {
  gold_only: "pure gold, no stones",
  gold_with_stones: "gold with small gemstone accents",
  gold_with_diamonds: "gold with diamond embellishments",
};

const SIZE_DESCRIPTIONS: Record<string, string> = {
  small: "delicate and petite (12mm)",
  medium: "balanced and elegant (18mm)",
  large: "bold and statement-making (25mm)",
};

function buildGenerationPrompt(design: {
  name: string;
  karat: string;
  font: string;
  size: string;
  style: string;
  jewelryType?: string;
  designStyle?: string;
}): string {
  const fontDesc = FONT_DESCRIPTIONS[design.font] || "elegant script";
  const styleDesc = STYLE_DESCRIPTIONS[design.style] || "pure gold";
  const sizeDesc = SIZE_DESCRIPTIONS[design.size] || "18mm";
  const aesthetic = design.designStyle || "elegant";

  return `You are a world-class jewelry designer and luxury product photographer.

A customer wants custom jewelry with their name on it. They've shown you a reference image.

STEP 1 — STUDY THE REFERENCE:
Look at the reference image and identify:
- The exact type of jewelry (ring, pendant, bracelet, earring, chain, etc.)
- Its shape, silhouette, proportions, and dimensions
- The metal type, color, and finish
- Any stones, filigree, patterns, or decorative elements

STEP 2 — VISUALIZE IN 3D:
Mentally construct this jewelry as a 3D object. Find the best surface for embossing '${design.name}'. Consider how letters wrap around the curves.

STEP 3 — GENERATE:
Create a photorealistic product photograph of the same type of jewelry as the reference, with '${design.name}' embossed on it.

SPECIFICATIONS:
- Jewelry type: match the reference image exactly (if it's a ring, generate a ring; if a pendant, a pendant)
- Metal: match the reference — preserve color, tone, and finish exactly
- Style: ${aesthetic}, inspired by the reference
- Embossing: '${design.name}' in ${fontDesc}, with physical depth in the metal
- Decoration: ${styleDesc}
- Size: ${sizeDesc}

PHOTOGRAPHY:
- Professional studio, soft lighting, warm cream background
- Sharp focus on the jewelry and name
- Subtle shadow beneath the piece
- This must look like a photograph from a Cartier or Tiffany catalog

CRITICAL: DO NOT paste flat text on a surface. The name must be PHYSICALLY part of the 3D metal form. Generate the complete photograph now.`;
}

function buildFromScratchPrompt(design: {
  name: string;
  karat: string;
  font: string;
  size: string;
  style: string;
  jewelryType?: string;
  designStyle?: string;
}): string {
  const fontDesc = FONT_DESCRIPTIONS[design.font] || "elegant script";
  const styleDesc = STYLE_DESCRIPTIONS[design.style] || "pure gold";
  const sizeDesc = SIZE_DESCRIPTIONS[design.size] || "18mm";
  const type = design.jewelryType || "pendant";
  const aesthetic = design.designStyle || "minimalist";

  return `You are a world-class jewelry designer and luxury product photographer.

Generate a photorealistic product photograph of a custom ${design.karat} gold ${type} with the name '${design.name}' embossed on it.

DESIGN:
- Style: ${aesthetic}
- Metal: ${design.karat} yellow gold, polished with warm luster
- Decoration: ${styleDesc}
- Size feel: ${sizeDesc}
- Type: ${type} (with chain if pendant/necklace)

NAME EMBOSSING:
- '${design.name}' in ${fontDesc} lettering
- Letters have PHYSICAL DEPTH — raised from or engraved into the metal
- Each letter follows the 3D contours of the piece
- Realistic light and shadow on each letter stroke
- Looks crafted by a master engraver

PHOTOGRAPHY:
- Professional studio product shot
- Soft lighting, warm cream background
- Sharp focus on name area, gentle depth of field
- Luxury catalog quality — Cartier/Tiffany level
- Subtle shadow, realistic gold reflections

The name must be PHYSICALLY part of the metal, not flat text. Generate now.`;
}

async function callGemini(
  ai: any,
  prompt: string,
  referenceBase64: string | null,
): Promise<{ imageData: string; mimeType: string } | null> {
  const contents: any[] = [{ text: prompt }];
  if (referenceBase64) {
    contents.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: referenceBase64,
      },
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-image-preview",
    contents,
    config: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: "1K",
      },
    },
  });

  const candidate = response.candidates?.[0];
  if (!candidate?.content?.parts) return null;

  for (const part of candidate.content.parts) {
    if (part.inlineData?.data) {
      return {
        imageData: part.inlineData.data,
        mimeType: part.inlineData.mimeType || "image/png",
      };
    }
  }
  return null;
}

export const generate = internalAction({
  args: { designId: v.id("designs") },
  handler: async (ctx, { designId }) => {
    try {
      // 1. Get design
      const design = await ctx.runQuery(internal.designs.getInternal, { designId });

      // === DEBUG LOGGING ===
      console.log("=== GENERATION DEBUG ===");
      console.log("Design ID:", designId);
      console.log("Name:", design.name);
      console.log("Karat:", design.karat);
      console.log("Font:", design.font);
      console.log("Size:", design.size);
      console.log("Style:", design.style);
      console.log("JewelryType:", JSON.stringify(design.jewelryType));
      console.log("DesignStyle:", JSON.stringify(design.designStyle));
      console.log("ReferenceType:", design.referenceType);
      console.log("ReferenceUrl:", design.referenceUrl?.slice(0, 80));
      console.log("ReferenceStorageId:", design.referenceStorageId);
      console.log("=== END DEBUG ===");

      // 2. Update status: analyzing
      await ctx.runMutation(internal.designs.updateStatus, {
        designId,
        status: "analyzing",
        analysisStep: "Studying your reference...",
      });

      // 3. Download reference image if exists and store in Convex
      let referenceBase64: string | null = null;
      let referenceUrl = design.referenceUrl;
      if (design.referenceStorageId) {
        const url = await ctx.storage.getUrl(design.referenceStorageId);
        if (url) referenceUrl = url;
      }
      if (referenceUrl) {
        try {
          const response = await fetch(referenceUrl);
          const buffer = await response.arrayBuffer();
          referenceBase64 = Buffer.from(buffer).toString("base64");

          // Store the reference in Convex storage for reliable display later
          if (!design.referenceStorageId) {
            const blob = new Blob([buffer], { type: "image/jpeg" });
            const refStorageId = await ctx.storage.store(blob);
            await ctx.runMutation(internal.designs.storeReferenceImage, {
              designId,
              referenceStorageId: refStorageId,
            });
          }
        } catch (e) {
          console.error("Failed to download reference:", e);
        }
      }

      // 4. Update with analysis data
      await ctx.runMutation(internal.designs.updateStatus, {
        designId,
        status: "engraving",
        analysisStep: `Creating '${design.name}' in ${design.karat} gold...`,
        analysisData: {
          jewelryType: design.jewelryType || "Pendant",
          metal: `${design.karat} Gold`,
          bestSpot: "AI visualized",
        },
      });

      // 5. Initialize Gemini
      const { GoogleGenAI } = await import("@google/genai");

      const saJsonBase64 = process.env.GOOGLE_SA_JSON;
      if (!saJsonBase64) throw new Error("GOOGLE_SA_JSON not set");

      const saJson = JSON.parse(Buffer.from(saJsonBase64, "base64").toString());

      const ai = new GoogleGenAI({
        vertexai: true,
        project: process.env.GCP_PROJECT_ID || "cyphersol-prod",
        location: process.env.GCP_LOCATION || "global",
        googleAuthOptions: {
          credentials: saJson,
        },
      });

      // 6. Build prompt based on whether there's a reference image
      const prompt = referenceBase64
        ? buildGenerationPrompt(design)
        : buildFromScratchPrompt(design);

      console.log("Has reference image:", !!referenceBase64);
      console.log("Reference image size:", referenceBase64 ? (referenceBase64.length / 1024).toFixed(0) + "kb base64" : "none");
      console.log("Prompt first 300 chars:", prompt.slice(0, 300));

      // 7. Generate 4 variations SEQUENTIALLY — Pro model rate limit is ~2/min
      const results: ({ imageData: string; mimeType: string } | null)[] = [];
      for (let i = 0; i < 4; i++) {
        try {
          console.log(`Generating variation ${i + 1}/4...`);
          const result = await callGemini(ai, prompt, referenceBase64);
          results.push(result);
          if (result) {
            // Store immediately so user can see progress
            const imageBuffer = Buffer.from(result.imageData, "base64");
            const blob = new Blob([imageBuffer], { type: result.mimeType });
            const storageId = await ctx.storage.store(blob);
            await ctx.runMutation(internal.designs.addGeneratedImage, {
              designId,
              imageStorageId: storageId,
            });
          }
          // Wait 15s between calls to respect rate limit (except after last)
          if (i < 3) {
            await new Promise((r) => setTimeout(r, 15000));
          }
        } catch (err) {
          console.error(`Variation ${i} failed:`, err);
          results.push(null);
        }
      }

      // 8. Check results and set completed
      const storedCount = results.filter(Boolean).length;
      if (storedCount === 0) {
        throw new Error("No images generated by Gemini");
      }

      console.log(`Generation complete: ${storedCount}/4 images stored`);
      await ctx.runMutation(internal.designs.completeGeneration, { designId });
    } catch (error: any) {
      console.error("Generation failed:", error);
      await ctx.runMutation(internal.designs.updateStatus, {
        designId,
        status: "failed",
        error: error.message || "Generation failed",
      });
    }
  },
});
