import type { DrxporterSettings } from "@drxporter/shared";
import { DEFAULT_SETTINGS } from "@drxporter/shared";

export function getDefaults(): DrxporterSettings {
  return { ...DEFAULT_SETTINGS };
}
