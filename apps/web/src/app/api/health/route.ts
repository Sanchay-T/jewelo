import { healthPayload } from "../../../lib/health";

export function GET() {
  return Response.json(healthPayload, {
    headers: { "cache-control": "no-store" },
  });
}
