import { describe, it, expect } from "vitest";
import { resolveParentMap, buildAncestorChain } from "../src/importer/parent-resolver";

describe("Importer", () => {
  it("should resolve parent map", () => {
    const instances = [
      { uuid: "parent", className: "Folder", name: "Parent", properties: {}, attributes: {}, tags: [], children: ["child"] },
      { uuid: "child", className: "Part", name: "Child", properties: {}, attributes: {}, tags: [], children: [] },
    ];

    const map = resolveParentMap(instances);
    expect(map.get("child")).toBe("parent");
    expect(map.get("parent")).toBeNull();
  });

  it("should build ancestor chain", () => {
    const parentMap = new Map<string, string | null>([
      ["a", null],
      ["b", "a"],
      ["c", "b"],
    ]);

    const chain = buildAncestorChain("c", parentMap);
    expect(chain).toEqual(["a", "b"]);
  });
});
