import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

const sa = JSON.parse(fs.readFileSync(path.resolve("../cyphersol-prod-ceef91ff98ca.json"), "utf-8"));
const ai = new GoogleGenAI({ vertexai: true, project: "cyphersol-prod", location: "global", googleAuthOptions: { credentials: sa } });

async function main() {
  // Test 1: numberOfImages with generateImages on gemini-3-pro-image-preview
  console.log("Test 1: generateImages with numberOfImages: 4...\n");
  try {
    const res = await ai.models.generateImages({
      model: "gemini-3-pro-image-preview",
      prompt: "A photorealistic product photo of a silver ring with the name Sanchay embossed on it. Professional studio lighting, cream background.",
      config: {
        numberOfImages: 4,
        aspectRatio: "1:1",
      },
    });
    console.log("generateImages result:", JSON.stringify(res).slice(0, 500));
    if (res.generatedImages) {
      console.log("Got", res.generatedImages.length, "images");
      for (let i = 0; i < res.generatedImages.length; i++) {
        const img = res.generatedImages[i];
        if (img.image?.imageBytes) {
          fs.writeFileSync(`test-genimg-${i}.png`, img.image.imageBytes);
          console.log(`Image ${i}: saved (${(img.image.imageBytes.length / 1024).toFixed(0)}kb)`);
        }
      }
    }
  } catch (e) {
    console.log("generateImages error:", e.message?.slice(0, 200));
  }

  // Test 2: Try imageConfig.numberOfImages inside generateContent
  console.log("\nTest 2: generateContent with imageConfig.numberOfImages: 4...\n");
  try {
    const res2 = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: "A silver ring with Sanchay embossed. Studio lighting, cream background.",
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: "1K",
          numberOfImages: 4,
        },
      },
    });
    const parts = res2.candidates?.[0]?.content?.parts || [];
    let imgCount = 0;
    for (const part of parts) {
      if (part.inlineData?.data) {
        imgCount++;
        const buf = Buffer.from(part.inlineData.data, "base64");
        fs.writeFileSync(`test-content-img-${imgCount}.png`, buf);
        console.log(`Image ${imgCount}: saved (${(buf.length / 1024).toFixed(0)}kb)`);
      }
    }
    console.log("Total images in response:", imgCount);
  } catch (e) {
    console.log("generateContent error:", e.message?.slice(0, 200));
  }
}

main().catch(console.error);
