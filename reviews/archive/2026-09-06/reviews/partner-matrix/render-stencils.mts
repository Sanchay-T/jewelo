import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderIdentityAnchor } from "../../apps/jobs/src/identity-anchor.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outRoot = join(root, "reviews/partner-matrix/stencils");

const arabic = ["أسماء", "نور", "محمد", "عبدالرحمن"] as const;
const latin = ["ASMA", "MUHAMMAD"] as const;
const slug: Record<string, string> = {
  أسماء: "asma",
  نور: "nur",
  محمد: "muhammad",
  عبدالرحمن: "abdulrahman",
  ASMA: "asma",
  MUHAMMAD: "muhammad",
};

async function main() {
  const rows: unknown[] = [];
  mkdirSync(join(outRoot, "noto-naskh"), { recursive: true });
  mkdirSync(join(outRoot, "playfair"), { recursive: true });

  for (const name of arabic) {
    const rendered = await renderIdentityAnchor(
      {
        approvedText: name,
        language: "ar",
        typography: "classic",
        fingerprint: "stage0",
      },
      {
        names: [{ approvedArabicText: name }],
        arabicStyle: "classic",
        layout: "single-name",
        connector: "none",
        dimensions: { widthMm: 30, heightMm: 12, thicknessMm: 1.2 },
      },
    );
    const file = join(outRoot, "noto-naskh", `${slug[name]}.png`);
    writeFileSync(file, rendered.png);
    rows.push({
      name,
      language: "ar",
      font: rendered.report.fontFile ?? "NotoNaskhArabic-Regular.ttf",
      file: file.replace(`${root}/`, ""),
      pngSha256: rendered.pngSha256,
      report: rendered.report,
    });
    console.log("ar", name, rendered.report);
  }

  for (const name of latin) {
    const rendered = await renderIdentityAnchor(
      {
        approvedText: name,
        language: "en",
        typography: "Playfair Display",
        fingerprint: "stage0",
      },
      {
        layout: "single-name",
        connector: "none",
        dimensions: { widthMm: 30, heightMm: 12, thicknessMm: 1.2 },
      },
    );
    const file = join(outRoot, "playfair", `${slug[name]}.png`);
    writeFileSync(file, rendered.png);
    rows.push({
      name,
      language: "en",
      font: "Playfair Display",
      file: file.replace(`${root}/`, ""),
      pngSha256: rendered.pngSha256,
      report: rendered.report,
    });
    console.log("en", name, rendered.pngSha256);
  }

  writeFileSync(
    join(outRoot, "stage0-report.json"),
    JSON.stringify(rows, null, 2),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
