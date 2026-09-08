import { pipelineLimits } from "@jewelo/config";
import { serve } from "inngest/next";

import { inngest } from "../../../inngest/client";
import { functions } from "../../../inngest/functions";

// The longest one dispatch of a still may hold this request. Next requires a
// static literal here, so the number cannot be read from configuration - but it
// is the same invariant as the stale window, which the sweeper derives from it,
// and the assertion below refuses to boot if the two ever drift.
//
// Fix-2 review M6: this was 300 s while the three provider timeouts a still
// makes alone sum to 300 s, so on a host that honours the cap the request was
// killed after the image had been paid for. It is now
// `pipelineLimits.executorRequestCapSeconds`: the image timeout, the two vision
// timeouts and the validated allowance for the render, downloads, upload and
// writes around them.
export const maxDuration = 360;
export const dynamic = "force-dynamic";

/** Thrown at import when the literal above no longer matches the configuration. */
class ExecutorRequestCapMismatchError extends Error {
  constructor(literalSeconds: number, configuredSeconds: number) {
    super(
      `executor request cap mismatch: apps/web/src/app/api/inngest/route.ts maxDuration is ${literalSeconds}s, pipelineLimits.executorRequestCapSeconds is ${configuredSeconds}s; the stale window is derived from the configured value, so set maxDuration to it`,
    );
    this.name = "ExecutorRequestCapMismatchError";
  }
}

if (maxDuration * 1_000 !== pipelineLimits.executorRequestCapMs) {
  throw new ExecutorRequestCapMismatchError(
    maxDuration,
    pipelineLimits.executorRequestCapSeconds,
  );
}

export const { GET, POST, PUT } = serve({ client: inngest, functions });
