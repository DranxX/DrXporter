import type { CacheKey, CacheEntry } from "@drxporter/shared";
import { CacheStore } from "./cache-store";

export class UuidIndex {
  private store: CacheStore;

  constructor(store: CacheStore) {
    this.store = store;
  }

  lookup(key: CacheKey, uuid: string): CacheEntry | undefined {
    return this.store.getEntry(key, uuid);
  }

  register(key: CacheKey, uuid: string, entry: CacheEntry): void {
    this.store.setEntry(key, uuid, entry);
  }

  unregister(key: CacheKey, uuid: string): void {
    this.store.removeEntry(key, uuid);
  }

  exists(key: CacheKey, uuid: string): boolean {
    return this.store.getEntry(key, uuid) !== undefined;
  }

  getAllUuids(key: CacheKey): string[] {
    const cache = this.store.load(key);
    return Object.keys(cache.entries);
  }
}
