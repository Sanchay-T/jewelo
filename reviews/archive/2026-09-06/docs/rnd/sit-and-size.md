# Sit, size, and one piece

Binding for R&D stills and for any generation flow that uses these looks.
Updated 2026-09-04 from Umayr’s marks.

## Sits

**Bar** = the name reads as a wide horizontal piece.
Letters stay upright.

**Window** = the name sits inside a frame.
Letters stay upright and horizontal.

**Drop** = letters stay upright and stack top to bottom.
Never rotate the whole word 90°.
Arabic must still read as Arabic, not as a sideways stamp.
If stacking would split the metal into two pieces, do not rotate.
Hang the same upright letters as a falling piece, still one gold object.

## Box size

The metal follows the name.

- short (Noor / نور): compact. Little empty gold around the letters.
- medium (Asma / أسماء): default.
- long (Muhammad / محمد): wide. Letters fill the frame.

A short name in a long-name window is a fail.

Customer sizes on the wire: 22 mm and 32 mm.
New packshots default to 32 mm.
Do not reshoot old 30 mm passes just to change the number.

## One piece (this is what “janky” meant)

Janky means the gold is not properly connected.
The model must produce **one castable object on the first try**.

Put this block in every still prompt. Do not bury it.

```text
CASTING
This is one piece of 18K gold, as if it came from a single mould.
Every letter is physically fused to the next letter or to the frame.
No floating letters. No separate islands. No charms hanging off the name.
No air gap that would make two pieces in a caster's hand.
If the stencil shows bridges, those bridges are metal in the photo.
The two jump rings are attached to the body, not hovering.
A jeweler could pick the whole pendant up as one object.
If any letter is a separate piece, the image is wrong. Fuse it.
```

The stencil is already one connected component.
The photo must keep that connectivity.
Do not copy stencil rings as extra holes on letters.

Negative space and broken-frame looks are still one metal object.
The name may be a hole. The gold around it is one piece.

## The flow cannot go blank

The customer never sees an empty slot.
R&D never stops at “unfilled” while a connected photo is still possible.

```text
queued -> generating -> verifying -> ready
                     -> retrying  (not blank)
```

Retry until there is a photo in that slot.

1. Same cell, same stencil, stronger CASTING block.
2. If drop-stack splits the metal: drop = upright letters hanging as a fall, still one piece. Never 90° rotate.
3. If the look’s drop still cannot be one piece: keep bar or window of the same name on screen while drop retries. The slot still shows jewelry.
4. Stop only if the identity stencil itself cannot be built.

A fail is a retry, not a gray tile.
Do not put a failed photo in `pass/`.
Do put the last legal sibling in the customer view so the board is never empty.

Paid connectivity retries do not stop at 3.
Identity spelling failures also retry.
Do not start a new look while this cell still has no showable still.

## Auto-fail on pixels

- sideways Arabic (90° rotate)
- any letter as a separate island
- extra rings on letters
- frame sized for a different name length
- solid plaque when the look is openwork

Then retry. Do not leave the cell blank.
