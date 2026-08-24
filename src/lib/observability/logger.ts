export type LogLevel = "debug" | "info" | "warn" | "error";

type ErrorPayload = {
  name: string;
  message: string;
  stack?: string;
};

export interface LogEvent {
  ts: string;
  level: LogLevel;
  message: string;
  event: string;
  route?: string;
  method?: string;
  statusCode?: number;
  durationMs?: number;
  error?: ErrorPayload;
  requestId?: string;
  [key: string]: unknown;
}

type JsonLoggerOptions = {
  service?: string;
  level?: LogLevel;
};

type LogPayload = Omit<Partial<LogEvent>, "ts" | "level" | "message">;

const LEVEL_VALUE: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const allowed: LogLevel[] = ["debug", "info", "warn", "error"];

function nowIso(): string {
  return new Date().toISOString();
}

function parseLevel(value?: string): LogLevel {
  return value && allowed.includes(value.toLowerCase() as LogLevel)
    ? (value.toLowerCase() as LogLevel)
    : "info";
}

function getMinLevel(): LogLevel {
  if (typeof process === "undefined") return "info";
  return parseLevel(process.env.LOG_LEVEL);
}

export function serializeError(error: unknown): ErrorPayload {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    name: "Error",
    message: String(error),
  };
}

export function createLogger({ service = "jewelo", level = getMinLevel() }: JsonLoggerOptions = {}) {
  const minLevel = parseLevel(level);

  const emit = (current: LogLevel, message: string, payload: LogPayload = {}) => {
    if (LEVEL_VALUE[current] < LEVEL_VALUE[minLevel]) {
      return;
    }

    const event: LogEvent = {
      ts: nowIso(),
      level: current,
      event: payload.event ?? "app.event",
      message,
      service,
      ...payload,
    };

    const text = JSON.stringify(event);
    if (current === "error" || current === "warn") {
      console.error(text);
    } else {
      console.log(text);
    }
  };

  return {
    debug: (message: string, payload: LogPayload = {}) => emit("debug", message, payload),
    info: (message: string, payload: LogPayload = {}) => emit("info", message, payload),
    warn: (message: string, payload: LogPayload = {}) => emit("warn", message, payload),
    error: (message: string, payload: LogPayload = {}) => emit("error", message, payload),
  };
}

export const logger = createLogger();
