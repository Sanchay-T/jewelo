import {
  jsonError,
  supabaseRequest,
  userConfig,
} from "../../../../lib/backend/supabase-rest";

export async function POST() {
  try {
    const config = userConfig();
    const session = await supabaseRequest<Record<string, unknown>>(
      config,
      "/auth/v1/signup",
      {
        method: "POST",
        body: JSON.stringify({ data: { jewelo_principal: "anonymous" } }),
      },
    );
    return Response.json(session, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return jsonError(error);
  }
}
