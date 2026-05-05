export interface InstanceIdentity {
  uuid: string;
  className: string;
  name: string;
  parent: string | null;
}

export interface InstanceJson {
  uuid: string;
  className: string;
  name: string;
  properties: Record<string, PropertyValue>;
  attributes: Record<string, AttributeValue>;
  tags: string[];
  children: string[];
}

export type PropertyValue =
  | { type: "string"; value: string }
  | { type: "number"; value: number }
  | { type: "boolean"; value: boolean }
  | { type: "Color3"; value: [number, number, number] }
  | { type: "Vector3"; value: [number, number, number] }
  | { type: "Vector2"; value: [number, number] }
  | { type: "CFrame"; value: number[] }
  | { type: "UDim2"; value: [number, number, number, number] }
  | { type: "UDim"; value: [number, number] }
  | { type: "Enum"; value: number; enumType?: string }
  | { type: "BrickColor"; value: number }
  | { type: "Ref"; value: string | null }
  | { type: "unknown"; value: unknown };

export type AttributeValue = string | number | boolean;

export interface InstanceTreeNode {
  uuid: string;
  className: string;
  name: string;
  children: InstanceTreeNode[];
  isAncestorOnly: boolean;
}

export type ScriptType = "server" | "client" | "module";

export interface ScriptDescriptor {
  uuid: string;
  name: string;
  scriptType: ScriptType;
  source: string;
  className: string;
}
