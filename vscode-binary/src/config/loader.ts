import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type { DrxporterSettings } from "@drxporter/shared";
import { isValidSettings, DEFAULT_SETTINGS } from "@drxporter/shared";
import { createLogger } from "../logging/logger";

const logger = createLogger("config");

export function loadConfig(configPath?: string): DrxporterSettings {
  const path = configPath || resolve(process.cwd(), "drxporter.config.json");

  if (!existsSync(path)) {
    logger.debug("No config file found, using defaults");
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw);

    if (!isValidSettings(parsed)) {
      logger.warn("Invalid config file, using defaults");
      return { ...DEFAULT_SETTINGS };
    }

    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (err) {
    logger.error(`Failed to load config: ${err instanceof Error ? err.message : String(err)}`);
    return { ...DEFAULT_SETTINGS };
  }
}
