"use node";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

function buildEngravePrompt(name: string): string {
  return `You are a master jeweler AND a professional product photographer.

A customer has brought you this piece of jewelry and asked you to engrave the name '${name}' on it. You will engrave it, then photograph the result in the exact same setup.

STEP 1 — ANALYZE THIS PHOTO:
Before you do anything, study this image carefully:
- What type of jewelry is this? (ring, pendant, bracelet, chain, earring, etc.)
- Where is the light coming from? (direction, intensity, color temperature)
- What metal is this? (yellow gold, rose gold, white gold, silver, platinum)
- What is the surface finish? (polished, matte, brushed, hammered, textured)
- Where are the flat or gently curved surfaces where engraving is physically possible?
- What is the camera angle and depth of field?

STEP 2 — DECIDE PLACEMENT:
Based on your analysis, find the single best location on this piece to engrave '${name}':
- Choose a surface that is visible, smooth enough to engrave, and large enough for the text
- The text should not overlap any stones, settings, clasps, or decorative elements
- The text should follow the natural curve of the surface it sits on
- Choose a font size that is proportional — small enough to be realistic, large enough to read
- Choose a font style that matches the piece's aesthetic

STEP 3 — ENGRAVE WITH REAL PHYSICS:
Now engrave the name into the metal. This is a PHYSICAL operation on real metal:
- Your engraving tool cuts V-shaped grooves into the metal surface
- The inside of each groove is angled, so it reflects light DIFFERENTLY than the flat surface around it
- The groove wall FACING the light source appears as a bright line
- The groove wall AWAY from the light source is in shadow
- The deepest point of each groove is the darkest
- Where the groove edge meets the flat surface, there is a sharp specular highlight
- The engraving follows the 3D curvature of the surface — it is not flat text pasted on a curved object
- At the start and end of each letter stroke, the groove tapers to a point (the burin enters and exits the metal)

ABSOLUTE RULES:
- DO NOT change anything about this image except adding the engraving
- Same jewelry, same stones, same chain, same background, same lighting, same camera angle
- The engraving must look like it existed BEFORE the photograph was taken
- If someone zoomed in 400%, the engraving should show physical depth in the metal, not flat printed text
- The output image should be the same composition as the input

Output the edited photograph now.`;
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
    model: "gemini-2.0-flash-exp",
    contents,
    config: {
      responseModalities: ["TEXT", "IMAGE"],
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

      // 2. Update status: analyzing
      await ctx.runMutation(internal.designs.updateStatus, {
        designId,
        status: "analyzing",
        analysisStep: "Identifying jewelry type...",
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

          // Store the reference image in Convex storage if it came from a URL
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
        analysisStep: `Engraving '${design.name}' now...`,
        analysisData: {
          jewelryType: "Pendant",
          metal: "Gold, polished",
          bestSpot: "AI determined",
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

      // 6. Generate 4 variations with the SAME prompt
      //    Gemini's natural randomness produces different variations each call.
      //    This is the same behavior as ChatGPT/DALL-E giving 4 outputs.
      const prompt = buildEngravePrompt(design.name);

      const generationPromises = Array.from({ length: 4 }, (_, i) => {
        return new Promise<{ imageData: string; mimeType: string } | null>(
          (resolve) => {
            // Stagger by 1s to avoid rate limits
            setTimeout(async () => {
              try {
                const result = await callGemini(ai, prompt, referenceBase64);
                resolve(result);
              } catch (err) {
                console.error(`Variation ${i} failed:`, err);
                resolve(null);
              }
            }, i * 1000);
          }
        );
      });

      const results = await Promise.all(generationPromises);

      // 7. Store all successful images
      let storedCount = 0;
      for (const result of results) {
        if (result) {
          const imageBuffer = Buffer.from(result.imageData, "base64");
          const blob = new Blob([imageBuffer], { type: result.mimeType });
          const storageId = await ctx.storage.store(blob);

          await ctx.runMutation(internal.designs.completeGeneration, {
            designId,
            imageStorageId: storageId,
          });
          storedCount++;
        }
      }

      if (storedCount === 0) {
        throw new Error("No images generated by Gemini");
      }
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
