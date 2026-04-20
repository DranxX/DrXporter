import { describe, it, expect } from "vitest";
import { isValidUuid, detectDuplicateUuids } from "@drxporter/shared";
import { generateUuid, isUuidFormat } from "../src/utils/ids";

describe("UUID", () => {
  it("should generate valid UUIDs", () => {
    const uuid = generateUuid();
    expect(isUuidFormat(uuid)).toBe(true);
    expect(isValidUuid(uuid)).toBe(true);
  });

  it("should detect duplicates", () => {
    const uuids = ["a", "b", "a", "c", "b", "b"];
    const duplicates = detectDuplicateUuids(uuids);
    expect(duplicates.size).toBe(2);
    expect(duplicates.get("a")).toBe(2);
    expect(duplicates.get("b")).toBe(3);
  });

  it("should reject invalid UUIDs", () => {
    expect(isValidUuid("not-a-uuid")).toBe(false);
    expect(isValidUuid("")).toBe(false);
  });
});
