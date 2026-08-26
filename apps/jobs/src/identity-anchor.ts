import sharp from "sharp";

interface IdentityAnchor {
  approvedText: string;
  language: "en" | "ar";
  typography: string;
  fingerprint: string;
}

function xml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function identityAnchorSvg(
  anchor: IdentityAnchor,
  specification: Readonly<Record<string, unknown>>,
) {
  const layout = String(specification.layout ?? "single-name");
  const connector = String(specification.connector ?? "none");
  const fontSize = Math.max(
    84,
    Math.min(190, 720 / Math.max(4, [...anchor.approvedText].length)),
  );
  const direction = anchor.language === "ar" ? "rtl" : "ltr";
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600" viewBox="0 0 1200 600">`,
    `<metadata>${xml(JSON.stringify({ fingerprint: anchor.fingerprint, layout, connector }))}</metadata>`,
    `<rect width="1200" height="600" fill="transparent"/>`,
    `<path d="M40 300 H255 M945 300 H1160" stroke="#111" stroke-width="10" fill="none"/>`,
    `<circle cx="255" cy="300" r="16" fill="none" stroke="#111" stroke-width="8"/>`,
    `<circle cx="945" cy="300" r="16" fill="none" stroke="#111" stroke-width="8"/>`,
    `<text x="600" y="330" text-anchor="middle" direction="${direction}" unicode-bidi="bidi-override" font-family="${xml(anchor.typography)}, DejaVu Sans" font-size="${fontSize}" font-weight="500" fill="#111">${xml(anchor.approvedText)}</text>`,
    `<text x="600" y="540" text-anchor="middle" font-family="DejaVu Sans" font-size="20" fill="#111">${xml(`${layout}|${connector}|${anchor.fingerprint}`)}</text>`,
    `</svg>`,
  ].join("");
}

export async function renderIdentityAnchor(
  anchor: IdentityAnchor,
  specification: Readonly<Record<string, unknown>>,
) {
  const svg = identityAnchorSvg(anchor, specification);
  const png = await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
    .toBuffer();
  return { svg: Buffer.from(svg), png };
}
