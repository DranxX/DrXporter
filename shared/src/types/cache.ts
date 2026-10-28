import type { AttributeValue, PropertyValue } from "./instance";

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
  source?: string;
  properties?: Record<string, PropertyValue>;
  attributes?: Record<string, AttributeValue>;
  tags?: string[];
  children?: string[];
}

export interface PlaceCache {
  gameId: string;
  placeId: string;
  version: number;
  entries: Record<string, CacheEntry>;
  createdAt: number;
  updatedAt: number;
}
