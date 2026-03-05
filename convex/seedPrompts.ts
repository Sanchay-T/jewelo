"use node";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// ── Handlebars Templates ──────────────────────────────────────────────
// These are direct conversions of the hardcoded prompt builders in
// src/lib/prompts/*.ts into Handlebars template strings.

const TEMPLATES: Array<{ slug: string; name: string; template: string }> = [
  {
    slug: "fromScratch",
    name: "From Scratch v1",
    template: `Design and photograph a custom {{aesthetic}} {{#if isNamePendant}}name pendant{{else}}{{jewelryType}}{{/if}} from scratch.

{{#if isNamePendant}}
STEP 1 -- DESIGN THE NAME PENDANT:
The name '{{name}}' written in {{fontStyle}} IS the pendant itself. There is NO separate pendant body -- the letters are the shape, laser-cut or cast as one continuous piece of solid {{karat}} {{metalLabel}} gold with a high polish, warm luster, and flawless mirror-like surface. Think of name necklaces you see on Etsy or in a gold souk: the word hangs from a chain, each letter connected to the next. The piece is {{sizeFeel}}, with a {{aesthetic}} design aesthetic and {{decoration}}. The letters should have beautiful {{fontStyle}} styling with natural flourishes, their thickness substantial enough to read clearly but still elegant. Small decorative elements like hearts, stars, butterflies, or flowers may connect to the first or last letter for added charm. {{chainDesc}}
CRITICAL: There is NO flat plate, NO oval body, NO pendant behind the letters. The letters themselves ARE the entire piece. The silhouette of the pendant IS the word '{{name}}'.
{{else}}
STEP 1 -- DESIGN THE PIECE:
Create a {{aesthetic}} {{jewelryType}} crafted from solid {{karat}} {{metalLabel}} gold with a high polish, warm luster, and flawless mirror-like surface with realistic micro-reflections. The piece features {{decoration}} and is {{sizeFeel}}. {{chainDesc}}Think about where the name will be engraved BEFORE designing the shape. Ensure there is a prominent, elegant surface area for the name '{{name}}' -- the name should be the hero element, so design the piece around it.
{{/if}}

{{#if isNamePendant}}
STEP 2 -- REFINE THE LETTERING:
{{> textReference}}

If a second attached image shows the name rendered in the correct font and language, use it as your EXACT visual guide for character shapes, spacing, and direction. Match it precisely.

The name '{{name}}' must be rendered in {{fontStyle}}.
Each letter is solid gold -- not engraved text on a surface, but the actual physical shape of the pendant.
The gold has thickness and dimension -- you can see the depth of the metal from the side.
Light catches the polished face of each letter, creating highlights and reflections.
CRITICAL: Every single letter of '{{name}}' must be present, correctly shaped, and clearly readable. Do not skip, add, or rearrange any letters.
{{else}}
STEP 2 -- ENGRAVE THE NAME:
Now integrate the customer's name as a beautifully engraved element on the piece you designed in Step 1.

{{> textReference}}

If a second attached image shows the name rendered in the correct font and language, use it as your EXACT visual guide for character shapes, spacing, and direction. Match it precisely.

The name '{{name}}' must be engraved in {{fontStyle}}.
Spelling check: {{spellingCheck}}.
Place the name in the most prominent, natural location on the piece. The engraving should feel intentional -- like the piece was designed FOR this name. Scale the text proportionally to the piece.
{{> engravingPhysics}}
CRITICAL: Every single letter of '{{name}}' must be present and clearly legible. Do not skip, add, or rearrange any letters.
{{/if}}

STEP 3 -- RENDER THE FINAL PHOTOGRAPH:
Render the completed piece with engraving as a professional product photograph.

CAMERA & LIGHTING:
- Angle: {{variationCamera}}
- Lighting: {{variationLighting}}
- Lens: 85mm macro, f/2.8
- Feel: {{variationFeel}}
- Resolution: ultra-crisp, photorealistic, 8K detail

FRAMING:
Show the COMPLETE piece from bail/attachment to bottom. Do not crop any part of the jewelry.
The piece occupies 60-70% of frame height, centered with generous negative space on all sides.
Include chain attachment point. The viewer must see the full silhouette of the piece.

BACKGROUND:
{{background}}
No props -- the jewelry is the only object in frame. Centered, clean, catalog-ready composition.
Style: luxury jewelry catalog photography, Cartier/Tiffany/Bulgari level.

OUTPUT: Generate a SQUARE 1:1 image. Luxury catalog quality. No watermarks.

{{> absoluteRules}}`,
  },
  {
    slug: "reference",
    name: "Reference Shot v1",
    template: `You are a master jeweler AND a professional product photographer.

A customer has brought you a reference image of a {{#if isNamePendant}}name pendant{{else}}{{jewelryType}}{{/if}} they love. They want a piece that follows this reference's STYLE, but made to their exact specifications below. You will craft it and photograph the result.

{{#if isNamePendant}}
STEP 1 — ANALYZE THE REFERENCE:
Study the attached reference image. This is a name pendant where the letters of a name form the pendant shape itself -- there is no separate pendant body. Look at how the font style shapes each letter, how the letters connect to one another, whether there are decorative elements like hearts, flowers, or butterflies, and how the chain attaches to the first and last letter. Use this overall style and letter construction as your inspiration.
{{else}}
STEP 1 — ANALYZE THE REFERENCE:
Study the attached reference image carefully. Observe the overall shape and silhouette, the design elements that define its character such as curves, edges, and proportions, and identify the flat or gently curved surfaces where engraving is physically possible. Use this shape as your design foundation.
{{/if}}

{{#if isNamePendant}}
STEP 2 — APPLY THE CUSTOMER'S SPECIFICATIONS:
The customer wants this as a name pendant where the letters form the shape, crafted from {{karat}} {{metalLabel}} gold with a high polish and warm luster. The piece is {{sizeFeel}} with a {{aesthetic}} design aesthetic and features {{decoration}}. If the reference shows a different metal color, karat, or decoration style, override it with these customer choices.
{{else}}
STEP 2 — APPLY THE CUSTOMER'S SPECIFICATIONS:
The customer wants this as a {{jewelryType}} crafted from {{karat}} {{metalLabel}} gold with a high polish and warm luster. The piece is {{sizeFeel}} with a {{aesthetic}} design aesthetic and features {{decoration}}. If the reference shows a different metal color, karat, or decoration style, override it with these customer choices.
{{/if}}

{{#if isNamePendant}}
STEP 3 — FORM THE NAME AS THE PENDANT:
{{> textReference}}

If a second attached image shows the name rendered in the correct font and language, use it as your EXACT visual guide for character shapes, spacing, and direction. Match it precisely.

The name '{{name}}' in {{fontStyle}} IS the pendant shape — the letters are solid {{karat}} {{metalLabel}} gold, laser-cut or cast as one continuous piece.
There is NO flat plate or pendant body behind the letters. The silhouette of the pendant IS the word '{{name}}'.
Each letter has thickness and dimension — solid gold with polished faces catching the light.
The chain attaches at both ends of the name.
CRITICAL: Every letter of '{{name}}' must be present, correctly shaped, and clearly readable.
{{else}}
STEP 3 — ENGRAVE THE NAME:
{{> textReference}}

If a second attached image shows the name rendered in the correct font and language, use it as your EXACT visual guide for character shapes, spacing, and direction. Match it precisely.

The name '{{name}}' must be engraved in {{fontStyle}}. Find the most prominent, natural location on the piece for the engraving -- a surface that is visible, smooth enough, and large enough. Do not overlap any stones, settings, clasps, or decorative elements, and let the text follow the natural curve of the surface. The name '{{name}}' must be the hero element, clearly readable at first glance.
{{> engravingPhysics}}
{{/if}}

STEP 4 — PHOTOGRAPH THE RESULT:
Capture the finished piece with a {{variationCamera}} camera angle and {{variationLighting}} lighting. Use an 85mm macro lens at f/2.8 with shallow depth of field for a {{variationFeel}} feel.

FRAMING:
Show the COMPLETE piece from bail/attachment to bottom. Do not crop any part of the jewelry.
The piece occupies 60-70% of frame height, centered with generous negative space on all sides.
Include chain attachment point. The viewer must see the full silhouette of the piece.

BACKGROUND:
{{background}}
Centered composition, no props, no humans.
Style: luxury jewelry catalog photography, Cartier/Tiffany/Bulgari level.

OUTPUT: SQUARE 1:1 image. Professional jewelry catalog quality. No watermarks.

{{> absoluteRules}}

Generate the photograph now.`,
  },
  {
    slug: "onBody",
    name: "On-Body Shot v1",
    template: `Generate a professional jewelry advertisement photograph showing a {{jewelryType}} in {{karat}} {{metalLabel}} gold being worn.

{{#if hasReference}}The attached reference shows the jewelry style. Generate an on-body lifestyle shot of a similar piece being worn.{{else}}Generate an on-body lifestyle shot of a {{jewelryType}} in {{karat}} {{metalLabel}} gold being worn.{{/if}}

PIECE DETAILS:
This is a {{aesthetic}} {{jewelryType}} crafted from {{karat}} {{metalLabel}} gold with a high polish and warm luster. It features {{decoration}} and is {{sizeFeel}}. The quality standard is Cartier, Tiffany, Bulgari editorial campaign level.

BODY & FRAMING:
The piece is worn on the {{bodyPart}}. Frame the shot as {{bodyFraming}}, with the model in {{bodyPose}}. The model has natural warm-toned skin with a healthy glow. {{bodyRules}}. Wardrobe is minimal or absent -- bare skin or simple neutral fabric that does not compete with the jewelry. The jewelry is the star of the photograph.

{{> textReference}}

{{#if isNamePendant}}
THE NAME AS THE PENDANT:
The name '{{name}}' forms the pendant itself -- the letters are solid {{karat}} {{metalLabel}} gold shapes, not engraved grooves on a separate surface. Each letter is a physical piece of gold with thickness and dimension, connected to form the word '{{name}}' in {{fontStyle}}. There is no flat plate or pendant body behind the letters. Every single letter must be visible, correctly shaped, and clearly readable even in the on-body context. The name is the star of this photograph.
{{else}}
ENGRAVING:
The name '{{name}}' is engraved on this piece in {{fontStyle}}. The engraving cuts V-shaped grooves into the metal, with angled walls that catch light as bright specular lines on one side and fall into soft shadow on the other. The grooves follow the 3D curvature of the surface and taper to fine points at the start and end of each stroke. The engraved name '{{name}}' MUST be clearly readable even in the on-body context -- frame the shot so the jewelry and especially the engraved name are prominent and legible. The name is the star of this photograph.
{{/if}}

CAMERA & LIGHTING:
- Angle: {{variationCamera}}
- Lighting: {{variationLighting}}. Soft studio lighting, shallow depth of field.
- Lens: 85mm, f/1.8, creamy bokeh
- Depth of field: shallow -- jewelry tack-sharp, background and skin softly blurred
- Feel: {{variationFeel}}
- Resolution: ultra-crisp, photorealistic, 8K detail

OUTPUT: Generate a SQUARE 1:1 image. Professional jewelry ad quality. No watermarks.

{{> absoluteRules}}`,
  },
  {
    slug: "chainedOnBody",
    name: "Chained On-Body v1",
    template: `IDENTITY CONSTRAINT — THIS IS THE SAME PIECE:
{{#if isNamePendant}}The first attached image shows the EXACT {{karat}} {{metalLabel}} gold name pendant where the name '{{name}}' forms the pendant shape -- the letters ARE the piece. You MUST use this exact piece in the on-body shot below. Do NOT redesign or create a new piece. Same letter shapes, same decorative elements, same metal, same chain. Only the context changes (now worn on a person).{{else}}The first attached image shows the EXACT {{karat}} {{metalLabel}} gold {{jewelryType}} with the name '{{name}}' engraved on it. You MUST use this exact piece in the on-body shot below. Do NOT redesign or create a new piece. Same metal, same shape, same engraving, same stones, same chain. Only the context changes (now worn on a person).{{/if}}
If a second attached image shows the name rendered in text, use it as a visual guide to ensure the name remains accurate on-body.

{{> onBody}}`,
  },
  {
    slug: "video",
    name: "Video Prompt v1",
    template: `On-body lifestyle video of a model wearing a {{karat}} {{metalLabel}} gold {{jewelryType}}.

Movement: {{videoMotion}}.

Lighting: {{videoLighting}}.

The model's movement is slow, natural, and elegant -- like a luxury jewelry advertisement.
The jewelry is the star -- it catches light beautifully as the model moves.
Shallow depth of field: the jewelry is tack-sharp, background and skin softly blurred.
Cinematic 9:16 vertical framing, the piece is always visible and prominent in frame.

Style: luxury jewelry brand social media content, Cartier/Tiffany/Bulgari campaign quality,
professional studio lighting, cinematic color grading, warm and inviting mood,
ultra-smooth motion, no shaking, no sudden movements.

Duration: 5-6 seconds, single continuous take, no cuts.`,
  },
  {
    slug: "videoNegative",
    name: "Video Negative Prompt v1",
    template: `shaky camera, blurry, out of focus, distorted geometry, morphing shapes, melting metal, text overlay, watermark, logo, fast movement, sudden cuts, jump cuts, flickering, low quality, pixelated, noisy, grainy, overexposed, underexposed, color banding, artifacts, deformed jewelry, broken chain, misshapen stones, floating objects, multiple pieces, duplicate jewelry, distorted face, extra fingers, deformed hands`,
  },
];

