import {
  assertSameOrigin,
  authenticateOperator,
  clearOperatorSessionCookie,
  hasOperatorSession,
  operatorSessionCookie,
} from "../../../../lib/backend/operator-session";
import { jsonError, readJson } from "../../../../lib/backend/supabase-rest";
import {
  assertNotBackedOff,
  clearFailures,
  clientIp,
  recordFailure,
} from "../../../../lib/backend/request-guard";

const SCOPE = "operator-login";

export async function GET(request: Request) {
  try {
    return Response.json({ authenticated: hasOperatorSession(request) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    // Fix review 3, MN-5. Login is a mutation like any other operator command:
    // it hands out the operator cookie. Without this check a page on another
    // origin could post credentials it already knows and have the browser keep
    // the resulting session, and the guessing loop below could be driven from
    // off-site. Same helper and same rule as every other operator route.
    assertSameOrigin(request, true);
    // Before the body is even read, so a guessing loop costs the attacker time
    // and this process nothing.
    const source = clientIp(request);
    assertNotBackedOff(SCOPE, source);
    const { email, passphrase } = await readJson<{
      email: string;
      passphrase: string;
    }>(request, ["email", "passphrase"]);
    if (!authenticateOperator(email, passphrase)) {
      recordFailure(SCOPE, source);
      return Response.json(
        { error: "Invalid operator credentials", code: "unauthenticated" },
        { status: 401 },
      );
    }
    clearFailures(SCOPE, source);
    return Response.json(
      { authenticated: true },
      { headers: { "set-cookie": operatorSessionCookie() } },
    );
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE() {
  return Response.json(
    { authenticated: false },
    { headers: { "set-cookie": clearOperatorSessionCookie() } },
  );
}
