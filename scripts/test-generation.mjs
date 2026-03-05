/**
 * Backend test script: validates the generation pipeline with timing metrics.
 *
 * Usage:
 *   cd app && node scripts/test-generation.mjs
 *
 * Tests both reference-based and from-scratch paths.
 * Uses the same prompt-building logic as convex/generation.ts.
 */
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

// ── Config ──────────────────────────────────────────────────────────
const SA_PATH = path.resolve("../cyphersol-prod-ceef91ff98ca.json");
const OUTPUT_DIR = path.resolve("../test-outputs/generation-test");

const FONT_STYLES = {
  script: "elegant flowing cursive script",
  modern: "clean, modern, bold block capitals",
  classic: "refined classic serif with balanced proportions",
};

const DECORATION_STYLES = {
  gold_only: "none, pure polished gold",
  gold_with_stones: "small gemstone accents along edges",
  gold_with_diamonds: "pave-set round brilliant-cut diamonds catching light",
};

const SIZE_FEELS = {
  small: "delicate, petite, 12mm",
  medium: "balanced, elegant, 18mm",
  large: "bold, statement-making, 25mm",
};

const CAMERA_ANGLES = [
  "front-facing hero shot, name centered and prominent",
  "angled 3/4 view showing depth and dimension of lettering",
  "100mm macro lens, tight crop on the engraved name and metal texture",
  "soft overhead angle with dramatic directional lighting on the name",
];

