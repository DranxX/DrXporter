import type { InstanceJson } from "@drxporter/shared";

export function resolveParentMap(instances: InstanceJson[]): Map<string, string | null> {
  const parentMap = new Map<string, string | null>();
  const childToParent = new Map<string, string>();

  for (const inst of instances) {
    parentMap.set(inst.uuid, null);
    for (const childUuid of inst.children) {
      childToParent.set(childUuid, inst.uuid);
    }
  }

  for (const [childUuid, parentUuid] of childToParent) {
    parentMap.set(childUuid, parentUuid);
  }

  return parentMap;
}

export function buildAncestorChain(uuid: string, parentMap: Map<string, string | null>): string[] {
  const chain: string[] = [];
  let current = parentMap.get(uuid) ?? null;
  while (current) {
    chain.unshift(current);
    current = parentMap.get(current) ?? null;
  }
  return chain;
}
