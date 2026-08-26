import {
  authenticateOperator,
  clearOperatorSessionCookie,
  hasOperatorSession,
  operatorSessionCookie,
} from "../../../../lib/backend/operator-session";
import { jsonError } from "../../../../lib/backend/supabase-rest";

export async function GET(request: Request) {
  try {
    return Response.json({ authenticated: hasOperatorSession(request) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { email, passphrase } = (await request.json()) as {
      email: string;
      passphrase: string;
    };
    if (!authenticateOperator(email, passphrase))
      return Response.json(
        { error: "Invalid operator credentials" },
        { status: 401 },
      );
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
