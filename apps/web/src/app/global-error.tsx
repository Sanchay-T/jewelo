"use client";

/**
 * P7-5 / DS-9. The last resort, and the only place a root-layout crash can be
 * reported from.
 *
 * Next renders this instead of the whole document when the root layout itself
 * throws, so it carries its own `html` and `body` and cannot use the app's
 * stylesheet: the few rules here are the CALEUMS palette written inline, not a
 * second style system. Nothing else in the studio changes.
 *
 * The report goes through `@jewelo/observability`, which does nothing at all
 * while `NEXT_PUBLIC_SENTRY_DSN` is empty. The shopper is told, in the shop's
 * own voice, that this is the shop's fault and that reloading is safe; the
 * message never mentions software.
 */

import { useEffect } from "react";

import { reportBrowserError } from "@jewelo/observability/client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportBrowserError(error, { code: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "2rem",
          background: "#f7f3ec",
          color: "#10100f",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <main style={{ maxWidth: "28rem", textAlign: "center" }}>
          <h1
            style={{
              fontFamily: "Georgia, serif",
              fontWeight: 400,
              fontSize: "1.5rem",
              margin: "0 0 0.75rem",
            }}
          >
            This page did not open
          </h1>
          <p style={{ margin: "0 0 1.5rem", color: "#6e685f" }}>
            Nothing you entered has been lost, and no order has been placed.
            Please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              border: "1px solid #a68243",
              background: "#a68243",
              color: "#fffdf9",
              borderRadius: "999px",
              padding: "0.75rem 1.75rem",
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
