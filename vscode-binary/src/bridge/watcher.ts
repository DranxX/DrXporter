import { existsSync, readFileSync, readdirSync, rmSync, watch, type FSWatcher } from "node:fs";
import { basename, relative, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type { CacheEntry, CacheKey, InstanceJson, PlaceCache } from "@drxporter/shared";
import { INSTANCE_JSON_EXTENSION, isFolderClass, isScriptClass, isServiceClass } from "@drxporter/shared";
import { createLogger } from "../logging/logger";
import { CacheStore } from "../cache/cache-store";
import {
  classNameFromScriptFile,
  normalizeRelativePath,
  pathLeafName,
  pathParent,
  readInstanceJsonFile,
  relativePathFromWorkspaceFile,
  replacePathLeaf,
  scriptExtension,
  scriptSuffixForFile,
  workspaceFilePath,
  workspaceFolderPath,
  writeInstanceJsonFile,
} from "./sync-files";

const logger = createLogger("watcher");

export type FileChange = ScriptFileChange | InstanceFileChange | DeleteFileChange;

export interface ScriptFileChange {
  uuid: string;
  relativePath: string;
  className: string;
  type: "script";
  content: string;
  name: string;
  parentUuid: string | null;
}

export interface InstanceFileChange {
  uuid: string;
  relativePath: string;
  className: string;
  type: "instance";
  data: InstanceJson;
  name: string;
  parentUuid: string | null;
}

export interface DeleteFileChange {
  uuid: string;
  relativePath: string;
  className: string;
  type: "delete";
  name: string;
}

interface CacheRef {
  key: CacheKey;
  uuid: string;
  entry: CacheEntry;
}

interface WorkspaceScriptFile {
  fullPath: string;
  relativePath: string;
  className: string;
}

interface WorkspaceInstanceFile {
  fullPath: string;
  relativePath: string;
  data: Partial<InstanceJson> | null;
}

const MAX_PENDING = 200;
const DEBOUNCE_MS = 1000;
const STARTUP_GRACE_MS = 5000;
const RECENT_WRITE_TTL = 5000;
const RECONCILE_KEY = "__workspace_reconcile__";

const pendingChanges: FileChange[] = [];
let isWatching = false;
let startupGracePeriod = true;
const recentWrites = new Map<string, number>();
let fsWatcher: FSWatcher | null = null;
let startupGraceTimer: NodeJS.Timeout | null = null;
const debounceTimers = new Map<string, NodeJS.Timeout>();
let cachedLookup: Map<string, CacheRef> | null = null;
let lookupCacheTime = 0;
const LOOKUP_CACHE_TTL = 10_000;

export function markFileWritten(filePath: string): void {
  recentWrites.set(filePath, Date.now());
}

export function invalidateLookupCache(): void {
  cachedLookup = null;
  lookupCacheTime = 0;
}

function cleanupRecentWrites(): void {
  const now = Date.now();
  for (const [path, time] of recentWrites) {
    if (now - time > RECENT_WRITE_TTL) {
      recentWrites.delete(path);
    }
  }
}

function wasRecentlyWritten(filePath: string): boolean {
  cleanupRecentWrites();
  const lastWrite = recentWrites.get(filePath);
  return Boolean(lastWrite && Date.now() - lastWrite < RECENT_WRITE_TTL);
}

function queueChange(change: FileChange): void {
  if (pendingChanges.length >= MAX_PENDING) {
    pendingChanges.shift();
  }
  pendingChanges.push(change);
}

export function getPendingChanges(): FileChange[] {
  const changes = [...pendingChanges];
  pendingChanges.length = 0;
  return changes;
}

export function clearPendingChanges(): void {
  pendingChanges.length = 0;
}

export function dropPendingChangesForUuid(uuid: string): void {
  for (let i = pendingChanges.length - 1; i >= 0; i--) {
    if (pendingChanges[i]?.uuid === uuid) {
      pendingChanges.splice(i, 1);
    }
  }
}

export function stopWatcher(): void {
  if (fsWatcher) {
    fsWatcher.close();
    fsWatcher = null;
  }
  if (startupGraceTimer) {
    clearTimeout(startupGraceTimer);
    startupGraceTimer = null;
  }
  for (const timer of debounceTimers.values()) {
    clearTimeout(timer);
  }
  debounceTimers.clear();
  isWatching = false;
  startupGracePeriod = true;
  pendingChanges.length = 0;
  recentWrites.clear();
  invalidateLookupCache();
}

export function startWatcher(srcDir: string, cacheDir: string): void {
  if (isWatching) return;
  if (!existsSync(srcDir)) {
    logger.info("Source directory not found, watcher will start after first export");
    return;
  }

  isWatching = true;
  startupGracePeriod = true;
  logger.info(`Watching for workspace changes in: ${srcDir}`);

  startupGraceTimer = setTimeout(() => {
    startupGraceTimer = null;
    startupGracePeriod = false;
    reconcileWorkspace(srcDir, cacheDir);
    logger.info("File watcher active (grace period ended)");
  }, STARTUP_GRACE_MS);
  startupGraceTimer.unref?.();

  fsWatcher = watch(srcDir, { recursive: true }, (eventType, filename) => {
    if (!filename || startupGracePeriod) return;

    const name = String(filename).replace(/\\/g, "/");
    if (eventType === "rename") {
      scheduleReconcile(srcDir, cacheDir);
      return;
    }

    const isScript = name.endsWith(".lua");
    const isInstanceJson = name.endsWith(INSTANCE_JSON_EXTENSION);
    if (!isScript && !isInstanceJson) return;

    const fullPath = resolve(srcDir, name);
    if (wasRecentlyWritten(fullPath)) return;

    if (!existsSync(fullPath)) return;
    scheduleFileChange(fullPath, srcDir, cacheDir, isInstanceJson ? "instance" : "script");
  });
}

function scheduleFileChange(fullPath: string, srcDir: string, cacheDir: string, kind: "script" | "instance"): void {
  const existing = debounceTimers.get(fullPath);
  if (existing) clearTimeout(existing);

  debounceTimers.set(
    fullPath,
    setTimeout(() => {
      debounceTimers.delete(fullPath);
      if (kind === "instance") {
        processInstanceJsonChange(fullPath, srcDir, cacheDir);
      } else {
        processScriptFileChange(fullPath, srcDir, cacheDir);
      }
    }, DEBOUNCE_MS),
  );
  debounceTimers.get(fullPath)?.unref?.();
}

function scheduleReconcile(srcDir: string, cacheDir: string): void {
  const existing = debounceTimers.get(RECONCILE_KEY);
  if (existing) clearTimeout(existing);

  debounceTimers.set(
    RECONCILE_KEY,
    setTimeout(() => {
      debounceTimers.delete(RECONCILE_KEY);
      reconcileWorkspace(srcDir, cacheDir);
    }, DEBOUNCE_MS),
  );
  debounceTimers.get(RECONCILE_KEY)?.unref?.();
}

function parseCacheKey(file: string): CacheKey | null {
  const parts = file.replace(".json", "").split("_");
  if (parts.length !== 2) return null;
  return { gameId: parts[0], placeId: parts[1] };
}

function loadCaches(cacheDir: string): Array<{ key: CacheKey; cache: PlaceCache }> {
  if (!existsSync(cacheDir)) return [];

  const store = new CacheStore(cacheDir);
  const files = readdirSync(cacheDir).filter((f) => f.endsWith(".json"));
  const caches: Array<{ key: CacheKey; cache: PlaceCache }> = [];

  for (const file of files) {
    const key = parseCacheKey(file);
    if (!key) continue;
    caches.push({ key, cache: store.load(key) });
  }

  return caches;
}

function getWritableCache(cacheDir: string, preferredKey?: CacheKey): { key: CacheKey; cache: PlaceCache } | null {
  const store = new CacheStore(cacheDir);
  if (preferredKey) {
    return { key: preferredKey, cache: store.load(preferredKey) };
  }

  const caches = loadCaches(cacheDir);
  if (caches.length > 0) return caches[0];
  return null;
}

function saveCache(cacheDir: string, key: CacheKey, cache: PlaceCache): void {
  const store = new CacheStore(cacheDir);
  store.save(key, cache);
  invalidateLookupCache();
}

function nextUuid(): string {
  return randomUUID();
}

function entryFromInstance(relativePath: string, parentUuid: string | null, data: InstanceJson): CacheEntry {
  return {
    uuid: data.uuid,
    className: data.className,
    name: data.name,
    parentUuid,
    lastExportedAt: Date.now(),
    relativePath,
    properties: data.properties || {},
    attributes: data.attributes || {},
    tags: data.tags || [],
    children: data.children || [],
  };
}

function addChild(cache: PlaceCache, parentUuid: string | null, childUuid: string): void {
  if (!parentUuid) return;
  const parent = cache.entries[parentUuid];
  if (!parent) return;
  const children = parent.children || [];
  if (!children.includes(childUuid)) {
    parent.children = [...children, childUuid];
  }
}

function removeChildRefs(cache: PlaceCache, removedUuid: string): void {
  for (const entry of Object.values(cache.entries)) {
    if (entry.children) {
      entry.children = entry.children.filter((uuid) => uuid !== removedUuid);
    }
  }
}

function cacheEntryByPath(cache: PlaceCache, relativePath: string): [string, CacheEntry] | null {
  for (const [uuid, entry] of Object.entries(cache.entries)) {
    if (entry.relativePath === relativePath) return [uuid, entry];
  }
  return null;
}

function readLooseInstanceJson(fullPath: string): Partial<InstanceJson> | null {
  try {
    const parsed = JSON.parse(readFileSync(fullPath, "utf-8"));
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as Partial<InstanceJson>;
  } catch {
    return null;
  }
}

function ensureWorkspaceParent(
  cache: PlaceCache,
  relativePath: string,
): { uuid: string | null; created: CacheEntry[] } {
  const parts = relativePath.split("/").filter(Boolean);
  const created: CacheEntry[] = [];
  if (parts.length <= 1) return { uuid: null, created };

  let parentUuid: string | null = null;
  let currentPath = "";

  for (let i = 0; i < parts.length - 1; i++) {
    const name = parts[i];
    currentPath = currentPath ? `${currentPath}/${name}` : name;
    const existing = cacheEntryByPath(cache, currentPath);
    if (existing) {
      parentUuid = existing[0];
      continue;
    }

    const className = i === 0 && isServiceClass(name) ? name : "Folder";
    const uuid = nextUuid();
    const entry: CacheEntry = {
      uuid,
      className,
      name,
      parentUuid,
      lastExportedAt: Date.now(),
      relativePath: currentPath,
      properties: {},
      attributes: {},
      tags: [],
      children: [],
    };
    cache.entries[uuid] = entry;
    addChild(cache, parentUuid, uuid);
    created.push(entry);
    parentUuid = uuid;
  }

  return { uuid: parentUuid, created };
}

function queueInstanceCreate(entry: CacheEntry): void {
  const data = instanceJsonFromCacheEntry(entry);
  queueChange({
    uuid: entry.uuid,
    relativePath: entry.relativePath,
    className: entry.className,
    type: "instance",
    data,
    name: entry.name,
    parentUuid: entry.parentUuid,
  });
}

function queueScriptCreate(entry: CacheEntry): void {
  queueChange({
    uuid: entry.uuid,
    relativePath: entry.relativePath,
    className: entry.className,
    type: "script",
    content: entry.source || "",
    name: entry.name,
    parentUuid: entry.parentUuid,
  });
}

function instanceJsonFromCacheEntry(entry: CacheEntry): InstanceJson {
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

function collectSubtree(cache: PlaceCache, rootUuid: string): string[] {
  const result: string[] = [];
  const visited = new Set<string>();

  function visit(uuid: string): void {
    if (visited.has(uuid)) return;
    visited.add(uuid);
    const entry = cache.entries[uuid];
    if (!entry) return;

    for (const [childUuid, child] of Object.entries(cache.entries)) {
      if (child.parentUuid === uuid) visit(childUuid);
    }
    for (const childUuid of entry.children || []) visit(childUuid);
    result.push(uuid);
  }

  visit(rootUuid);
  return result;
}

function normalizeWorkspacePath(path: string): string {
  return normalizeRelativePath(path.replace(/\\/g, "/"));
}

function ingestWorkspaceFolders(folderPaths: string[], cacheDir: string, preferredKey?: CacheKey): void {
  const target = getWritableCache(cacheDir, preferredKey);
  if (!target) return;

  let dirty = false;
  for (const folderPath of [...folderPaths].sort((a, b) => a.length - b.length)) {
    if (cacheEntryByPath(target.cache, folderPath)) continue;
    const parent = ensureWorkspaceParent(target.cache, `${folderPath}/__folder__`);
    for (const entry of parent.created) {
      queueInstanceCreate(entry);
      dirty = true;
    }
  }

  if (dirty) {
    saveCache(cacheDir, target.key, target.cache);
  }
}

function queueDeletedWorkspaceEntries(srcDir: string, cacheDir: string, preferredKey?: CacheKey): void {
  const contexts = preferredKey ? [getWritableCache(cacheDir, preferredKey)].filter(Boolean) : loadCaches(cacheDir);
  for (const context of contexts as Array<{ key: CacheKey; cache: PlaceCache }>) {
    let dirty = false;
    for (const [uuid, entry] of Object.entries({ ...context.cache.entries })) {
      if (!context.cache.entries[uuid]) continue;
      if (isServiceClass(entry.className)) continue;

      const suffix = isScriptClass(entry.className) ? scriptExtension(entry.className) : INSTANCE_JSON_EXTENSION;
      const expected = isFolderClass(entry.className)
        ? workspaceFolderPath(srcDir, entry.relativePath)
        : workspaceFilePath(srcDir, entry.relativePath, suffix);

      if (expected && existsSync(expected)) continue;

      for (const subtreeUuid of collectSubtree(context.cache, uuid)) {
        const subtreeEntry = context.cache.entries[subtreeUuid];
        if (!subtreeEntry || isServiceClass(subtreeEntry.className)) continue;
        queueChange({
          uuid: subtreeUuid,
          relativePath: subtreeEntry.relativePath,
          className: subtreeEntry.className,
          type: "delete",
          name: subtreeEntry.name,
        });
        removeChildRefs(context.cache, subtreeUuid);
        delete context.cache.entries[subtreeUuid];
        dirty = true;
      }
    }

    if (dirty) saveCache(cacheDir, context.key, context.cache);
  }
}

function buildScriptLookupCache(cacheDir: string): Map<string, CacheRef> {
  const now = Date.now();
  if (cachedLookup && now - lookupCacheTime < LOOKUP_CACHE_TTL) {
    return cachedLookup;
  }

  const lookup = new Map<string, CacheRef>();
  for (const { key, cache } of loadCaches(cacheDir)) {
    for (const [entryUuid, entry] of Object.entries(cache.entries)) {
      if (!isScriptClass(entry.className)) continue;
      lookup.set(scriptLookupKey(entry.relativePath, entry.className), { key, uuid: entryUuid, entry });
    }
  }

  cachedLookup = lookup;
  lookupCacheTime = now;
  return lookup;
}

function scriptLookupKey(relativePath: string, className: string): string {
  return `${relativePath}\0${className}`;
}

function findCacheEntry(cacheDir: string, uuid: string): CacheRef | null {
  for (const { key, cache } of loadCaches(cacheDir)) {
    const entry = cache.entries[uuid];
    if (entry) return { key, uuid, entry };
  }
  return null;
}

function saveCacheEntry(cacheDir: string, ref: CacheRef, entry: CacheEntry): void {
  const store = new CacheStore(cacheDir);
  const cache = store.load(ref.key);
  cache.entries[ref.uuid] = entry;
  store.save(ref.key, cache);
  invalidateLookupCache();
}

function ingestUntrackedScript(
  fullPath: string,
  srcDir: string,
  cacheDir: string,
  relativePath: string,
  className: string,
  suffix: string,
  preferredKey?: CacheKey,
): boolean {
  const target = getWritableCache(cacheDir, preferredKey);
  if (!target) {
    logger.debug(`Changed script not in cache: ${relativePath}${suffix}`);
    return false;
  }

  const existing = cacheEntryByPath(target.cache, relativePath);
  if (existing) return false;

  let source = "";
  try {
    source = readFileSync(fullPath, "utf-8");
  } catch {
    return false;
  }

  const parent = ensureWorkspaceParent(target.cache, relativePath);
  for (const entry of parent.created) queueInstanceCreate(entry);

  const uuid = nextUuid();
  const entry: CacheEntry = {
    uuid,
    className,
    name: pathLeafName(relativePath),
    parentUuid: parent.uuid,
    lastExportedAt: Date.now(),
    relativePath,
    source,
  };
  target.cache.entries[uuid] = entry;
  addChild(target.cache, parent.uuid, uuid);
  saveCache(cacheDir, target.key, target.cache);
  queueScriptCreate(entry);
  logger.info(`New script imported from VSCode: ${relativePath}${suffix}`);
  return true;
}

function ingestUntrackedInstance(fullPath: string, srcDir: string, cacheDir: string, preferredKey?: CacheKey): boolean {
  const target = getWritableCache(cacheDir, preferredKey);
  if (!target) {
    logger.debug(`Changed instance JSON UUID not in cache: ${fullPath}`);
    return false;
  }

  const relativePath = relativePathFromWorkspaceFile(srcDir, fullPath, INSTANCE_JSON_EXTENSION);
  const looseData = readLooseInstanceJson(fullPath);
  if (!looseData) {
    logger.debug(`Invalid instance JSON changed: ${fullPath}`);
    return false;
  }
  if (!looseData.className) {
    logger.warn(`Instance JSON missing className: ${fullPath}`);
    return false;
  }

  if (looseData.uuid && target.cache.entries[looseData.uuid]) return false;
  const existing = cacheEntryByPath(target.cache, relativePath);
  if (existing) return false;

  const parent = ensureWorkspaceParent(target.cache, relativePath);
  for (const entry of parent.created) queueInstanceCreate(entry);

  const instance: InstanceJson = {
    uuid: looseData.uuid || nextUuid(),
    className: looseData.className,
    name: looseData.name || pathLeafName(relativePath),
    properties: looseData.properties || {},
    attributes: looseData.attributes || {},
    tags: looseData.tags || [],
    children: looseData.children || [],
  };

  const entry = entryFromInstance(relativePath, parent.uuid, instance);
  target.cache.entries[instance.uuid] = entry;
  addChild(target.cache, parent.uuid, instance.uuid);
  saveCache(cacheDir, target.key, target.cache);

  const written = writeInstanceJsonFile(srcDir, relativePath, instance);
  if (written) markFileWritten(written);
  queueInstanceCreate(entry);
  logger.info(`New instance imported from VSCode: ${relativePath}${INSTANCE_JSON_EXTENSION}`);
  return true;
}

function processScriptFileChange(fullPath: string, srcDir: string, cacheDir: string): void {
  if (!existsSync(fullPath)) return;

  const fileName = basename(fullPath);
  const className = classNameFromScriptFile(fileName);
  const suffix = scriptSuffixForFile(fileName);
  if (!className || !suffix) return;

  const relativePath = relativePathFromWorkspaceFile(srcDir, fullPath, suffix);
  const lookup = buildScriptLookupCache(cacheDir);
  const ref = lookup.get(scriptLookupKey(relativePath, className));

  if (!ref) {
    ingestUntrackedScript(fullPath, srcDir, cacheDir, relativePath, className, suffix);
    return;
  }

  try {
    const content = readFileSync(fullPath, "utf-8");
    const name = pathLeafName(relativePath);
    const changed = ref.entry.source !== content || ref.entry.name !== name || ref.entry.relativePath !== relativePath;
    if (!changed) return;

    const nextEntry: CacheEntry = {
      ...ref.entry,
      name,
      relativePath,
      source: content,
    };
    saveCacheEntry(cacheDir, ref, nextEntry);

    queueChange({
      uuid: ref.uuid,
      relativePath,
      className: ref.entry.className,
      type: "script",
      content,
      name,
      parentUuid: ref.entry.parentUuid,
    });
    logger.info(`Script changed: ${relativePath}${suffix} -> queued for sync`);
  } catch {
    logger.debug(`Error reading changed script: ${relativePath}${suffix}`);
  }
}

function processInstanceJsonChange(fullPath: string, srcDir: string, cacheDir: string): void {
  if (!existsSync(fullPath)) return;

  const data = readInstanceJsonFile(fullPath);
  if (!data) {
    ingestUntrackedInstance(fullPath, srcDir, cacheDir);
    return;
  }

  const ref = findCacheEntry(cacheDir, data.uuid);
  if (!ref) {
    ingestUntrackedInstance(fullPath, srcDir, cacheDir);
    return;
  }

  if (isFolderClass(ref.entry.className)) {
    logger.debug(`Ignoring legacy Folder metadata file: ${fullPath}`);
    return;
  }

  let relativePath = relativePathFromWorkspaceFile(srcDir, fullPath, INSTANCE_JSON_EXTENSION);
  let normalizedData: InstanceJson = {
    uuid: data.uuid,
    className: ref.entry.className,
    name: data.name || ref.entry.name,
    properties: data.properties || {},
    attributes: data.attributes || {},
    tags: data.tags || [],
    children: data.children || [],
  };

  if (relativePath !== ref.entry.relativePath) {
    normalizedData = { ...normalizedData, name: pathLeafName(relativePath) };
  } else {
    const desiredPath = replacePathLeaf(relativePath, normalizedData.name);
    if (desiredPath !== relativePath) {
      const written = writeInstanceJsonFile(srcDir, desiredPath, normalizedData);
      if (written) {
        markFileWritten(written);
        rmSync(fullPath, { force: true });
        relativePath = desiredPath;
      }
    }
  }

  const changed =
    ref.entry.name !== normalizedData.name ||
    ref.entry.relativePath !== relativePath ||
    stableStringify(ref.entry.properties || {}) !== stableStringify(normalizedData.properties) ||
    stableStringify(ref.entry.attributes || {}) !== stableStringify(normalizedData.attributes) ||
    stableStringify(ref.entry.tags || []) !== stableStringify(normalizedData.tags) ||
    stableStringify(ref.entry.children || []) !== stableStringify(normalizedData.children);

  if (!changed) return;

  const nextEntry: CacheEntry = {
    ...ref.entry,
    name: normalizedData.name,
    relativePath,
    properties: normalizedData.properties,
    attributes: normalizedData.attributes,
    tags: normalizedData.tags,
    children: normalizedData.children,
  };
  saveCacheEntry(cacheDir, ref, nextEntry);

  const currentPath = workspaceFilePath(srcDir, relativePath, INSTANCE_JSON_EXTENSION);
  if (currentPath && !wasRecentlyWritten(currentPath)) {
    const written = writeInstanceJsonFile(srcDir, relativePath, normalizedData);
    if (written) markFileWritten(written);
  }

  queueChange({
    uuid: ref.uuid,
    relativePath,
    className: ref.entry.className,
    type: "instance",
    data: normalizedData,
    name: normalizedData.name,
    parentUuid: ref.entry.parentUuid,
  });
  logger.info(`Instance changed: ${relativePath}${INSTANCE_JSON_EXTENSION} -> queued for sync`);
}

export function reconcileWorkspace(srcDir: string, cacheDir: string, preferredKey?: CacheKey): void {
  if (!existsSync(srcDir)) return;

  const workspace = scanWorkspace(srcDir);
  ingestWorkspaceFolders(workspace.folderPaths, cacheDir, preferredKey);

  for (const instanceFile of workspace.instanceJsonFiles) {
    if (!wasRecentlyWritten(instanceFile.fullPath)) {
      processInstanceJsonChange(instanceFile.fullPath, srcDir, cacheDir);
    }
  }

  const scriptFiles = new Map<string, WorkspaceScriptFile>();
  for (const scriptFile of workspace.scriptFiles) {
    scriptFiles.set(scriptLookupKey(scriptFile.relativePath, scriptFile.className), scriptFile);
  }

  const refs = loadCaches(cacheDir).flatMap(({ key, cache }) =>
    Object.entries(cache.entries)
      .filter(([, entry]) => isScriptClass(entry.className))
      .map(([uuid, entry]) => ({ key, uuid, entry })),
  );

  const tracked = new Set(refs.map((ref) => scriptLookupKey(ref.entry.relativePath, ref.entry.className)));
  const missingRefs = refs.filter((ref) => {
    const expected = workspaceFilePath(srcDir, ref.entry.relativePath, scriptExtension(ref.entry.className));
    return !expected || !existsSync(expected);
  });

  const untrackedFiles = workspace.scriptFiles.filter(
    (file) => !tracked.has(scriptLookupKey(file.relativePath, file.className)),
  );

  for (const ref of missingRefs) {
    const candidate = findRenameCandidate(ref.entry, untrackedFiles, missingRefs);
    if (!candidate) continue;

    try {
      const content = readFileSync(candidate.fullPath, "utf-8");
      const name = pathLeafName(candidate.relativePath);
      const nextEntry: CacheEntry = {
        ...ref.entry,
        name,
        relativePath: candidate.relativePath,
        source: content,
      };
      saveCacheEntry(cacheDir, ref, nextEntry);

      queueChange({
        uuid: ref.uuid,
        relativePath: candidate.relativePath,
        className: ref.entry.className,
        type: "script",
        content,
        name,
        parentUuid: ref.entry.parentUuid,
      });
      logger.info(`Script renamed: ${ref.entry.relativePath} -> ${candidate.relativePath}`);

      const index = untrackedFiles.indexOf(candidate);
      if (index >= 0) untrackedFiles.splice(index, 1);
    } catch {
      logger.debug(`Error reading renamed script: ${candidate.relativePath}`);
    }
  }

  for (const file of untrackedFiles) {
    ingestUntrackedScript(file.fullPath, srcDir, cacheDir, file.relativePath, file.className, scriptExtension(file.className), preferredKey);
  }

  queueDeletedWorkspaceEntries(srcDir, cacheDir, preferredKey);
}

function scanWorkspace(srcDir: string): {
  scriptFiles: WorkspaceScriptFile[];
  instanceJsonFiles: WorkspaceInstanceFile[];
  folderPaths: string[];
} {
  const scriptFiles: WorkspaceScriptFile[] = [];
  const instanceJsonFiles: WorkspaceInstanceFile[] = [];
  const folderPaths: string[] = [];

  function traverse(currentDir: string): void {
    for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = resolve(currentDir, entry.name);
      if (entry.isDirectory()) {
        const relPath = normalizeWorkspacePath(relative(srcDir, fullPath));
        if (relPath) folderPaths.push(relPath);
        traverse(fullPath);
        continue;
      }

      if (entry.name.endsWith(INSTANCE_JSON_EXTENSION)) {
        instanceJsonFiles.push({
          fullPath,
          relativePath: relativePathFromWorkspaceFile(srcDir, fullPath, INSTANCE_JSON_EXTENSION),
          data: readLooseInstanceJson(fullPath),
        });
        continue;
      }

      if (!entry.name.endsWith(".lua")) continue;
      const className = classNameFromScriptFile(entry.name);
      const suffix = scriptSuffixForFile(entry.name);
      if (!className || !suffix) continue;
      scriptFiles.push({
        fullPath,
        className,
        relativePath: relativePathFromWorkspaceFile(srcDir, fullPath, suffix),
      });
    }
  }

  traverse(srcDir);
  return { scriptFiles, instanceJsonFiles, folderPaths };
}

function findRenameCandidate(
  entry: CacheEntry,
  candidates: WorkspaceScriptFile[],
  missingRefs: CacheRef[],
): WorkspaceScriptFile | null {
  const sameClass = candidates.filter((candidate) => candidate.className === entry.className);
  const sameParent = sameClass.filter((candidate) => pathParent(candidate.relativePath) === pathParent(entry.relativePath));
  if (sameParent.length === 1) return sameParent[0];

  if (entry.source) {
    const contentMatches = sameClass.filter((candidate) => {
      try {
        return readFileSync(candidate.fullPath, "utf-8") === entry.source;
      } catch {
        return false;
      }
    });
    if (contentMatches.length === 1) return contentMatches[0];
  }

  const missingSameClass = missingRefs.filter((ref) => ref.entry.className === entry.className);
  if (sameClass.length === 1 && missingSameClass.length === 1) return sameClass[0];

  return null;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
