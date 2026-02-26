/**
 * Canvas Text Renderer
 *
 * Renders the user's name in the exact selected font onto an HTML Canvas
 * and exports as a PNG Blob. This PNG is fed to Gemini as a reference image
 * so the AI copies the exact letterforms for pendant generation.
 */

/** Font family CSS mapping for each font style key */
const FONT_FAMILY_MAP: Record<string, string> = {
  // English fonts
  script: "'Playfair Display', serif",
  modern: "'Inter', sans-serif",
  classic: "'Playfair Display', serif",
  // Arabic fonts
  naskh: "'Noto Naskh Arabic', serif",
  diwani: "'Noto Naskh Arabic', serif",
  kufi: "'Noto Naskh Arabic', serif",
  // Chinese fonts
  regular: "'Noto Sans SC', sans-serif",
  serif: "'Noto Serif SC', serif",
  bold: "'Noto Sans SC', sans-serif",
};

/** Font weight/style prefix for canvas font string */
const FONT_WEIGHT_MAP: Record<string, string> = {
  script: "italic 400",
  modern: "700",
  classic: "400",
  naskh: "400",
  diwani: "400",
  kufi: "700",
  regular: "400",
  serif: "400",
  bold: "700",
};

const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 256;
const DEFAULT_FONT_SIZE = 72;
const MAX_TEXT_WIDTH = 480;

/**
 * Renders the given name text onto a canvas using the specified font style
 * and returns a PNG Blob suitable for use as a Gemini reference image.
 *
 * @param name - The user's name to render
 * @param font - Font style key (e.g. "script", "modern", "naskh", "kufi")
 * @param language - Language code ("en", "ar", "zh")
 * @returns PNG Blob of the rendered text on transparent background
 */
export async function renderTextToCanvas(
  name: string,
  font: string,
  language: string
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get 2D canvas context");
  }

  // Clear to transparent
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Resolve font family and weight
  const fontFamily = FONT_FAMILY_MAP[font] ?? "'Inter', sans-serif";
  const fontWeight = FONT_WEIGHT_MAP[font] ?? "400";

  // Start with default font size
  let fontSize = DEFAULT_FONT_SIZE;

  // Set initial font to measure text
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

  // Auto-scale: if measured text width exceeds MAX_TEXT_WIDTH, reduce proportionally
  const measured = ctx.measureText(name);
  if (measured.width > MAX_TEXT_WIDTH) {
    fontSize = Math.floor(fontSize * (MAX_TEXT_WIDTH / measured.width));
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  }

  // Set text direction for Arabic
  if (language === "ar") {
    ctx.direction = "rtl";
  }

  // Draw white text, centered
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(name, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

  // Export as PNG Blob
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("canvas.toBlob returned null"));
        }
      },
      "image/png"
    );
  });
}
