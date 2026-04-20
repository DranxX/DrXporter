import type { AttributeValue } from "@drxporter/shared";
import { UUID_ATTRIBUTE_NAME } from "@drxporter/shared";

export function serializeAttributes(attributes: Record<string, AttributeValue>): Record<string, AttributeValue> {
  const result: Record<string, AttributeValue> = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (key !== UUID_ATTRIBUTE_NAME) {
      result[key] = value;
    }
  }
  return result;
}

export function deserializeAttributes(raw: Record<string, unknown>): Record<string, AttributeValue> {
  const result: Record<string, AttributeValue> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      result[key] = value;
    }
  }
  return result;
}
