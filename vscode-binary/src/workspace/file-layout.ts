import { isScriptClass } from "@drxporter/shared";
import { toFilesystemName, toScriptFileName, toInstanceJsonFileName } from "@drxporter/shared";

export function resolveInstancePath(parentPath: string, name: string, className: string): string {
  const safeName = toFilesystemName(name);
  if (isScriptClass(className)) {
    return `${parentPath}/${toScriptFileName(name, className)}`;
  }
  return `${parentPath}/${safeName}`;
}

export function resolveInstanceJsonPath(parentPath: string, name: string): string {
  return `${parentPath}/${toInstanceJsonFileName(name)}`;
}
