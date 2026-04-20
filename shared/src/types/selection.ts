export type SelectionState = "selected" | "partial" | "none";

export interface SelectionNode {
  uuid: string;
  name: string;
  className: string;
  state: SelectionState;
  children: SelectionNode[];
}

export interface SelectionResult {
  selectedUuids: string[];
  ancestorUuids: string[];
  totalSelected: number;
  totalAncestors: number;
}

export interface PropertySelection {
  className: string;
  includedProperties: string[];
  excludedProperties: string[];
}
