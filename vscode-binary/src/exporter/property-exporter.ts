import type { InstanceJson } from "@drxporter/shared";
import { filterProperties } from "@drxporter/shared";

export function exportWithSelectedProperties(instance: InstanceJson, includedProperties: string[]): InstanceJson {
  return {
    ...instance,
    properties: filterProperties(instance.properties, includedProperties),
  };
}
