import type { InstanceJson, ScriptDescriptor } from "@drxporter/shared";

export interface SelectionExportResult {
  instances: InstanceJson[];
  scripts: ScriptDescriptor[];
  skipped: string[];
}

export function filterBySelection(
  allInstances: InstanceJson[],
  allScripts: ScriptDescriptor[],
  selectedUuids: Set<string>,
  ancestorUuids: Set<string>
): SelectionExportResult {
  const instances: InstanceJson[] = [];
  const scripts: ScriptDescriptor[] = [];
  const skipped: string[] = [];

  for (const inst of allInstances) {
    if (selectedUuids.has(inst.uuid) || ancestorUuids.has(inst.uuid)) {
      instances.push(inst);
    } else {
      skipped.push(inst.uuid);
    }
  }

  for (const script of allScripts) {
    if (selectedUuids.has(script.uuid)) {
      scripts.push(script);
    } else {
      skipped.push(script.uuid);
    }
  }

  return { instances, scripts, skipped };
}
