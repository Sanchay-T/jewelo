"use node";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const FONT_STYLES: Record<string, string> = {
  script: "elegant flowing cursive script",
  modern: "clean, modern, bold block capitals",
  classic: "refined classic serif with balanced proportions",
};

const DECORATION_STYLES: Record<string, string> = {
  gold_only: "none, pure polished gold",
  gold_with_stones: "small gemstone accents along edges",
  gold_with_diamonds: "pave-set round brilliant-cut diamonds catching light",
};

const SIZE_FEELS: Record<string, string> = {
  small: "delicate, petite, 12mm",
  medium: "balanced, elegant, 18mm",
  large: "bold, statement-making, 25mm",
};

// Camera angles for 4 diverse variations
const CAMERA_ANGLES = [
  "front-facing hero shot, name centered and prominent",
  "angled 3/4 view showing depth and dimension of lettering",
  "100mm macro lens, tight crop on the engraved name and metal texture",
  "soft overhead angle with dramatic directional lighting on the name",
];

// ── JSON PROMPT: Reference-based (engrave on existing piece) ───────
function buildReferencePrompt(
  design: { name: string; font: string; karat: string; style: string },
  variationIndex: number,
): string {
  const fontStyle = FONT_STYLES[design.font] || "elegant script";
  const camera = CAMERA_ANGLES[variationIndex];

  return JSON.stringify({
    generation_profile: "commercial-jewelry-asset",
    task: "Engrave the customer's name onto the jewelry shown in the reference image. Do NOT redesign the jewelry — only add the engraving.",
    subject: {
      geometry_source: "Use the provided reference image EXACTLY. Same jewelry, same stones, same chain, same background, same lighting, same camera angle.",
      preserve_rules: [
        "DO NOT change anything about this image except adding the engraving",
        "The engraving must look like it existed BEFORE the photograph was taken",
        "Same metal, same finish, same composition",
      ],
    },
    custom_typography: {
      engraved_text: design.name,
      character_count: design.name.length,
      spelling_check: `The text must read exactly: ${design.name.split("").join(" - ")}`,
      font_style: fontStyle,
      text_accuracy: `CRITICAL: Every single letter of '${design.name}' must be present and clearly legible. Do not truncate, abbreviate, or skip any letters. The name has ${design.name.length} characters.`,
      integration_style: "physically engraved into the metal surface with V-shaped grooves, following the 3D curvature",
      engraving_physics: [
        "V-shaped grooves cut by engraving burin",
        "Groove wall facing light = bright specular highlight",
        "Groove wall in shadow = darker than surrounding metal",
        "Deepest point of groove = darkest",
        "Sharp highlights where groove edge meets flat surface",
        "Letter strokes taper at start and end (burin entry/exit)",
      ],
    },
    technical_render: {
      camera,
      lighting: "professional studio, three-point softbox, warm tone",
      resolution: "ultra-crisp, photorealistic, 8k detail",
      style: "luxury jewelry catalog photography",
    },
  }, null, 2);
}

// ── JSON PROMPT: From-scratch (generate new piece) ─────────────────
function buildFromScratchPrompt(
  design: {
    name: string;
    karat: string;
    font: string;
    size: string;
    style: string;
    jewelryType?: string;
    designStyle?: string;
  },
  variationIndex: number,
): string {
  const fontStyle = FONT_STYLES[design.font] || "elegant script";
  const decoration = DECORATION_STYLES[design.style] || "none, pure polished gold";
  const sizeFeel = SIZE_FEELS[design.size] || "balanced, elegant, 18mm";
  const type = design.jewelryType || "pendant";
  const aesthetic = design.designStyle || "minimalist";
  const camera = CAMERA_ANGLES[variationIndex];

  return JSON.stringify({
    generation_profile: "commercial-jewelry-asset",
    task: `Create a photorealistic product photograph of a custom ${type} with the customer's name engraved on it.`,
    subject: {
      item_type: type,
      design_style: aesthetic,
      primary_material: `solid ${design.karat} yellow gold`,
      finish: "high polish with warm luster",
      decoration,
      size: sizeFeel,
      chain: type.includes("pendant") || type.includes("necklace") ? "delicate matching gold chain" : "none",
    },
    custom_typography: {
      engraved_text: design.name,
      character_count: design.name.length,
      spelling_check: `The text must read exactly: ${design.name.split("").join(" - ")}`,
      font_style: fontStyle,
      text_accuracy: `CRITICAL: Every single letter of '${design.name}' must be present and clearly legible. Do not truncate, abbreviate, or skip any letters. The name has ${design.name.length} characters.`,
      integration_style: "flawlessly embossed into the metal, following 3D curves of the piece",
      engraving_physics: [
        "V-shaped grooves cut by engraving burin",
        "Groove wall facing light = bright specular highlight",
        "Groove wall in shadow = darker than surrounding metal",
        "Deepest point of groove = darkest",
        "Sharp highlights where groove edge meets flat surface",
        "Letter strokes taper at start and end (burin entry/exit)",
      ],
    },
    environment: {
      background: "warm cream studio backdrop (#FAF7F2)",
      props: "none",
    },
    technical_render: {
      camera,
      lighting: "professional studio, three-point softbox, warm tone",
      resolution: "ultra-crisp, photorealistic, 8k detail",
      style: "luxury jewelry catalog photography, Cartier/Tiffany level",
    },
  }, null, 2);
}

