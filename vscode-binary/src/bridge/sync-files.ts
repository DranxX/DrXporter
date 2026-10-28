import { existsSync, mkdirSync, readdirSync, readFileSync, rmdirSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import type { CacheEntry, InstanceJson, ScriptDescriptor } from "@drxporter/shared";
import {
  INSTANCE_JSON_EXTENSION,
  SCRIPT_EXTENSIONS,
  isFolderClass,
  isScriptClass,
  isValidInstanceJson,
  parseScriptTypeFromExtension,
  toFilesystemName,
} from "@drxporter/shared";

export function sanitizePathSegment(name: string): string {
  const cleaned = toFilesystemName(String(name || "Instance").trim() || "Instance");
  if (cleaned.length === 0 || /^\.+$/.test(cleaned)) return "Instance";
  return cleaned;
}

export function normalizeRelativePath(relativePath: string): string {
  return relativePath
    .split(/[\\/]+/)
    .filter(Boolean)
    .map(sanitizePathSegment)
    .join("/");
}

export function joinRelativePath(parentPath: string | null | undefined, name: string): string {
  const leaf = sanitizePathSegment(name);
  return parentPath ? `${normalizeRelativePath(parentPath)}/${leaf}` : leaf;
}

export function replacePathLeaf(relativePath: string, name: string): string {
  const parts = normalizeRelativePath(relativePath).split("/").filter(Boolean);
  if (parts.length === 0) return sanitizePathSegment(name);
  parts[parts.length - 1] = sanitizePathSegment(name);
  return parts.join("/");
}

export function pathLeafName(relativePath: string): string {
  const parts = normalizeRelativePath(relativePath).split("/").filter(Boolean);
  return parts[parts.length - 1] || "Instance";
}

export function pathParent(relativePath: string): string | null {
  const parts = normalizeRelativePath(relativePath).split("/").filter(Boolean);
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join("/");
}

export function scriptExtension(className: string): string {
  return SCRIPT_EXTENSIONS[className] || ".lua";
}

export function scriptTypeForClass(className: string): ScriptDescriptor["scriptType"] {
  if (className === "Script") return "server";
  if (className === "LocalScript") return "client";
  return "module";
}

export function classNameFromScriptFile(fileName: string): string | null {
  return parseScriptTypeFromExtension(fileName);
}

export function scriptSuffixForFile(fileName: string): string | null {
  const className = classNameFromScriptFile(fileName);
  if (!className) return null;
  return scriptExtension(className);
}

export function relativePathFromWorkspaceFile(srcDir: string, fullPath: string, suffix: string): string {
  const rel = relative(srcDir, fullPath).replace(/\\/g, "/");
  return normalizeRelativePath(rel.slice(0, -suffix.length));
}

export function resolveInside(baseDir: string, relativeFilePath: string): string | null {
  const base = resolve(baseDir);
  const fullPath = resolve(base, relativeFilePath);
  const rel = relative(base, fullPath);
  if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) {
    return fullPath;
  }
  return null;
}

export function workspaceFilePath(srcDir: string, relativePath: string, suffix: string): string | null {
  return resolveInside(srcDir, `${normalizeRelativePath(relativePath)}${suffix}`);
}

export function workspaceFolderPath(srcDir: string, relativePath: string): string | null {
  return resolveInside(srcDir, normalizeRelativePath(relativePath));
}

export function entryFilePath(srcDir: string, entry: CacheEntry): string | null {
  if (isFolderClass(entry.className)) return workspaceFolderPath(srcDir, entry.relativePath);
  const suffix = isScriptClass(entry.className) ? scriptExtension(entry.className) : INSTANCE_JSON_EXTENSION;
  return workspaceFilePath(srcDir, entry.relativePath, suffix);
}

export function writeTextFile(srcDir: string, relativePath: string, suffix: string, content: string): string | null {
  const fullPath = workspaceFilePath(srcDir, relativePath, suffix);
  if (!fullPath) return null;
  const dir = dirname(fullPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(fullPath, content, "utf-8");
  return fullPath;
}

export function writeInstanceJsonFile(srcDir: string, relativePath: string, instance: InstanceJson): string | null {
  if (isFolderClass(instance.className)) {
    const fullPath = workspaceFolderPath(srcDir, relativePath);
    if (!fullPath) return null;

    const legacyFile = workspaceFilePath(srcDir, relativePath, INSTANCE_JSON_EXTENSION);
    if (legacyFile && existsSync(legacyFile)) {
      unlinkSync(legacyFile);
    }

    if (!existsSync(fullPath)) mkdirSync(fullPath, { recursive: true });
    return fullPath;
  }

  return writeTextFile(srcDir, relativePath, INSTANCE_JSON_EXTENSION, `${JSON.stringify(instance, null, 2)}\n`);
}

export function writeScriptFile(srcDir: string, relativePath: string, script: ScriptDescriptor): string | null {
  return writeTextFile(srcDir, relativePath, scriptExtension(script.className), script.source || "");
}

export function removeWorkspaceFile(srcDir: string, relativePath: string, className: string): boolean {
  const suffix = isScriptClass(className) ? scriptExtension(className) : INSTANCE_JSON_EXTENSION;
  const fullPath = workspaceFilePath(srcDir, relativePath, suffix);
  if (!fullPath || !existsSync(fullPath)) return false;
  unlinkSync(fullPath);
  return true;
}

export function removeEmptyWorkspaceFolder(srcDir: string, relativePath: string): boolean {
  const normalized = normalizeRelativePath(relativePath);
  if (!normalized) return false;
  const fullPath = workspaceFolderPath(srcDir, relativePath);
  if (!fullPath || !existsSync(fullPath)) return false;

  try {
    for (const entry of readdirSync(fullPath, { withFileTypes: true })) {
      if (!entry.isDirectory()) return false;
      const removed = removeEmptyWorkspaceFolder(srcDir, `${normalized}/${entry.name}`);
      if (!removed) return false;
    }
    rmdirSync(fullPath);
    return true;
  } catch {
    return false;
  }
}

export function removeWorkspaceFolderTree(srcDir: string, relativePath: string): boolean {
  const normalized = normalizeRelativePath(relativePath);
  if (!normalized) return false;
  const fullPath = workspaceFolderPath(srcDir, normalized);
  if (!fullPath || !existsSync(fullPath)) return false;
  rmSync(fullPath, { recursive: true, force: true });
  return true;
}

export function instanceJsonFromEntry(entry: CacheEntry): InstanceJson {
  return {
    uuid: entry.uuid,
    className: entry.className,
    name: entry.name,
    properties: entry.properties || {},
    attributes: entry.attributes || {},
    tags: entry.tags || [],
    children: entry.children || [],
  };
}

export function scriptDescriptorFromEntry(entry: CacheEntry, source: string): ScriptDescriptor {
  return {
    uuid: entry.uuid,
    name: entry.name,
    scriptType: scriptTypeForClass(entry.className),
    source,
    className: entry.className,
  };
}

export function readInstanceJsonFile(fullPath: string): InstanceJson | null {
  try {
    const parsed = JSON.parse(readFileSync(fullPath, "utf-8"));
    if (!isValidInstanceJson(parsed)) return null;
    return {
      uuid: parsed.uuid,
      className: parsed.className,
      name: parsed.name,
      properties: parsed.properties || {},
      attributes: parsed.attributes || {},
      tags: parsed.tags || [],
      children: parsed.children || [],
    };
  } catch {
    return null;
  }
}
