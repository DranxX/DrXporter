import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { InstanceJson } from "@drxporter/shared";
import { isValidInstanceJson, INSTANCE_JSON_EXTENSION } from "@drxporter/shared";

export function readInstanceTree(dir: string): InstanceJson[] {
  const results: InstanceJson[] = [];

  function traverse(currentDir: string): void {
    const entries = readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      if (entry.isDirectory()) {
        traverse(fullPath);
      } else if (entry.name.endsWith(INSTANCE_JSON_EXTENSION)) {
        try {
          const raw = readFileSync(fullPath, "utf-8");
          const parsed = JSON.parse(raw);
          if (isValidInstanceJson(parsed)) {
            results.push(parsed as InstanceJson);
          }
        } catch {}
      }
    }
  }

  traverse(dir);
  return results;
}
