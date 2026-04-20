export type ErrorSeverity = "fatal" | "error" | "warning" | "info";

export interface DiagnosticError {
  code: string;
  severity: ErrorSeverity;
  message: string;
  source: string;
  context?: Record<string, unknown>;
}

export const ERROR_CODES = {
  MISSING_UUID: "DRX_E001",
  DUPLICATE_UUID: "DRX_E002",
  INVALID_INSTANCE_JSON: "DRX_E003",
  CLASS_MISMATCH: "DRX_E004",
  PATH_CLASH: "DRX_E005",
  BRIDGE_CONNECT_FAILED: "DRX_E006",
  BRIDGE_TIMEOUT: "DRX_E007",
  EXPORT_FAILED: "DRX_E008",
  IMPORT_FAILED: "DRX_E009",
  CACHE_CORRUPTED: "DRX_E010",
  UNSUPPORTED_PROPERTY: "DRX_E011",
  INVALID_PAYLOAD: "DRX_E012",
  FILESYSTEM_ERROR: "DRX_E013",
  VALIDATION_FAILED: "DRX_E014",
  DUPLICATE_UUID_REWRITE: "DRX_W001",
  PROPERTY_SKIPPED: "DRX_W002",
  ANCESTOR_INCLUDED: "DRX_I001",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
