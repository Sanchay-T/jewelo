import {
  ApiError,
  authenticatedUser,
  jsonError,
  readJson,
  supabaseRequest,
} from "../../../lib/backend/supabase-rest";
import {
  customerPreviewRequest,
  parsePreviewRequestInput,
  previewRequestInsert,
  PREVIEW_REQUEST_COLUMNS,
  type PreviewRequestRow,
} from "../../../lib/backend/preview-requests";
import {
  inngest,
  jobEngineConfigured,
  PREVIEW_REQUEST_CREATED_EVENT,
} from "../../../inngest/client";

const NO_STORE = { "cache-control": "no-store" };

/**
 * Honest degrade. The shopper keeps the labelled illustrated sample and leaves
 * a way to be contacted; the request becomes durable operator work. No provider
 * call, price or promise happens here.
 */
export async function POST(request: Request) {
  try {
    const { bearer, config, user } = await authenticatedUser(request);
    const input = parsePreviewRequestInput(
      await readJson<Record<string, unknown>>(request),
    );
    const existing = async () =>
      input.requestKey
        ? await supabaseRequest<PreviewRequestRow[]>(
            config,
            `/rest/v1/preview_requests?select=${PREVIEW_REQUEST_COLUMNS}&request_key=eq.${encodeURIComponent(input.requestKey)}&limit=1`,
            {},
            bearer,
          )
        : [];
    const replay = (await existing())[0];
    if (replay)
      return Response.json(customerPreviewRequest(replay), {
        status: 200,
        headers: NO_STORE,
      });
    try {
      const rows = await supabaseRequest<PreviewRequestRow[]>(
        config,
        `/rest/v1/preview_requests?select=${PREVIEW_REQUEST_COLUMNS}`,
        {
          method: "POST",
          headers: { prefer: "return=representation" },
          body: JSON.stringify(previewRequestInsert(user.id, input)),
        },
        bearer,
      );
      const created = rows[0];
      if (!created) throw new Error("Preview request insert returned no row");
      await announceCapturedRequest(created.id);
      return Response.json(customerPreviewRequest(created), {
        status: 201,
        headers: NO_STORE,
      });
    } catch (error) {
      // A concurrent double submit loses the race on the
      // (principal_id, request_key) unique index; the winner is the answer.
      if (!(error instanceof ApiError) || error.code !== "state_conflict")
        throw error;
      const raced = (await existing())[0];
      if (!raced) throw error;
      return Response.json(customerPreviewRequest(raced), {
        status: 200,
        headers: NO_STORE,
      });
    }
  } catch (error) {
    return jsonError(error);
  }
}

/**
 * P7-3. Tell the shop. Only the id travels; the notification job loads the row
 * with the service role, so the contact detail never enters the job engine's
 * event store.
 *
 * Best effort by design. The row is already durable and already visible in the
 * operator queue, so a job engine that is unreachable must not turn a captured
 * request into a 5xx for the shopper standing at the counter. The event id is
 * derived from the request id, which makes a replay of this call one event, and
 * the `notified_at` claim in the database makes it one message.
 */
async function announceCapturedRequest(requestId: string): Promise<void> {
  if (!jobEngineConfigured()) return;
  try {
    await inngest.send({
      id: `preview-request-created:${requestId}`,
      name: PREVIEW_REQUEST_CREATED_EVENT,
      data: { previewRequestId: requestId },
    });
  } catch (error) {
    console.error("preview_request_notification_dispatch_failed", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}
