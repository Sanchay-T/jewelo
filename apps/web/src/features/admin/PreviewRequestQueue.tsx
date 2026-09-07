"use client";

import { useCallback, useEffect, useState } from "react";
import {
  loadOperatorPreviewRequests,
  markPreviewRequestContacted,
  type OperatorPreviewRequestRecord,
} from "@/lib/operator-preview-request-client";

/**
 * Honest-degrade queue: shoppers whose personalized preview could not be
 * generated and who asked to be contacted. The contact detail is operator-only.
 */
export function PreviewRequestQueue() {
  const [requests, setRequests] = useState<OperatorPreviewRequestRecord[]>([]);
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      setRequests(await loadOperatorPreviewRequests());
      setError("");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Preview requests unavailable",
      );
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function contacted(id: string) {
    setBusy(id);
    try {
      await markPreviewRequestContacted(id);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Action unavailable");
    } finally {
      setBusy(undefined);
    }
  }

  if (!error && requests.length === 0) return null;
  const waiting = requests.filter((item) => item.status === "new").length;
  return (
    <section className="clm-review-handoff" aria-label="Preview requests">
      <div>
        <p className="clm-kicker">Preview requests</p>
        <h2>{waiting} awaiting contact</h2>
      </div>
      {error ? (
        <p role="status">{error}</p>
      ) : (
        <ul>
          {requests.map((item) => (
            <li key={item.id}>
              {item.summary} — {item.contact.channel} {item.contact.value}
              {item.contact.name ? ` (${item.contact.name})` : ""} ·{" "}
              {new Date(item.createdAt).toLocaleString("en")} ·{" "}
              {item.sampleReference
                ? `sample ${item.sampleReference.sampleId}`
                : "no sample shown"}{" "}
              {item.status === "new" ? (
                <button
                  type="button"
                  className="clm-secondary"
                  disabled={busy === item.id}
                  onClick={() => void contacted(item.id)}
                >
                  Mark contacted
                </button>
              ) : (
                <span className="clm-state" data-state={item.status}>
                  {item.status}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