// ── Handlebars Partials ───────────────────────────────────────────────

const PARTIALS: Array<{ slug: string; name: string; template: string }> = [
  {
    slug: "textReference",
    name: "Text Reference Block v1",
    template: `TEXT REFERENCE — THE NAME TO RENDER:
The customer's name is: "{{name}}"
Spelled character by character: {{charSpelling}}
Total characters: {{charCount}}
{{languageNote}}
Every character must be present, correctly shaped, and in the exact order shown above. Do NOT add, remove, or rearrange any characters.`,
  },
  {
    slug: "engravingPhysics",
    name: "Engraving Physics v1",
    template: `ENGRAVING PHYSICS — V-SHAPED GROOVE IN REAL METAL:
The engraving tool cuts V-shaped grooves directly into the metal surface, creating channels with angled walls that interact with light in physically accurate ways. The groove wall facing the light source catches it as a bright specular line, while the wall turned away falls into soft shadow. At the deepest point of each groove, the metal is darkest. Where each groove edge meets the flat surface, a sharp specular highlight traces the outline of every letter. The engraving follows the 3D curvature of the surface -- never flat text pasted onto a curved object. At the start and end of each stroke, the groove tapers to a fine point where the burin enters and exits the metal. Zoomed in 400%, the engraving shows physical depth carved into the metal, not printed or overlaid text.`,
  },
  {
    slug: "absoluteRules",
    name: "Absolute Rules v1",
    template: `ABSOLUTE RULES:
{{referenceRule}}The name text must be physically part of the metal -- raised, embossed, or engraved into the surface -- never flat printed or overlaid. The background is {{background}}. Use professional studio lighting with a soft key light and subtle fill to reveal the metal's luster and the depth of every detail. This is luxury catalog quality -- the image will be shown to customers as a product preview. The pendant hangs naturally from its bail or chain attachment point with realistic gravity. No watermarks, no logos, no text overlays outside the jewelry itself. The output image must be photorealistic at 1024x1024 resolution.`,
  },
  {
    slug: "onBody",
    name: "On-Body Partial v1",
    template: `Generate a professional jewelry advertisement photograph showing a {{jewelryType}} in {{karat}} {{metalLabel}} gold being worn.

{{#if hasReference}}The attached reference shows the jewelry style. Generate an on-body lifestyle shot of a similar piece being worn.{{else}}Generate an on-body lifestyle shot of a {{jewelryType}} in {{karat}} {{metalLabel}} gold being worn.{{/if}}

PIECE DETAILS:
This is a {{aesthetic}} {{jewelryType}} crafted from {{karat}} {{metalLabel}} gold with a high polish and warm luster. It features {{decoration}} and is {{sizeFeel}}. The quality standard is Cartier, Tiffany, Bulgari editorial campaign level.

BODY & FRAMING:
The piece is worn on the {{bodyPart}}. Frame the shot as {{bodyFraming}}, with the model in {{bodyPose}}. The model has natural warm-toned skin with a healthy glow. {{bodyRules}}. Wardrobe is minimal or absent -- bare skin or simple neutral fabric that does not compete with the jewelry. The jewelry is the star of the photograph.

{{> textReference}}

{{#if isNamePendant}}
THE NAME AS THE PENDANT:
The name '{{name}}' forms the pendant itself -- the letters are solid {{karat}} {{metalLabel}} gold shapes, not engraved grooves on a separate surface. Each letter is a physical piece of gold with thickness and dimension, connected to form the word '{{name}}' in {{fontStyle}}. There is no flat plate or pendant body behind the letters. Every single letter must be visible, correctly shaped, and clearly readable even in the on-body context. The name is the star of this photograph.
{{else}}
ENGRAVING:
The name '{{name}}' is engraved on this piece in {{fontStyle}}. The engraving cuts V-shaped grooves into the metal, with angled walls that catch light as bright specular lines on one side and fall into soft shadow on the other. The grooves follow the 3D curvature of the surface and taper to fine points at the start and end of each stroke. The engraved name '{{name}}' MUST be clearly readable even in the on-body context -- frame the shot so the jewelry and especially the engraved name are prominent and legible. The name is the star of this photograph.
{{/if}}

CAMERA & LIGHTING:
- Angle: {{variationCamera}}
- Lighting: {{variationLighting}}. Soft studio lighting, shallow depth of field.
- Lens: 85mm, f/1.8, creamy bokeh
- Depth of field: shallow -- jewelry tack-sharp, background and skin softly blurred
- Feel: {{variationFeel}}
- Resolution: ultra-crisp, photorealistic, 8K detail

OUTPUT: Generate a SQUARE 1:1 image. Professional jewelry ad quality. No watermarks.

{{> absoluteRules}}`,
  },
];

