# Prompt and identity playbook

Prompts are versioned code artifacts. They compile typed design data into provider requests and are recorded with every call.

## Inputs

- canonical identity assets and fingerprint;
- immutable design revision;
- variation brief;
- representation kind: product, worn, fast motion preview, or selected final motion;
- prompt release;
- provider/model profile.

## Product still — GPT Image 2

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

Each of the four directions varies camera, lighting, surface, and editorial art direction—not pendant identity.

Recommended direction matrix:

```text
1  warm cream editorial / frontal macro
2  dark charcoal luxury / shallow three-quarter angle
3  soft rose-neutral / elevated side light
4  high-key gallery / restrained top-down composition
```

Do not make all four prompts identical except for a random seed.

## Worn still — GPT Image 2

```text
Use the approved product render and canonical identity as immutable references. Show that exact piece worn naturally by an adult model. Preserve glyph geometry, stones, metal, chain, scale, and attachments.

Portrait 4:5 editorial composition with clear neck/collarbone context. Natural anatomy and physical contact. Pendant unobstructed and readable. Change only wearer, environment, camera, and lighting.

No redesign, morphing, extra pendant, hidden name, mirrored text, incorrect scale, duplicated chain, or jewelry covering the pendant.
```

The matching product still is always the first visual reference for its worn task.

## Fast motion preview — Seedance 2.0 Fast

One fast preview is generated for each verified product direction.

```text
Animate the attached approved product still into a single continuous 4-second silent vertical 9:16 luxury-jewelry product shot.

IDENTITY LOCK
The pendant is immutable. Preserve the exact spelling, glyph contours, joins, stone positions, metal, chain attachment, dimensions, and silhouette from the first frame. No respelling, mirrored text, contour mutation, stone movement, chain duplication, stretching, melting, or extra jewelry.

CAMERA
One restrained cinematic movement only: a slow 10–20 degree micro-orbit with a very gentle push-in. Keep the entire pendant readable and inside frame. No cut, whip, zoom jump, rack-focus jump, or viewpoint that hides the name.

LIGHT
Move one warm specular highlight slowly across the gold while preserving realistic metal reflections. Soft premium background falloff. No flicker, pulsing, color shift, or artificial sparkle explosion.

PHYSICS
Pendant remains structurally rigid. Only extremely subtle physically plausible chain settling is allowed. No aggressive swinging or deformation.

END
Finish close to the opening composition for a clean loop. No text overlay, logo, watermark, hands, wearer, or audio.
```

Profile:

```text
endpoint       bytedance/seedance-2.0/fast/image-to-video
duration       4
resolution     720p
aspect_ratio   9:16
generate_audio false
bitrate_mode   standard
```

Variation motion briefs may differ slightly in camera direction or lighting path, but never identity constraints.

## Selected final motion — Seedance 2.0 Standard

```text
Create a single continuous 6-second silent vertical 9:16 luxury-jewelry hero shot from the attached approved still.

The pendant identity is immutable. Preserve exact spelling, geometry, stones, metal, chain, attachments, scale, and silhouette throughout every frame.

Use a restrained cinematic camera orbit/push-in, physically subtle movement, warm moving specular light, and shallow editorial depth of field. Keep the pendant readable and unobstructed. No cuts, morphing, mirror, extra jewelry, aggressive swing, hand occlusion, facial focus, logo, watermark, or audio.

End near the starting composition for a smooth loop.
```

The selected final may use the approved worn still when the intended shot is on-body; the provider request must explicitly choose product-hero or worn-hero mode rather than mixing them accidentally.

Profile:

```text
endpoint       bytedance/seedance-2.0/image-to-video
duration       6
resolution     720p (1080p only after evaluation/budget approval)
aspect_ratio   9:16
generate_audio false
```

## Negative/verification policy

Prompt text is not sufficient protection. Every output is checked against the canonical identity and expected media contract.

Hard failures:

- wrong, missing, repeated, or mirrored glyph;
- topology or attachment drift;
- metal or stone mismatch;
- duplicate pendant/chain;
- unreadable name;
- motion deformation;
- wrong duration/aspect/resolution;
- unexpected audio when the profile is silent.

A failed asset retries only its own task within the release’s bounded budget.

## Prompt releases

Store:

- release ID/version;
- template checksum;
- typed input snapshot;
- exact provider endpoint/model profile;
- canonical fingerprint;
- direction/motion brief;
- provider request/seed;
- output and verifier result;
- latency, attempts, and cost.

Never add a runtime admin prompt editor before the code-based release/rollback path is reliable.
