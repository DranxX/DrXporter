import { describe, it, expect } from "vitest";
import { createEmptyPlaceCache, isValidPlaceCache } from "@drxporter/shared";

describe("Cache", () => {
  it("should create empty place cache", () => {
    const cache = createEmptyPlaceCache("123", "456");
    expect(cache.gameId).toBe("123");
    expect(cache.placeId).toBe("456");
    expect(cache.version).toBe(1);
    expect(Object.keys(cache.entries)).toHaveLength(0);
  });

  it("should validate place cache", () => {
    const cache = createEmptyPlaceCache("123", "456");
    expect(isValidPlaceCache(cache)).toBe(true);
  });

  it("should reject invalid cache", () => {
    expect(isValidPlaceCache(null)).toBe(false);
    expect(isValidPlaceCache({})).toBe(false);
  });
});
