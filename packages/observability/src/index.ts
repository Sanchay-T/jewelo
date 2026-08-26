export interface LogContext {
  readonly requestId?: string;
  readonly runId?: string;
  readonly taskId?: string;
}

export interface Logger {
  info(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}
