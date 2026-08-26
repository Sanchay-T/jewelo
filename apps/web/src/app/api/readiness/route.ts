import { readinessPayload } from "../../../lib/health";

export function GET() {
  return Response.json(readinessPayload(process.env), {
    headers: { "cache-control": "no-store" },
  });
}
