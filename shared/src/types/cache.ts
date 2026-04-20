export interface CacheKey {
  gameId: string;
  placeId: string;
}

export interface CacheEntry {
  uuid: string;
  className: string;
  name: string;
  parentUuid: string | null;
  lastExportedAt: number;
  relativePath: string;
}

export interface PlaceCache {
  gameId: string;
  placeId: string;
  version: number;
  entries: Record<string, CacheEntry>;
  createdAt: number;
  updatedAt: number;
}
