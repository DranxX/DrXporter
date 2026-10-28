import type { InstanceJson } from "@drxporter/shared";
import { isValidUuid } from "@drxporter/shared";

export interface UuidScanResult {
  valid: string[];
  invalid: string[];
  missing: number;
}

export function scanUuids(instances: InstanceJson[]): UuidScanResult {
  const valid: string[] = [];
  const invalid: string[] = [];
  let missing = 0;

  for (const inst of instances) {
    if (!inst.uuid) {
      missing++;
    } else if (isValidUuid(inst.uuid)) {
      valid.push(inst.uuid);
    } else {
      invalid.push(inst.uuid);
    }
  }

  return { valid, invalid, missing };
}
