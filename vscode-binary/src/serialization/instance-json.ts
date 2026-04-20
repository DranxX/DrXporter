import type { InstanceJson } from "@drxporter/shared";
import { isValidInstanceJson, createEmptyInstanceJson } from "@drxporter/shared";

export function serializeInstanceJson(instance: InstanceJson): string {
  return JSON.stringify(instance, null, 2);
}

export function deserializeInstanceJson(raw: string): InstanceJson | null {
  try {
    const parsed = JSON.parse(raw);
    if (!isValidInstanceJson(parsed)) return null;
    return parsed as InstanceJson;
  } catch {
    return null;
  }
}

export { createEmptyInstanceJson };
