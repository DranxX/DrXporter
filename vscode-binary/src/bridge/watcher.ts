import { existsSync, readFileSync, readdirSync, rmSync, watch, type FSWatcher } from "node:fs";
import { basename, resolve } from "node:path";
import type { CacheEntry, CacheKey, InstanceJson, PlaceCache } from "@drxporter/shared";
import { INSTANCE_JSON_EXTENSION, isFolderClass, isScriptClass } from "@drxporter/shared";
import { createLogger } from "../logging/logger";
import { CacheStore } from "../cache/cache-store";
import {
  classNameFromScriptFile,
  pathLeafName,
  pathParent,
  readInstanceJsonFile,
  relativePathFromWorkspaceFile,
  replacePathLeaf,
  scriptExtension,
  scriptSuffixForFile,
  workspaceFilePath,
  writeInstanceJsonFile,
} from "./sync-files";

const logger = createLogger("watcher");

export type FileChange = ScriptFileChange | InstanceFileChange;

export interface ScriptFileChange {
  uuid: string;
  relativePath: string;
  className: string;
  type: "script";
  content: string;
  name: string;
}

export interface InstanceFileChange {
  uuid: string;
  relativePath: string;
  className: string;
  type: "instance";
  data: InstanceJson;
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
    logger.info("File watcher active (grace period ended)");
  }, STARTUP_GRACE_MS);
  startupGraceTimer.unref?.();

  fsWatcher = watch(srcDir, { recursive: true }, (eventType, filename) => {
    if (!filename || startupGracePeriod) return;

    const name = String(filename).replace(/\\/g, "/");
    const isScript = name.endsWith(".lua");
    const isInstanceJson = name.endsWith(INSTANCE_JSON_EXTENSION);
    if (!isScript && !isInstanceJson) return;

    const fullPath = resolve(srcDir, name);
    if (wasRecentlyWritten(fullPath)) return;

    if (eventType === "rename") {
      scheduleReconcile(srcDir, cacheDir);
      return;
    }

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
    logger.debug(`Changed script not in cache: ${relativePath}${suffix}`);
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
    logger.debug(`Invalid instance JSON changed: ${fullPath}`);
    return;
  }

  const ref = findCacheEntry(cacheDir, data.uuid);
  if (!ref) {
    logger.debug(`Changed instance JSON UUID not in cache: ${data.uuid}`);
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
  });
  logger.info(`Instance changed: ${relativePath}${INSTANCE_JSON_EXTENSION} -> queued for sync`);
}

function reconcileWorkspace(srcDir: string, cacheDir: string): void {
  if (!existsSync(srcDir) || !existsSync(cacheDir)) return;

  const workspace = scanWorkspace(srcDir);
  for (const instancePath of workspace.instanceJsonFiles) {
    if (!wasRecentlyWritten(instancePath)) {
      processInstanceJsonChange(instancePath, srcDir, cacheDir);
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
      });
      logger.info(`Script renamed: ${ref.entry.relativePath} -> ${candidate.relativePath}`);

      const index = untrackedFiles.indexOf(candidate);
      if (index >= 0) untrackedFiles.splice(index, 1);
    } catch {
      logger.debug(`Error reading renamed script: ${candidate.relativePath}`);
    }
  }
}

function scanWorkspace(srcDir: string): { scriptFiles: WorkspaceScriptFile[]; instanceJsonFiles: string[] } {
  const scriptFiles: WorkspaceScriptFile[] = [];
  const instanceJsonFiles: string[] = [];

  function traverse(currentDir: string): void {
    for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = resolve(currentDir, entry.name);
      if (entry.isDirectory()) {
        traverse(fullPath);
        continue;
      }

      if (entry.name.endsWith(INSTANCE_JSON_EXTENSION)) {
        instanceJsonFiles.push(fullPath);
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
  return { scriptFiles, instanceJsonFiles };
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
