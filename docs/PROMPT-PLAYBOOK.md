# Prompt playbook

Prompts are versioned product assets. Each task stores the resolved prompt release and canonical identity fingerprint.

## Shared identity block

```text
IDENTITY AUTHORITY
The attached canonical jewelry asset is the source of truth.
The visible text must read exactly: “{{approvedText}}”.
Preserve every character, order, connection, counter-space and silhouette.
Do not translate, respell, add, remove or stylize letters beyond the canonical geometry.
The product, worn image and motion clip must depict the same physical piece.
If the exact identity cannot be preserved, return no usable result.
```

## Product still

```text
Create a premium photorealistic studio product image of the exact attached jewelry piece.

{{identityBlock}}

SPECIFICATION
- type: {{jewelryType}}
- metal: {{karat}} {{metalColor}} gold
- finish: {{finish}}
- stones: {{stones}}
- target dimensions: {{dimensions}}
- direction: {{directionBrief}}

CAMERA AND LIGHT
Macro luxury-jewelry photography, physically plausible reflections, controlled highlights,
clean edge definition, realistic chain/attachments, neutral premium background.
The whole piece is visible and large enough to inspect. Square composition with safe margins.

DO NOT
No alternate words, duplicate chains, floating stones, fused clasps, impossible intersections,
watermarks, hands, packaging, extra jewelry, text labels or logos.
```

## Worn still

```text
Place the exact attached product on an adult model while preserving the identical piece.
Use the canonical asset and approved product image as identity references.

{{identityBlock}}

Show believable scale and placement for {{jewelryType}} at {{dimensions}}.
Natural skin texture, editorial but not distracting styling, anatomically plausible contact,
correct gravity, chain path and shadows. Portrait 4:5 composition.
The jewelry is the focal point; do not redesign it to fit the scene.
```

## Motion preview

```text
Create a six-second vertical 9:16 luxury jewelry motion study of the exact attached piece.

{{identityBlock}}

SHOT
A restrained camera arc and subtle physically plausible pendant movement.
Begin with a clean hero view, reveal metal and stone highlights, then settle into a readable final frame.
Keep the name front-facing and legible long enough to inspect. Premium warm light, shallow depth of field,
no cuts that hide identity, no morphing, no new objects and no change to the chain or geometry.
```

## Negative / rejection guidance

```text
Reject: spelling drift, transformed letters, unreadable name, changed jewelry type, extra pendants,
duplicate chains, floating stones, impossible metal, melted geometry, unsafe body content,
logos, watermarks, captions, sudden camera motion, morphing or identity occlusion.
```

## Prompt architecture

```text
release
 ├── identity partial
 ├── material partial
 ├── product template
 ├── worn template
 ├── motion template
 ├── negative template
 └── model-specific config
```

A prompt release is immutable once used in production. New experiments create a new release and are activated only after evaluation.
