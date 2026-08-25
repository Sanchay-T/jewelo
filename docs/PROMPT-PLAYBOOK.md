# Prompt and identity playbook

Prompts are versioned code artifacts. They compile typed design data into provider requests and are recorded with every call.

## Inputs

- canonical identity assets and fingerprint;
- immutable design revision;
- variation brief;
- representation kind: product, worn, or motion;
- prompt release;
- provider/model profile.

## Product still

```text
Create a premium photorealistic fine-jewelry product photograph.

IDENTITY LOCK
The attached canonical pendant image is immutable. Preserve the exact glyph sequence, contours, joins, stone positions, metal, bail/chain attachment, and proportions. Do not respell, reinterpret, add, remove, mirror, or stylize any letter.

PRODUCT
{karat} {metal} {jewelry_type}; canonical identity {fingerprint}; {stone_description}; physically plausible thickness and craftsmanship.

COMPOSITION
Square 1:1. Product only. Entire piece visible, centered, no wearer, no text, no logo, no packaging.

LIGHT
Luxury editorial studio light, controlled specular highlights, restrained shadows, high material detail.

AVOID
extra jewelry, duplicated chains, floating stones, malformed clasps, impossible reflections, watermark, typography outside the piece.
```

Each of four directions varies camera/lighting/background art direction, not pendant identity.

## Worn still

```text
Use the approved product render and canonical identity as immutable references. Show that exact piece worn naturally by an adult model. Preserve glyph geometry, stones, metal, chain, scale, and attachments.

Square 1:1 editorial portrait crop with clear neck/collarbone context. Natural anatomy and physical contact. Pendant unobstructed and readable. Change only wearer, environment, camera, and lighting.

No redesign, morphing, extra pendant, hidden name, mirrored text, or incorrect scale.
```

## Motion

```text
Animate the approved selected still into a 6-second silent vertical 9:16 luxury-jewelry shot.

IDENTITY LOCK
The pendant is immutable. No respelling, contour mutation, stone movement, metal change, chain duplication, stretching, or extra jewelry.

MOTION
Slow restrained camera orbit/push-in. Subtle physically plausible chain movement. Warm moving specular highlight across gold. Shallow editorial depth of field. No aggressive swing, fast cut, hand occlusion, or facial focus.

END
Finish close enough to the opening composition for a smooth loop.
```

## Prompt releases

Store:

- release ID/version;
- template checksum;
- typed input snapshot;
- model/profile;
- canonical fingerprint;
- output and verifier result.

Never add a runtime admin prompt editor before the code-based release/rollback path is reliable.
