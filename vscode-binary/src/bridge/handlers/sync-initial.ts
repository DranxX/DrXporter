import type { RouteResult } from "../router";
import { parseRequest, createResponse, createErrorResponse } from "../protocol";
import { CacheStore } from "../../cache/cache-store";
import { INSTANCE_JSON_EXTENSION, isFolderClass, isScriptClass } from "@drxporter/shared";
import { createLogger } from "../../logging/logger";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  scriptExtension,
  workspaceFolderPath,
  workspaceFilePath,
} from "../sync-files";

const logger = createLogger("sync-initial");

interface InitialSyncPayload {
  cacheKey: { gameId: string; placeId: string };
  studioTimestamp: number;
}

export async function handleSyncInitial(body: string): Promise<RouteResult> {
  const request = parseRequest<InitialSyncPayload>(body);
  if (!request) {
    return { status: 400, body: createErrorResponse("unknown", "DRX_E012", "Invalid sync payload") };
  }

  const payload = request.payload;
  const cacheDir = resolve(process.cwd(), ".drxporter-cache");

  if (!existsSync(cacheDir)) {
    logger.info("No cache exists, Studio should do initial export");
    return {
      status: 200,
      body: createResponse(request.requestId, {
        action: "pull-from-studio",
        requestedUuids: [],
      }),
    };
  }

  const store = new CacheStore(cacheDir);
  const cache = store.load(payload.cacheKey);
  const entries = Object.values(cache.entries);

  if (entries.length === 0) {
    logger.info("Cache empty, Studio should do initial export");
    return {
      status: 200,
      body: createResponse(request.requestId, {
        action: "pull-from-studio",
        requestedUuids: [],
      }),
    };
  }

  const srcDir = resolve(process.cwd(), "src");
  const uuidsNeedFromStudio: string[] = [];

  for (const entry of entries) {
    const suffix = isScriptClass(entry.className) ? scriptExtension(entry.className) : INSTANCE_JSON_EXTENSION;
    const filePath = isFolderClass(entry.className)
      ? workspaceFolderPath(srcDir, entry.relativePath)
      : workspaceFilePath(srcDir, entry.relativePath, suffix);

    if (!filePath || !existsSync(filePath)) {
      uuidsNeedFromStudio.push(entry.uuid);
      continue;
    }
  }

  logger.info("Initial sync: Studio is authoritative, requesting Roblox snapshot");
  return {
    status: 200,
    body: createResponse(request.requestId, {
      action: "pull-from-studio",
      requestedUuids: uuidsNeedFromStudio,
    }),
  };
}
