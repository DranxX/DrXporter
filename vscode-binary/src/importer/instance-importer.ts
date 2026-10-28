import { readFileSync, existsSync } from "node:fs";
import type { InstanceJson } from "@drxporter/shared";
import { isValidInstanceJson } from "@drxporter/shared";

export function readInstanceJsonFile(filePath: string): InstanceJson | null {
  if (!existsSync(filePath)) return null;
  try {
    const raw = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    if (!isValidInstanceJson(parsed)) return null;
    return parsed as InstanceJson;
  } catch {
    return null;
  }
}
