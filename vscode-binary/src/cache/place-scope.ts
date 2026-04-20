import type { CacheKey } from "@drxporter/shared";

export function createCacheKey(gameId: string, placeId: string): CacheKey {
  return { gameId, placeId };
}

export function cacheKeyToString(key: CacheKey): string {
  return `${key.gameId}:${key.placeId}`;
}

export function parseCacheKey(str: string): CacheKey | null {
  const parts = str.split(":");
  if (parts.length !== 2) return null;
  return { gameId: parts[0], placeId: parts[1] };
}
