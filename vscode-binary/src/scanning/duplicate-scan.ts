import type { InstanceJson } from "@drxporter/shared";
import { detectDuplicateUuids } from "@drxporter/shared";

export interface DuplicateScanResult {
  hasDuplicates: boolean;
  duplicates: Map<string, number>;
}

export function scanForDuplicates(instances: InstanceJson[]): DuplicateScanResult {
  const uuids = instances.map((i) => i.uuid);
  const duplicates = detectDuplicateUuids(uuids);
  return {
    hasDuplicates: duplicates.size > 0,
    duplicates,
  };
}
