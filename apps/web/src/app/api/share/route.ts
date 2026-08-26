import { createHash, randomBytes } from "node:crypto";
import {
  authenticatedUser,
  jsonError,
  supabaseRequest,
} from "../../../lib/backend/supabase-rest";

export async function POST(request: Request) {
  try {
    const { bearer, config, user } = await authenticatedUser(request);
    const { designId, expiresInSeconds = 86400 } = (await request.json()) as {
      designId: string;
      expiresInSeconds?: number;
    };
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const rows = await supabaseRequest<Array<Record<string, unknown>>>(
      config,
      "/rest/v1/share_grants",
      {
        method: "POST",
        headers: { prefer: "return=representation" },
        body: JSON.stringify({
          design_id: designId,
          owner_principal_id: user.id,
          token_hash: tokenHash,
          expires_at: new Date(
            Date.now() + Math.min(expiresInSeconds, 604800) * 1000,
          ).toISOString(),
        }),
      },
      bearer,
    );
    return Response.json(
      { id: rows[0]?.id, token, expiresAt: rows[0]?.expires_at },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error);
  }
}
