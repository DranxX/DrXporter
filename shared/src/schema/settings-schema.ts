export interface DrxporterSettings {
  bridgePort: number;
  bridgeHost: string;
  outputRoot: string;
  cacheDir: string;
  strictMode: boolean;
  destructiveImport: boolean;
  logLevel: "debug" | "info" | "warn" | "error";
}

export const DEFAULT_SETTINGS: DrxporterSettings = {
  bridgePort: 34872,
  bridgeHost: "127.0.0.1",
  outputRoot: "./output",
  cacheDir: ".drxporter-cache",
  strictMode: true,
  destructiveImport: false,
  logLevel: "info",
};

export function isValidSettings(data: unknown): data is Partial<DrxporterSettings> {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  if (obj.bridgePort !== undefined && typeof obj.bridgePort !== "number") return false;
  if (obj.bridgeHost !== undefined && typeof obj.bridgeHost !== "string") return false;
  if (obj.strictMode !== undefined && typeof obj.strictMode !== "boolean") return false;
  return true;
}
