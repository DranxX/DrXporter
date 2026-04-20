import type { InstanceJson } from "../types/instance";

export interface InstanceSchemaDefinition {
  uuid: { type: "string"; required: true };
  className: { type: "string"; required: true };
  name: { type: "string"; required: true };
  properties: { type: "object"; required: false };
  attributes: { type: "object"; required: false };
  tags: { type: "array"; required: false };
  children: { type: "array"; required: false };
}

export const INSTANCE_SCHEMA: InstanceSchemaDefinition = {
  uuid: { type: "string", required: true },
  className: { type: "string", required: true },
  name: { type: "string", required: true },
  properties: { type: "object", required: false },
  attributes: { type: "object", required: false },
  tags: { type: "array", required: false },
  children: { type: "array", required: false },
};

export function isValidInstanceJson(data: unknown): data is InstanceJson {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  if (typeof obj.uuid !== "string" || obj.uuid.length === 0) return false;
  if (typeof obj.className !== "string" || obj.className.length === 0) return false;
  if (typeof obj.name !== "string") return false;
  return true;
}

export function createEmptyInstanceJson(uuid: string, className: string, name: string): InstanceJson {
  return {
    uuid,
    className,
    name,
    properties: {},
    attributes: {},
    tags: [],
    children: [],
  };
}