// ── Config Maps (JSON-stringified) ────────────────────────────────────

const CONFIGS: Array<{ key: string; data: any }> = [
  {
    key: "fontStyles",
    data: {
      script: "elegant flowing cursive script with connected letter strokes and graceful loops",
      modern: "clean modern sans-serif uppercase with uniform stroke width and geometric proportions",
      classic: "refined classic serif with balanced proportions and subtle bracketed serifs",
      naskh: "traditional Naskh Arabic calligraphy with flowing connected letterforms and balanced dots",
      diwani: "ornate Diwani Arabic calligraphy with dramatic curved strokes and stacked composition",
      kufi: "angular Kufic Arabic calligraphy with geometric straight lines and square proportions",
      regular: "standard regular-weight letterforms with even stroke width and neutral proportions",
      serif: "classic serif letterforms with elegant thin-to-thick stroke contrast and traditional terminals",
      bold: "bold heavyweight letterforms with strong stroke width and commanding presence",
    },
  },
  {
    key: "backgroundStyles",
    data: {
      yellow: "dark emerald green velvet fabric background (#1B3D2F), slightly draped with soft folds catching ambient light, providing rich contrast against yellow gold",
      yellow_gold: "dark emerald green velvet fabric background (#1B3D2F), slightly draped with soft folds catching ambient light, providing rich contrast against yellow gold",
      white: "deep navy blue velvet fabric background (#0F1B2D), smooth with subtle texture, providing elegant contrast against bright white gold",
      white_gold: "deep navy blue velvet fabric background (#0F1B2D), smooth with subtle texture, providing elegant contrast against bright white gold",
      rose: "warm cream linen fabric background (#FAF7F2), softly textured with gentle folds, complementing the soft pink-copper tones of rose gold",
      rose_gold: "warm cream linen fabric background (#FAF7F2), softly textured with gentle folds, complementing the soft pink-copper tones of rose gold",
    },
  },
  {
    key: "decorationStyles",
    data: {
      gold_only: "pure polished gold with no stones — clean, elegant surfaces with mirror-like reflections and subtle brushed accents",
      gold_with_stones: "gold set with semi-precious gemstones (sapphires, rubies, or emeralds) in prong or bezel settings along the frame or bail",
      gold_with_diamonds: "gold set with brilliant-cut diamonds in micro-pave or channel settings, each facet catching light with fire and scintillation",
    },
  },
  {
    key: "sizeFeels",
    data: {
      small: "delicate and petite, approximately 12mm in height — subtle everyday jewelry with fine detail",
      medium: "balanced and versatile, approximately 18mm in height — the classic statement pendant size",
      large: "bold and commanding, approximately 25mm in height — a striking centerpiece with generous surface area",
    },
  },
  {
    key: "variations",
    data: [
      {
        name: "Hero",
        camera: "front-facing straight-on view, pendant centered in frame with even margins on all sides",
        lighting: "even diffused studio lighting with twin soft-boxes at 45 degrees, minimal shadows, clean white bounce fill from below",
        feel: "clean catalog product shot — crisp, symmetrical, no drama, maximum clarity for e-commerce",
      },
      {
        name: "Angled",
        camera: "3/4 turn showing the pendant at roughly 30-40 degrees from front, revealing side profile and depth",
        lighting: "key light from the right side at 45 degrees with subtle fill on the left, creating gentle shadows that reveal form",
        feel: "dimensional and sculptural — emphasises the 3D depth of the lettering and the thickness of the metal",
      },
      {
        name: "Macro",
        camera: "tight close-up crop on the engraved or embossed name, filling 70-80% of the frame with the text detail",
        lighting: "focused spot light raking across the surface at a low angle to accentuate groove depth and surface texture",
        feel: "intimate detail shot — showcases craftsmanship, metal grain, and the physical depth of every letter stroke",
      },
      {
        name: "Dramatic",
        camera: "slightly lower angle looking up at the pendant, creating a sense of grandeur and presence",
        lighting: "warm directional light from upper-left with deep shadows on the right, dramatic fall-off into darkness",
        feel: "moody luxury editorial — evokes high-end magazine advertising with rich contrast and emotional impact",
      },
    ],
  },
  {
    key: "bodyMapping",
    data: {
      pendant: {
        part: "neck and upper chest",
        framing: "chin to clavicle, tight crop on the neckline area",
        pose: "elegant, slightly turned head, natural relaxed shoulders",
        rules: "NO face above the lips, NO eyes, NO full head visible",
      },
      necklace: {
        part: "neck and upper chest",
        framing: "chin to clavicle, tight crop on the neckline area",
        pose: "elegant, slightly turned head, natural relaxed shoulders",
        rules: "NO face above the lips, NO eyes, NO full head visible",
      },
      name_pendant: {
        part: "neck and upper chest",
        framing: "chin to clavicle, tight crop centering the name pendant on the chest so every letter of the name is visible and readable",
        pose: "straight-on or slight 3/4 turn, relaxed shoulders, pendant resting naturally",
        rules: "NO face above the lips, NO eyes, NO full head visible",
      },
      chain: {
        part: "neck and upper chest",
        framing: "chin to mid-chest, showing the full chain drape",
        pose: "natural, relaxed posture, chain catching light",
        rules: "NO face above the lips, NO eyes, NO full head visible",
      },
      ring: {
        part: "hand and fingers",
        framing: "close crop on the hand, ring prominent on the finger",
        pose: "graceful hand pose, fingers slightly separated, elegant and relaxed",
        rules: "NO face, NO body above the wrist, hand only",
      },
      bracelet: {
        part: "hand and wrist",
        framing: "wrist and lower forearm, hand upright in an Apple-style product hand pose",
        pose: "wrist slightly turned to catch light, fingers relaxed and natural",
        rules: "NO face, NO body above the mid-forearm, wrist and hand only",
      },
      earrings: {
        part: "ear and jawline",
        framing: "side profile from ear to jaw, hair swept back to reveal the earring",
        pose: "head turned to show the earring in profile, chin slightly lifted",
        rules: "NO eyes visible, NO frontal face, side profile only, hair swept behind the ear",
      },
    },
  },
  {
    key: "videoMotion",
    data: {
      pendant: "the model slowly turns her head to the side, the pendant catches light and gently sways on her chest, camera holds steady with a slight slow push-in toward the neckline",
      name_pendant: "the model subtly tilts her chin upward and turns slightly, the name pendant catches a warm glint of light as each gold letter rests against her collarbone, camera slowly pushes in with shallow depth of field to reveal the name detail, 85mm cinematic lens feel",
      ring: "the model slowly rotates her hand, fingers gently moving, the ring catches light from different angles, camera holds tight on the hand with a soft slow pan",
      bracelet: "the model gently lifts and turns her wrist, the bracelet catches light, camera follows the wrist with a slow tracking shot",
      earrings: "the model turns her head slowly to one side, the earring sways and catches light, camera holds at ear level with a subtle push-in",
      chain: "the model takes a slow breath, the chain rises and falls gently on her chest, catching light, camera slowly pans down from chin to the chain detail",
      necklace: "the model slowly turns from profile to front-facing, the necklace drapes naturally and catches light across the curve of her neck, camera holds steady at chest level",
    },
  },
  {
    key: "videoLighting",
    data: {
      yellow: "warm golden-hour studio lighting, soft key light from upper left, gentle fill from right, warm skin tones, gold glowing with rich luster",
      yellow_gold: "warm golden-hour studio lighting, soft key light from upper left, gentle fill from right, warm skin tones, gold glowing with rich luster",
      rose_gold: "warm pink-tinted soft lighting, gentle key light from upper left, subtle fill, rose gold glowing with soft copper-pink warmth against the skin",
      rose: "warm pink-tinted soft lighting, gentle key light from upper left, subtle fill, rose gold glowing with soft copper-pink warmth against the skin",
      white_gold: "cool neutral studio lighting, crisp key light from upper left, clean fill, white gold gleaming with bright silver-platinum reflections",
      white: "cool neutral studio lighting, crisp key light from upper left, clean fill, white gold gleaming with bright silver-platinum reflections",
    },
  },
];

