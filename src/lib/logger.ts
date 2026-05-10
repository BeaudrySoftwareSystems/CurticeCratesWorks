import pino, { type Logger } from "pino";

type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

const level = (process.env["LOG_LEVEL"] as LogLevel | undefined) ?? "info";

export const logger: Logger = pino({
  level,
  base: {
    service: "curtis-crates-inventory",
    env: process.env["NODE_ENV"] ?? "development",
  },
  redact: {
    paths: [
      "password",
      "*.password",
      "token",
      "*.token",
      "authorization",
      "*.authorization",
      "cookie",
      "*.cookie",
      "email",
      "*.email",
    ],
    censor: "[REDACTED]",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Create a child logger bound to a specific request context. Always include
 * `requestId` in middleware so downstream service-layer logs correlate to
 * a single inbound request.
 */
export function createChildLogger(
  requestId: string,
  bindings: Record<string, unknown> = {},
): Logger {
  return logger.child({ requestId, ...bindings });
}
