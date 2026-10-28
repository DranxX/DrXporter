import type { ScriptDescriptor } from "@drxporter/shared";
import { SCRIPT_EXTENSIONS } from "@drxporter/shared";

export function serializeScript(script: ScriptDescriptor): string {
  return script.source;
}

export function getScriptExtension(className: string): string {
  return SCRIPT_EXTENSIONS[className] || ".lua";
}

export function getScriptFileName(name: string, className: string): string {
  return `${name}${getScriptExtension(className)}`;
}
