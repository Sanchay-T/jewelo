import {
  authenticatedUser,
  jsonError,
} from "../../../lib/backend/supabase-rest";

const ACCEPTED = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

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
          "content-type": file.type,
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