// ── Prompt builders (mirrors generation.ts) ─────────────────────────
function buildFromScratchPrompt(design, variationIndex) {
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
      chain: "delicate matching gold chain",
    },
    custom_typography: {
      engraved_text: design.name,
      character_count: design.name.length,
      spelling_check: `The text must read exactly: ${design.name.split("").join(" - ")}`,
      font_style: fontStyle,
      text_accuracy: `CRITICAL: Every single letter of '${design.name}' must be present and clearly legible. The name has ${design.name.length} characters.`,
      integration_style: "flawlessly embossed into the metal, following 3D curves of the piece",
      engraving_physics: [
        "V-shaped grooves cut by engraving burin",
        "Groove wall facing light = bright specular highlight",
        "Groove wall in shadow = darker than surrounding metal",
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

function buildReferencePrompt(design, variationIndex) {
  const fontStyle = FONT_STYLES[design.font] || "elegant script";
  const camera = CAMERA_ANGLES[variationIndex];

  return JSON.stringify({
    generation_profile: "commercial-jewelry-asset",
    task: "Engrave the customer's name onto the jewelry shown in the reference image. Do NOT redesign the jewelry — only add the engraving.",
    subject: {
      geometry_source: "Use the provided reference image EXACTLY.",
      preserve_rules: [
        "DO NOT change anything about this image except adding the engraving",
        "The engraving must look like it existed BEFORE the photograph was taken",
      ],
    },
    custom_typography: {
      engraved_text: design.name,
      character_count: design.name.length,
      spelling_check: `The text must read exactly: ${design.name.split("").join(" - ")}`,
      font_style: fontStyle,
      text_accuracy: `CRITICAL: Every single letter of '${design.name}' must be present and clearly legible. The name has ${design.name.length} characters.`,
      integration_style: "physically engraved into the metal surface with V-shaped grooves",
      engraving_physics: [
        "V-shaped grooves cut by engraving burin",
        "Groove wall facing light = bright specular highlight",
        "Groove wall in shadow = darker than surrounding metal",
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

// ── Gemini call ─────────────────────────────────────────────────────
async function callGemini(ai, prompt, referenceBase64) {
  const contents = [{ text: prompt }];
  if (referenceBase64) {
    contents.push({
      inlineData: { mimeType: "image/jpeg", data: referenceBase64 },
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-image-preview",
    contents,
    config: { responseModalities: ["TEXT", "IMAGE"] },
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

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  // Init
  if (!fs.existsSync(SA_PATH)) {
    console.error("Service account JSON not found at", SA_PATH);
    process.exit(1);
  }

  const sa = JSON.parse(fs.readFileSync(SA_PATH, "utf-8"));
  const ai = new GoogleGenAI({
    vertexai: true,
    project: "cyphersol-prod",
    location: "global",
    googleAuthOptions: { credentials: sa },
  });

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const design = {
    name: "Layla",
    font: "script",
    karat: "21K",
    size: "medium",
    style: "gold_only",
    jewelryType: "pendant",
    designStyle: "minimalist",
  };

  // ── Test 1: From-scratch (4 angles in parallel) ──────────────────
  console.log("═══════════════════════════════════════════════");
  console.log("  TEST 1: From-scratch generation (4 angles, parallel)");
  console.log("═══════════════════════════════════════════════");
  console.log(`  Name: ${design.name} | Font: ${design.font} | Karat: ${design.karat}`);
  console.log();

  const results = [];
  const totalStart = Date.now();

  // Fire all 4 calls in parallel
  const promises = CAMERA_ANGLES.map(async (angle, i) => {
    const prompt = buildFromScratchPrompt(design, i);
    console.log(`  [${i + 1}/4] ${angle.slice(0, 55)}...`);
    const start = Date.now();

    try {
      const result = await callGemini(ai, prompt, null);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);

      if (result) {
        const imageBuffer = Buffer.from(result.imageData, "base64");
        const ext = result.mimeType.includes("png") ? "png" : "jpg";
        const filename = `scratch-${i + 1}-${design.name}.${ext}`;
        fs.writeFileSync(path.join(OUTPUT_DIR, filename), imageBuffer);
        const sizeKb = (imageBuffer.length / 1024).toFixed(0);
        console.log(`    ✓ [${i + 1}] ${elapsed}s | ${sizeKb}kb | ${filename}`);
        return { variation: i + 1, time: elapsed, size: sizeKb, status: "ok" };
      } else {
        console.log(`    ✗ [${i + 1}] ${elapsed}s | no image returned`);
        return { variation: i + 1, time: elapsed, size: 0, status: "no_image" };
      }
    } catch (err) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`    ✗ [${i + 1}] ${elapsed}s | ERROR: ${err.message}`);
      return { variation: i + 1, time: elapsed, size: 0, status: "error" };
    }
  });

  const settled = await Promise.allSettled(promises);
  for (const r of settled) {
    results.push(r.status === "fulfilled" ? r.value : { variation: "?", time: "0", size: 0, status: "error" });
  }
  results.sort((a, b) => a.variation - b.variation);

  const totalTime = ((Date.now() - totalStart) / 1000).toFixed(1);
  const successCount = results.filter((r) => r.status === "ok").length;

  // ── Summary ───────────────────────────────────────────────────────
  console.log();
  console.log("═══════════════════════════════════════════════");
  console.log("  SUMMARY");
  console.log("═══════════════════════════════════════════════");
  console.log();
  console.log("  Var# │ Time   │ Size     │ Status");
  console.log("  ─────┼────────┼──────────┼────────");
  for (const r of results) {
    const t = `${r.time}s`.padEnd(6);
    const s = r.size ? `${r.size}kb`.padEnd(8) : "—".padEnd(8);
    console.log(`    ${r.variation}  │ ${t} │ ${s} │ ${r.status}`);
  }
  console.log("  ─────┼────────┼──────────┼────────");
  console.log(`  Total: ${totalTime}s | ${successCount}/4 succeeded`);
  console.log(`  Output: ${OUTPUT_DIR}`);
  console.log();

  if (successCount === 0) {
    console.error("  ❌ All generations failed!");
    process.exit(1);
  } else if (successCount < 4) {
    console.warn(`  ⚠️  Only ${successCount}/4 succeeded`);
  } else {
    console.log("  ✅ All 4 variations generated successfully");
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
