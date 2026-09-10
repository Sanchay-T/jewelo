import { jewelryDraftSpecificationSchema } from "@jewelo/contracts";

import {
  ApiError,
  authenticatedUser,
  jsonError,
  readJson,
  supabaseRequest,
  validated,
} from "../../../../lib/backend/supabase-rest";

export async function POST(request: Request) {
  try {
    const { bearer, config, user } = await authenticatedUser(request);
    const input = await readJson<{
      locale: "en" | "ar";
      specification: Record<string, unknown>;
      designId?: string;
    }>(request, ["locale", "specification"]);
    if (input.locale !== "en" && input.locale !== "ar")
      throw new ApiError("Invalid locale", 422, "invalid_input");
    // The stored specification is the validated, NFC-normalised one, so the SQL
    // fingerprint and the renderer shape the same bytes.
    const specification = validated(
      jewelryDraftSpecificationSchema,
      input.specification,
    );
    const rows = await supabaseRequest<Array<Record<string, unknown>>>(
      config,
      "/rest/v1/design_drafts",
      {
        method: "POST",
        headers: { prefer: "return=representation" },
        body: JSON.stringify({
          owner_principal_id: user.id,
          design_id: input.designId,
          locale: input.locale,
          specification,
          spelling_confirmed: false,
        }),
      },
      bearer,
    );
    return Response.json(rows[0], { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
