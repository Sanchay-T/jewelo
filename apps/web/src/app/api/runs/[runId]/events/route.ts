import {
  authenticatedUser,
  jsonError,
  supabaseRequest,
} from "../../../../../lib/backend/supabase-rest";

export async function GET(
  request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await context.params;
    const { bearer, config } = await authenticatedUser(request);
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let previous = "";
        for (let index = 0; index < 12; index += 1) {
          if (request.signal.aborted) break;
          const tasks = await supabaseRequest<Array<Record<string, unknown>>>(
            config,
            `/rest/v1/generation_tasks?run_id=eq.${encodeURIComponent(runId)}&order=updated_at`,
            {},
            bearer,
          );
          const payload = JSON.stringify(tasks);
          if (payload !== previous) {
            controller.enqueue(
              encoder.encode(`event: status\ndata: ${payload}\n\n`),
            );
            previous = payload;
          }
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache, no-store",
        connection: "keep-alive",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
