import type { RouteResult } from "../router";
import { parseRequest, createResponse, createErrorResponse } from "../protocol";
import type { ExportPushPayload, InstanceJson, ScriptDescriptor, CacheEntry } from "@drxporter/shared";
import { INSTANCE_JSON_EXTENSION, isFolderClass, isScriptClass, isServiceClass } from "@drxporter/shared";
import { CacheStore } from "../../cache/cache-store";
import { clearPendingChanges, invalidateLookupCache, markFileWritten, startWatcher, stopWatcher } from "../watcher";
import { createLogger } from "../../logging/logger";
import { mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import {
  joinRelativePath,
  removeWorkspaceFolderTree,
  removeWorkspaceFile,
  scriptExtension,
  scriptTypeForClass,
  writeInstanceJsonFile,
  writeScriptFile,
} from "../sync-files";

const logger = createLogger("export");

function artifactKey(entry: CacheEntry): string {
  const suffix = isScriptClass(entry.className) ? scriptExtension(entry.className) : INSTANCE_JSON_EXTENSION;
  return `${entry.relativePath}\0${suffix}`;
}

function buildPathMap(
  instances: InstanceJson[],
  scripts: ScriptDescriptor[],
): { pathMap: Map<string, string>; parentMap: Map<string, string | null> } {
  const pathMap = new Map<string, string>();
  const parentMap = new Map<string, string | null>();
  const instanceMap = new Map<string, InstanceJson>();
  const childToParent = new Map<string, string>();
  const reserved = new Map<string, string>();

  for (const inst of instances) {
    instanceMap.set(inst.uuid, inst);
    if (inst.children) {
      for (const childUuid of inst.children) {
        childToParent.set(childUuid, inst.uuid);
        parentMap.set(childUuid, inst.uuid);
      }
    }
  }

  const visited = new Set<string>();

  function reservePath(uuid: string, path: string): string {
    const base = path || uuid.slice(0, 8);
    let candidate = base;
    let suffix = 1;
    while (reserved.has(candidate) && reserved.get(candidate) !== uuid) {
      const uuidSuffix = uuid.slice(0, 8) || String(suffix);
      candidate = suffix === 1 ? `${base}_${uuidSuffix}` : `${base}_${uuidSuffix}_${suffix}`;
      suffix++;
    }
    reserved.set(candidate, uuid);
    return candidate;
  }

  function resolvePath(uuid: string): string {
    if (pathMap.has(uuid)) return pathMap.get(uuid)!;
    if (visited.has(uuid)) return "";
    visited.add(uuid);

    const inst = instanceMap.get(uuid);
    if (!inst) return "";

    if (isServiceClass(inst.className) || isServiceClass(inst.name)) {
      const path = reservePath(uuid, joinRelativePath(null, inst.name));
      pathMap.set(uuid, path);
      parentMap.set(uuid, null);
      return path;
    }

    const parentUuid = childToParent.get(uuid);
    if (parentUuid) {
      const parentPath = resolvePath(parentUuid);
      const path = reservePath(uuid, joinRelativePath(parentPath, inst.name));
      pathMap.set(uuid, path);
      parentMap.set(uuid, parentUuid);
      return path;
    }

    const path = reservePath(uuid, joinRelativePath(null, inst.name));
    pathMap.set(uuid, path);
    parentMap.set(uuid, null);
    return path;
  }

  for (const inst of instances) {
    resolvePath(inst.uuid);
  }

  for (const script of scripts) {
    const parentUuid = childToParent.get(script.uuid);
    const parentPath = parentUuid ? resolvePath(parentUuid) : "";
    const path = reservePath(script.uuid, joinRelativePath(parentPath, script.name));
    pathMap.set(script.uuid, path);
    parentMap.set(script.uuid, parentUuid || null);
  }

  return { pathMap, parentMap };
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
  const { pathMap, parentMap } = buildPathMap(payload.instances || [], payload.scripts || []);

  const cache = store.load(cacheKey);
  const srcDir = resolve(process.cwd(), "src");
  let filesWritten = 0;
  let staleEntriesRemoved = 0;
  const folderPathsToRemove = new Set<string>();
  const fullSync = payload.fullSync === true || payload.forceOverwrite === true;

  if (fullSync) {
    clearPendingChanges();
  }

  if (payload.forceOverwrite) {
    stopWatcher();
    rmSync(srcDir, { recursive: true, force: true });
    mkdirSync(srcDir, { recursive: true });
    logger.info("Force overwrite: cleared src before applying Roblox snapshot");
  }

  for (const inst of payload.instances || []) {
    const relPath = pathMap.get(inst.uuid) || joinRelativePath(null, inst.name);
    const oldEntry = cache.entries[inst.uuid];
    if (oldEntry?.relativePath && oldEntry.relativePath !== relPath) {
      try {
        if (removeWorkspaceFile(srcDir, oldEntry.relativePath, oldEntry.className)) {
          logger.info(`Removed stale: src/${oldEntry.relativePath}`);
        }
        if (isFolderClass(oldEntry.className)) {
          folderPathsToRemove.add(oldEntry.relativePath);
        }
      } catch {}
    }

    const instanceJson: InstanceJson = {
      uuid: inst.uuid,
      className: inst.className,
      name: inst.name,
      properties: inst.properties || {},
      attributes: inst.attributes || {},
      tags: inst.tags || [],
      children: inst.children || [],
    };

    const entry: CacheEntry = {
      uuid: inst.uuid,
      className: inst.className,
      name: inst.name,
      parentUuid: parentMap.get(inst.uuid) || null,
      lastExportedAt: Date.now(),
      relativePath: relPath,
      properties: instanceJson.properties,
      attributes: instanceJson.attributes,
      tags: instanceJson.tags,
      children: instanceJson.children,
    };

    cache.entries[inst.uuid] = entry;

    const fullPath = writeInstanceJsonFile(srcDir, relPath, instanceJson);
    if (fullPath) {
      markFileWritten(fullPath);
      filesWritten++;
      if (isFolderClass(inst.className)) {
        logger.info(`Wrote folder: src/${relPath}/`);
      } else {
        logger.info(`Wrote: src/${relPath}.instance.json`);
      }
    }
  }

  for (const script of payload.scripts || []) {
    const relPath = pathMap.get(script.uuid) || joinRelativePath(null, script.name);
    const ext = scriptExtension(script.className);

    const oldEntry = cache.entries[script.uuid];
    if (oldEntry?.relativePath && oldEntry.relativePath !== relPath) {
      try {
        if (removeWorkspaceFile(srcDir, oldEntry.relativePath, oldEntry.className)) {
          const oldExt = scriptExtension(oldEntry.className);
          logger.info(`Removed stale: src/${oldEntry.relativePath}${oldExt}`);
        }
        if (isFolderClass(oldEntry.className)) {
          folderPathsToRemove.add(oldEntry.relativePath);
        }
      } catch {}
    }

    const entry: CacheEntry = {
      uuid: script.uuid,
      className: script.className,
      name: script.name,
      parentUuid: parentMap.get(script.uuid) || null,
      lastExportedAt: Date.now(),
      relativePath: relPath,
      source: script.source || "",
    };

    cache.entries[script.uuid] = entry;

    const fullPath = writeScriptFile(srcDir, relPath, {
      ...script,
      scriptType: script.scriptType || scriptTypeForClass(script.className),
      source: script.source || "",
    });
    if (fullPath) {
      markFileWritten(fullPath);
      filesWritten++;
      logger.info(`Wrote: src/${relPath}${ext}`);
    }
  }

  if (fullSync) {
    const activeArtifacts = new Set<string>();
    const activeFolderPaths = new Set<string>();
    for (const uuid of uuids) {
      const entry = cache.entries[uuid];
      if (entry) {
        activeArtifacts.add(artifactKey(entry));
        if (isFolderClass(entry.className)) activeFolderPaths.add(entry.relativePath);
      }
    }

    for (const [uuid, oldEntry] of Object.entries({ ...cache.entries })) {
      if (uuids.has(uuid)) continue;

      if (isFolderClass(oldEntry.className) && !activeFolderPaths.has(oldEntry.relativePath)) {
        folderPathsToRemove.add(oldEntry.relativePath);
      }

      if (!activeArtifacts.has(artifactKey(oldEntry))) {
        try {
          if (removeWorkspaceFile(srcDir, oldEntry.relativePath, oldEntry.className)) {
            logger.info(`Removed stale: src/${oldEntry.relativePath}`);
          }
        } catch {}
      }

      delete cache.entries[uuid];
      staleEntriesRemoved++;
    }
  }

  for (const relPath of Array.from(folderPathsToRemove).sort((a, b) => b.length - a.length)) {
    if (removeWorkspaceFolderTree(srcDir, relPath)) {
      logger.info(`Removed folder tree: src/${relPath}/`);
    }
  }
  store.save(cacheKey, cache);
  invalidateLookupCache();

  startWatcher(srcDir, cacheDir);

  logger.info(
    `Cache saved: ${Object.keys(cache.entries).length} entries | Files written: ${filesWritten} | Stale removed: ${staleEntriesRemoved}`,
  );

  return {
    status: 200,
    body: createResponse(request.requestId, {
      exported: uuids.size,
      instances: payload.instances?.length || 0,
      scripts: payload.scripts?.length || 0,
      filesWritten,
      staleEntriesRemoved,
      forceOverwrite: payload.forceOverwrite === true,
    }),
  };
}
