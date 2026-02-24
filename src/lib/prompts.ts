export function generationPrompt(design: {
  name: string;
  karat: string;
  font: string;
  size: string;
  style: string;
}): string {
  const fontDescriptions: Record<string, string> = {
    script: "elegant flowing cursive script",
    modern: "clean modern sans-serif uppercase",
    classic: "refined classic serif",
  };
  const fontDesc = fontDescriptions[design.font] || "elegant script";

  return `You are a world-class jewelry designer and luxury product photographer.

A customer wants a custom name pendant. They've shown you a reference image as inspiration.

STEP 1 — STUDY THE REFERENCE:
Analyze this jewelry piece — type, shape, metal, finish, stones, decorative elements.

STEP 2 — VISUALIZE IN 3D:
Construct this piece mentally as a 3D object. Understand depth, curvature, surfaces.
Identify the best surface for embossing '${design.name}'.

STEP 3 — CREATE:
Generate a photorealistic product photograph of a ${design.karat} gold pendant with '${design.name}' embossed in ${fontDesc}.
- Match the style of the reference but create a FRESH piece
- Letters have PHYSICAL DEPTH in the metal
- Professional studio lighting, warm cream background
- Luxury catalog quality

The name must be physically part of the metal. Generate now.`;
}

export function fromScratchPrompt(design: {
  name: string;
  karat: string;
  font: string;
  size: string;
  style: string;
  jewelryType?: string;
  designStyle?: string;
}): string {
  const fontDescriptions: Record<string, string> = {
    script: "elegant flowing cursive script",
    modern: "clean modern sans-serif uppercase",
    classic: "refined classic serif",
  };
  const fontDesc = fontDescriptions[design.font] || "elegant script";
  const type = design.jewelryType || "pendant";
  const aesthetic = design.designStyle || "minimalist";

  return `Generate a photorealistic product photograph of a custom ${aesthetic} ${design.karat} gold ${type} with '${design.name}' embossed in ${fontDesc}.
Letters have physical depth in the metal. Professional studio lighting, warm cream background, luxury catalog quality.
The name must be physically part of the metal. Generate now.`;
}
