import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { INSTANCE_JSON_EXTENSION } from "@drxporter/shared";

export interface ScanResult {
  instanceJsonFiles: string[];
  scriptFiles: string[];
  directories: string[];
}

export function scanDirectory(dir: string): ScanResult {
  const instanceJsonFiles: string[] = [];
  const scriptFiles: string[] = [];
  const directories: string[] = [];

  function traverse(currentDir: string): void {
    const entries = readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      if (entry.isDirectory()) {
        directories.push(fullPath);
        traverse(fullPath);
      } else if (entry.name.endsWith(INSTANCE_JSON_EXTENSION)) {
        instanceJsonFiles.push(fullPath);
      } else if (entry.name.endsWith(".lua")) {
        scriptFiles.push(fullPath);
      }
    }
  }

  traverse(dir);
  return { instanceJsonFiles, scriptFiles, directories };
}
