import { SCRIPT_EXTENSIONS, INSTANCE_JSON_EXTENSION } from "../constants/defaults";
import { isScriptClass } from "../constants/classes";

export function toFilesystemName(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_");
}

export function toScriptFileName(name: string, className: string): string {
  const ext = SCRIPT_EXTENSIONS[className];
  if (!ext) return `${toFilesystemName(name)}.lua`;
  return `${toFilesystemName(name)}${ext}`;
}

export function toInstanceJsonFileName(name: string): string {
  return `${toFilesystemName(name)}${INSTANCE_JSON_EXTENSION}`;
}

export function resolveFileExtension(className: string): string {
  if (isScriptClass(className)) {
    return SCRIPT_EXTENSIONS[className] || ".lua";
  }
  return INSTANCE_JSON_EXTENSION;
}

export function parseScriptTypeFromExtension(fileName: string): string | null {
  if (fileName.endsWith(".server.lua")) return "Script";
  if (fileName.endsWith(".client.lua")) return "LocalScript";
  if (fileName.endsWith(".lua")) return "ModuleScript";
  return null;
}

export function isInstanceJsonFile(fileName: string): boolean {
  return fileName.endsWith(INSTANCE_JSON_EXTENSION);
}

export function isScriptFile(fileName: string): boolean {
  return fileName.endsWith(".lua");
}
