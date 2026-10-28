import { describe, it, expect } from "vitest";
import { createResponse, createErrorResponse, parseRequest } from "../src/bridge/protocol";

describe("Protocol", () => {
  it("should create success response", () => {
    const res = createResponse("req-1", { data: "test" });
    expect(res.success).toBe(true);
    expect(res.requestId).toBe("req-1");
    expect(res.payload).toEqual({ data: "test" });
    expect(res.error).toBeNull();
  });

  it("should create error response", () => {
    const res = createErrorResponse("req-2", "DRX_E001", "Missing UUID");
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe("DRX_E001");
  });

  it("should parse valid request", () => {
    const body = JSON.stringify({ requestId: "r1", action: "health", payload: {}, timestamp: 123 });
    const req = parseRequest(body);
    expect(req).not.toBeNull();
    expect(req?.action).toBe("health");
  });

  it("should return null for invalid request", () => {
    expect(parseRequest("invalid")).toBeNull();
    expect(parseRequest("{}")).toBeNull();
  });
});