// ── Seed Action ───────────────────────────────────────────────────────

export const seed = internalAction({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const hasTemplates = await ctx.runQuery(internal.prompts.hasAnyTemplates, {});
    if (hasTemplates) {
      console.log("[seed] Already seeded — skipping");
      return { seeded: false, reason: "already exists" };
    }

    console.log("[seed] Seeding prompt templates, partials, and configs...");

    // Insert templates
    for (const t of TEMPLATES) {
      await ctx.runMutation(internal.seedHelpers.insertTemplate, {
        slug: t.slug,
        version: 1,
        name: t.name,
        template: t.template,
        isActive: true,
        createdAt: Date.now(),
      });
    }
    console.log(`[seed] Inserted ${TEMPLATES.length} templates`);

    // Insert partials
    for (const p of PARTIALS) {
      await ctx.runMutation(internal.seedHelpers.insertPartial, {
        slug: p.slug,
        version: 1,
        name: p.name,
        template: p.template,
        isActive: true,
        createdAt: Date.now(),
      });
    }
    console.log(`[seed] Inserted ${PARTIALS.length} partials`);

    // Insert configs
    for (const c of CONFIGS) {
      await ctx.runMutation(internal.seedHelpers.insertConfig, {
        key: c.key,
        version: 1,
        data: JSON.stringify(c.data),
        isActive: true,
        createdAt: Date.now(),
      });
    }
    console.log(`[seed] Inserted ${CONFIGS.length} configs`);

    return { seeded: true, templates: TEMPLATES.length, partials: PARTIALS.length, configs: CONFIGS.length };
  },
});

