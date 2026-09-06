# Fixed example renderer

The customer designer uses one deterministic jewelry assembly. It does not look up the closest catalogue photograph. Customer names are saved as text; the fixed example geometry is Asma/Fatima or أسماء/فاطمة.

- `assembly.ts` canonicalizes all visible choices. Hidden second-name/layout and hidden gemstone values do not change geometry. Customer spelling, engraving, requests and the retired chain-length field do not change the front example.
- `scene.ts` loads versioned filled SVG outlines, builds extruded letters, connects components, packs nested stone settings within filled contours while respecting letter holes, and attaches the chosen chain. Camera views capture the same assembly. A fixed camera per view makes 22/32 mm visibly different.
- `usePiece.ts` lazily creates one WebGL context, serializes work, discards superseded captures, and releases object URLs. Errors belong to individual views. Review captures use a higher resolution than interactive examples.
- `storage.ts` saves immutable image Blobs in IndexedDB. Only snapshot descriptors and specifications enter the existing versioned local draft/bag state. A storage failure has explicit session-only behavior.

The source outlines and OFL font licenses are in `public/atelier/geometry/v1`. Jewelry-free imagegen background candidates and lineage are in `public/atelier/scenes/v1`. Previous photographs remain available for old bag items and historical asset review.

This is a fixed-sample customer visualization. Diwani/Thuluth option outlines use disclosed inspired font mappings. Lighting and the On-skin background are illustrative; the renderer does not establish manufacturing approval or fit on a specific customer's body. No provider credentials, customer image-generation requests, pricing or checkout integration are added.

Current browser acceptance uses `pnpm --filter @jewelo/web exec playwright test -c playwright.renderer.config.ts`. The earlier `atelier.spec.ts` records the superseded catalogue/mock-generation contract; its photo-ID assertions are not claims about this renderer. Unit tests retain those archival catalogue checks alongside assembly, geometry rules, snapshot and model coverage.
