import type { RouteResult } from "../router";
import { parseRequest, createResponse, createErrorResponse } from "../protocol";
import { CacheStore } from "../../cache/cache-store";
import { dropPendingChangesForUuid, invalidateLookupCache, markFileWritten, startWatcher } from "../watcher";
import {
  isFolderClass,
  isScriptClass,
  type AttributeValue,
  type CacheEntry,
  type CacheKey,
  type InstanceJson,
  type PlaceCache,
  type PropertyValue,
} from "@drxporter/shared";
import { createLogger } from "../../logging/logger";
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  joinRelativePath,
  normalizeRelativePath,
  removeEmptyWorkspaceFolder,
  removeWorkspaceFile,
  replacePathLeaf,
  scriptExtension,
  scriptTypeForClass,
  writeInstanceJsonFile,
  writeScriptFile,
} from "../sync-files";

const logger = createLogger("sync-push");

interface PushPayload {
  cacheKey?: CacheKey;
  uuid: string;
  name: string;
  className: string;
  type?: "script" | "instance";
  parentUuid?: string | null;
  scriptType?: string;
  source?: string;
  properties?: Record<string, PropertyValue>;
  attributes?: Record<string, AttributeValue>;
  tags?: string[];
  children?: string[];
  timestamp: number;
}

interface CacheContext {
  key: CacheKey;
  cache: PlaceCache;
}

function parseCacheKey(file: string): CacheKey | null {
  const parts = file.replace(".json", "").split("_");
  if (parts.length !== 2) return null;
  return { gameId: parts[0], placeId: parts[1] };
}

function loadTargetCaches(cacheDir: string, store: CacheStore, payload: PushPayload): CacheContext[] {
  if (payload.cacheKey) {
    return [{ key: payload.cacheKey, cache: store.load(payload.cacheKey) }];
  }

  const cacheFiles = existsSync(cacheDir) ? readdirSync(cacheDir).filter((f) => f.endsWith(".json")) : [];
  const contexts: CacheContext[] = [];
  for (const file of cacheFiles) {
    const key = parseCacheKey(file);
    if (key) contexts.push({ key, cache: store.load(key) });
  }
  return contexts;
}

function resolveIncomingPath(cacheEntries: Record<string, CacheEntry>, entry: CacheEntry | undefined, payload: PushPayload): string {
  const parentUuid = payload.parentUuid !== undefined ? payload.parentUuid : entry?.parentUuid;
  const parentEntry = parentUuid ? cacheEntries[parentUuid] : undefined;
  if (parentEntry?.relativePath) {
    return joinRelativePath(parentEntry.relativePath, payload.name);
  }

  if (entry?.relativePath) {
    return replacePathLeaf(entry.relativePath, payload.name);
  }

  return joinRelativePath(null, payload.name);
}

function reserveRelativePath(cacheEntries: Record<string, CacheEntry>, uuid: string, desiredPath: string): string {
  const base = normalizeRelativePath(desiredPath) || uuid.slice(0, 8) || "Instance";
  let candidate = base;
  let suffix = 1;

  const isTaken = (path: string) =>
    Object.entries(cacheEntries).some(([entryUuid, entry]) => entryUuid !== uuid && entry.relativePath === path);

  while (isTaken(candidate)) {
    const uuidSuffix = uuid.slice(0, 8) || String(suffix);
    candidate = suffix === 1 ? `${base}_${uuidSuffix}` : `${base}_${uuidSuffix}_${suffix}`;
    suffix++;
  }

  return candidate;
}

function findSmartCacheMatch(
  cacheEntries: Record<string, CacheEntry>,
  payload: PushPayload,
  desiredPath: string,
): string | null {
  const parentUuid = payload.parentUuid ?? null;
  const normalizedDesired = normalizeRelativePath(desiredPath);
  const matches = Object.entries(cacheEntries).filter(([entryUuid, entry]) => {
    if (entryUuid === payload.uuid) return false;
    if (entry.className !== payload.className) return false;
    if (entry.parentUuid !== parentUuid) return false;
    return entry.name === payload.name || normalizeRelativePath(entry.relativePath) === normalizedDesired;
  });

  if (matches.length === 1) return matches[0][0];

  const pathMatches = Object.entries(cacheEntries).filter(([entryUuid, entry]) => {
    if (entryUuid === payload.uuid) return false;
    if (entry.className !== payload.className) return false;
    return normalizeRelativePath(entry.relativePath) === normalizedDesired;
  });

  return pathMatches.length === 1 ? pathMatches[0][0] : null;
}

function replaceCacheReferences(cacheEntries: Record<string, CacheEntry>, oldUuid: string, nextUuid: string): void {
  for (const entry of Object.values(cacheEntries)) {
    if (entry.parentUuid === oldUuid) {
      entry.parentUuid = nextUuid;
    }
    if (entry.children) {
      entry.children = entry.children.map((childUuid) => (childUuid === oldUuid ? nextUuid : childUuid));
    }
  }
}

