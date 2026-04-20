export const LOG_LEVELS = ["debug", "info", "warn", "error", "fatal"] as const;
export type LogLevelName = (typeof LOG_LEVELS)[number];

export function isValidLogLevel(level: string): level is LogLevelName {
  return (LOG_LEVELS as readonly string[]).includes(level);
}
