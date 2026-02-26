"use node";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const FONT_STYLES: Record<string, string> = {
  script: "elegant flowing cursive script",
  modern: "clean, modern, bold block capitals",
  classic: "refined classic serif with balanced proportions",
  // Arabic fonts
  naskh: "traditional Arabic Naskh calligraphy, elegant and readable",
  diwani: "ornate Arabic Diwani script, decorative and flowing",
  kufi: "geometric Arabic Kufi script, bold and angular",
  // Chinese fonts
  regular: "clean standard Chinese typeface",
  serif: "elegant Chinese serif typeface with traditional strokes",
  bold: "bold Chinese typeface with strong presence",
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
    step_1_analyze: {
      instruction: "First, carefully study the reference image. Identify:",
      questions: [
        "What type of jewelry is this? (ring, pendant, necklace, bracelet, earring, etc.)",
        "What metal is it made of? (yellow gold, rose gold, white gold, silver, platinum)",
        "What is the surface area available for engraving?",
        "Where is the largest flat or gently curved metal surface where text would naturally be placed by a jeweler?",
        "What is the existing style — minimalist, ornate, modern, vintage?",
        "Are there stones, diamonds, or decorative elements to avoid when placing text?",
      ],
    },
    step_2_plan_engraving: {
      instruction: "Based on your analysis, decide the best placement for the engraved name.",
      name_to_engrave: design.name,
      character_count: design.name.length,
      spelling_check: `The text must read exactly: ${design.name.split("").join(" - ")}`,
      font_style: fontStyle,
      placement_rules: [
        "Choose the spot where a real master jeweler would engrave — the most natural, elegant location",
        "For pendants: typically the front face or along the curve",
        "For rings: the outer band or inner band",
        "For bracelets: the flat plate or outer surface",
        "For necklaces: the pendant or charm element",
        "Avoid placing text over stones, clasps, or decorative elements",
        "Scale the text to fit proportionally — not too large, not too small",
      ],
    },
    step_3_generate: {
      instruction: "Now generate the final image with the engraving applied.",
      preserve_rules: [
        "Keep the EXACT same jewelry piece from the reference — same metal, same stones, same chain, same composition",
        "Do NOT redesign or change anything except adding the engraving",
        "The engraving must look like it was always there — as if photographed after a jeweler engraved it",
      ],
      engraving_physics: [
        "V-shaped grooves cut by engraving burin",
        "Groove wall facing light = bright specular highlight",
        "Groove wall in shadow = darker than surrounding metal",
        "Letter strokes taper at start and end (burin entry/exit)",
      ],
      text_accuracy: `CRITICAL: Every single letter of '${design.name}' must be present and clearly legible. Do not skip any letters. The name has ${design.name.length} characters.`,
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
    step_1_design_piece: {
      instruction: `Design a beautiful custom ${type} from scratch. Think about what would make this piece stunning and unique.`,
      jewelry_spec: {
        type,
        design_style: aesthetic,
        material: `solid ${design.karat} yellow gold`,
        finish: "high polish with warm luster",
        decoration,
        size: sizeFeel,
        chain: type.includes("pendant") || type.includes("necklace") ? "delicate matching gold chain" : "none",
      },
      design_considerations: [
        `This is a ${aesthetic} ${type} — keep the design true to that style`,
        "Think about where the name will be engraved BEFORE designing the shape",
        "Ensure there is a prominent, elegant surface area for the name",
        "The name should be the hero element — design the piece around it",
      ],
    },
    step_2_engrave_name: {
      instruction: "Now integrate the customer's name as a beautifully engraved element.",
      name_to_engrave: design.name,
      character_count: design.name.length,
      spelling_check: `The text must read exactly: ${design.name.split("").join(" - ")}`,
      font_style: fontStyle,
      text_accuracy: `CRITICAL: Every single letter of '${design.name}' must be present and clearly legible. Do not skip any letters. The name has ${design.name.length} characters.`,
      placement: [
        "Place the name in the most prominent, natural location on the piece",
        "The engraving should feel intentional — like the piece was designed FOR this name",
        "Scale the text proportionally to the piece",
      ],
      engraving_physics: [
        "Flawlessly embossed into the metal, following the 3D curves",
        "V-shaped grooves with specular highlights on lit groove walls",
        "Shadow side of grooves darker than surrounding metal",
        "Letter strokes taper at start and end (burin entry/exit)",
      ],
    },
    step_3_final_render: {
      instruction: "Render the final product photograph.",
      environment: {
        background: "warm cream studio backdrop (#FAF7F2)",
        props: "none",
      },
      camera,
      lighting: "professional studio, three-point softbox, warm tone",
      resolution: "ultra-crisp, photorealistic, 8k detail",
      style: "luxury jewelry catalog photography, Cartier/Tiffany level",
    },
  }, null, 2);
}