function isIncomingScript(payload: PushPayload, entry: CacheEntry | undefined): boolean {
  return payload.type === "script" || isScriptClass(payload.className || entry?.className || "");
}

export async function handleSyncPushFromStudio(body: string): Promise<RouteResult> {
  const request = parseRequest<PushPayload>(body);
  if (!request) {
    return { status: 400, body: createErrorResponse("unknown", "DRX_E012", "Invalid push payload") };
  }

  const payload = request.payload;
  const cacheDir = resolve(process.cwd(), ".drxporter-cache");
  const store = new CacheStore(cacheDir);
  const srcDir = resolve(process.cwd(), "src");
  const targetCaches = loadTargetCaches(cacheDir, store, payload);
  let written = false;
  let renamed = false;
  let relativePath: string | null = null;
  let created = false;
  let adoptedUuid: string | null = null;

  for (const { key, cache } of targetCaches) {
    let entry = cache.entries[payload.uuid];
    const desiredPath = resolveIncomingPath(cache.entries, entry, payload);

    if (!entry) {
      const matchUuid = findSmartCacheMatch(cache.entries, payload, desiredPath);
      if (matchUuid) {
        entry = cache.entries[matchUuid];
        delete cache.entries[matchUuid];
        replaceCacheReferences(cache.entries, matchUuid, payload.uuid);
        adoptedUuid = matchUuid;
      }
    }

    if (!entry && !payload.cacheKey) continue;

    const nextRelPath = reserveRelativePath(cache.entries, payload.uuid, resolveIncomingPath(cache.entries, entry, payload));
    const nextClassName = payload.className || entry?.className || "Folder";
    renamed = Boolean(entry && entry.relativePath !== nextRelPath) || Boolean(adoptedUuid);
    created = !entry;

    if (entry && (entry.relativePath !== nextRelPath || entry.className !== nextClassName)) {
      try {
        removeWorkspaceFile(srcDir, entry.relativePath, entry.className);
        if (isFolderClass(entry.className)) {
          removeEmptyWorkspaceFolder(srcDir, entry.relativePath);
        }
      } catch {}
    }

    if (isIncomingScript(payload, entry)) {
      const source = payload.source ?? entry?.source ?? "";
      const nextEntry: CacheEntry = {
        ...(entry || {}),
        uuid: payload.uuid,
        name: payload.name,
        className: nextClassName,
        parentUuid: payload.parentUuid !== undefined ? payload.parentUuid : entry?.parentUuid ?? null,
        relativePath: nextRelPath,
        source,
        lastExportedAt: Date.now(),
      };
      cache.entries[payload.uuid] = nextEntry;
      store.save(key, cache);

      const fullPath = writeScriptFile(srcDir, nextRelPath, {
        uuid: payload.uuid,
        name: payload.name,
        className: nextEntry.className,
        scriptType: scriptTypeForClass(nextEntry.className),
        source,
      });
      if (fullPath) {
        markFileWritten(fullPath);
        logger.info(`Sync←Studio: ${nextRelPath}${scriptExtension(nextEntry.className)}`);
      }
    } else {
      const instanceJson: InstanceJson = {
        uuid: payload.uuid,
        className: nextClassName,
        name: payload.name,
        properties: payload.properties || entry?.properties || {},
        attributes: payload.attributes || entry?.attributes || {},
        tags: payload.tags || entry?.tags || [],
        children: payload.children || entry?.children || [],
      };
      const nextEntry: CacheEntry = {
        ...(entry || {}),
        uuid: payload.uuid,
        className: nextClassName,
        name: payload.name,
        parentUuid: payload.parentUuid !== undefined ? payload.parentUuid : entry?.parentUuid ?? null,
        relativePath: nextRelPath,
        properties: instanceJson.properties,
        attributes: instanceJson.attributes,
        tags: instanceJson.tags,
        children: instanceJson.children,
        lastExportedAt: Date.now(),
      };
      cache.entries[payload.uuid] = nextEntry;
      store.save(key, cache);

      const fullPath = writeInstanceJsonFile(srcDir, nextRelPath, instanceJson);
      if (fullPath) {
        markFileWritten(fullPath);
        if (isFolderClass(nextEntry.className)) {
          logger.info(`Sync←Studio: ${nextRelPath}/`);
        } else {
          logger.info(`Sync←Studio: ${nextRelPath}.instance.json`);
        }
      }
    }

    dropPendingChangesForUuid(payload.uuid);
    if (adoptedUuid) dropPendingChangesForUuid(adoptedUuid);
    invalidateLookupCache();
    startWatcher(srcDir, cacheDir);
    written = true;
    relativePath = nextRelPath;
    break;
  }

  if (!written) {
    logger.debug(`UUID not in cache: ${payload.uuid}`);
  }

  return {
    status: 200,
    body: createResponse(request.requestId, { written, renamed, created, adoptedUuid, relativePath }),
  };
}
