import pino from "pino";

// Bun compiled sidecars cannot resolve the optional pino-pretty transport at
// runtime. Keep JSON logging by default and opt into pretty output explicitly.
const usePrettyLogs = process.env.VYLINE_BACKEND_PRETTY_LOGS === "true";

export const logger = pino(
  { level: process.env.LOG_LEVEL ?? "info" },
  usePrettyLogs ? pino.transport({ target: "pino-pretty", options: { colorize: true } }) : undefined,
);

export function childLogger(subsystem: string) {
  return logger.child({ subsystem });
}
