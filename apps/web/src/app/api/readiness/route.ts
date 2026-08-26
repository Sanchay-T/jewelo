import { readinessPayload } from "../../../lib/health";

export function GET() {
  return Response.json(readinessPayload(process.env), {
    status: 503,
    headers: { "cache-control": "no-store" },
  });
}
