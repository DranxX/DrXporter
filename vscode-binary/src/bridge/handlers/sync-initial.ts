import type { RouteResult } from "../router";
import { parseRequest, createResponse, createErrorResponse } from "../protocol";
import { CacheStore } from "../../cache/cache-store";
import { isScriptClass, SCRIPT_EXTENSIONS } from "@drxporter/shared";
import { createLogger } from "../../logging/logger";
import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

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
  const cacheKey = payload.cacheKey;
  const cache = store.load(cacheKey);
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
  const studioTime = payload.studioTimestamp;
  const scriptsToSend: Array<{ uuid: string; source: string; name: string; className: string }> = [];
  const uuidsNeedFromStudio: string[] = [];

  for (const entry of entries) {
    if (!isScriptClass(entry.className)) continue;

    const ext = SCRIPT_EXTENSIONS[entry.className] || ".lua";
    const filePath = resolve(srcDir, entry.relativePath + ext);

    if (!existsSync(filePath)) {
      uuidsNeedFromStudio.push(entry.uuid);
      continue;
    }

    try {
      const stat = statSync(filePath);
      const fileModTime = Math.floor(stat.mtimeMs / 1000);
      const cacheTime = Math.floor(entry.lastExportedAt / 1000);

      if (fileModTime > cacheTime && fileModTime > studioTime) {
        const source = readFileSync(filePath, "utf-8");
        scriptsToSend.push({
          uuid: entry.uuid,
          source,
          name: entry.name,
          className: entry.className,
        });
      } else if (studioTime > fileModTime) {
        uuidsNeedFromStudio.push(entry.uuid);
      }
    } catch {
      uuidsNeedFromStudio.push(entry.uuid);
    }
  }

  if (scriptsToSend.length > 0 && uuidsNeedFromStudio.length === 0) {
    logger.info(`Initial sync: VSCode has ${scriptsToSend.length} newer scripts → push to Studio`);
    return {
      status: 200,
      body: createResponse(request.requestId, {
        action: "push-to-studio",
        scripts: scriptsToSend,
      }),
    };
  }

  if (uuidsNeedFromStudio.length > 0 && scriptsToSend.length === 0) {
    logger.info(`Initial sync: Studio has ${uuidsNeedFromStudio.length} newer scripts → pull from Studio`);
    return {
      status: 200,
      body: createResponse(request.requestId, {
        action: "pull-from-studio",
        requestedUuids: uuidsNeedFromStudio,
      }),
    };
  }

  if (scriptsToSend.length > 0 && uuidsNeedFromStudio.length > 0) {
    logger.info(`Initial sync: mixed — ${scriptsToSend.length} from VSCode, ${uuidsNeedFromStudio.length} from Studio`);
    return {
      status: 200,
      body: createResponse(request.requestId, {
        action: "push-to-studio",
        scripts: scriptsToSend,
        alsoNeedFromStudio: uuidsNeedFromStudio,
      }),
    };
  }

  logger.info("Initial sync: everything in sync");
  return {
    status: 200,
    body: createResponse(request.requestId, { action: "none" }),
  };
}
