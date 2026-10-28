import type { PlaceCache } from "../types/cache";

export function isValidPlaceCache(data: unknown): data is PlaceCache {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  if (typeof obj.gameId !== "string") return false;
  if (typeof obj.placeId !== "string") return false;
  if (typeof obj.version !== "number") return false;
  if (typeof obj.entries !== "object" || obj.entries === null) return false;
  return true;
}

export function createEmptyPlaceCache(gameId: string, placeId: string): PlaceCache {
  return {
    gameId,
    placeId,
    version: 1,
    entries: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
