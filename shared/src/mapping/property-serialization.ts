import type { PropertyValue } from "../types/instance";

export function serializePropertyValue(value: PropertyValue): unknown {
  return { type: value.type, value: value.value };
}

export function deserializePropertyValue(raw: unknown): PropertyValue | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.type !== "string") return null;
  return obj as PropertyValue;
}

export function serializeProperties(
  properties: Record<string, PropertyValue>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    result[key] = serializePropertyValue(value);
  }
  return result;
}

export function deserializeProperties(
  raw: Record<string, unknown>
): Record<string, PropertyValue> {
  const result: Record<string, PropertyValue> = {};
  for (const [key, value] of Object.entries(raw)) {
    const prop = deserializePropertyValue(value);
    if (prop) {
      result[key] = prop;
    }
  }
  return result;
}

export function mergeProperties(
  existing: Record<string, PropertyValue>,
  incoming: Record<string, PropertyValue>
): Record<string, PropertyValue> {
  const merged = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    merged[key] = value;
  }
  return merged;
}
