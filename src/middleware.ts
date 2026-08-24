import { NextResponse, type NextRequest } from "next/server";
import { logger } from "./lib/observability/logger";

export function middleware(request: NextRequest) {
  const requestId =
    request.headers.get("x-request-id") ||
    (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `req-${Date.now()}-${Math.random().toString(16).slice(2)}`);

  logger.info("incoming API request", {
    event: "http.request.start",
    route: request.nextUrl.pathname,
    method: request.method,
    requestId,
  });

  const response = NextResponse.next();
  response.headers.set("x-request-id", requestId);

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
