import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

// Use AI Studio API key (higher rate limits)
const apiKey = process.env.GEMINI_API_KEY || "AIzaSyD6M6thFSp_ws4BzrJ4ccUVhtdPWuPkM_8";
const ai = new GoogleGenAI({ apiKey });

const outputDir = path.resolve("public/hero");
fs.mkdirSync(outputDir, { recursive: true });

async function generate(contents, outputName) {
  console.log(`\n  Generating: ${outputName}...`);
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-image-preview",
    contents: Array.isArray(contents) ? contents : [{ text: contents }],
    config: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  });
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.text) console.log(`   ${part.text.slice(0, 100)}`);
    if (part.inlineData?.data) {
      const ext = part.inlineData.mimeType?.includes("png") ? "png" : "jpg";
      const filePath = path.join(outputDir, `${outputName}.${ext}`);
      const buffer = Buffer.from(part.inlineData.data, "base64");
      fs.writeFileSync(filePath, buffer);
      console.log(`   Saved: ${filePath} (${(buffer.length / 1024).toFixed(0)}kb)`);
      return { filePath, base64: part.inlineData.data, mimeType: part.inlineData.mimeType };
    }
  }
  console.error(`   No image generated`);
  return null;
}

async function main() {
  console.log("=== Hero Slider — Omran ===\n");

  // STEP 1: Generate the RENDER
  const renderPrompt = `Generate a stunning photorealistic product photograph of a luxury custom pendant necklace.

THE PENDANT:
- An ornate teardrop-shaped pendant in warm 21K rose gold
- The name "Omran" in beautiful Arabic-inspired calligraphic script, raised gold lettering
- Intricate vine and leaf filigree wrapping around the letters
- 6-8 tiny brilliant-cut diamonds scattered along the vines
- A crescent moon shape at the top forming the bail
- Delicate rose gold chain with small oval links

CRITICAL TEXT:
- The name must read exactly: O - m - r - a - n (5 characters)
- Every letter must be clearly legible

COMPOSITION:
- The pendant hangs CENTERED in the frame, occupying about 60% of the image height
- The chain enters from the upper-left and upper-right corners, meeting at the bail
- Straight-on camera angle, very slight downward tilt
- Background: smooth warm cream gradient, slightly darker at edges

PHOTOGRAPHY:
- Soft studio lighting from upper-left
- Warm cream/champagne background
- The pendant casts a subtle soft shadow directly below it
- Sharp focus throughout
- Luxury catalog quality, Cartier/Tiffany level`;

  const render = await generate(renderPrompt, "render");
  if (!render) { console.error("Render failed"); process.exit(1); }

  // Wait for rate limit
  console.log("\n  Waiting 15s...");
  await new Promise(r => setTimeout(r, 15000));

  // STEP 2: Generate sketch FROM the render
  const sketchPrompt = `Convert this photograph into a rough hand-drawn sketch on notebook paper.

CRITICAL RULES:
- The sketch must show the EXACT SAME pendant in the EXACT SAME position, angle, and size
- Every element in the same place — chain, pendant shape, name "Omran", details
- The sketch occupies the same area of the frame as the photograph

SKETCH STYLE:
- Drawn with a black ballpoint pen on white lined notebook paper
- The lines are wobbly and imperfect — drawn by a regular person, not an artist
- The letters "Omran" are attempted but messy and uneven
- The vine details are rough squiggles
- Small circles where the diamonds are
- Handwritten annotations with arrows: "diamonds here", "vine pattern", "rose gold?"
- A coffee ring stain in one corner
- Some lines traced over multiple times
- The paper has blue horizontal ruled lines

The composition must EXACTLY match the photograph for a before/after slider.`;

  await generate(
    [
      { text: sketchPrompt },
      { inlineData: { mimeType: render.mimeType || "image/png", data: render.base64 } },
    ],
    "sketch"
  );

  console.log("\n=== Done! ===");
}

main().catch(console.error);
