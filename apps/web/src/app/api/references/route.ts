import {
  authenticatedUser,
  jsonError,
} from "../../../lib/backend/supabase-rest";

const ACCEPTED = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * The declared MIME type is the caller's word. The stored content type is taken
 * from the bytes instead, so nothing but a real image can be uploaded and later
 * served back from the app's own origin.
 */
function sniffImageType(bytes: Uint8Array): string | undefined {
  const at = (index: number) => bytes[index] ?? -1;
  if (
    bytes.length >= 8 &&
    at(0) === 0x89 &&
    at(1) === 0x50 &&
    at(2) === 0x4e &&
    at(3) === 0x47 &&
    at(4) === 0x0d &&
    at(5) === 0x0a &&
    at(6) === 0x1a &&
    at(7) === 0x0a
  )
    return "image/png";
  if (bytes.length >= 3 && at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff)
    return "image/jpeg";
  const ascii = (offset: number, text: string) =>
    [...text].every((character, index) => at(offset + index) === character.charCodeAt(0));
  if (bytes.length >= 12 && ascii(0, "RIFF") && ascii(8, "WEBP"))
    return "image/webp";
  return undefined;
}

export async function POST(request: Request) {
  try {
    const { bearer, config, user } = await authenticatedUser(request);
    const form = await request.formData();
    const referenceId = String(form.get("referenceId") ?? "");
    const file = form.get("file");
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(referenceId))
      throw new Error("Invalid reference ID");
    if (!(file instanceof File)) throw new Error("Reference file is required");
    if (!ACCEPTED.has(file.type) || file.size > MAX_BYTES)
      throw new Error("Reference must be PNG, JPEG, or WebP and at most 5 MB");
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const sniffed = sniffImageType(head);
    if (!sniffed)
      throw new Error("Reference must be a PNG, JPEG or WebP image");
    const fileName = file.name.replaceAll(/[^a-zA-Z0-9._-]/g, "_");
    const objectPath = `principal/${user.id}/${referenceId}/${fileName}`;
    const response = await fetch(
      `${config.url}/storage/v1/object/references/${objectPath
        .split("/")
        .map(encodeURIComponent)
        .join("/")}`,
      {
        method: "POST",
        headers: {
          apikey: config.key,
          authorization: `Bearer ${bearer}`,
          "content-type": sniffed,
          "x-upsert": "false",
        },
        body: file,
      },
    );
    if (!response.ok && response.status !== 409)
      throw new Error(`Reference upload failed:${response.status}`);
    return Response.json({ id: referenceId, fileName, objectPath });
  } catch (error) {
    return jsonError(error);
  }
}
