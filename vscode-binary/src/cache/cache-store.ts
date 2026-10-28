import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import type { PlaceCache, CacheEntry, CacheKey } from "@drxporter/shared";
import { createEmptyPlaceCache, isValidPlaceCache } from "@drxporter/shared";
import { createLogger } from "../logging/logger";

const logger = createLogger("cache");

export class CacheStore {
  private cacheDir: string;
  private memoryCache = new Map<string, { data: PlaceCache; loadedAt: number }>();
  private static readonly MEMORY_TTL = 10_000;

  constructor(cacheDir: string) {
    this.cacheDir = cacheDir;
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true });
    }
  }

  private getPath(key: CacheKey): string {
    return resolve(this.cacheDir, `${key.gameId}_${key.placeId}.json`);
  }

  private cacheKeyStr(key: CacheKey): string {
    return `${key.gameId}_${key.placeId}`;
  }

  load(key: CacheKey): PlaceCache {
    const keyStr = this.cacheKeyStr(key);
    const cached = this.memoryCache.get(keyStr);
    if (cached && Date.now() - cached.loadedAt < CacheStore.MEMORY_TTL) {
      return cached.data;
    }

    const path = this.getPath(key);
    if (!existsSync(path)) {
      const empty = createEmptyPlaceCache(key.gameId, key.placeId);
      this.memoryCache.set(keyStr, { data: empty, loadedAt: Date.now() });
      return empty;
    }

    try {
      const raw = readFileSync(path, "utf-8");
      const parsed = JSON.parse(raw);
      if (!isValidPlaceCache(parsed)) {
        logger.warn("Invalid cache file, creating new");
        const empty = createEmptyPlaceCache(key.gameId, key.placeId);
        this.memoryCache.set(keyStr, { data: empty, loadedAt: Date.now() });
        return empty;
      }
      this.memoryCache.set(keyStr, { data: parsed, loadedAt: Date.now() });
      return parsed;
    } catch {
      logger.error("Failed to load cache");
      const empty = createEmptyPlaceCache(key.gameId, key.placeId);
      this.memoryCache.set(keyStr, { data: empty, loadedAt: Date.now() });
      return empty;
    }
  }

  save(key: CacheKey, cache: PlaceCache): void {
    const path = this.getPath(key);
    cache.updatedAt = Date.now();
    writeFileSync(path, JSON.stringify(cache, null, 2), "utf-8");
    const keyStr = this.cacheKeyStr(key);
    this.memoryCache.set(keyStr, { data: cache, loadedAt: Date.now() });
  }

  getEntry(key: CacheKey, uuid: string): CacheEntry | undefined {
    const cache = this.load(key);
    return cache.entries[uuid];
  }

  setEntry(key: CacheKey, uuid: string, entry: CacheEntry): void {
    const cache = this.load(key);
    cache.entries[uuid] = entry;
    this.save(key, cache);
  }

  removeEntry(key: CacheKey, uuid: string): void {
    const cache = this.load(key);
    delete cache.entries[uuid];
    this.save(key, cache);
  }

  clear(key: CacheKey): void {
    const empty = createEmptyPlaceCache(key.gameId, key.placeId);
    this.save(key, empty);
  }

  invalidateMemory(): void {
    this.memoryCache.clear();
  }
}
