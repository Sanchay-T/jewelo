// Renders lab stencils with the PRODUCTION identity renderer so lab results
// transfer to the pipeline. Read-only against apps/ and packages/.
// Run from the repository root:
//   node docs/goals/overnight-launch/lab/render-production-stencils.ts <outDir>
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { renderIdentityAnchor } from "../../../../apps/jobs/src/identity-anchor.ts";

const outDir = resolve(process.argv[2] ?? "docs/goals/overnight-launch/lab/stencils/production");
mkdirSync(outDir, { recursive: true });

const NAMES = [
  { slug: "asma", en: "Asma", ar: "أسماء", role: "lab" },
  { slug: "noor", en: "Noor", ar: "نور", role: "holdout" },
  { slug: "layla", en: "Layla", ar: "ليلى", role: "holdout" },
  { slug: "muhammad", en: "Muhammad", ar: "محمد", role: "holdout" },
];
const LETTERINGS = ["classic", "kufi"] as const;

const specification = {
  layout: "single-name",
  connector: "integral-rings",
  dimensions: { widthMm: 32, heightMm: 12, thicknessMm: 1.6 },
};

async function main() {
  const records: unknown[] = [];
  for (const name of NAMES) {
    for (const lettering of LETTERINGS) {
      for (const language of ["en", "ar"] as const) {
        const approvedText = language === "ar" ? name.ar : name.en;
        const file = `${name.slug}-${language}-${lettering}.png`;
        try {
          const rendered = await renderIdentityAnchor(
            { approvedText, language, typography: lettering, fingerprint: `lab-${name.slug}-${language}-${lettering}` },
            language === "ar"
              ? { ...specification, arabicStyle: lettering, names: [{ approvedArabicText: approvedText }] }
              : specification,
          );
          writeFileSync(join(outDir, file), rendered.png);
          records.push({ file, slug: name.slug, role: name.role, language, lettering, approvedText, ok: true, pngSha256: rendered.pngSha256, report: rendered.report });
          console.log(`OK    ${file}  ${JSON.stringify(rendered.report)}`);
        } catch (error) {
          const message = error instanceof Error ? `${error.name}:${error.message}` : String(error);
          records.push({ file, slug: name.slug, role: name.role, language, lettering, approvedText, ok: false, error: message });
          console.log(`FAIL  ${file}  ${message}`);
        }
      }
    }
  }
  writeFileSync(join(outDir, "render-report.json"), JSON.stringify(records, null, 2) + "\n");
  console.log(`\n${records.length} cells -> ${outDir}`);
}

await main();
