export interface LogContext {
  readonly requestId?: string;
  readonly runId?: string;
  readonly taskId?: string;
}

export interface Logger {
  info(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

/* ------------------------------------------------------------------------- */
/* P7-5 / DS-9. The observability port.                                       */
/*                                                                            */
/* Sentry and PostHog are vendors, so they live behind this package and       */
/* nowhere else: business code calls `reportError` and `captureJourneyEvent`  */
/* and never imports an SDK. Both are off until an account exists. The switch */
/* is the credential and nothing else:                                        */
/*                                                                            */
/*   SENTRY_DSN              server errors      empty -> no SDK is imported   */
/*   NEXT_PUBLIC_SENTRY_DSN  browser errors     empty -> no SDK is imported   */
/*   NEXT_PUBLIC_POSTHOG_KEY journey analytics  empty -> no SDK is imported   */
/*   NEXT_PUBLIC_POSTHOG_HOST                   required with the key         */
/*                                                                            */
/* "No SDK is imported" is literal: every vendor import in this package is a  */
/* dynamic `import()` behind a credential check, so an unconfigured           */
/* deployment never evaluates vendor code and never opens a socket.           */
/* ------------------------------------------------------------------------- */

/**
 * What a report may carry beside the error. Ids and enumerated states only:
 * no shopper name, no phone number, no e-mail, no free text a shopper typed.
 * The type is the guard - a caller cannot pass a name without widening it here
 * first, which is a reviewable edit rather than an accident.
 */
export interface ErrorContext extends LogContext {
  readonly route?: string;
  readonly functionId?: string;
  readonly eventId?: string;
  readonly code?: string;
  readonly status?: number;
}

/**
 * The journey, as the shop would describe it out loud: a shopper reached a
 * step, ticked the spelling confirmation, and the shop received the request.
 * A closed list, because analytics that can be handed an arbitrary name is
 * analytics that will one day be handed a shopper's name.
 */
export type JourneyEvent =
  | "journey_step_reached"
  | "journey_spelling_confirmed"
  | "journey_request_captured";

/**
 * Properties a journey event may carry. Every field is an id or an enumerated
 * value that the shop chose, never anything the shopper typed. `locale` is the
 * two-letter code, `stage` the journey stage, `construction` the pendant
 * construction id.
 */
export interface JourneyProperties {
  readonly stage?: string;
  readonly locale?: string;
  readonly construction?: string;
  readonly designId?: string;
  readonly requestId?: string;
}

/** True when a value is a usable credential rather than an unset one. */
export function configured(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
