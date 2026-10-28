import { writeFileSync, mkdirSync, existsSync, unlinkSync } from "node:fs";
import { resolve, dirname } from "node:path";
import type { InstanceJson, ScriptDescriptor } from "@drxporter/shared";
import { SCRIPT_EXTENSIONS, INSTANCE_JSON_EXTENSION, isFolderClass } from "@drxporter/shared";

export function writeInstanceJson(basePath: string, relativePath: string, instance: InstanceJson): void {
  if (isFolderClass(instance.className)) {
    const dirPath = resolve(basePath, relativePath);
    const legacyPath = resolve(basePath, relativePath + INSTANCE_JSON_EXTENSION);
    if (existsSync(legacyPath)) unlinkSync(legacyPath);
    if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true });
    return;
  }

  const fullPath = resolve(basePath, relativePath + INSTANCE_JSON_EXTENSION);
  const dir = dirname(fullPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(fullPath, JSON.stringify(instance, null, 2), "utf-8");
}

export function writeScript(basePath: string, relativePath: string, script: ScriptDescriptor): void {
  const ext = SCRIPT_EXTENSIONS[script.className] || ".lua";
  const fullPath = resolve(basePath, relativePath + ext);
  const dir = dirname(fullPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(fullPath, script.source, "utf-8");
}
