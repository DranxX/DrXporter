import { describe, it, expect } from "vitest";
import { filterBySelection } from "../src/exporter/selection-exporter";

describe("Exporter", () => {
  it("should filter by selection", () => {
    const instances = [
      { uuid: "a", className: "Part", name: "A", properties: {}, attributes: {}, tags: [], children: [] },
      { uuid: "b", className: "Part", name: "B", properties: {}, attributes: {}, tags: [], children: [] },
    ];
    const scripts: any[] = [];
    const selected = new Set(["a"]);
    const ancestors = new Set<string>();

    const result = filterBySelection(instances, scripts, selected, ancestors);
    expect(result.instances).toHaveLength(1);
    expect(result.skipped).toHaveLength(1);
  });
});
