import type { PropertyValue } from "../types/instance";
import { ERROR_CODES, type DiagnosticError } from "../types/error";

const VALID_PROPERTY_TYPES = [
  "string", "number", "boolean", "Color3", "Vector3", "Vector2",
  "CFrame", "UDim2", "UDim", "Enum", "BrickColor", "Ref", "unknown",
] as const;

export function isValidPropertyType(type: string): boolean {
  return (VALID_PROPERTY_TYPES as readonly string[]).includes(type);
}

export function validateProperty(
  key: string,
  value: PropertyValue,
  source: string
): DiagnosticError | null {
  if (!value || typeof value !== "object") {
    return {
      code: ERROR_CODES.UNSUPPORTED_PROPERTY,
      severity: "error",
      message: `Invalid property value for "${key}"`,
      source,
    };
  }
  if (!isValidPropertyType(value.type)) {
    return {
      code: ERROR_CODES.UNSUPPORTED_PROPERTY,
      severity: "error",
      message: `Unsupported property type "${value.type}" for "${key}"`,
      source,
    };
  }
  return null;
}

export function filterProperties(
  properties: Record<string, PropertyValue>,
  included: string[]
): Record<string, PropertyValue> {
  const result: Record<string, PropertyValue> = {};
  for (const key of included) {
    if (key in properties) {
      result[key] = properties[key];
    }
  }
  return result;
}