// ── Gemini API call ────────────────────────────────────────────────
async function callGemini(
  ai: any,
  prompt: string,
  referenceBase64: string | null,
): Promise<{ imageData: string; mimeType: string } | null> {
  const contents: any[] = [];
  contents.push({ text: prompt });

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

// ── Main generation action ─────────────────────────────────────────
export const generate = internalAction({
  args: { designId: v.id("designs") },
  handler: async (ctx, { designId }) => {
    try {
      const design = await ctx.runQuery(internal.designs.getInternal, { designId });

      console.log("=== GENERATION START ===");
      console.log("Name:", design.name, "| Karat:", design.karat);
      console.log("Font:", design.font, "| Style:", design.style);
      console.log("Reference:", design.referenceUrl ? "yes" : "no");

      // Status: analyzing
      await ctx.runMutation(internal.designs.updateStatus, {
        designId,
        status: "analyzing",
        analysisStep: "Studying the piece...",
      });

      // Get reference image as base64
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

      // Status: engraving
      await ctx.runMutation(internal.designs.updateStatus, {
        designId,
        status: "engraving",
        analysisStep: `Engraving '${design.name}' in ${design.karat} gold...`,
        analysisData: {
          jewelryType: design.jewelryType || "Pendant",
          metal: `${design.karat} Gold`,
          bestSpot: "AI visualized",
        },
      });

      // Initialize Gemini
      const { GoogleGenAI } = await import("@google/genai");
      const saJsonBase64 = process.env.GOOGLE_SA_JSON;
      if (!saJsonBase64) throw new Error("GOOGLE_SA_JSON not set");
      const saJson = JSON.parse(Buffer.from(saJsonBase64, "base64").toString());

      const ai = new GoogleGenAI({
        vertexai: true,
        project: process.env.GCP_PROJECT_ID || "cyphersol-prod",
        location: process.env.GCP_LOCATION || "global",
        googleAuthOptions: { credentials: saJson },
      });

      // Generate 4 variations sequentially (rate limit ~2/min)
      for (let i = 0; i < 4; i++) {
        try {
          const prompt = referenceBase64
            ? buildReferencePrompt(design, i)
            : buildFromScratchPrompt(design, i);

          console.log(`Variation ${i + 1}/4: ${CAMERA_ANGLES[i].slice(0, 50)}...`);

          const result = await callGemini(ai, prompt, referenceBase64);

          if (result) {
            const imageBuffer = Buffer.from(result.imageData, "base64");
            const blob = new Blob([imageBuffer], { type: result.mimeType });
            const storageId = await ctx.storage.store(blob);
            await ctx.runMutation(internal.designs.addGeneratedImage, {
              designId,
              imageStorageId: storageId,
            });
            console.log(`  ✓ Variation ${i + 1} stored`);
          } else {
            console.warn(`  ✗ Variation ${i + 1} returned no image`);
          }

          // 15s between calls for rate limit (except after last)
          if (i < 3) {
            await new Promise((r) => setTimeout(r, 15000));
          }
        } catch (err: any) {
          console.error(`Variation ${i + 1} failed:`, err.message || err);
        }
      }

      // Check results
      const finalDesign = await ctx.runQuery(internal.designs.getInternal, { designId });
      const imageCount = finalDesign.imageStorageIds?.length || 0;

      if (imageCount === 0) {
        throw new Error("No images generated");
      }

      console.log(`=== DONE: ${imageCount}/4 images ===`);
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
