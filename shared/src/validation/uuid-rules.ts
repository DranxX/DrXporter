import { UUID_ATTRIBUTE_NAME } from "../constants/attributes";
import { ERROR_CODES, type DiagnosticError } from "../types/error";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(uuid: string): boolean {
  return UUID_PATTERN.test(uuid);
}

export function validateUuid(uuid: string, source: string): DiagnosticError | null {
  if (!uuid || uuid.length === 0) {
    return {
      code: ERROR_CODES.MISSING_UUID,
      severity: "fatal",
      message: `Missing ${UUID_ATTRIBUTE_NAME} on instance`,
      source,
    };
  }
  if (!isValidUuid(uuid)) {
    return {
      code: ERROR_CODES.MISSING_UUID,
      severity: "fatal",
      message: `Invalid UUID format: ${uuid}`,
      source,
    };
  }
  return null;
}

export function detectDuplicateUuids(uuids: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  const duplicates = new Map<string, number>();
  for (const uuid of uuids) {
    const count = (counts.get(uuid) || 0) + 1;
    counts.set(uuid, count);
    if (count > 1) {
      duplicates.set(uuid, count);
    }
  }
  return duplicates;
}
