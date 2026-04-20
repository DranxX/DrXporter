import type { InstanceJson } from "@drxporter/shared";
import type { DiagnosticError } from "@drxporter/shared";
import { validateBatchPayload } from "@drxporter/shared";
import { scanForDuplicates } from "./duplicate-scan";
import { scanUuids } from "./uuid-scan";
import { ERROR_CODES } from "@drxporter/shared";

export interface FullScanResult {
  valid: boolean;
  errors: DiagnosticError[];
}

export function runFullValidation(instances: InstanceJson[], source: string): FullScanResult {
  const errors: DiagnosticError[] = [];

  const batchResult = validateBatchPayload(instances, source);
  errors.push(...batchResult.errors);

  const uuidScan = scanUuids(instances);
  for (const invalid of uuidScan.invalid) {
    errors.push({
      code: ERROR_CODES.MISSING_UUID,
      severity: "fatal",
      message: `Invalid UUID format: ${invalid}`,
      source,
    });
  }

  const dupScan = scanForDuplicates(instances);
  for (const [uuid, count] of dupScan.duplicates) {
    errors.push({
      code: ERROR_CODES.DUPLICATE_UUID,
      severity: "fatal",
      message: `Duplicate UUID ${uuid} found ${count} times`,
      source,
    });
  }

  return { valid: errors.length === 0, errors };
}
