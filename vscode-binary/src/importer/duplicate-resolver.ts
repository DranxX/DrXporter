import type { InstanceJson } from "@drxporter/shared";
import { detectDuplicateUuids } from "@drxporter/shared";
import { createLogger } from "../logging/logger";

const logger = createLogger("duplicate-resolver");

export interface DuplicateResolution {
  resolved: boolean;
  rewrittenUuids: Map<string, string>;
  errors: string[];
}

export function checkForDuplicates(instances: InstanceJson[]): Map<string, number> {
  const uuids = instances.map((i) => i.uuid);
  return detectDuplicateUuids(uuids);
}

export function resolveDuplicates(instances: InstanceJson[], generateUuid: () => string): DuplicateResolution {
  const duplicates = checkForDuplicates(instances);
  const rewrittenUuids = new Map<string, string>();
  const errors: string[] = [];

  if (duplicates.size === 0) {
    return { resolved: true, rewrittenUuids, errors };
  }

  const seen = new Set<string>();
  for (const inst of instances) {
    if (seen.has(inst.uuid)) {
      const newUuid = generateUuid();
      logger.warn(`Rewriting duplicate UUID ${inst.uuid} -> ${newUuid} for ${inst.name}`);
      rewrittenUuids.set(inst.uuid, newUuid);
      inst.uuid = newUuid;
    } else {
      seen.add(inst.uuid);
    }
  }

  return { resolved: true, rewrittenUuids, errors };
}
