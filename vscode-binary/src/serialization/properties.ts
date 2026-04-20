import type { PropertyValue } from "@drxporter/shared";
import { serializeProperties, deserializeProperties, mergeProperties } from "@drxporter/shared";

export { serializeProperties, deserializeProperties, mergeProperties };

export function stringifyProperties(properties: Record<string, PropertyValue>): string {
  return JSON.stringify(serializeProperties(properties), null, 2);
}
