import type { RouteResult } from "../router";
import { parseRequest, createResponse, createErrorResponse } from "../protocol";
import type { ExportPushPayload, InstanceJson, ScriptDescriptor, CacheEntry } from "@drxporter/shared";
import { isScriptClass, isServiceClass, SCRIPT_EXTENSIONS } from "@drxporter/shared";
import { CacheStore } from "../../cache/cache-store";
import { markFileWritten, startWatcher } from "../watcher";
import { createLogger } from "../../logging/logger";
import { writeFileSync, mkdirSync, existsSync, unlinkSync } from "node:fs";
import { resolve, dirname } from "node:path";

const logger = createLogger("export");

function buildPathMap(
  instances: InstanceJson[],
  scripts: ScriptDescriptor[]
): Map<string, string> {
  const pathMap = new Map<string, string>();
  const instanceMap = new Map<string, InstanceJson>();
  const childToParent = new Map<string, string>();

  for (const inst of instances) {
    instanceMap.set(inst.uuid, inst);
    if (inst.children) {
      for (const childUuid of inst.children) {
        childToParent.set(childUuid, inst.uuid);
      }
    }
  }

  const visited = new Set<string>();

  function resolvePath(uuid: string): string {
    if (pathMap.has(uuid)) return pathMap.get(uuid)!;
    if (visited.has(uuid)) return "";
    visited.add(uuid);

    const inst = instanceMap.get(uuid);
    if (!inst) return "";

    if (isServiceClass(inst.className) || isServiceClass(inst.name)) {
      pathMap.set(uuid, inst.name);
      return inst.name;
    }

    const parentUuid = childToParent.get(uuid);
    if (parentUuid) {
      const parentPath = resolvePath(parentUuid);
      const path = parentPath ? `${parentPath}/${inst.name}` : inst.name;
      pathMap.set(uuid, path);
      return path;
    }

    pathMap.set(uuid, inst.name);
    return inst.name;
  }

  for (const inst of instances) {
    resolvePath(inst.uuid);
  }

  for (const script of scripts) {
    const parentUuid = childToParent.get(script.uuid);
    const parentPath = parentUuid ? (pathMap.get(parentUuid) || "") : "";
    pathMap.set(script.uuid, parentPath ? `${parentPath}/${script.name}` : script.name);
  }

  return pathMap;
}

function removeOldFile(srcDir: string, oldRelPath: string, className: string): void {
  try {
    if (isScriptClass(className)) {
      const ext = SCRIPT_EXTENSIONS[className] || ".lua";
      const oldPath = resolve(srcDir, oldRelPath + ext);
      if (existsSync(oldPath)) {
        unlinkSync(oldPath);
        logger.info(`Removed stale: src/${oldRelPath}${ext}`);
      }
    }
  } catch {}
}

export async function handleExportFromStudio(body: string): Promise<RouteResult> {
  const request = parseRequest<ExportPushPayload>(body);
  if (!request) {
    return { status: 400, body: createErrorResponse("unknown", "DRX_E012", "Invalid export payload") };
  }

  const payload = request.payload;
  logger.info(`Export received: ${payload.instances?.length || 0} instances, ${payload.scripts?.length || 0} scripts`);

  const uuids = new Set<string>();
  for (const inst of payload.instances || []) {
    if (uuids.has(inst.uuid)) {
      return {
        status: 400,
        body: createErrorResponse(request.requestId, "DRX_E002", `Duplicate UUID: ${inst.uuid}`),
      };
    }
    uuids.add(inst.uuid);
  }

  for (const script of payload.scripts || []) {
    if (uuids.has(script.uuid)) {
      return {
        status: 400,
        body: createErrorResponse(request.requestId, "DRX_E002", `Duplicate UUID: ${script.uuid}`),
      };
    }
    uuids.add(script.uuid);
  }

  const cacheDir = resolve(process.cwd(), ".drxporter-cache");
  const store = new CacheStore(cacheDir);
  const cacheKey = payload.cacheKey || { gameId: "0", placeId: "0" };

  const pathMap = buildPathMap(payload.instances || [], payload.scripts || []);

  const cache = store.load(cacheKey);
  const srcDir = resolve(process.cwd(), "src");
  let filesWritten = 0;

  for (const inst of payload.instances || []) {
    const relPath = pathMap.get(inst.uuid) || inst.name;

    const entry: CacheEntry = {
      uuid: inst.uuid,
      className: inst.className,
      name: inst.name,
      parentUuid: null,
      lastExportedAt: Date.now(),
      relativePath: relPath,
    };

    (entry as any).properties = inst.properties;
    (entry as any).attributes = inst.attributes;
    (entry as any).tags = inst.tags;
    (entry as any).children = inst.children;

    cache.entries[inst.uuid] = entry;
  }

  for (const script of payload.scripts || []) {
    const relPath = pathMap.get(script.uuid) || script.name;
    const ext = SCRIPT_EXTENSIONS[script.className] || ".lua";

    const oldEntry = cache.entries[script.uuid];
    if (oldEntry && oldEntry.relativePath && oldEntry.relativePath !== relPath) {
      removeOldFile(srcDir, oldEntry.relativePath, script.className);
    }

    const entry: CacheEntry = {
      uuid: script.uuid,
      className: script.className,
      name: script.name,
      parentUuid: null,
      lastExportedAt: Date.now(),
      relativePath: relPath,
    };
    (entry as any).source = script.source;

    cache.entries[script.uuid] = entry;

    const fullPath = resolve(srcDir, relPath + ext);
    const dir = dirname(fullPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    markFileWritten(fullPath);
    writeFileSync(fullPath, script.source || "", "utf-8");
    filesWritten++;
    logger.info(`Wrote: src/${relPath}${ext}`);
  }

  store.save(cacheKey, cache);

  startWatcher(srcDir, cacheDir);

  logger.info(`Cache saved: ${Object.keys(cache.entries).length} entries | Scripts written: ${filesWritten}`);

  return {
    status: 200,
    body: createResponse(request.requestId, {
      exported: uuids.size,
      instances: payload.instances?.length || 0,
      scripts: payload.scripts?.length || 0,
      filesWritten,
    }),
  };
}
