import { ERROR_CODES } from "@drxporter/shared";

export class StrictError extends Error {
  code: string;
  source: string;

  constructor(code: string, message: string, source: string) {
    super(message);
    this.name = "StrictError";
    this.code = code;
    this.source = source;
  }
}

export function throwStrict(code: string, message: string, source: string): never {
  throw new StrictError(code, message, source);
}

export function assertStrict(condition: boolean, code: string, message: string, source: string): void {
  if (!condition) {
    throwStrict(code, message, source);
  }
}

export function assertUuid(uuid: string | undefined | null, context: string): void {
  assertStrict(!!uuid && uuid.length > 0, ERROR_CODES.MISSING_UUID, `Missing UUID: ${context}`, "strict-error");
}

export function assertNoDuplicate(uuid: string, seen: Set<string>, context: string): void {
  assertStrict(!seen.has(uuid), ERROR_CODES.DUPLICATE_UUID, `Duplicate UUID: ${uuid} in ${context}`, "strict-error");
}
