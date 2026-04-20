import type { ScriptDescriptor } from "@drxporter/shared";
import { writeScript } from "../workspace/tree-writer";

export function exportScript(basePath: string, relativePath: string, script: ScriptDescriptor): void {
  writeScript(basePath, relativePath, script);
}

export function exportScripts(basePath: string, scripts: Array<{ relativePath: string; script: ScriptDescriptor }>): number {
  let count = 0;
  for (const entry of scripts) {
    exportScript(basePath, entry.relativePath, entry.script);
    count++;
  }
  return count;
}
