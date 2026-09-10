import { webGuardLimits } from "@jewelo/config";

import {
  jsonError,
  supabaseRequest,
  userConfig,
} from "../../../../lib/backend/supabase-rest";
import {
  assertRateLimit,
  clientIp,
  createRateLimitStore,
} from "../../../../lib/backend/request-guard";

// A principal is the key to every customer route, so one source may only mint a
// small number of them per window. A shopper needs exactly one.
const signups = createRateLimitStore();

export async function POST(request: Request) {
  try {
    assertRateLimit(
      signups,
      clientIp(request),
      webGuardLimits.anonymousSignupsPerWindow,
      webGuardLimits.anonymousSignupWindowMs,
      "Too many sign-in attempts. Wait a moment and try again.",
    );
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
