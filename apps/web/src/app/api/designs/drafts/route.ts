import {
  authenticatedUser,
  jsonError,
  supabaseRequest,
} from "../../../../lib/backend/supabase-rest";

export async function POST(request: Request) {
  try {
    const { bearer, config, user } = await authenticatedUser(request);
    const input = (await request.json()) as {
      locale: "en" | "ar";
      specification: Record<string, unknown>;
      designId?: string;
    };
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
          specification: input.specification,
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
