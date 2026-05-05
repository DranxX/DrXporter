import type { RouteResult } from "../router";
import { parseRequest, createResponse, createErrorResponse } from "../protocol";
import type { ImportPullPayload, InstanceJson, ScriptDescriptor } from "@drxporter/shared";
import { INSTANCE_JSON_EXTENSION, isFolderClass, isScriptClass } from "@drxporter/shared";
import { CacheStore } from "../../cache/cache-store";
import { createLogger } from "../../logging/logger";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  instanceJsonFromEntry,
  readInstanceJsonFile,
  scriptDescriptorFromEntry,
  scriptExtension,
  workspaceFilePath,
} from "../sync-files";

const logger = createLogger("import");

export async function handleImportToStudio(body: string): Promise<RouteResult> {
  const request = parseRequest<ImportPullPayload>(body);
  if (!request) {
    return { status: 400, body: createErrorResponse("unknown", "DRX_E012", "Invalid import payload") };
  }

  const payload = request.payload;
  logger.info(`Import requested: ${payload.requestedUuids?.length || 0} UUIDs`);

  const cacheDir = resolve(process.cwd(), ".drxporter-cache");
  const store = new CacheStore(cacheDir);
  const cacheKey = payload.cacheKey || { gameId: "0", placeId: "0" };
  const cache = store.load(cacheKey);

  const instances: InstanceJson[] = [];
  const scripts: ScriptDescriptor[] = [];
  const srcDir = resolve(process.cwd(), "src");

  for (const uuid of payload.requestedUuids || []) {
    const entry = cache.entries[uuid];
    if (!entry) {
      logger.debug(`UUID not in cache: ${uuid}`);
      continue;
    }

    const relPath = entry.relativePath;
    if (!relPath) continue;

    if (isScriptClass(entry.className)) {
      const ext = scriptExtension(entry.className);
      const fullPath = workspaceFilePath(srcDir, relPath, ext);

      let source = entry.source || "";
      if (fullPath && existsSync(fullPath)) {
        try {
          source = readFileSync(fullPath, "utf-8");
        } catch {}
      }

      scripts.push(scriptDescriptorFromEntry(entry, source));
    } else {
      const fullPath = isFolderClass(entry.className)
        ? null
        : workspaceFilePath(srcDir, relPath, INSTANCE_JSON_EXTENSION);
      const fromFile = fullPath && existsSync(fullPath) ? readInstanceJsonFile(fullPath) : null;
      instances.push(fromFile || instanceJsonFromEntry(entry));
    }
  }

  logger.info(`Import response: ${instances.length} instances, ${scripts.length} scripts`);

  return {
    status: 200,
    body: createResponse(request.requestId, {
      success: true,
      instances,
      scripts,
    }),
  };
}
