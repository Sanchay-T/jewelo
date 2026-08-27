# Caleums Arabic identity engine v3

This directory is the immutable production extraction of the coordinator-approved
`caleums_pipeline_final.zip`. The Python files are provenance and regression
references only; production Trigger jobs use the narrow TypeScript adapter in
`src/caleums-arabic-v3.ts` and sharp 0.34.5's libvips/Pango/Fribidi/HarfBuzz
stack. No Python service or runtime dependency is introduced.

Only one-name Arabic `classic` (Amiri) and `minimal` (Scheherazade New) inputs
are live. Every other Arabic style and every two-name Arabic layout returns an
explicit pre-spend operator-review decision. English continues through the
existing deterministic renderer.

`manifest.json` records exact source checksums, licensing identifiers, approval
status, and the runtime shaping contract. The approved characters, final PNG,
validation report, and fingerprint are immutable task inputs.
