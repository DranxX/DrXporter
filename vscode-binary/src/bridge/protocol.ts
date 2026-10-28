import type { BridgeRequest, BridgeResponse, BridgeError } from "@drxporter/shared";
import { randomUUID } from "node:crypto";

export function createResponse<T>(requestId: string, payload: T): BridgeResponse<T> {
  return {
    requestId,
    success: true,
    payload,
    error: null,
    timestamp: Date.now(),
  };
}

export function createErrorResponse(requestId: string, code: string, message: string): BridgeResponse<null> {
  return {
    requestId,
    success: false,
    payload: null,
    error: { code, message },
    timestamp: Date.now(),
  };
}

export function parseRequest<T>(body: string): BridgeRequest<T> | null {
  try {
    const parsed = JSON.parse(body);
    if (!parsed.requestId || !parsed.action) return null;
    return parsed as BridgeRequest<T>;
  } catch {
    return null;
  }
}

export function generateRequestId(): string {
  return randomUUID();
}
