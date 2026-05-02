import { watch, existsSync, readFileSync, readdirSync, type FSWatcher } from "node:fs";
import { resolve, relative } from "node:path";
import { createLogger } from "../logging/logger";
import { CacheStore } from "../cache/cache-store";
import type { CacheKey } from "@drxporter/shared";

const logger = createLogger("watcher");

export interface FileChange {
  uuid: string;
  relativePath: string;
  className: string;
  type: "script";
  content: string;
}

const MAX_PENDING = 200;
const DEBOUNCE_MS = 1000;
const STARTUP_GRACE_MS = 5000;
const RECENT_WRITE_TTL = 5000;

const pendingChanges: FileChange[] = [];
let isWatching = false;
let startupGracePeriod = true;
const recentWrites = new Map<string, number>();
let fsWatcher: FSWatcher | null = null;
let startupGraceTimer: NodeJS.Timeout | null = null;
const debounceTimers = new Map<string, NodeJS.Timeout>();
let cachedLookup: Map<string, { uuid: string; className: string }> | null = null;
let lookupCacheTime = 0;
const LOOKUP_CACHE_TTL = 10_000;

export function markFileWritten(filePath: string): void {
  recentWrites.set(filePath, Date.now());
}

function cleanupRecentWrites(): void {
  const now = Date.now();
  for (const [path, time] of recentWrites) {
    if (now - time > RECENT_WRITE_TTL) {
      recentWrites.delete(path);
    }
  }
}

export function getPendingChanges(): FileChange[] {
  const changes = [...pendingChanges];
  pendingChanges.length = 0;
  return changes;
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
  cachedLookup = null;
  lookupCacheTime = 0;
}

export function startWatcher(srcDir: string, cacheDir: string): void {
  if (isWatching) return;
  if (!existsSync(srcDir)) {
    logger.info("Source directory not found, watcher will start after first export");
    return;
  }

  isWatching = true;
  startupGracePeriod = true;
  logger.info(`Watching for script changes in: ${srcDir}`);

  startupGraceTimer = setTimeout(() => {
    startupGraceTimer = null;
    startupGracePeriod = false;
    logger.info("File watcher active (grace period ended)");
  }, STARTUP_GRACE_MS);
  startupGraceTimer.unref?.();

  fsWatcher = watch(srcDir, { recursive: true }, (eventType, filename) => {
    if (!filename) return;
    if (startupGracePeriod) return;
    if (eventType !== "change") return;
    if (!filename.endsWith(".lua")) return;

    const fullPath = resolve(srcDir, filename);
    if (!existsSync(fullPath)) return;

    cleanupRecentWrites();
    const lastWrite = recentWrites.get(fullPath);
    if (lastWrite && Date.now() - lastWrite < RECENT_WRITE_TTL) {
      return;
    }

    const existing = debounceTimers.get(fullPath);
    if (existing) clearTimeout(existing);

    debounceTimers.set(
      fullPath,
      setTimeout(() => {
        debounceTimers.delete(fullPath);
        processFileChange(fullPath, srcDir, cacheDir);
      }, DEBOUNCE_MS)
    );
    debounceTimers.get(fullPath)?.unref?.();
  });
}

function buildLookupCache(cacheDir: string): Map<string, { uuid: string; className: string }> {
  const now = Date.now();
  if (cachedLookup && now - lookupCacheTime < LOOKUP_CACHE_TTL) {
    return cachedLookup;
  }

  const lookup = new Map<string, { uuid: string; className: string }>();
  if (!existsSync(cacheDir)) return lookup;

  const store = new CacheStore(cacheDir);
  const files = readdirSync(cacheDir).filter((f) => f.endsWith(".json"));

  for (const file of files) {
    const parts = file.replace(".json", "").split("_");
    if (parts.length !== 2) continue;
    const key: CacheKey = { gameId: parts[0], placeId: parts[1] };
    const cache = store.load(key);

    for (const [entryUuid, entry] of Object.entries(cache.entries)) {
      lookup.set(entry.relativePath, { uuid: entryUuid, className: entry.className });
    }
  }

  cachedLookup = lookup;
  lookupCacheTime = now;
  return lookup;
}

function processFileChange(fullPath: string, srcDir: string, cacheDir: string): void {
  if (!existsSync(fullPath)) return;

  const relPath = relative(srcDir, fullPath);
  const basePath = relPath
    .replace(/\.server\.lua$/, "")
    .replace(/\.client\.lua$/, "")
    .replace(/\.lua$/, "");

  const lookup = buildLookupCache(cacheDir);
  const entry = lookup.get(basePath);

  if (!entry) {
    logger.debug(`Changed file not in cache: ${relPath}`);
    return;
  }

  if (entry.className !== "ModuleScript" && entry.className !== "Script" && entry.className !== "LocalScript") {
    return;
  }

  try {
    const content = readFileSync(fullPath, "utf-8");

    if (pendingChanges.length >= MAX_PENDING) {
      pendingChanges.shift();
    }

    pendingChanges.push({
      uuid: entry.uuid,
      relativePath: basePath,
      className: entry.className,
      type: "script",
      content,
    });
    logger.info(`Script changed: ${relPath} → queued for sync`);
  } catch {
    logger.debug(`Error reading changed file: ${relPath}`);
  }
}
