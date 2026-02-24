export function universalEngravePrompt(name: string): string {
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
