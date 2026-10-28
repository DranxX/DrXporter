import type { InstanceJson } from "@drxporter/shared";
import { writeInstanceJson } from "../workspace/tree-writer";

export function exportInstance(basePath: string, relativePath: string, instance: InstanceJson): void {
  writeInstanceJson(basePath, relativePath, instance);
}

export function exportInstances(basePath: string, instances: Array<{ relativePath: string; instance: InstanceJson }>): number {
  let count = 0;
  for (const entry of instances) {
    exportInstance(basePath, entry.relativePath, entry.instance);
    count++;
  }
  return count;
}