// ── JSON PROMPT: Name pendant (name IS the shape) ──────────────────
function buildNamePendantPrompt(
  design: {
    name: string;
    karat: string;
    font: string;
    size: string;
    style: string;
    designStyle?: string;
  },
  variationIndex: number,
): string {
  const fontStyle = FONT_STYLES[design.font] || "elegant script";
  const decoration = DECORATION_STYLES[design.style] || "none, pure polished gold";
  const sizeFeel = SIZE_FEELS[design.size] || "balanced, elegant, 18mm";
  const aesthetic = design.designStyle || "minimalist";
  const camera = CAMERA_ANGLES[variationIndex];

  return JSON.stringify({
    concept: {
      instruction: "Design a custom name pendant necklace where the NAME ITSELF forms the entire pendant shape.",
      type: "name pendant / wire name necklace",
      description: `The word '${design.name}' written in ${fontStyle} IS the pendant. The letters are formed from solid ${design.karat} gold wire/metal, connected as one continuous piece hanging from a delicate chain.`,
      reference_styles: [
        "Wire name necklace as seen at Tiffany & Co, Zales, Kay Jewelers",
        "The letters flow into each other as one continuous piece of gold",
        "NOT text engraved on a flat pendant surface — the text IS the pendant",
      ],
    },
    design_spec: {
      name: design.name,
      character_count: design.name.length,
      spelling_check: `The text must read exactly: ${design.name.split("").join(" - ")}`,
      font_style: fontStyle,
      text_accuracy: `CRITICAL: Every single letter of '${design.name}' must be present and clearly legible. The name has ${design.name.length} characters.`,
      material: `solid ${design.karat} yellow gold`,
      finish: "high polish with warm luster",
      decoration,
      size: sizeFeel,
      chain: "delicate matching gold chain with spring ring clasp",
    },
    render: {
      camera,
      background: "warm cream studio backdrop (#FAF7F2)",
      lighting: "professional studio, three-point softbox, warm tone",
      resolution: "ultra-crisp, photorealistic, 8k detail",
      style: `${aesthetic} luxury jewelry catalog photography`,
    },
  }, null, 2);
}

// ── Gemini API call via Vertex AI ────────────────────────────────────
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
    model: "gemini-3.1-flash-image-preview",
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

      // Initialize Gemini via Google AI Studio (higher rate limits than Vertex AI)
      const { GoogleGenAI } = await import("@google/genai");
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY not set");

      const ai = new GoogleGenAI({ apiKey });

      // Generate 4 variations in parallel (AI Studio paid tier: 10+ RPM)
      const promises = CAMERA_ANGLES.map(async (angle, i) => {
        // 3s stagger to avoid burst spike
        if (i > 0) await new Promise((r) => setTimeout(r, i * 3000));

        const prompt = referenceBase64
          ? buildReferencePrompt(design, i)
          : design.jewelryType === "name_pendant"
            ? buildNamePendantPrompt(design, i)
            : buildFromScratchPrompt(design, i);

        console.log(`Variation ${i + 1}/4: ${angle.slice(0, 50)}...`);

        // Retry up to 3 times on 429
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const start = Date.now();
            const result = await callGemini(ai, prompt, referenceBase64);
            const elapsed = ((Date.now() - start) / 1000).toFixed(1);

            if (result) {
              const imageBuffer = Buffer.from(result.imageData, "base64");
              const blob = new Blob([imageBuffer], { type: result.mimeType });
              const storageId = await ctx.storage.store(blob);
              await ctx.runMutation(internal.designs.addGeneratedImage, {
                designId,
                imageStorageId: storageId,
              });
              console.log(`  ✓ Variation ${i + 1} stored (${elapsed}s)`);

              await ctx.runMutation(internal.designs.updateStatus, {
                designId,
                status: "engraving",
                analysisStep: `Variation ${i + 1} of 4 complete...`,
              });
              return true;
            } else {
              console.warn(`  ✗ Variation ${i + 1} returned no image (${elapsed}s)`);
              return false;
            }
          } catch (err: any) {
            const is429 = err.message?.includes("429") || err.message?.includes("RESOURCE_EXHAUSTED");
            if (is429 && attempt < 2) {
              const wait = (attempt + 1) * 15;
              console.warn(`  ⏳ Variation ${i + 1} rate limited, retrying in ${wait}s (attempt ${attempt + 1}/3)`);
              await new Promise((r) => setTimeout(r, wait * 1000));
            } else {
              console.error(`  ✗ Variation ${i + 1} failed:`, err.message || err);
              return false;
            }
          }
        }
        return false;
      });

      const results = await Promise.allSettled(promises);
      for (const [i, r] of results.entries()) {
        if (r.status === "rejected") {
          console.error(`Variation ${i + 1} failed:`, r.reason?.message || r.reason);
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
