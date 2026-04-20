import type { InstanceIdentity } from "../types/instance";

export interface ParentChain {
  target: InstanceIdentity;
  ancestors: InstanceIdentity[];
}

export function buildParentChain(
  targetUuid: string,
  registry: Map<string, InstanceIdentity>
): ParentChain | null {
  const target = registry.get(targetUuid);
  if (!target) return null;

  const ancestors: InstanceIdentity[] = [];
  let current = target;

  while (current.parent) {
    const parent = registry.get(current.parent);
    if (!parent) break;
    ancestors.unshift(parent);
    current = parent;
  }

  return { target, ancestors };
}

export function buildRelativePath(chain: ParentChain): string {
  const parts = chain.ancestors.map((a) => a.name);
  parts.push(chain.target.name);
  return parts.join("/");
}

export function resolveParentUuid(
  relativePath: string,
  registry: Map<string, InstanceIdentity>
): string | null {
  const parts = relativePath.split("/");
  if (parts.length < 2) return null;

  const parentName = parts[parts.length - 2];
  for (const [uuid, identity] of registry) {
    if (identity.name === parentName) return uuid;
  }
  return null;
}
