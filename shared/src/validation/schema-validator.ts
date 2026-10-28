import type { InstanceJson } from "../types/instance";
import type { DiagnosticError } from "../types/error";
import { ERROR_CODES } from "../types/error";
import { isValidInstanceJson } from "../schema/instance-schema";
import { isValidUuid } from "./uuid-rules";

export interface ValidationResult {
  valid: boolean;
  errors: DiagnosticError[];
}

export function validateInstancePayload(data: unknown, source: string): ValidationResult {
  const errors: DiagnosticError[] = [];

  if (!isValidInstanceJson(data)) {
    errors.push({
      code: ERROR_CODES.INVALID_INSTANCE_JSON,
      severity: "fatal",
      message: "Invalid instance JSON structure",
      source,
    });
    return { valid: false, errors };
  }

  const instance = data as InstanceJson;

  if (!isValidUuid(instance.uuid)) {
    errors.push({
      code: ERROR_CODES.MISSING_UUID,
      severity: "fatal",
      message: `Invalid UUID: ${instance.uuid}`,
      source,
    });
  }

  if (instance.properties) {
    for (const [key, val] of Object.entries(instance.properties)) {
      if (!val || typeof val !== "object" || !("type" in val)) {
        errors.push({
          code: ERROR_CODES.UNSUPPORTED_PROPERTY,
          severity: "error",
          message: `Malformed property "${key}"`,
          source,
        });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateBatchPayload(
  instances: unknown[],
  source: string
): ValidationResult {
  const allErrors: DiagnosticError[] = [];
  for (let i = 0; i < instances.length; i++) {
    const result = validateInstancePayload(instances[i], `${source}[${i}]`);
    allErrors.push(...result.errors);
  }
  return { valid: allErrors.length === 0, errors: allErrors };
}
