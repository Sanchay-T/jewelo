"use node";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import {
  buildProductShotPrompt,
  buildOnBodyPrompt,
  buildFromScratchPrompt,
  type DesignInput,
} from "../src/lib/prompts/index";



// ── Gemini API call via Vertex AI ────────────────────────────────────
async function callGemini(
  ai: any,
  prompt: string,
  referenceImages: Array<{ base64: string; mimeType: string }>,
): Promise<{ imageData: string; mimeType: string } | null> {
  const contents: any[] = [];

  // Add all reference images as inline_data parts BEFORE the text prompt
  for (const ref of referenceImages) {
    contents.push({
      inlineData: {
        mimeType: ref.mimeType,
        data: ref.base64,
      },
    });
  }

  contents.push({ text: prompt });

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

// ── Helper: single Gemini call with retry (3x on 429, exponential backoff) ──
async function callGeminiWithRetry(
  ai: any,
  prompt: string,
  referenceImages: Array<{ base64: string; mimeType: string }>,
  label: string,
): Promise<{ imageData: string; mimeType: string } | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const start = Date.now();
      const result = await callGemini(ai, prompt, referenceImages);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);

      if (result) {
        console.log(`  OK ${label} (${elapsed}s)`);
        return result;
      } else {
        console.warn(`  EMPTY ${label} — no image returned (${elapsed}s)`);
        return null;
      }
    } catch (err: any) {
      const is429 =
        err.message?.includes("429") ||
        err.message?.includes("RESOURCE_EXHAUSTED");
      if (is429 && attempt < 2) {
        const wait = (attempt + 1) * 15;
        console.warn(
          `  RETRY ${label} — rate limited, waiting ${wait}s (attempt ${attempt + 1}/3)`,
        );
        await new Promise((r) => setTimeout(r, wait * 1000));
      } else {
        console.error(`  FAIL ${label}:`, err.message || err);
        return null;
      }
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

      // Status: analyzing — also gives the client time to upload the text reference
      await ctx.runMutation(internal.designs.updateStatus, {
        designId,
        status: "analyzing",
        analysisStep: "Studying the piece...",
      });

      // Brief pause to allow the client-side text reference upload to complete
      // (the client uploads in parallel after createDesign returns)
      await new Promise((r) => setTimeout(r, 2000));

      // Re-read design to pick up textReferenceStorageId saved by the client
      const freshDesign = await ctx.runQuery(internal.designs.getInternal, { designId });

      // Get reference image as base64
      let referenceBase64: string | null = null;
      let referenceUrl = freshDesign.referenceUrl;

      if (freshDesign.referenceStorageId) {
        const url = await ctx.storage.getUrl(freshDesign.referenceStorageId);
        if (url) referenceUrl = url;
      }

      if (referenceUrl) {
        try {
          const response = await fetch(referenceUrl);
          const buffer = await response.arrayBuffer();
          referenceBase64 = Buffer.from(buffer).toString("base64");

          if (!freshDesign.referenceStorageId) {
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

      // Download text reference image (Canvas-rendered name PNG)
      let textReferenceBase64: string | undefined;
      if (freshDesign.textReferenceStorageId) {
        const textRefUrl = await ctx.storage.getUrl(freshDesign.textReferenceStorageId);
        if (textRefUrl) {
          try {
            const textResp = await fetch(textRefUrl);
            const textBuffer = await textResp.arrayBuffer();
            textReferenceBase64 = Buffer.from(textBuffer).toString("base64");
            console.log("Text reference image loaded:", Math.round(textBuffer.byteLength / 1024), "KB");
          } catch (e) {
            console.error("Failed to download text reference:", e);
          }
        }
      }

      // Build reference images array for callGemini
      const referenceImages: Array<{ base64: string; mimeType: string }> = [];
      if (referenceBase64) {
        referenceImages.push({ base64: referenceBase64, mimeType: "image/jpeg" });
      }
      if (textReferenceBase64) {
        referenceImages.push({ base64: textReferenceBase64, mimeType: "image/png" });
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

      // ── Build DesignInput for the new prompt builders ──────────────
      const hasReference = !!(referenceBase64 || freshDesign.referenceStorageId);

      const designInput: DesignInput = {
        name: design.name,
        language: design.language as DesignInput["language"],
        font: design.font,
        size: design.size as DesignInput["size"],
        karat: design.karat as DesignInput["karat"],
        style: design.style as DesignInput["style"],
        metalType: (design.metalType || "yellow") as DesignInput["metalType"],
        jewelryType: design.jewelryType,
        designStyle: design.designStyle,
      };

      // ══════════════════════════════════════════════════════════════
      // HERO-ANCHORED GENERATION PIPELINE
      //
      // Step 1: Generate 1 hero product shot (preserves reference if exists)
      // Step 2: Use hero as anchor for 3 more angles + 4 on-body shots
      //
      // This ensures ALL outputs show the SAME jewelry piece.
      // ══════════════════════════════════════════════════════════════

      const VARIATION_COUNT = 4;
      const fontStyle = designInput.font;
      const metalLabel = designInput.metalType;
      const karat = designInput.karat;
      const jewelryType = designInput.jewelryType || "pendant";
      const name = designInput.name;

      // ── STEP 1: Generate hero product shot ──────────────────────
      console.log("--- Step 1: Generating HERO product shot ---");

      await ctx.runMutation(internal.designs.updateStatus, {
        designId,
        status: "engraving",
        analysisStep: "Creating your hero design...",
      });

      let heroPrompt: string;
      if (hasReference) {
        // REFERENCE FLOW: Use the proven universal engrave prompt
        // This preserves the original jewelry piece and only adds engraving
        heroPrompt = `You are a master jeweler AND a professional product photographer.

A customer has brought you this piece of jewelry and asked you to engrave the name '${name}' on it. You will engrave it, then photograph the result in the exact same setup.

STEP 1 — ANALYZE THIS PHOTO:
Before you do anything, study this image carefully:
- What type of jewelry is this?
- Where is the light coming from?
- What metal is this?
- What is the surface finish?
- Where are the flat or gently curved surfaces where engraving is physically possible?
- What is the camera angle and depth of field?

STEP 2 — DECIDE PLACEMENT:
Based on your analysis, find the single best location to engrave '${name}':
- Choose a surface that is visible, smooth enough, and large enough for the text
- Do NOT overlap any stones, settings, clasps, or decorative elements
- Text should follow the natural curve of the surface
- Font size proportional to the piece — realistic but legible
- The name '${name}' must be the hero element — clearly readable at first glance

STEP 3 — ENGRAVE WITH REAL PHYSICS:
- V-shaped grooves cut into metal surface
- Groove wall facing light = bright specular highlight
- Groove wall away from light = shadow
- Deepest point of each groove is darkest
- Sharp specular highlight where groove edge meets flat surface
- Text follows 3D curvature — NOT flat text pasted on
- Letter strokes taper at start and end (burin entry/exit)

ABSOLUTE RULES:
- DO NOT change anything about this image except adding the engraving
- Same jewelry, same stones, same chain, same background, same lighting, same camera angle
- The engraving must look like it existed BEFORE the photograph was taken
- At 400% zoom, show physical depth in the metal
- Output the same composition as the input — SQUARE 1:1 format

Output the edited photograph now.`;
      } else {
        // FROM SCRATCH FLOW: Design a new piece
        heroPrompt = buildFromScratchPrompt(designInput, 0);
      }

      const heroResult = await callGeminiWithRetry(
        ai, heroPrompt, referenceImages, "HERO"
      );

      if (!heroResult) {
        throw new Error("Hero product shot failed — cannot continue");
      }

      // Store hero image
      const heroBuffer = Buffer.from(heroResult.imageData, "base64");
      const heroBlob = new Blob([heroBuffer], { type: heroResult.mimeType });
      const heroStorageId = await ctx.storage.store(heroBlob);
      await ctx.runMutation(internal.designs.addProductImage, {
        designId, storageId: heroStorageId,
      });

      console.log("  ✓ Hero product shot stored");

      // Hero base64 becomes the anchor for ALL subsequent calls
      const heroBase64 = heroResult.imageData;

      await ctx.runMutation(internal.designs.updateStatus, {
        designId,
        status: "engraving",
        analysisStep: "Creating variations of your design...",
      });

      // ── STEP 2: Generate remaining shots anchored to hero ───────
      // 3 more product angles + 4 on-body shots = 7 calls
      // All receive the hero image as reference
      console.log("--- Step 2: Generating 3 angle variations + 4 on-body shots ---");

      const heroRef: Array<{ base64: string; mimeType: string }> = [
        { base64: heroBase64, mimeType: "image/png" },
      ];
      // Also include text reference if available
      if (textReferenceBase64) {
        heroRef.push({ base64: textReferenceBase64, mimeType: "image/png" });
      }

      // Build all 7 prompts
      const anglePrompts = [1, 2, 3].map((i) => {
        const angles = [
          "3/4 angled view showing depth and dimension",
          "macro close-up focused on the engraved name and metal texture",
          "slightly lower angle with warm directional lighting, editorial mood",
        ];
        return `You are a professional jewelry product photographer.

You have been given a photograph of a ${karat} ${metalLabel} gold ${jewelryType} with the name '${name}' engraved on it.

Photograph this EXACT SAME piece from a different angle: ${angles[i - 1]}.

CRITICAL RULES:
- This is the SAME physical jewelry piece — do NOT redesign it
- Same metal color, same shape, same engraving, same stones (if any)
- Same chain and clasp style (if present)
- Only the camera angle and lighting change
- The engraved name '${name}' must remain clearly legible
- Professional studio photography, SQUARE 1:1 format
- 85mm lens, shallow depth of field

Generate the photograph now.`;
      });

      const onBodyPrompts = [0, 1, 2, 3].map((i) => {
        const angles = [
          "front-facing, centered, even studio lighting",
          "slightly angled, key light from upper-left",
          "close crop emphasizing the jewelry, focused lighting",
          "warm directional light, editorial mood",
        ];

        // Body part mapping
        let bodyPart = "neck and upper chest";
        let framing = "Frame from chin to clavicle. No face visible.";
        let pose = "Jewelry resting naturally, chain draping over collarbones";

        if (jewelryType === "ring") {
          bodyPart = "hand and fingers";
          framing = "Close crop on hand and wrist. Graceful hand pose.";
          pose = "Ring on ring finger, fingers slightly spread";
        } else if (jewelryType === "bracelet") {
          bodyPart = "wrist and hand in upright position";
          framing = "Wrist facing camera, hand elevated.";
          pose = "Bracelet on wrist, hand upright with fingers relaxed";
        } else if (jewelryType === "earrings") {
          bodyPart = "ear and jawline";
          framing = "Side profile from ear to jaw. No eyes visible. Hair swept back.";
          pose = "Earring hanging naturally from earlobe";
        }

        return `You are a luxury jewelry advertising photographer. Style reference: Cartier, Tiffany, Bulgari editorial campaigns.

You have been given a product photograph of a ${karat} ${metalLabel} gold ${jewelryType} with the name '${name}' engraved on it.

Now photograph this EXACT SAME piece being worn on a person:
- Body part: ${bodyPart}
- Framing: ${framing}
- Pose: ${pose}
- Camera: ${angles[i]}
- Skin: Natural warm-toned skin
- 85mm lens, f/1.8, creamy bokeh background

CRITICAL RULES:
- This must be the EXACT SAME jewelry piece from the reference image
- Same metal, same shape, same engraving, same stones
- Do NOT redesign or alter the jewelry in any way
- The engraved name '${name}' must remain clearly visible
- NO face visible. NO eyes. The jewelry is the star.
- Professional jewelry ad quality, SQUARE 1:1 format

Generate the on-body photograph now.`;
      });

      // Fire all 7 with rate-limit-friendly stagger
      const allPrompts = [
        ...anglePrompts.map((p, i) => ({ type: "product" as const, prompt: p, label: `angle[${i + 2}]` })),
        ...onBodyPrompts.map((p, i) => ({ type: "onbody" as const, prompt: p, label: `on-body[${i + 1}]` })),
      ];

      // Process in batches of 2 with 5s stagger
      for (let batch = 0; batch < allPrompts.length; batch += 2) {
        if (batch > 0) {
          await new Promise((r) => setTimeout(r, 5000));
        }

        const batchItems = allPrompts.slice(batch, batch + 2);
        console.log(`  Batch ${Math.floor(batch / 2) + 1}: ${batchItems.map(b => b.label).join(" + ")}`);

        const results = await Promise.all(
          batchItems.map((item) =>
            callGeminiWithRetry(ai, item.prompt, heroRef, item.label)
          )
        );

        for (let j = 0; j < results.length; j++) {
          const result = results[j];
          const item = batchItems[j];
          if (!result) {
            console.warn(`  SKIP ${item.label} — no image`);
            continue;
          }
          try {
            const buf = Buffer.from(result.imageData, "base64");
            const blob = new Blob([buf], { type: result.mimeType });
            const sid = await ctx.storage.store(blob);
            if (item.type === "product") {
              await ctx.runMutation(internal.designs.addProductImage, { designId, storageId: sid });
            } else {
              await ctx.runMutation(internal.designs.addOnBodyImage, { designId, storageId: sid });
            }
            console.log(`  ✓ ${item.label} stored`);
          } catch (e: any) {
            console.error(`  STORE FAIL ${item.label}:`, e.message || e);
          }
        }

        await ctx.runMutation(internal.designs.updateStatus, {
          designId,
          status: "engraving",
          analysisStep: `Creating your designs... (${Math.min(batch + 2, allPrompts.length) + 1}/8)`,
        });
      }

      // ── Check results ─────────────────────────────────────────────
      const finalDesign = await ctx.runQuery(internal.designs.getInternal, { designId });
      const productCount = finalDesign.productImageStorageIds?.length || 0;
      const onBodyCount = finalDesign.onBodyImageStorageIds?.length || 0;

      if (productCount === 0) {
        throw new Error("No images generated");
      }

      console.log(`=== DONE: ${productCount} product + ${onBodyCount} on-body images ===`);
      await ctx.runMutation(internal.designs.completeGeneration, { designId });

      // Trigger 4 Veo video generations (2s stagger)
      for (let i = 0; i < 4; i++) {
        await ctx.scheduler.runAfter(i * 2000, internal.video.generateVideo, {
          designId,
          variationIndex: i,
        });
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
