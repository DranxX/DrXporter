import type { RouteResult } from "../router";
import { parseRequest, createResponse, createErrorResponse } from "../protocol";
import { CacheStore } from "../../cache/cache-store";
import { markFileWritten } from "../watcher";
import { SCRIPT_EXTENSIONS } from "@drxporter/shared";
import { createLogger } from "../../logging/logger";
import { writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";

const logger = createLogger("sync-push");

interface PushPayload {
  uuid: string;
  name: string;
  className: string;
  scriptType: string;
  source: string;
  timestamp: number;
}

export async function handleSyncPushFromStudio(body: string): Promise<RouteResult> {
  const request = parseRequest<PushPayload>(body);
  if (!request) {
    return { status: 400, body: createErrorResponse("unknown", "DRX_E012", "Invalid push payload") };
  }

  const payload = request.payload;
  const cacheDir = resolve(process.cwd(), ".drxporter-cache");
  const store = new CacheStore(cacheDir);
  const srcDir = resolve(process.cwd(), "src");

  if (!existsSync(cacheDir)) {
    return { status: 200, body: createResponse(request.requestId, { written: false }) };
  }

  const cacheFiles = readdirSync(cacheDir).filter((f) => f.endsWith(".json"));
  let written = false;

  for (const file of cacheFiles) {
    const parts = file.replace(".json", "").split("_");
    if (parts.length !== 2) continue;
    const key = { gameId: parts[0], placeId: parts[1] };
    const cache = store.load(key);

    const entry = cache.entries[payload.uuid];
    if (!entry) continue;

    (entry as any).source = payload.source;
    entry.lastExportedAt = Date.now();
    cache.entries[payload.uuid] = entry;
    store.save(key, cache);

    const ext = SCRIPT_EXTENSIONS[payload.className] || ".lua";
    const fullPath = resolve(srcDir, entry.relativePath + ext);
    const dir = dirname(fullPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    markFileWritten(fullPath);
    writeFileSync(fullPath, payload.source || "", "utf-8");
    written = true;

    logger.info(`Sync←Studio: ${entry.relativePath}${ext}`);
    break;
  }

  if (!written) {
    logger.debug(`UUID not in cache: ${payload.uuid}`);
  }

  return {
    status: 200,
    body: createResponse(request.requestId, { written }),
  };
}
