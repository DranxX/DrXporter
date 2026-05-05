import type { InstanceJson, ScriptDescriptor } from "./instance";
import type { CacheKey } from "./cache";

export interface BridgeRequest<T = unknown> {
  requestId: string;
  action: BridgeAction;
  payload: T;
  timestamp: number;
}

export interface BridgeResponse<T = unknown> {
  requestId: string;
  success: boolean;
  payload: T | null;
  error: BridgeError | null;
  timestamp: number;
}

export interface BridgeError {
  code: string;
  message: string;
  details?: unknown;
}

export type BridgeAction =
  | "connect"
  | "disconnect"
  | "export-push"
  | "import-pull"
  | "validate"
  | "health"
  | "cache-get"
  | "cache-clear"
  | "sync/changes"
  | "sync/push-from-studio"
  | "sync/initial";

export interface ConnectPayload {
  gameId: string;
  placeId: string;
  pluginVersion: string;
}

export interface ExportPushPayload {
  cacheKey: CacheKey;
  instances: InstanceJson[];
  scripts: ScriptDescriptor[];
  selectedUuids: string[];
  ancestorUuids: string[];
  fullSync?: boolean;
  forceOverwrite?: boolean;
}

export interface ImportPullPayload {
  cacheKey: CacheKey;
  requestedUuids: string[];
}

export interface ImportPullResponse {
  instances: InstanceJson[];
  scripts: ScriptDescriptor[];
}

export interface HealthResponse {
  status: "ok";
  version: string;
  uptime: number;
}

export interface ValidatePayload {
  cacheKey: CacheKey;
}

export interface ValidateResponse {
  valid: boolean;
  errors: BridgeError[];
}
